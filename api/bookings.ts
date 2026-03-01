import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, timesOverlap, getDateRange } from './_db.js';
import type { DbBooking, DbBookingWithNanny, BookingPlan, BookingCreator } from '@/types';

interface CreateBookingBody {
  nanny_id?: number | null;
  client_name: string;
  client_email: string;
  client_phone?: string;
  hotel?: string;
  date: string;
  end_date?: string | null;
  start_time: string;
  end_time?: string;
  plan?: BookingPlan;
  children_count?: number;
  children_ages?: string;
  notes?: string;
  total_price?: number;
  locale?: string;
  status?: string;
  clock_in?: string | null;
  clock_out?: string | null;
  created_by?: BookingCreator;
  created_by_name?: string;
}

interface AvailableNannyRow {
  id: number;
  name: string;
  booking_count: string;
}

interface ExistingBookingRow {
  id: number;
  nanny_id: number;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  hotel: string;
}

interface BlockedNannyRow { nanny_id: number }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Ensure migration columns exist (no-op once columns are present)
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(255) DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'en'`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_by VARCHAR(255) DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS collection_note TEXT DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT ''`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_migrated_to_eur BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_token VARCHAR(64)`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT ''`;

    if (req.method === 'GET') {
      // ─── Cron: Send automated reminders for tomorrow's bookings ──
      if (req.query.cron === 'send-reminders') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

        // Find bookings scheduled for tomorrow that haven't been reminded
        const upcoming = await sql`
          SELECT b.*, n.name as nanny_name, n.email as nanny_email
          FROM bookings b
          LEFT JOIN nannies n ON b.nanny_id = n.id
          WHERE b.date = ${tomorrowStr}
            AND b.status IN ('pending', 'confirmed')
            AND (b.reminder_sent = false OR b.reminder_sent IS NULL)
        ` as (DbBookingWithNanny & { nanny_email: string | null })[];

        let nannyReminders = 0;
        let parentReminders = 0;
        let whatsappReminders = 0;

        for (const b of upcoming) {
          // 1. Send nanny reminder email
          if (b.nanny_id && b.nanny_email) {
            try {
              const { sendNannyReminderEmail } = await import('./_emailTemplates.js');
              await sendNannyReminderEmail({
                nannyName: b.nanny_name || 'Nanny',
                nannyEmail: b.nanny_email,
                bookingId: b.id,
                clientName: b.client_name,
                date: b.date,
                endDate: b.end_date || null,
                startTime: b.start_time,
                endTime: b.end_time || '',
                hotel: b.hotel || '',
                childrenCount: b.children_count || 1,
                totalPrice: b.total_price || 0,
              });
              nannyReminders++;
            } catch (e) { console.error('Nanny reminder failed:', e); }
          }

          // 2. Send parent reminder email
          if (b.client_email) {
            try {
              const { sendParentReminderEmail } = await import('./_emailTemplates.js');
              await sendParentReminderEmail({
                bookingId: b.id,
                clientName: b.client_name,
                clientEmail: b.client_email,
                date: b.date,
                startTime: b.start_time,
                endTime: b.end_time || '',
                hotel: b.hotel || '',
                childrenCount: b.children_count || 1,
                nannyName: b.nanny_name || 'Your Nanny',
                locale: b.locale || 'en',
              });
              parentReminders++;
            } catch (e) { console.error('Parent reminder failed:', e); }
          }

          // 3. Send WhatsApp reminder to parent (if phone available)
          const WA_TOKEN = process.env.WHATSAPP_TOKEN;
          const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
          if (WA_TOKEN && WA_PHONE_ID && b.client_phone) {
            try {
              let phone = b.client_phone.replace(/[\s\-\(\)]/g, '');
              if (phone.startsWith('0')) phone = '212' + phone.slice(1);
              if (!phone.startsWith('+') && !phone.match(/^\d{10,}/)) phone = '+' + phone;
              phone = phone.replace('+', '');

              const reminderSiteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
              const waMsg = [
                '📅 *Booking Reminder — Tomorrow!*',
                '',
                `👤 *Client:* ${b.client_name}`,
                `👩‍👧 *Nanny:* ${b.nanny_name || 'TBD'}`,
                `📅 *Date:* ${b.date}`,
                `🕐 *Time:* ${b.start_time}${b.end_time ? ` - ${b.end_time}` : ''}`,
                `🏨 *Location:* ${b.hotel || 'N/A'}`,
                `👶 *Children:* ${b.children_count || 1}`,
                '',
                `📍 *Track:* ${reminderSiteUrl}/booking/${b.id}`,
                '',
                '_Your booking is scheduled for tomorrow. See you then!_',
                '_Call a Nanny — callanannycare.com_',
              ].join('\n');

              await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: waMsg } }),
              });
              whatsappReminders++;
            } catch (e) { console.error('WhatsApp reminder failed:', e); }
          }

          // 4. Mark as reminded
          await sql`UPDATE bookings SET reminder_sent = true WHERE id = ${b.id}`;
        }

        return res.status(200).json({
          success: true,
          date: tomorrowStr,
          totalBookings: upcoming.length,
          nannyReminders,
          parentReminders,
          whatsappReminders,
        });
      }
      // ────────────────────────────────────────────────────────────

      // ?deleted=true → return soft-deleted bookings for audit view
      if (req.query.deleted === 'true') {
        const deleted = await sql`
          SELECT b.*, n.name as nanny_name, n.image as nanny_image
          FROM bookings b
          LEFT JOIN nannies n ON b.nanny_id = n.id
          WHERE b.deleted_at IS NOT NULL
          ORDER BY b.deleted_at DESC
        ` as DbBookingWithNanny[];
        return res.status(200).json(deleted);
      }

      const bookings = await sql`
        SELECT b.*, n.name as nanny_name, n.image as nanny_image
        FROM bookings b
        LEFT JOIN nannies n ON b.nanny_id = n.id
        WHERE b.deleted_at IS NULL
        ORDER BY b.created_at DESC
      ` as DbBookingWithNanny[];
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { nanny_id: provided_nanny_id, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, locale, status: reqStatus, clock_in, clock_out, created_by, created_by_name } = req.body as CreateBookingBody;

      // ─── Minimum 3-hour duration check ──────────────────────────
      if (start_time && end_time && !clock_in) {
        const parseT = (t: string) => {
          const [h, m] = t.replace('h', ':').split(':').map(Number);
          return h + (m || 0) / 60;
        };
        const s = parseT(start_time);
        const e = parseT(end_time);
        const dur = e <= s ? (24 - s) + e : e - s;
        if (dur < 3) {
          return res.status(400).json({ error: 'Minimum booking duration is 3 hours.' });
        }
      }

      // ─── Conflict-aware nanny assignment ────────────────────────
      const bookingDates = getDateRange(date, end_date || null);
      const effectiveEndTime = end_time || '23h59';

      let nanny_id = provided_nanny_id;
      if (!nanny_id) {
        // Auto-assign: find conflict-free nanny with fewest bookings
        const available = await sql`
          SELECT n.id, n.name, COUNT(b.id) as booking_count
          FROM nannies n
          LEFT JOIN bookings b ON b.nanny_id = n.id AND b.status != 'cancelled'
          WHERE n.available = true AND n.status = 'active'
          GROUP BY n.id, n.name
          ORDER BY booking_count ASC, n.id ASC
        ` as AvailableNannyRow[];
        if (available.length === 0) {
          return res.status(400).json({ error: 'No nannies are currently available. Please try again later.' });
        }

        // Check blocked dates
        const blockedRows = await sql`
          SELECT DISTINCT nanny_id FROM nanny_blocked_dates WHERE date = ANY(${bookingDates})
        ` as BlockedNannyRow[];
        const blockedIds = new Set(blockedRows.map(b => b.nanny_id));

        // Check existing bookings for overlap + same-hotel priority
        const existing = await sql`
          SELECT id, nanny_id, date, start_time, end_time, client_name, hotel FROM bookings
          WHERE status != 'cancelled' AND date = ANY(${bookingDates})
        ` as ExistingBookingRow[];

        // Build list of conflict-free candidates
        const eligibleCandidates: { id: number; sameHotel: boolean }[] = [];
        for (const candidate of available) {
          if (blockedIds.has(candidate.id)) continue;
          const hasConflict = existing.some(
            eb => eb.nanny_id === candidate.id &&
              timesOverlap(start_time, effectiveEndTime, eb.start_time, eb.end_time || '23h59')
          );
          if (!hasConflict) {
            // Check if this nanny already has a same-day booking at the same hotel
            const sameHotel = !!(hotel && existing.some(
              eb => eb.nanny_id === candidate.id &&
                eb.hotel && eb.hotel.toLowerCase().trim() === hotel.toLowerCase().trim()
            ));
            eligibleCandidates.push({ id: candidate.id, sameHotel });
          }
        }

        if (eligibleCandidates.length === 0) {
          return res.status(400).json({ error: 'No nannies are currently available for this time slot. Please try a different time.' });
        }

        // Prefer nanny already at the same hotel (saves transportation)
        const sameHotelMatch = eligibleCandidates.find(c => c.sameHotel);
        nanny_id = sameHotelMatch ? sameHotelMatch.id : eligibleCandidates[0].id;
      } else {
        // Manual assign: check for conflicts with the chosen nanny
        const conflicts = await sql`
          SELECT id, date, start_time, end_time, client_name FROM bookings
          WHERE nanny_id = ${nanny_id} AND status != 'cancelled' AND date = ANY(${bookingDates})
        ` as ExistingBookingRow[];

        const overlapping = conflicts.filter(
          c => timesOverlap(start_time, effectiveEndTime, c.start_time, c.end_time || '23h59')
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
      // ────────────────────────────────────────────────────────────

      const result = await sql`
        INSERT INTO bookings (nanny_id, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, status, locale, clock_in, clock_out, price_migrated_to_eur, created_by, created_by_name)
        VALUES (${nanny_id}, ${client_name}, ${client_email}, ${client_phone || ''}, ${hotel || ''}, ${date}, ${end_date || null}, ${start_time}, ${end_time || ''}, ${plan || 'hourly'}, ${children_count || 1}, ${children_ages || ''}, ${notes || ''}, ${total_price || 0}, ${reqStatus || 'pending'}, ${locale || 'en'}, ${clock_in || null}, ${clock_out || null}, true, ${created_by || 'parent'}, ${created_by_name || ''})
        RETURNING *
      ` as DbBooking[];
      // Create notification for nanny
      if (result[0] && nanny_id) {
        try {
          await sql`
            INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
            VALUES (${nanny_id}, 'new_booking', 'New Booking Request',
            ${`You have a new booking request from ${client_name} on ${date}.`}, ${result[0].id})
          `;
        } catch (notifError: unknown) {
          console.error('Failed to create notification:', notifError);
        }

        // Send assignment email to nanny
        try {
          const nannyRows = await sql`SELECT name, email FROM nannies WHERE id = ${nanny_id}` as { name: string; email: string | null }[];
          if (nannyRows[0]?.email) {
            const { sendNannyAssignmentEmail } = await import('./_emailTemplates.js');
            await sendNannyAssignmentEmail({
              nannyName: nannyRows[0].name,
              nannyEmail: nannyRows[0].email,
              bookingId: result[0].id,
              clientName: client_name,
              date,
              endDate: end_date || null,
              startTime: start_time,
              endTime: end_time || '',
              hotel: hotel || '',
              childrenCount: children_count || 1,
              totalPrice: total_price || 0,
            });
          }
        } catch (nannyEmailError: unknown) {
          console.error('Nanny assignment email failed:', nannyEmailError);
        }
      }

      // Send push notifications (best-effort, non-blocking)
      try {
        const { sendPushToUser, sendPushToAllAdmins } = await import('./_pushUtils.js');
        let pushNannyName = '';
        if (nanny_id) {
          try {
            const nr = await sql`SELECT name FROM nannies WHERE id = ${nanny_id}` as { name: string }[];
            pushNannyName = nr[0]?.name || '';
          } catch { /* ignore */ }
          await sendPushToUser('nanny', nanny_id, {
            title: 'New Booking Request',
            body: `New booking from ${client_name} on ${date}`,
            url: `/nanny/bookings?booking=${result[0].id}`,
            tag: `booking-new-${result[0].id}`,
          });
        }
        await sendPushToAllAdmins({
          title: 'New Booking',
          body: pushNannyName ? `${client_name} booked for ${date} — ${pushNannyName}` : `${client_name} booked for ${date}`,
          url: `/admin/bookings?booking=${result[0].id}`,
          tag: `admin-booking-new-${result[0].id}`,
        });
      } catch (pushError: unknown) {
        console.error('Push notification failed:', pushError);
      }

      // Send WhatsApp Business notification (best-effort, non-blocking)
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
      const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;

      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && WHATSAPP_BUSINESS_NUMBER) {
        try {
          const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
          const waMessage = [
            "🔔 *New Booking Received!*",
            "",
            `👤 *Client:* ${client_name}`,
            `📱 *Phone:* ${client_phone || "N/A"}`,
            `🏨 *Hotel:* ${hotel || "N/A"}`,
            `📅 *Date:* ${date}`,
            `🕐 *Time:* ${start_time}${end_time ? ` - ${end_time}` : ""}`,
            `👶 *Children:* ${children_count || 1}`,
            `💰 *Total:* ${total_price || 0}€`,
            "",
            `📍 *Track:* ${siteUrl}/booking/${result[0].id}`,
            "",
            "_Sent automatically by Call a Nanny_",
          ].join("\n");

          await fetch(
            `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: WHATSAPP_BUSINESS_NUMBER,
                type: "text",
                text: { body: waMessage },
              }),
            }
          );
        } catch (waError: unknown) {
          console.error("WhatsApp notification failed:", waError);
        }
      }

      // Send WhatsApp booking confirmation to parent (automatic)
      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && client_phone) {
        try {
          let parentPhone = client_phone.replace(/[\s\-\(\)]/g, '');
          if (parentPhone.startsWith('0')) parentPhone = '212' + parentPhone.slice(1);
          if (!parentPhone.startsWith('+') && !parentPhone.match(/^\d{10,}/)) parentPhone = '+' + parentPhone;
          parentPhone = parentPhone.replace('+', '');

          const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
          const trackUrl = `${siteUrl}/booking/${result[0].id}`;
          const bookingLocale = locale || 'en';

          const waParentMsg = bookingLocale === 'fr'
            ? [
                '✅ *Réservation Confirmée — Call a Nanny*',
                '',
                `Bonjour ${client_name},`,
                'Merci pour votre réservation ! Voici les détails :',
                '',
                `📋 *Réservation #:* ${result[0].id}`,
                `📅 *Date:* ${date}${end_date ? ` — ${end_date}` : ''}`,
                `🕐 *Heure:* ${start_time}${end_time ? ` - ${end_time}` : ''}`,
                `🏨 *Lieu:* ${hotel || 'N/A'}`,
                `👶 *Enfants:* ${children_count || 1}`,
                `💰 *Total:* ${total_price || 0}€`,
                '',
                '📌 *Prochaine étape :* Une nounou qualifiée vous sera assignée sous peu.',
                '',
                `📍 *Suivre votre réservation :* ${trackUrl}`,
                '',
                '_Merci de votre confiance !_',
                '💕 Call a Nanny — Marrakech',
              ].join('\n')
            : [
                '✅ *Booking Confirmed — Call a Nanny*',
                '',
                `Hi ${client_name},`,
                'Thank you for your booking! Here are the details:',
                '',
                `📋 *Booking #:* ${result[0].id}`,
                `📅 *Date:* ${date}${end_date ? ` — ${end_date}` : ''}`,
                `🕐 *Time:* ${start_time}${end_time ? ` - ${end_time}` : ''}`,
                `🏨 *Location:* ${hotel || 'N/A'}`,
                `👶 *Children:* ${children_count || 1}`,
                `💰 *Total:* ${total_price || 0}€`,
                '',
                '📌 *Next step:* A qualified nanny will be assigned to your booking shortly.',
                '',
                `📍 *Track your booking:* ${trackUrl}`,
                '',
                '_Thank you for choosing us!_',
                '💕 Call a Nanny — Marrakech',
              ].join('\n');

          await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: parentPhone, type: 'text', text: { body: waParentMsg } }),
          });
        } catch (waParentError: unknown) {
          console.error('WhatsApp confirmation to parent failed:', waParentError);
        }
      }

      // Send email to parent (best-effort)
      if (result[0] && client_email) {
        try {
          // Send confirmation email
          const { sendConfirmationEmail } = await import('./_emailTemplates.js');
          await sendConfirmationEmail({
            bookingId: result[0].id,
            clientName: client_name,
            clientEmail: client_email,
            clientPhone: client_phone || '',
            hotel: hotel || '',
            date,
            startTime: start_time,
            endTime: end_time || '',
            childrenCount: children_count || 1,
            childrenAges: children_ages || '',
            totalPrice: total_price || 0,
            notes: notes || '',
            locale: locale || 'en',
          });
        } catch (emailError: unknown) {
          console.error('Email sending failed:', emailError);
        }
      }

      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bookings API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
