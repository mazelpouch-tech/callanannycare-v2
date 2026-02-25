import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbNanny, NannyStatus } from '@/types';

interface UpdateNannyBody {
  name?: string;
  location?: string;
  rating?: number;
  bio?: string;
  specialties?: string[];
  languages?: string[];
  rate?: number;
  image?: string;
  experience?: string;
  available?: boolean;
  email?: string;
  pin?: string;
  status?: NannyStatus;
  phone?: string;
  // Blocked date actions
  action?: 'block_date' | 'unblock_date' | 'bulk_block_dates';
  date?: string;
  dates?: string[];
  reason?: string;
}

interface BlockedDateRow { id: number; date: string; reason: string; created_at: string }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  const { id } = req.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM nannies WHERE id = ${id}` as DbNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });

      // Also fetch blocked dates for admin viewing
      const blockedDates = await sql`
        SELECT id, date, reason, created_at FROM nanny_blocked_dates
        WHERE nanny_id = ${id} ORDER BY date ASC
      ` as BlockedDateRow[];

      return res.status(200).json({ ...result[0], blocked_dates: blockedDates });
    }

    if (req.method === 'PUT') {
      const { name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, status, phone, action, date, dates, reason } = req.body as UpdateNannyBody;

      // ─── Blocked date actions (admin) ────────────────────────────
      if (action === 'block_date' && date) {
        await sql`
          INSERT INTO nanny_blocked_dates (nanny_id, date, reason)
          VALUES (${id}, ${date}, ${reason || ''})
          ON CONFLICT (nanny_id, date) DO UPDATE SET reason = ${reason || ''}
        `;
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${id} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }

      if (action === 'unblock_date' && date) {
        await sql`DELETE FROM nanny_blocked_dates WHERE nanny_id = ${id} AND date = ${date}`;
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${id} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }

      if (action === 'bulk_block_dates' && dates && dates.length > 0) {
        for (const d of dates) {
          await sql`
            INSERT INTO nanny_blocked_dates (nanny_id, date, reason)
            VALUES (${id}, ${d}, ${reason || ''})
            ON CONFLICT (nanny_id, date) DO NOTHING
          `;
        }
        const blockedDates = await sql`
          SELECT id, date, reason, created_at FROM nanny_blocked_dates
          WHERE nanny_id = ${id} ORDER BY date ASC
        ` as BlockedDateRow[];
        return res.status(200).json({ success: true, blocked_dates: blockedDates });
      }
      // ────────────────────────────────────────────────────────────

      const result = await sql`
        UPDATE nannies SET
          name = COALESCE(${name}, name),
          location = COALESCE(${location}, location),
          rating = COALESCE(${rating}, rating),
          bio = COALESCE(${bio}, bio),
          specialties = COALESCE(${JSON.stringify(specialties) || null}, specialties),
          languages = COALESCE(${JSON.stringify(languages) || null}, languages),
          rate = COALESCE(${rate}, rate),
          image = COALESCE(${image}, image),
          experience = COALESCE(${experience}, experience),
          available = COALESCE(${available}, available),
          email = COALESCE(${email}, email),
          pin = COALESCE(${pin}, pin),
          status = COALESCE(${status}, status),
          phone = COALESCE(${phone}, phone),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      ` as DbNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });
      return res.status(200).json(result[0]);
    }
    
    if (req.method === 'DELETE') {
      await sql`DELETE FROM nannies WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nanny API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
