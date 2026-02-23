import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import type { DbNanny } from '@/types';

interface CreateNannyBody {
  name: string;
  location: string;
  rating?: number;
  bio: string;
  specialties?: string[];
  languages?: string[];
  rate?: number;
  image?: string;
  experience?: string;
  available?: boolean;
  email?: string | null;
  pin?: string;
  phone?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const nannies = await sql`SELECT * FROM nannies ORDER BY name ASC` as DbNanny[];

      // Optionally include blocked dates for all nannies (used by ForwardBookingModal)
      if (req.query.include_blocked === 'true') {
        const allBlocked = await sql`
          SELECT nanny_id, date FROM nanny_blocked_dates ORDER BY date ASC
        ` as { nanny_id: number; date: string }[];
        // Group by nanny_id
        const blockedByNanny: Record<number, string[]> = {};
        for (const row of allBlocked) {
          if (!blockedByNanny[row.nanny_id]) blockedByNanny[row.nanny_id] = [];
          blockedByNanny[row.nanny_id].push(row.date);
        }
        const nanniesWithBlocked = nannies.map(n => ({
          ...n,
          blocked_dates: blockedByNanny[n.id] || [],
        }));
        return res.status(200).json(nanniesWithBlocked);
      }

      return res.status(200).json(nannies);
    }
    
    if (req.method === 'POST') {
      const { name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, phone } = req.body as CreateNannyBody;
      const result = await sql`
        INSERT INTO nannies (name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, phone)
        VALUES (${name}, ${location}, ${rating || 4.8}, ${bio}, ${JSON.stringify(specialties || [])}, ${JSON.stringify(languages || [])}, ${rate || 150}, ${image || ''}, ${experience || '1 year'}, ${available !== false}, ${email || null}, ${pin || ''}, ${phone || ''})
        RETURNING *
      ` as DbNanny[];
      return res.status(201).json(result[0]);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nannies API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
