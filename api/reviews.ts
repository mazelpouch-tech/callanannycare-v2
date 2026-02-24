import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/reviews?nanny_id=123 — fetch all reviews for a nanny
    if (req.method === 'GET') {
      const { nanny_id } = req.query;

      if (!nanny_id) {
        return res.status(400).json({ error: 'nanny_id is required' });
      }

      const reviews = await sql`
        SELECT id, nanny_id, client_name, rating, comment, created_at
        FROM nanny_reviews
        WHERE nanny_id = ${nanny_id}
        ORDER BY created_at DESC
      `;
      return res.status(200).json(reviews);
    }

    // POST /api/reviews?action=public — submit a public review (from nanny review page)
    if (req.method === 'POST' && req.query.action === 'public') {
      const { nanny_id, client_name, rating, comment } = req.body as { nanny_id: number; client_name: string; rating: number; comment?: string };

      if (!nanny_id || !client_name || !rating) {
        return res.status(400).json({ error: 'nanny_id, client_name, and rating are required' });
      }
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }
      if (!client_name.trim() || client_name.trim().length < 2) {
        return res.status(400).json({ error: 'Please enter your name' });
      }

      // Verify nanny exists
      const nannyRows = await sql`SELECT id FROM nannies WHERE id = ${nanny_id}` as { id: number }[];
      if (nannyRows.length === 0) {
        return res.status(404).json({ error: 'Nanny not found' });
      }

      const sanitizedName = client_name.trim().slice(0, 100);
      const sanitizedComment = (comment || '').trim().slice(0, 1000);

      // Insert without booking_id (defaults to NULL for public reviews)
      await sql`
        INSERT INTO nanny_reviews (nanny_id, client_name, client_email, rating, comment)
        VALUES (${nanny_id}, ${sanitizedName}, ${''}, ${rating}, ${sanitizedComment})
      `;

      // Update nanny average rating
      const avgResult = await sql`
        SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating
        FROM nanny_reviews WHERE nanny_id = ${nanny_id}
      ` as { avg_rating: string }[];

      if (avgResult[0]?.avg_rating) {
        await sql`UPDATE nannies SET rating = ${parseFloat(avgResult[0].avg_rating)} WHERE id = ${nanny_id}`;
      }

      return res.status(201).json({ success: true, message: 'Review submitted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reviews API error:', message);
    return res.status(500).json({ error: 'Internal server error', details: message });
  }
}
