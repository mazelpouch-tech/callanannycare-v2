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
      const result = await sql`SELECT * FROM nannies WHERE id = ${id}` as DbNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Nanny not found' });
      return res.status(200).json(result[0]);
    }

    if (req.method === 'PUT') {
      const { name, location, rating, bio, specialties, languages, rate, image, experience, available, email, pin, status, phone } = req.body as UpdateNannyBody;
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
