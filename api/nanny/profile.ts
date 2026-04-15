import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, setCors } from '../_db.js';
import type { DbNanny, DbNotification } from '@/types';

/** Parse time string like "09h00" or "14:30" to decimal hours */
function parseTimeToHours(t: string): number | null {
  if (!t) return null;
  const hFormat = t.match(/^(\d{1,2})h(\d{2})$/i);
  if (hFormat) return parseInt(hFormat[1]) + parseInt(hFormat[2]) / 60;
  const colonFormat = t.match(/^(\d{1,2}):(\d{2})/);
  if (colonFormat) {
    let h = parseInt(colonFormat[1]);
    const m = parseInt(colonFormat[2]);
    if (/pm/i.test(t) && h < 12) h += 12;
    if (/am/i.test(t) && h === 12) h = 0;
    return h + m / 60;
  }
  return null;
}

/** Calculate booked hours from start/end time strings, matching frontend logic */
function parseBookedHours(startTime: string, endTime: string, startDate?: string, endDate?: string | null): number {
  const s = parseTimeToHours(startTime);
  const e = parseTimeToHours(endTime);
  if (s === null || e === null) return 0;
  const hoursPerDay = e > s ? e - s : (24 - s) + e;
  if (hoursPerDay <= 0) return 0;
  let days = 1;
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (d2 > d1) days = Math.round((d2 - d1) / 86400000) + 1;
  }
  return hoursPerDay * days;
}

interface UpdateProfileBody {
  nannyId: number;
  bio?: string;
  languages?: string[];
  specialties?: string[];
  image?: string;
  available?: boolean;
  changePin?: boolean;
  currentPin?: string;
  newPin?: string;
  // Blocked date actions
  action?: 'block_date' | 'unblock_date' | 'bulk_block_dates' | 'mark_notifications_read';
  date?: string;
  dates?: string[];
  reason?: string;
  // Notification mark-read
  notificationIds?: number[];
}

interface BlockedDateRow { id: number; date: string; reason: string; created_at: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (setCors(req, res)) return;

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const { nannyId } = req.query;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

