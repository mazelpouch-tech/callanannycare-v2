import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbNanny } from '@/types';

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
  action?: 'block_date' | 'unblock_date' | 'bulk_block_dates';
  date?: string;
  dates?: string[];
  reason?: string;
}

interface BlockedDateRow { id: number; date: string; reason: string; created_at: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = getDb();

    if (req.method === 'GET') {
      const { nannyId } = req.query;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

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
      const { nannyId, bio, languages, specialties, image, available, changePin, currentPin, newPin, action, date, dates, reason } = req.body as UpdateProfileBody;
      if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

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
