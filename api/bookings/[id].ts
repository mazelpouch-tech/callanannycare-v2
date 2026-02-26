import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, timesOverlap, getDateRange } from '../_db.js';
import type { DbBookingWithNanny, BookingStatus, BookingPlan } from '@/types';

interface UpdateBookingBody {
  nanny_id?: number | null;
  status?: BookingStatus;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  hotel?: string;
  date?: string;
  end_date?: string | null;
  start_time?: string;
  end_time?: string;
  plan?: BookingPlan;
  children_count?: number;
  children_ages?: string;
  notes?: string;
  total_price?: number;
  clock_in?: string | null;
  clock_out?: string | null;
  resend_invoice?: boolean;
  send_reminder?: boolean;
  cancellation_reason?: string;
  cancelled_by?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT b.*, n.name as nanny_name, n.image as nanny_image
        FROM bookings b
        LEFT JOIN nannies n ON b.nanny_id = n.id
        WHERE b.id = ${id}
      ` as DbBookingWithNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });

      // Email verification for parent tracking page
      const emailParam = req.query.email;
      if (emailParam && typeof emailParam === 'string') {
        if (result[0].client_email?.toLowerCase().trim() !== emailParam.toLowerCase().trim()) {
          return res.status(403).json({ error: 'Email does not match this booking' });
        }
      }

      // Include payment/payout ledger when requested
      if (req.query.include === 'payments') {
        const payments = await sql`SELECT * FROM booking_payments WHERE booking_id = ${id} ORDER BY created_at ASC`;
        const payouts  = await sql`SELECT * FROM booking_payouts  WHERE booking_id = ${id} ORDER BY created_at ASC`;
        return res.status(200).json({ ...result[0], payments, payouts });
      }

      return res.status(200).json(result[0]);
    }

    // ─── Payment / Payout ledger actions ────────────────────────────
    if (req.method === 'POST') {
      const { action, amount, amount_eur, currency, method, received_by, paid_by, note, paymentId, payoutId } = req.body as {
        action: string;
        amount?: number;
        amount_eur?: number;
        currency?: string;
        method?: string;
        received_by?: string;
        paid_by?: string;
        note?: string;
        paymentId?: number;
        payoutId?: number;
      };

      if (action === 'addPayment') {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        const cur = currency || 'EUR';
        // amount_eur: use provided value for DH payments; for EUR payments fall back to amount itself
        const eurEquiv = amount_eur && amount_eur > 0 ? amount_eur : (cur === 'EUR' ? amount : 0);
        const r = await sql`
          INSERT INTO booking_payments (booking_id, amount, amount_eur, currency, method, received_by, note)
          VALUES (${id}, ${amount}, ${eurEquiv}, ${cur}, ${method || 'cash'}, ${received_by || ''}, ${note || ''})
          RETURNING *
        `;
        return res.status(201).json(r[0]);
      }

      if (action === 'deletePayment') {
        if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });
        await sql`DELETE FROM booking_payments WHERE id = ${paymentId} AND booking_id = ${id}`;
        return res.status(200).json({ success: true });
      }

      if (action === 'addPayout') {
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
        const bookingRows = await sql`SELECT nanny_id FROM bookings WHERE id = ${id}` as { nanny_id: number | null }[];
        const nannyId = bookingRows[0]?.nanny_id ?? null;
        const r = await sql`
          INSERT INTO booking_payouts (booking_id, nanny_id, amount, currency, method, paid_by, note)
          VALUES (${id}, ${nannyId}, ${amount}, ${currency || 'DH'}, ${method || 'cash'}, ${paid_by || ''}, ${note || ''})
          RETURNING *
        `;
        return res.status(201).json(r[0]);
      }

      if (action === 'deletePayout') {
        if (!payoutId) return res.status(400).json({ error: 'Missing payoutId' });
        await sql`DELETE FROM booking_payouts WHERE id = ${payoutId} AND booking_id = ${id}`;
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid action' });
    }
    // ────────────────────────────────────────────────────────────────
    
    if (req.method === 'PUT') {
      const { nanny_id, status, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, clock_in, clock_out, resend_invoice, send_reminder, cancellation_reason, cancelled_by } = req.body as UpdateBookingBody;

      // ─── Conflict check when nanny/date/time changes ────────────
      if (nanny_id !== undefined || date || end_date !== undefined || start_time || end_time) {
        const currentRows = await sql`SELECT * FROM bookings WHERE id = ${id}` as DbBookingWithNanny[];
        if (currentRows.length > 0) {
          const cur = currentRows[0];
          const effNannyId = nanny_id !== undefined ? nanny_id : cur.nanny_id;
          const effDate = date || cur.date;
          const effEndDate = end_date !== undefined ? end_date : cur.end_date;
          const effStartTime = start_time || cur.start_time;
          const effEndTime = end_time || cur.end_time || '23h59';

          if (effNannyId) {
            const bookingDates = getDateRange(effDate, effEndDate || null);
            const conflicts = await sql`
              SELECT id, date, start_time, end_time, client_name FROM bookings
              WHERE nanny_id = ${effNannyId} AND id != ${id} AND status != 'cancelled' AND date = ANY(${bookingDates})
            ` as { id: number; date: string; start_time: string; end_time: string; client_name: string }[];

            const overlapping = conflicts.filter(
              c => timesOverlap(effStartTime, effEndTime, c.start_time, c.end_time || '23h59')
            );
            if (overlapping.length > 0) {
              return res.status(409).json({
                error: 'Scheduling conflict: this nanny already has a booking at this time.',
                conflicts: overlapping.map(c => ({
                  bookingId: c.id, date: c.date, startTime: c.start_time, endTime: c.end_time, clientName: c.client_name,
                })),
              });
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────────

      const result = await sql`
        UPDATE bookings SET
          nanny_id = COALESCE(${nanny_id !== undefined ? nanny_id : null}, nanny_id),
          status = COALESCE(${status}, status),
          client_name = COALESCE(${client_name}, client_name),
          client_email = COALESCE(${client_email}, client_email),
          client_phone = COALESCE(${client_phone}, client_phone),
          hotel = COALESCE(${hotel}, hotel),
          date = COALESCE(${date}, date),
          end_date = COALESCE(${end_date !== undefined ? end_date : null}, end_date),
          start_time = COALESCE(${start_time}, start_time),
          end_time = COALESCE(${end_time}, end_time),
          plan = COALESCE(${plan}, plan),
          children_count = COALESCE(${children_count}, children_count),
          children_ages = COALESCE(${children_ages}, children_ages),
          notes = COALESCE(${notes}, notes),
          total_price = COALESCE(${total_price}, total_price),
          clock_in = COALESCE(${clock_in ? clock_in : null}, clock_in),
          clock_out = COALESCE(${clock_out ? clock_out : null}, clock_out),
          cancelled_at = CASE WHEN ${status} = 'cancelled' AND cancelled_at IS NULL THEN NOW() ELSE cancelled_at END,
          cancellation_reason = CASE WHEN ${status} = 'cancelled' THEN COALESCE(${cancellation_reason || ''}, cancellation_reason) ELSE cancellation_reason END,
          cancelled_by = CASE WHEN ${status} = 'cancelled' THEN COALESCE(${cancelled_by || ''}, cancelled_by) ELSE cancelled_by END,
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      ` as DbBookingWithNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });

      // Create notification for nanny on status change
      if (status && result[0] && result[0].nanny_id) {
        try {
          const notifMessages = {
            confirmed: { title: 'Booking Confirmed', type: 'booking_confirmed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been confirmed.` },
            cancelled: { title: 'Booking Cancelled', type: 'booking_cancelled', message: `The booking with ${result[0].client_name} on ${result[0].date} has been cancelled.` },
            completed: { title: 'Booking Completed', type: 'booking_completed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been marked as completed.` },
          };
          const notif = notifMessages[status as keyof typeof notifMessages];
          if (notif) {
            await sql`
              INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
              VALUES (${result[0].nanny_id}, ${notif.type}, ${notif.title}, ${notif.message}, ${id})
            `;
          }
        } catch (notifError: unknown) {
          console.error('Failed to create notification:', notifError);
        }
      }

      // Send push notifications on status change (best-effort)
      if (status && result[0]) {
        try {
          const { sendPushToUser, sendPushToAllAdmins } = await import('../_pushUtils.js');

          if (result[0].nanny_id) {
            const pushMessages: Record<string, { title: string; body: string }> = {
              confirmed: { title: 'Booking Confirmed', body: `Booking with ${result[0].client_name} on ${result[0].date} confirmed` },
              cancelled: { title: 'Booking Cancelled', body: `Booking with ${result[0].client_name} on ${result[0].date} was cancelled` },
              completed: { title: 'Booking Completed', body: `Booking with ${result[0].client_name} marked as completed` },
            };
            const pushMsg = pushMessages[status];
            if (pushMsg) {
              await sendPushToUser('nanny', result[0].nanny_id, {
                ...pushMsg,
                url: `/nanny/bookings?booking=${id}`,
                tag: `booking-${status}-${id}`,
              });
            }
          }

          await sendPushToAllAdmins({
            title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            body: `Booking #${id} with ${result[0].client_name} is now ${status}`,
            url: `/admin/bookings?booking=${id}`,
            tag: `admin-booking-status-${id}`,
          });
        } catch (pushError: unknown) {
          console.error('Push notification (status) failed:', pushError);
        }
      }

      // ─── Nanny confirmed → send parent a confirmation email with nanny profile ───
      if (status === 'confirmed' && result[0] && result[0].nanny_id && result[0].client_email) {
        try {
          const nannyProfileRows = await sql`
            SELECT name, image, bio, experience, rating, languages, specialties
            FROM nannies WHERE id = ${result[0].nanny_id}
          ` as { name: string; image: string; bio: string; experience: string; rating: number; languages: string | string[]; specialties: string | string[] }[];

          if (nannyProfileRows[0]) {
            const np = nannyProfileRows[0];
            const parsedLangs = typeof np.languages === 'string' ? JSON.parse(np.languages || '[]') : np.languages;
            const parsedSpecs = typeof np.specialties === 'string' ? JSON.parse(np.specialties || '[]') : np.specialties;

            const { sendNannyConfirmedEmail } = await import('../_emailTemplates.js');
            await sendNannyConfirmedEmail({
              bookingId: result[0].id,
              clientName: result[0].client_name,
              clientEmail: result[0].client_email,
              hotel: result[0].hotel || '',
              date: result[0].date,
              endDate: result[0].end_date || null,
              startTime: result[0].start_time,
              endTime: result[0].end_time || '',
              childrenCount: result[0].children_count || 1,
              childrenAges: result[0].children_ages || '',
              totalPrice: result[0].total_price || 0,
              nannyName: np.name,
              nannyImage: np.image || '',
              nannyBio: np.bio || '',
              nannyExperience: np.experience || '',
              nannyRating: np.rating || 5,
              nannyLanguages: parsedLangs,
              nannySpecialties: parsedSpecs,
              locale: result[0].locale || 'en',
            });
          }
        } catch (confirmedEmailError: unknown) {
          console.error('Nanny confirmed email to parent failed:', confirmedEmailError);
        }

        // WhatsApp confirmation to parent (automatic — no button click needed)
        const WA_TOKEN_CF = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID_CF = process.env.WHATSAPP_PHONE_ID;

        if (WA_TOKEN_CF && WA_PHONE_ID_CF && result[0].client_phone) {
          try {
            let parentPhoneCF = result[0].client_phone.replace(/[\s\-\(\)]/g, '');
            if (parentPhoneCF.startsWith('0')) parentPhoneCF = '212' + parentPhoneCF.slice(1);
            if (!parentPhoneCF.startsWith('+') && !parentPhoneCF.match(/^\d{10,}/)) parentPhoneCF = '+' + parentPhoneCF;
            parentPhoneCF = parentPhoneCF.replace('+', '');

            // Fetch nanny name for the message
            let confirmedNannyName = 'your nanny';
            try {
              const nnRows = await sql`SELECT name FROM nannies WHERE id = ${result[0].nanny_id}` as { name: string }[];
              if (nnRows[0]) confirmedNannyName = nnRows[0].name;
            } catch { /* ignore */ }

            const bookingLocale = result[0].locale || 'en';
            const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
            const trackUrl = `${baseUrl}/booking/${result[0].id}`;

            const waConfirmMsg = bookingLocale === 'fr'
              ? [
                  '🎉 *Bonne Nouvelle — Nounou Confirmée !*',
                  '',
                  `Bonjour ${result[0].client_name},`,
                  `Votre nounou *${confirmedNannyName}* a accepté votre réservation !`,
                  '',
                  `📋 *Réservation #:* ${result[0].id}`,
                  `📅 *Date:* ${result[0].date}`,
                  `🕐 *Heure:* ${result[0].start_time} - ${result[0].end_time || ''}`,
                  `🏨 *Lieu:* ${result[0].hotel || 'N/A'}`,
                  `👶 *Enfants:* ${result[0].children_count || 1}`,
                  `💰 *Total:* ${result[0].total_price || 0}€`,
                  '',
                  `📍 Suivez votre réservation : ${trackUrl}`,
                  '',
                  '_Merci de votre confiance !_',
                  '💕 Call a Nanny — Marrakech',
                ].join('\n')
              : [
                  '🎉 *Great News — Nanny Confirmed!*',
                  '',
                  `Hi ${result[0].client_name},`,
                  `Your nanny *${confirmedNannyName}* has accepted your booking!`,
                  '',
                  `📋 *Booking #:* ${result[0].id}`,
                  `📅 *Date:* ${result[0].date}`,
                  `🕐 *Time:* ${result[0].start_time} - ${result[0].end_time || ''}`,
                  `🏨 *Location:* ${result[0].hotel || 'N/A'}`,
                  `👶 *Children:* ${result[0].children_count || 1}`,
                  `💰 *Total:* ${result[0].total_price || 0}€`,
                  '',
                  `📍 Track your booking: ${trackUrl}`,
                  '',
                  '_Thank you for choosing us!_',
                  '💕 Call a Nanny — Marrakech',
                ].join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID_CF}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN_CF}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: parentPhoneCF, type: 'text', text: { body: waConfirmMsg } }),
            });
          } catch (waConfirmErr: unknown) {
            console.error('WhatsApp confirmation to parent failed:', waConfirmErr);
          }
        }

        // WhatsApp confirmation to business
        const WA_BIZ_CF = process.env.WHATSAPP_BUSINESS_NUMBER;
        if (WA_TOKEN_CF && WA_PHONE_ID_CF && WA_BIZ_CF) {
          try {
            let bizNannyName = 'Unknown';
            try {
              const nnRows2 = await sql`SELECT name FROM nannies WHERE id = ${result[0].nanny_id}` as { name: string }[];
              if (nnRows2[0]) bizNannyName = nnRows2[0].name;
            } catch { /* ignore */ }

            const waBizConfirm = [
              '✅ *Nanny Confirmed Booking*',
              '',
              `📋 *Booking #:* ${result[0].id}`,
              `👤 *Parent:* ${result[0].client_name}`,
              `👩‍👧 *Nanny:* ${bizNannyName}`,
              `📅 *Date:* ${result[0].date}`,
              `🕐 *Time:* ${result[0].start_time} - ${result[0].end_time || ''}`,
              `🏨 *Hotel:* ${result[0].hotel || 'N/A'}`,
              `💰 *Amount:* ${result[0].total_price || 0}€`,
              '',
              '_Confirmation email + WhatsApp sent to parent._',
            ].join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID_CF}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN_CF}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: WA_BIZ_CF, type: 'text', text: { body: waBizConfirm } }),
            });
          } catch (waBizConfirmErr: unknown) {
            console.error('WhatsApp confirmation to business failed:', waBizConfirmErr);
          }
        }
      }

      // ─── Cancellation → email to parent + nanny + WhatsApp to business + parent ───
      if (status === 'cancelled' && result[0]) {
        const booking = result[0];
        const bookingDateTime = new Date(`${booking.date}T${(booking.start_time || '09:00').replace('h', ':')}:00`);
        const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / 3600000;
        const hasCancellationFee = hoursUntilBooking < 24;

        // 1. Send cancellation email to parent
        if (booking.client_email) {
          try {
            const { sendCancellationEmail } = await import('../_emailTemplates.js');
            await sendCancellationEmail({
              bookingId: booking.id,
              clientName: booking.client_name,
              clientEmail: booking.client_email,
              hotel: booking.hotel || '',
              date: booking.date,
              startTime: booking.start_time,
              endTime: booking.end_time || '',
              childrenCount: booking.children_count || 1,
              totalPrice: booking.total_price || 0,
              cancellationReason: cancellation_reason || '',
              cancelledBy: cancelled_by || 'admin',
              hasCancellationFee,
              locale: booking.locale || 'en',
            });
          } catch (cancelEmailErr: unknown) {
            console.error('Cancellation email to parent failed:', cancelEmailErr);
          }
        }

        // 2. Send cancellation email to nanny (inline)
        if (booking.nanny_id) {
          try {
            const nannyRowsCancel = await sql`SELECT name, email FROM nannies WHERE id = ${booking.nanny_id}` as { name: string; email: string | null }[];
            if (nannyRowsCancel[0]?.email) {
              const resendModule = await import('resend');
              const ResendClass = resendModule.Resend;
              const apiKey = process.env.RESEND_API_KEY;
              if (apiKey) {
                const resendClient = new ResendClass(apiKey);
                const fromAddr = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';
                await resendClient.emails.send({
                  from: fromAddr,
                  to: nannyRowsCancel[0].email,
                  subject: `Booking Cancelled #${booking.id}`,
                  html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:20px;">
                    <h2 style="color:#ef4444;">Booking Cancelled</h2>
                    <p>Hi ${nannyRowsCancel[0].name},</p>
                    <p>The booking with <strong>${booking.client_name}</strong> on <strong>${booking.date}</strong> (${booking.start_time} - ${booking.end_time || ''}) has been cancelled.</p>
                    ${cancellation_reason ? `<p><strong>Reason:</strong> ${cancellation_reason}</p>` : ''}
                    <p style="color:#666;font-size:13px;">No action required on your end. Your schedule has been updated automatically.</p>
                    <p style="color:#999;font-size:12px;">— Call a Nanny Team</p>
                  </div>`,
                });
              }
            }
          } catch (nannyCancelErr: unknown) {
            console.error('Cancellation email to nanny failed:', nannyCancelErr);
          }
        }

        // 3. WhatsApp cancellation to business
        const WA_TOKEN_C = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID_C = process.env.WHATSAPP_PHONE_ID;
        const WA_BIZ_C = process.env.WHATSAPP_BUSINESS_NUMBER;

        if (WA_TOKEN_C && WA_PHONE_ID_C && WA_BIZ_C) {
          try {
            const waCancelBiz = [
              '❌ *Booking Cancelled*',
              '',
              `📋 *Booking #:* ${booking.id}`,
              `👤 *Parent:* ${booking.client_name}`,
              `📅 *Date:* ${booking.date}`,
              `🕐 *Time:* ${booking.start_time} - ${booking.end_time || ''}`,
              `💰 *Amount:* ${booking.total_price || 0}€`,
              cancellation_reason ? `📝 *Reason:* ${cancellation_reason}` : '',
              `👤 *Cancelled by:* ${cancelled_by || 'admin'}`,
              hasCancellationFee ? '⚠️ *24h fee applies*' : '✅ *No fee (>24h)*',
            ].filter(Boolean).join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID_C}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN_C}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: WA_BIZ_C, type: 'text', text: { body: waCancelBiz } }),
            });
          } catch (waCancelBizErr: unknown) {
            console.error('WhatsApp cancel to business failed:', waCancelBizErr);
          }
        }

        // 4. WhatsApp cancellation to parent
        if (WA_TOKEN_C && WA_PHONE_ID_C && booking.client_phone) {
          try {
            let parentPhoneC = booking.client_phone.replace(/[\s\-\(\)]/g, '');
            if (parentPhoneC.startsWith('0')) parentPhoneC = '212' + parentPhoneC.slice(1);
            if (!parentPhoneC.startsWith('+') && !parentPhoneC.match(/^\d{10,}/)) parentPhoneC = '+' + parentPhoneC;
            parentPhoneC = parentPhoneC.replace('+', '');

            const locale = booking.locale || 'en';
            const waCancelParent = locale === 'fr'
              ? [
                  '❌ *Réservation Annulée*',
                  '',
                  `Bonjour ${booking.client_name},`,
                  `Votre réservation #${booking.id} du ${booking.date} a été annulée.`,
                  cancellation_reason ? `📝 *Raison:* ${cancellation_reason}` : '',
                  hasCancellationFee ? '⚠️ Des frais d\'annulation peuvent s\'appliquer (annulation <24h).' : '✅ Aucun frais d\'annulation.',
                  '',
                  '💕 Vous pouvez réserver à nouveau sur callanannycare.com',
                ].filter(Boolean).join('\n')
              : [
                  '❌ *Booking Cancelled*',
                  '',
                  `Hi ${booking.client_name},`,
                  `Your booking #${booking.id} on ${booking.date} has been cancelled.`,
                  cancellation_reason ? `📝 *Reason:* ${cancellation_reason}` : '',
                  hasCancellationFee ? '⚠️ A cancellation fee may apply (cancelled <24h before service).' : '✅ No cancellation fee applies.',
                  '',
                  '💕 You can rebook anytime at callanannycare.com',
                ].filter(Boolean).join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID_C}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN_C}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: parentPhoneC, type: 'text', text: { body: waCancelParent } }),
            });
          } catch (waCancelParentErr: unknown) {
            console.error('WhatsApp cancel to parent failed:', waCancelParentErr);
          }
        }
      }

      // Send assignment email when nanny_id is changed (nanny reassigned/assigned)
      if (nanny_id !== undefined && nanny_id && result[0]) {
        try {
          const nannyRows = await sql`SELECT name, email FROM nannies WHERE id = ${nanny_id}` as { name: string; email: string | null }[];
          if (nannyRows[0]?.email) {
            const { sendNannyAssignmentEmail } = await import('../_emailTemplates.js');
            await sendNannyAssignmentEmail({
              nannyName: nannyRows[0].name,
              nannyEmail: nannyRows[0].email,
              bookingId: result[0].id,
              clientName: result[0].client_name,
              date: result[0].date,
              endDate: result[0].end_date || null,
              startTime: result[0].start_time,
              endTime: result[0].end_time || '',
              hotel: result[0].hotel || '',
              childrenCount: result[0].children_count || 1,
              totalPrice: result[0].total_price || 0,
            });
          }
        } catch (nannyEmailError: unknown) {
          console.error('Nanny assignment email failed:', nannyEmailError);
        }

        // Push notification to newly assigned nanny
        try {
          const { sendPushToUser } = await import('../_pushUtils.js');
          await sendPushToUser('nanny', nanny_id, {
            title: 'New Booking Assigned',
            body: `You've been assigned a booking with ${result[0].client_name} on ${result[0].date}`,
            url: `/nanny/bookings?booking=${result[0].id}`,
            tag: `booking-assigned-${result[0].id}`,
          });
        } catch (pushErr: unknown) {
          console.error('Push (reassign) failed:', pushErr);
        }
      }

      // Send invoice when booking is completed with clock_out (nanny checkout)
      if (status === 'completed' && clock_out && result[0]) {
        // Query nanny name for the invoice
        let invoiceNannyName = 'Your Nanny';
        try {
          const nannyRows = await sql`
            SELECT name FROM nannies WHERE id = ${result[0].nanny_id}
          ` as { name: string }[];
          invoiceNannyName = nannyRows[0]?.name || 'Your Nanny';
        } catch { /* ignore */ }

        const clockInTime = result[0].clock_in || clock_out;
        const clockOutTime = clock_out;

        // Calculate hours worked
        let hoursWorked = '0';
        try {
          const diff = new Date(clockOutTime).getTime() - new Date(clockInTime).getTime();
          hoursWorked = Math.max(0, diff / 3600000).toFixed(1);
        } catch { /* ignore */ }

        // 1. Send invoice email (if parent has email)
        if (result[0].client_email) {
          try {
            const { sendInvoiceEmail } = await import('../_emailTemplates.js');
            await sendInvoiceEmail({
              bookingId: result[0].id,
              clientName: result[0].client_name,
              clientEmail: result[0].client_email,
              clientPhone: result[0].client_phone,
              hotel: result[0].hotel,
              date: result[0].date,
              startTime: result[0].start_time,
              endTime: result[0].end_time,
              clockIn: clockInTime,
              clockOut: clockOutTime,
              childrenCount: result[0].children_count,
              childrenAges: result[0].children_ages,
              totalPrice: result[0].total_price,
              nannyName: invoiceNannyName,
              locale: result[0].locale || 'en',
            });
          } catch (invoiceError: unknown) {
            console.error('Invoice email failed:', invoiceError);
          }
        }

        // 2. Send invoice via WhatsApp to parent (if phone is available)
        const parentPhone = result[0].client_phone;
        const WA_TOKEN = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

        if (WA_TOKEN && WA_PHONE_ID && parentPhone) {
          try {
            // Format phone: ensure it starts with country code, strip spaces/dashes
            let formattedPhone = parentPhone.replace(/[\s\-\(\)]/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '212' + formattedPhone.slice(1);
            if (!formattedPhone.startsWith('+') && !formattedPhone.match(/^\d{10,}/)) formattedPhone = '+' + formattedPhone;
            formattedPhone = formattedPhone.replace('+', '');

            const clockInFmt = new Date(clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const clockOutFmt = new Date(clockOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const waInvoice = [
              '📄 *INVOICE — Call a Nanny*',
              '',
              `📋 *Invoice #:* INV-${result[0].id}`,
              `👤 *Billed To:* ${result[0].client_name}`,
              `👩‍👧 *Caregiver:* ${invoiceNannyName}`,
              `📅 *Date:* ${result[0].date}`,
              `🕐 *Time:* ${clockInFmt} – ${clockOutFmt}`,
              `⏱ *Hours:* ${hoursWorked}h`,
              `👶 *Children:* ${result[0].children_count || 1}`,
              '',
              `💰 *Total: ${result[0].total_price || 0}€*`,
              '',
              '_Thank you for choosing Call a Nanny!_',
              '_Payment is due upon completion of service._',
              '',
              '📧 info@callanannycare.com',
              '🌐 callanannycare.com',
            ].join('\n');

            await fetch(
              `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WA_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: formattedPhone,
                  type: 'text',
                  text: { body: waInvoice },
                }),
              }
            );
          } catch (waError: unknown) {
            console.error('WhatsApp invoice to parent failed:', waError);
          }
        }

        // 3. Send invoice notification to business WhatsApp
        const WA_BIZ_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;
        if (WA_TOKEN && WA_PHONE_ID && WA_BIZ_NUMBER) {
          try {
            const waBizMsg = [
              '✅ *Shift Completed — Invoice Sent*',
              '',
              `📋 *Invoice #:* INV-${result[0].id}`,
              `👤 *Parent:* ${result[0].client_name}`,
              `👩‍👧 *Nanny:* ${invoiceNannyName}`,
              `📅 *Date:* ${result[0].date}`,
              `⏱ *Hours:* ${hoursWorked}h`,
              `💰 *Amount:* ${result[0].total_price || 0}€`,
              '',
              `_Invoice sent to parent${result[0].client_email ? ' via email & WhatsApp' : parentPhone ? ' via WhatsApp' : ''}_`,
            ].join('\n');

            await fetch(
              `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WA_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: WA_BIZ_NUMBER,
                  type: 'text',
                  text: { body: waBizMsg },
                }),
              }
            );
          } catch (waBizError: unknown) {
            console.error('WhatsApp business notification failed:', waBizError);
          }
        }

        // 4. Auto-send review link to parent (delayed conceptually — sent right after invoice)
        try {
          const crypto = await import('crypto');
          const reviewToken = crypto.randomBytes(32).toString('hex');
          await sql`UPDATE bookings SET review_token = ${reviewToken}, review_sent_at = NOW() WHERE id = ${id}`;

          const reviewBaseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
          const reviewUrl = `${reviewBaseUrl}/review/${result[0].id}?token=${reviewToken}`;
          const reviewLocale = result[0].locale || 'en';

          // Email
          if (result[0].client_email) {
            try {
              const { sendReviewRequestEmail } = await import('../_emailTemplates.js');
              await sendReviewRequestEmail({
                bookingId: result[0].id,
                clientName: result[0].client_name,
                clientEmail: result[0].client_email,
                date: result[0].date,
                nannyName: invoiceNannyName,
                reviewUrl,
                locale: reviewLocale,
              });
            } catch (reviewEmailErr: unknown) {
              console.error('Review request email failed:', reviewEmailErr);
            }
          }

          // WhatsApp
          if (WA_TOKEN && WA_PHONE_ID && parentPhone) {
            try {
              let reviewPhone = parentPhone.replace(/[\s\-\(\)]/g, '');
              if (reviewPhone.startsWith('0')) reviewPhone = '212' + reviewPhone.slice(1);
              if (!reviewPhone.startsWith('+') && !reviewPhone.match(/^\d{10,}/)) reviewPhone = '+' + reviewPhone;
              reviewPhone = reviewPhone.replace('+', '');

              const waReviewMsg = reviewLocale === 'fr'
                ? [
                    '⭐ *Votre avis compte !*',
                    '',
                    `Bonjour ${result[0].client_name},`,
                    `Nous espérons que vous avez apprécié le service de *${invoiceNannyName}*.`,
                    '',
                    `Pourriez-vous prendre un instant pour laisser un avis ?`,
                    `📝 ${reviewUrl}`,
                    '',
                    '_Merci beaucoup !_',
                    '💕 Call a Nanny',
                  ].join('\n')
                : [
                    '⭐ *Your Feedback Matters!*',
                    '',
                    `Hi ${result[0].client_name},`,
                    `We hope you enjoyed the service from *${invoiceNannyName}*.`,
                    '',
                    `Could you take a moment to leave a review?`,
                    `📝 ${reviewUrl}`,
                    '',
                    '_Thank you!_',
                    '💕 Call a Nanny',
                  ].join('\n');

              await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: reviewPhone, type: 'text', text: { body: waReviewMsg } }),
              });
            } catch (waReviewErr: unknown) {
              console.error('WhatsApp review request failed:', waReviewErr);
            }
          }
        } catch (reviewErr: unknown) {
          console.error('Auto-send review link failed:', reviewErr);
        }
      }

      // Resend invoice email on admin request
      if (resend_invoice && result[0] && result[0].client_email && result[0].status === 'completed' && result[0].clock_out) {
        try {
          const nannyRows2 = await sql`
            SELECT name FROM nannies WHERE id = ${result[0].nanny_id}
          ` as { name: string }[];
          const nannyName2 = nannyRows2[0]?.name || 'Your Nanny';

          const { sendInvoiceEmail: resendInvoiceFn } = await import('../_emailTemplates.js');
          await resendInvoiceFn({
            bookingId: result[0].id,
            clientName: result[0].client_name,
            clientEmail: result[0].client_email,
            clientPhone: result[0].client_phone,
            hotel: result[0].hotel,
            date: result[0].date,
            startTime: result[0].start_time,
            endTime: result[0].end_time,
            clockIn: result[0].clock_in || result[0].clock_out,
            clockOut: result[0].clock_out,
            childrenCount: result[0].children_count,
            childrenAges: result[0].children_ages,
            totalPrice: result[0].total_price,
            nannyName: nannyName2,
            locale: result[0].locale || 'en',
          });
        } catch (resendError: unknown) {
          console.error('Resend invoice email failed:', resendError);
        }
      }

      // Send reminder email to nanny for pending bookings
      if (send_reminder && result[0] && result[0].nanny_id && result[0].status === 'pending') {
        try {
          const nannyRowsR = await sql`SELECT name, email FROM nannies WHERE id = ${result[0].nanny_id}` as { name: string; email: string | null }[];
          if (nannyRowsR[0]?.email) {
            const { sendNannyReminderEmail } = await import('../_emailTemplates.js');
            await sendNannyReminderEmail({
              nannyName: nannyRowsR[0].name,
              nannyEmail: nannyRowsR[0].email,
              bookingId: result[0].id,
              clientName: result[0].client_name,
              date: result[0].date,
              endDate: result[0].end_date || null,
              startTime: result[0].start_time,
              endTime: result[0].end_time || '',
              hotel: result[0].hotel || '',
              childrenCount: result[0].children_count || 1,
              totalPrice: result[0].total_price || 0,
            });
          }
        } catch (reminderError: unknown) {
          console.error('Reminder email failed:', reminderError);
        }
        return res.status(200).json({ ...result[0], reminded: true });
      }

      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Booking API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
