import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbBookingWithNanny } from '@/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sql = getDb();
    const { nannyId } = req.query;
    
    if (!nannyId) return res.status(400).json({ error: 'nannyId is required' });

    const bookings = await sql`
      SELECT b.*, n.name as nanny_name, n.image as nanny_image
      FROM bookings b
      LEFT JOIN nannies n ON b.nanny_id = n.id
      WHERE b.nanny_id = ${nannyId}
      ORDER BY b.date DESC, b.start_time DESC
    ` as DbBookingWithNanny[];
    
    return res.status(200).json(bookings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Nanny bookings error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