      // Stats-only request (used by nanny dashboard)
      if (req.query.include === 'stats') {
        const statsResult = await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
            COUNT(*) FILTER (WHERE status = 'confirmed' AND date >= CURRENT_DATE::text) as upcoming_bookings,
            COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
            COALESCE(SUM(total_price) FILTER (WHERE status = 'completed'), 0) as total_earnings,
            COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed') AND date >= to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD') AND date < to_char(date_trunc('week', CURRENT_DATE) + interval '7 days', 'YYYY-MM-DD')) as this_week_bookings
          FROM bookings
          WHERE nanny_id = ${nannyId}
        ` as { completed_bookings: string; upcoming_bookings: string; pending_bookings: string; total_earnings: string; this_week_bookings: string }[];

        // Calculate hours from booked times (start_time/end_time + extra_times) instead of clock data
        // This correctly accounts for split bookings (e.g. 10h00-13h00 + 18h00-21h30)
        const completedRows = await sql`
          SELECT start_time, end_time, extra_times, date, end_date
          FROM bookings
          WHERE nanny_id = ${nannyId}
            AND status = 'completed'
            AND start_time IS NOT NULL
            AND end_time IS NOT NULL
        ` as { start_time: string; end_time: string; extra_times: string | null; date: string; end_date: string | null }[];

        let totalHours = 0;
        for (const row of completedRows) {
          totalHours += parseBookedHours(row.start_time, row.end_time, row.date, row.end_date);
          if (row.extra_times) {
            try {
              const extras = typeof row.extra_times === 'string' ? JSON.parse(row.extra_times) : row.extra_times;
              if (Array.isArray(extras)) {
                for (const et of extras) {
                  const s = et.start_time || et.startTime;
                  const e = et.end_time || et.endTime;
                  if (s && e) totalHours += parseBookedHours(s, e, row.date, row.end_date);
                }
              }
            } catch { /* ignore malformed JSON */ }
          }
        }

        const stats = statsResult[0];

        return res.status(200).json({
          totalHoursWorked: parseFloat(totalHours.toFixed(1)),
          completedBookings: parseInt(stats.completed_bookings),
          upcomingBookings: parseInt(stats.upcoming_bookings),
          pendingBookings: parseInt(stats.pending_bookings),
          totalEarnings: parseInt(stats.total_earnings),
          thisWeekBookings: parseInt(stats.this_week_bookings),
        });
      }

      // Notifications request
      if (req.query.include === 'notifications') {
        const notifications = await sql`
          SELECT * FROM nanny_notifications
          WHERE nanny_id = ${nannyId}
          ORDER BY created_at DESC
          LIMIT 50
        ` as DbNotification[];
        return res.status(200).json(notifications);
      }


      const result = await sql`
        SELECT id, name, email, location, rating, bio, specialties, languages, image, experience, available, created_at
        FROM nannies WHERE id = ${nannyId}
      ` as DbNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });

      // Also fetch blocked dates
      const blockedDates = await sql`
        SELECT id, date, reason, created_at FROM nanny_blocked_dates
        WHERE nanny_id = ${nannyId} ORDER BY date ASC
      ` as BlockedDateRow[];

      return res.status(200).json({ ...result[0], blocked_dates: blockedDates });
    }

    if (req.method === 'PUT') {
      const { nannyId, bio, languages, specialties, image, available, changePin, currentPin, newPin, action, date, dates, reason, notificationIds } = req.body as UpdateProfileBody;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

      // ─── Mark notifications read ─────────────────────────────────
      if (action === 'mark_notifications_read') {
        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
          return res.status(400).json({ error: 'notificationIds array is required' });
        }
        await sql`
          UPDATE nanny_notifications SET is_read = true
          WHERE id = ANY(${notificationIds})
        `;
        return res.status(200).json({ success: true });
      }


      // ─── Blocked date actions ────────────────────────────────────
      if (action === 'block_date' && date) {
        await sql`
          INSERT INTO nanny_blocked_dates (nanny_id, date, reason)
          VALUES (${nannyId}, ${date}, ${reason || ''})
          ON CONFLICT (nanny_id, date) DO UPDATE SET reason = ${reason || ''}
        `;
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${nannyId} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }

      if (action === 'unblock_date' && date) {
        await sql`DELETE FROM nanny_blocked_dates WHERE nanny_id = ${nannyId} AND date = ${date}`;
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${nannyId} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }

      if (action === 'bulk_block_dates' && dates && dates.length > 0) {
        for (const d of dates) {
          await sql`
            INSERT INTO nanny_blocked_dates (nanny_id, date, reason)
            VALUES (${nannyId}, ${d}, ${reason || ''})
            ON CONFLICT (nanny_id, date) DO NOTHING
          `;
        }
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${nannyId} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }
      // ────────────────────────────────────────────────────────────

      // Validate image size (base64 can be large)
      if (image && image.length > 2 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large. Maximum 1.5 MB.' });
      }

      // Handle PIN change
      if (changePin) {
        if (!currentPin || !newPin) return res.status(400).json({ error: 'Current and new PIN required' });
        if (newPin.length < 4 || newPin.length > 6) return res.status(400).json({ error: 'PIN must be 4-6 digits' });

        const nanny = await sql`SELECT pin FROM nannies WHERE id = ${nannyId}` as DbNanny[];
        if (nanny.length === 0) return res.status(404).json({ error: 'Nanny not found' });
        if (nanny[0].pin !== currentPin) return res.status(403).json({ error: 'Current PIN is incorrect' });

        await sql`UPDATE nannies SET pin = ${newPin}, updated_at = NOW() WHERE id = ${nannyId}`;

        return res.status(200).json({ success: true, message: 'PIN updated' });
      }

      const result = await sql`
        UPDATE nannies SET
          bio = COALESCE(${bio}, bio),
          languages = COALESCE(${languages ? JSON.stringify(languages) : null}, languages),
          specialties = COALESCE(${specialties ? JSON.stringify(specialties) : null}, specialties),
          image = COALESCE(${image}, image),
          available = COALESCE(${available}, available),
          updated_at = NOW()
        WHERE id = ${nannyId}
        RETURNING id, name, email, location, rating, bio, specialties, languages, image, experience, available
      ` as DbNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });
      return res.status(200).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nanny profile error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
