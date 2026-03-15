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
  extra_dates?: string | null; // JSON array of additional non-contiguous dates
  extra_times?: string | null; // JSON array of extra time blocks [{"start_time":"18h00","end_time":"21h00"}]
  skip_min_hours?: boolean;
  skip_conflict_check?: boolean;
  skip_parent_notifications?: boolean; // Skip parent email/WhatsApp (for multi-day batching)
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
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_dates TEXT DEFAULT NULL`;
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS extra_times TEXT`;

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
        let nannyPushReminders = 0;

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

          // 1b. Create in-app notification + push for nanny
          if (b.nanny_id) {
            const timeSlot = `${b.start_time}${b.end_time ? ' - ' + b.end_time : ''}`;
            const reminderMsg = `Reminder: You have a booking tomorrow with ${b.client_name} at ${b.hotel || 'N/A'} (${timeSlot}).`;
            try {
              await sql`
                INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
                VALUES (${b.nanny_id}, 'new_booking', 'Shift Tomorrow', ${reminderMsg}, ${b.id})
              `;
            } catch (e) { console.error('Nanny in-app notification failed:', e); }
            try {
              const { sendPushToUser } = await import('./_pushUtils.js');
              const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
              await sendPushToUser('nanny', b.nanny_id, {
                title: 'Shift Tomorrow',
                body: reminderMsg,
                url: `${siteUrl}/nanny/bookings`,
                tag: `reminder-${b.id}`,
              });
              nannyPushReminders++;
            } catch (e) { console.error('Nanny push reminder failed:', e); }
          }

          // 2. Send parent reminder email — DISABLED (parent emails paused)
          // if (b.client_email) {
          //   try {
          //     const { sendParentReminderEmail } = await import('./_emailTemplates.js');
          //     await sendParentReminderEmail({
          //       bookingId: b.id,
          //       clientName: b.client_name,
          //       clientEmail: b.client_email,
          //       date: b.date,
          //       startTime: b.start_time,
          //       endTime: b.end_time || '',
          //       hotel: b.hotel || '',
          //       childrenCount: b.children_count || 1,
          //       nannyName: b.nanny_name || 'Your Nanny',
          //       locale: b.locale || 'en',
          //     });
          //     parentReminders++;
          //   } catch (e) { console.error('Parent reminder failed:', e); }
          // }

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
          nannyPushReminders,
          parentReminders,
          whatsappReminders,
        });
      }

      // ─── Cron: Weekly earnings summary email to admins ──
      if (req.query.cron === 'weekly-summary') {
        // Previous pay period: last Sunday 00:00 → this Sunday 00:00 (Sat 23:59 cutoff)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        const periodEnd = new Date(now);
        periodEnd.setDate(now.getDate() - dayOfWeek); // This Sunday 00:00
        periodEnd.setHours(0, 0, 0, 0);
        const periodStart = new Date(periodEnd);
        periodStart.setDate(periodEnd.getDate() - 7); // Last Sunday 00:00

        const startStr = periodStart.toISOString().split('T')[0];
        const endStr = periodEnd.toISOString().split('T')[0];

        // Human-readable label: "Sat, Mar 1 23:59 — Sat, Mar 8 23:59"
        const satStart = new Date(periodStart);
        satStart.setDate(satStart.getDate() - 1);
        const satEnd = new Date(periodEnd);
        satEnd.setDate(satEnd.getDate() - 1);
        const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const periodLabel = `${fmtShort(satStart)} 23:59 — ${fmtShort(satEnd)} 23:59`;

        // Get admin emails
        const admins = await sql`
          SELECT email FROM admin_users WHERE role = 'super_admin' AND is_active = true
        ` as { email: string }[];
        const adminEmails = admins.map(a => a.email).filter(Boolean);
        if (adminEmails.length === 0) {
          return res.status(200).json({ success: true, skipped: 'no admin emails' });
        }

        // Get all completed bookings in the period with nanny info
        const completed = await sql`
          SELECT b.id, b.date, b.start_time, b.end_time, b.client_name, b.total_price,
                 b.nanny_id, n.name as nanny_name
          FROM bookings b
          LEFT JOIN nannies n ON b.nanny_id = n.id
          WHERE b.status = 'completed'
            AND b.date >= ${startStr}
            AND b.date < ${endStr}
            AND b.nanny_id IS NOT NULL
        ` as Array<{ id: number; date: string; start_time: string; end_time: string; client_name: string; total_price: number; nanny_id: number; nanny_name: string }>;

        // Group by nanny
        const byNanny = new Map<number, { name: string; bookings: typeof completed }>();
        for (const b of completed) {
          if (!byNanny.has(b.nanny_id)) {
            byNanny.set(b.nanny_id, { name: b.nanny_name, bookings: [] });
          }
          byNanny.get(b.nanny_id)!.bookings.push(b);
        }

        // Helper: parse time string to decimal hours
        const parseT = (t: string) => {
          const hFmt = t.match(/^(\d{1,2})h(\d{2})$/i);
          if (hFmt) return parseInt(hFmt[1]) + parseInt(hFmt[2]) / 60;
          const cFmt = t.match(/^(\d{1,2}):(\d{2})/);
          if (cFmt) return parseInt(cFmt[1]) + parseInt(cFmt[2]) / 60;
          return 0;
        };
        const RATE = 31.25;

        // Build per-nanny summaries
        const nannySummaries: Array<{ nannyName: string; bookings: Array<{ id: number; date: string; clientName: string; startTime: string; endTime: string; hours: number; pay: number }>; totalHours: number; totalPay: number }> = [];
        for (const [, nanny] of byNanny) {
          const bookingData = nanny.bookings.map(b => {
            const s = parseT(b.start_time);
            const e = parseT(b.end_time || '');
            const hours = e > s ? e - s : e > 0 ? (24 - s) + e : 0;
            const pay = Math.ceil(hours * RATE);
            return { id: b.id, date: b.date, clientName: b.client_name, startTime: b.start_time, endTime: b.end_time || '', hours, pay };
          });
          nannySummaries.push({
            nannyName: nanny.name,
            bookings: bookingData,
            totalHours: bookingData.reduce((sum, b) => sum + b.hours, 0),
            totalPay: bookingData.reduce((sum, b) => sum + b.pay, 0),
          });
        }

        let emailSent = false;
        try {
          const { sendWeeklySummaryEmail } = await import('./_emailTemplates.js');
          await sendWeeklySummaryEmail({
            adminEmails,
            periodLabel,
            nannySummaries,
            grandTotalHours: nannySummaries.reduce((s, n) => s + n.totalHours, 0),
            grandTotalPay: nannySummaries.reduce((s, n) => s + n.totalPay, 0),
          });
          emailSent = true;
        } catch (e) { console.error('Weekly summary email failed:', e); }

        return res.status(200).json({
          success: true,
          period: periodLabel,
          nanniesWithBookings: byNanny.size,
          emailSent,
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
      // ─── Multi-day consolidated notification action ─────────
      if (req.body?.action === 'send-multi-day-confirmation') {
        const { client_name: mName, client_email: mEmail, client_phone: mPhone, hotel: mHotel, locale: mLocale, booking_ids, days } = req.body as {
          action: string; client_name: string; client_email: string; client_phone?: string; hotel?: string; locale?: string;
          booking_ids: number[];
          days: { date: string; startTime: string; endTime: string; price: number }[];
        };
        const grandTotal = days.reduce((sum: number, d: { price: number }) => sum + d.price, 0);

        // Send one consolidated parent email
        if (mEmail) {
          try {
            const { sendMultiDayConfirmationEmail } = await import('./_emailTemplates.js');
            await sendMultiDayConfirmationEmail({
              bookingIds: booking_ids,
              clientName: mName,
              clientEmail: mEmail,
              clientPhone: mPhone || '',
              hotel: mHotel || '',
              days,
              grandTotal,
              locale: mLocale || 'en',
            });
          } catch (emailErr) { console.error('Multi-day confirmation email failed:', emailErr); }
        }

        // Send one consolidated WhatsApp to parent
        const WA_TOKEN = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
        if (WA_TOKEN && WA_PHONE_ID && mPhone) {
          try {
            let parentPhone = mPhone.replace(/[\s\-\(\)]/g, '');
            if (parentPhone.startsWith('0')) parentPhone = '212' + parentPhone.slice(1);
            if (!parentPhone.startsWith('+') && !parentPhone.match(/^\d{10,}/)) parentPhone = '+' + parentPhone;
            parentPhone = parentPhone.replace('+', '');

            const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
            const daysText = days.map((d: { date: string; startTime: string; endTime: string; price: number }) =>
              `  📅 ${d.date}  🕐 ${d.startTime} - ${d.endTime}  💰 ${d.price}€`
            ).join('\n');
            const waParentMsg = [
              '✅ *Réservation Confirmée — Call a Nanny*',
              '✅ *Booking Confirmed — Call a Nanny*',
              '',
              `Bonjour ${mName},`,
              'Merci pour votre réservation ! Voici les détails :',
              '',
              `Hi ${mName},`,
              'Thank you for your booking! Here are the details:',
              '',
              `📋 *Réservations / Bookings:* ${booking_ids.map(id => `#${id}`).join(', ')}`,
              '',
              daysText,
              '',
              `🏨 *Lieu / Location :* ${mHotel || 'N/A'}`,
              `💰 *Total :* ${grandTotal}€`,
              '',
              '📌 *Prochaine étape :* Une nounou qualifiée vous sera assignée sous peu.',
              '📌 *Next step:* A qualified nanny will be assigned to your booking shortly.',
              '',
              '💳 *Paiement :* Le paiement sera collecté par un membre de notre équipe avant la fin de votre séjour — et non par votre hôtel.',
              '💳 *Payment:* Payment will be collected by a member of our staff by the end of your stay — not by your hotel.',
              '',
              `📍 *Suivre / Track :* ${siteUrl}/booking/${booking_ids[0]}`,
              '',
              '_Merci de votre confiance ! / Thank you for choosing us!_',
              '💕 Call a Nanny — Marrakech',
            ].join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: parentPhone, type: 'text', text: { body: waParentMsg } }),
            });
          } catch (waErr) { console.error('Multi-day WhatsApp to parent failed:', waErr); }
        }

        // Send one consolidated WhatsApp to business
        const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;
        if (WA_TOKEN && WA_PHONE_ID && WHATSAPP_BUSINESS_NUMBER) {
          try {
            const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
            const daysText = days.map((d: { date: string; startTime: string; endTime: string; price: number }) =>
              `  📅 ${d.date}  🕐 ${d.startTime} - ${d.endTime}  💰 ${d.price}€`
            ).join('\n');
            const waBusinessMsg = [
              '🔔 *Nouvelle Réservation Multi-Jours ! / New Multi-Day Booking!*',
              '',
              `👤 *Client :* ${mName}`,
              `📱 *Téléphone / Phone :* ${mPhone || 'N/A'}`,
              `🏨 *Hôtel / Hotel :* ${mHotel || 'N/A'}`,
              '',
              daysText,
              '',
              `💰 *Grand Total :* ${grandTotal}€`,
              '',
              `📍 *Gérer / Manage :* ${siteUrl}/admin/bookings?booking=${booking_ids[0]}`,
              '',
              '_Envoyé automatiquement par Call a Nanny_',
            ].join('\n');

            await fetch(`https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: WHATSAPP_BUSINESS_NUMBER, type: 'text', text: { body: waBusinessMsg } }),
            });
          } catch (waErr) { console.error('Multi-day WhatsApp to business failed:', waErr); }
        }

        return res.status(200).json({ success: true, message: 'Multi-day confirmation sent' });
      }
      // ────────────────────────────────────────────────────────────

      const { nanny_id: provided_nanny_id, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, locale, status: reqStatus, clock_in, clock_out, created_by, created_by_name, extra_dates, extra_times, skip_min_hours, skip_conflict_check, skip_parent_notifications } = req.body as CreateBookingBody;

      // ─── Minimum 3-hour duration check (admin can override) ───
      if (start_time && end_time && !clock_in && !(skip_min_hours && created_by === 'admin')) {
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
      let unassigned = false;
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
          // No nannies at all — accept booking unassigned
          nanny_id = null;
          unassigned = true;
        } else {
        // Check blocked dates (one date at a time to avoid ANY() array issues with Neon driver)
        let blockedRows: BlockedNannyRow[] = [];
        for (const d of bookingDates) {
          const rows = await sql`
            SELECT DISTINCT nanny_id FROM nanny_blocked_dates WHERE date = ${d}
          ` as BlockedNannyRow[];
          blockedRows = blockedRows.concat(rows);
        }
        const blockedIds = new Set(blockedRows.map(b => b.nanny_id));

        // Check existing bookings for overlap + same-hotel priority
        let existing: ExistingBookingRow[] = [];
        for (const d of bookingDates) {
          const rows = await sql`
            SELECT id, nanny_id, date, start_time, end_time, client_name, hotel FROM bookings
            WHERE status != 'cancelled' AND date = ${d}
          ` as ExistingBookingRow[];
          existing = existing.concat(rows);
        }

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
          // All nannies busy — accept booking unassigned
          nanny_id = null;
          unassigned = true;
        } else {
        // Prefer nanny already at the same hotel (saves transportation)
        const sameHotelMatch = eligibleCandidates.find(c => c.sameHotel);
        nanny_id = sameHotelMatch ? sameHotelMatch.id : eligibleCandidates[0].id;
        }
        }
      } else {
        // Manual assign: check for conflicts with the chosen nanny (one date at a time to avoid ANY() issues)
        let conflicts: ExistingBookingRow[] = [];
        for (const d of bookingDates) {
          const rows = await sql`
            SELECT id, date, start_time, end_time, client_name FROM bookings
            WHERE nanny_id = ${nanny_id} AND status != 'cancelled' AND date = ${d}
          ` as ExistingBookingRow[];
          conflicts = conflicts.concat(rows);
        }

        const overlapping = conflicts.filter(
          c => timesOverlap(start_time, effectiveEndTime, c.start_time, c.end_time || '23h59')
        );
        if (overlapping.length > 0 && !(skip_conflict_check && created_by === 'admin')) {
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
        INSERT INTO bookings (nanny_id, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, status, locale, clock_in, clock_out, price_migrated_to_eur, created_by, created_by_name, extra_dates, extra_times)
        VALUES (${nanny_id}, ${client_name}, ${client_email}, ${client_phone || ''}, ${hotel || ''}, ${date}, ${end_date || null}, ${start_time}, ${end_time || ''}, ${plan || 'hourly'}, ${children_count || 1}, ${children_ages || ''}, ${notes || ''}, ${total_price || 0}, ${reqStatus || 'pending'}, ${locale || 'en'}, ${clock_in || null}, ${clock_out || null}, true, ${created_by || 'parent'}, ${created_by_name || ''}, ${extra_dates || null}, ${extra_times || null})
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

        // Format date as "Sat 08th March"
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dateObj = new Date(date + 'T12:00:00');
        const dayName = days[dateObj.getDay()];
        const dayNum = dateObj.getDate();
        const suffix = dayNum === 1 || dayNum === 21 || dayNum === 31 ? 'st' : dayNum === 2 || dayNum === 22 ? 'nd' : dayNum === 3 || dayNum === 23 ? 'rd' : 'th';
        const monthName = months[dateObj.getMonth()];
        const formattedDate = `${dayName} ${String(dayNum).padStart(2, '0')}${suffix} ${monthName}`;

        if (nanny_id) {
          try {
            const nr = await sql`SELECT name FROM nannies WHERE id = ${nanny_id}` as { name: string }[];
            pushNannyName = nr[0]?.name || '';
          } catch { /* ignore */ }
          await sendPushToUser('nanny', nanny_id, {
            title: 'New Booking Request',
            body: `New booking from ${client_name} on ${formattedDate}`,
            url: `/nanny/bookings?booking=${result[0].id}`,
            tag: `booking-new-${result[0].id}`,
          });
        }
        if (unassigned) {
          await sendPushToAllAdmins({
            title: '🚨 URGENT: No Nanny Assigned!',
            body: `${client_name} booked for ${formattedDate} (${start_time}${end_time ? '-' + end_time : ''}) but NO nanny is available. Please assign one ASAP!`,
            url: `/admin/bookings?booking=${result[0].id}`,
            tag: `admin-booking-urgent-${result[0].id}`,
          });
        } else {
          await sendPushToAllAdmins({
            title: 'New Booking',
            body: pushNannyName ? `${client_name} - ${formattedDate} - ${pushNannyName}` : `${client_name} - ${formattedDate}`,
            url: `/admin/bookings?booking=${result[0].id}`,
            tag: `admin-booking-new-${result[0].id}`,
          });
        }
      } catch (pushError: unknown) {
        console.error('Push notification failed:', pushError);
      }

      // Send WhatsApp Business notification (best-effort, non-blocking)
      // Skip when batching multi-day bookings (consolidated notification sent separately)
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
      const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;

      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && WHATSAPP_BUSINESS_NUMBER && !skip_parent_notifications) {
        try {
          const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
          const waLines = unassigned
            ? [
                "🚨 *URGENT — Réservation SANS Nounou ! / Booking WITHOUT Nanny!*",
                "",
                "⚠️ Aucune nounou disponible. Veuillez en assigner une au plus vite !",
                "⚠️ No nanny available. Please assign one ASAP!",
                "",
                `👤 *Client :* ${client_name}`,
                `📱 *Téléphone / Phone :* ${client_phone || "N/A"}`,
                `🏨 *Hôtel / Hotel :* ${hotel || "N/A"}`,
                `📅 *Date :* ${date}`,
                `🕐 *Heure / Time :* ${start_time}${end_time ? ` - ${end_time}` : ""}`,
                `👶 *Enfants / Children :* ${children_count || 1}`,
                `💰 *Total :* ${total_price || 0}€`,
                "",
                `📍 *Gérer / Manage :* ${siteUrl}/admin/bookings?booking=${result[0].id}`,
                "",
                "_Envoyé automatiquement par Call a Nanny_",
              ]
            : [
                "🔔 *Nouvelle Réservation Reçue ! / New Booking Received!*",
                "",
                `👤 *Client :* ${client_name}`,
                `📱 *Téléphone / Phone :* ${client_phone || "N/A"}`,
                `🏨 *Hôtel / Hotel :* ${hotel || "N/A"}`,
                `📅 *Date :* ${date}`,
                `🕐 *Heure / Time :* ${start_time}${end_time ? ` - ${end_time}` : ""}`,
                `👶 *Enfants / Children :* ${children_count || 1}`,
                `💰 *Total :* ${total_price || 0}€`,
                "",
                `📍 *Suivre / Track :* ${siteUrl}/booking/${result[0].id}`,
                "",
                "_Envoyé automatiquement par Call a Nanny_",
              ];
          const waMessage = waLines.join("\n");

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
      // Skip when batching multi-day bookings (consolidated notification sent separately)
      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && client_phone && !skip_parent_notifications) {
        try {
          let parentPhone = client_phone.replace(/[\s\-\(\)]/g, '');
          if (parentPhone.startsWith('0')) parentPhone = '212' + parentPhone.slice(1);
          if (!parentPhone.startsWith('+') && !parentPhone.match(/^\d{10,}/)) parentPhone = '+' + parentPhone;
          parentPhone = parentPhone.replace('+', '');

          const siteUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';
          const trackUrl = `${siteUrl}/booking/${result[0].id}`;
          const waParentMsg = [
                '✅ *Réservation Confirmée — Call a Nanny*',
                '✅ *Booking Confirmed — Call a Nanny*',
                '',
                `Bonjour ${client_name},`,
                'Merci pour votre réservation ! Voici les détails :',
                '',
                `Hi ${client_name},`,
                'Thank you for your booking! Here are the details:',
                '',
                `📋 *Réservation / Booking #:* ${result[0].id}`,
                `📅 *Date :* ${date}${end_date ? ` — ${end_date}` : ''}`,
                `🕐 *Heure / Time :* ${start_time}${end_time ? ` - ${end_time}` : ''}`,
                `🏨 *Lieu / Location :* ${hotel || 'N/A'}`,
                `👶 *Enfants / Children :* ${children_count || 1}`,
                `💰 *Total :* ${total_price || 0}€`,
                '',
                '📌 *Prochaine étape :* Une nounou qualifiée vous sera assignée sous peu.',
                '📌 *Next step:* A qualified nanny will be assigned to your booking shortly.',
                '',
                '💳 *Paiement :* Le paiement sera collecté par un membre de notre équipe avant la fin de votre séjour — et non par votre hôtel.',
                '💳 *Payment:* Payment will be collected by a member of our staff by the end of your stay — not by your hotel.',
                '',
                `📍 *Suivre votre réservation / Track your booking :* ${trackUrl}`,
                '',
                '_Merci de votre confiance ! / Thank you for choosing us!_',
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

      // Send confirmation email to parent (best-effort)
      // Skip when batching multi-day bookings (consolidated email sent separately)
      if (result[0] && client_email && !skip_parent_notifications) {
        try {
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
