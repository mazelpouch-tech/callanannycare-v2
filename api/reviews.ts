import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';

interface ReviewBody {
  booking_id: number;
  token: string;
  rating: number;
  comment?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/reviews?booking_id=123&token=abc — fetch booking info for review page
    if (req.method === 'GET') {
      const { booking_id, token, nanny_id } = req.query;

      // Admin fetch: get all reviews for a nanny
      if (nanny_id) {
        const reviews = await sql`
          SELECT r.*, b.date, b.start_time, b.end_time
          FROM nanny_reviews r
          JOIN bookings b ON r.booking_id = b.id
          WHERE r.nanny_id = ${nanny_id}
          ORDER BY r.created_at DESC
        `;
        return res.status(200).json(reviews);
      }

      // Parent review page: validate token & return booking info
      if (!booking_id || !token) {
        return res.status(400).json({ error: 'booking_id and token are required' });
      }

      const bookingRows = await sql`
        SELECT b.id, b.client_name, b.client_email, b.date, b.start_time, b.end_time,
               b.nanny_id, b.review_token, b.status,
               n.name as nanny_name, n.image as nanny_image
        FROM bookings b
        LEFT JOIN nannies n ON b.nanny_id = n.id
        WHERE b.id = ${booking_id}
      ` as { id: number; client_name: string; client_email: string; date: string; start_time: string; end_time: string; nanny_id: number | null; review_token: string | null; status: string; nanny_name: string; nanny_image: string }[];

      if (bookingRows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookingRows[0];

      if (booking.review_token !== token) {
        return res.status(403).json({ error: 'Invalid review token' });
      }

      // Check if review already exists
      const existingReview = await sql`
        SELECT id, rating, comment FROM nanny_reviews WHERE booking_id = ${booking_id}
      ` as { id: number; rating: number; comment: string }[];

      return res.status(200).json({
        booking: {
          id: booking.id,
          clientName: booking.client_name,
          date: booking.date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          nannyName: booking.nanny_name,
          nannyImage: booking.nanny_image,
          nannyId: booking.nanny_id,
        },
        existingReview: existingReview.length > 0 ? existingReview[0] : null,
      });
    }

    // POST /api/reviews — submit a review
    if (req.method === 'POST') {
      const { booking_id, token, rating, comment } = req.body as ReviewBody;

      if (!booking_id || !token || !rating) {
        return res.status(400).json({ error: 'booking_id, token, and rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // Validate token
      const bookingRows = await sql`
        SELECT id, client_name, client_email, nanny_id, review_token, status
        FROM bookings WHERE id = ${booking_id}
      ` as { id: number; client_name: string; client_email: string; nanny_id: number | null; review_token: string | null; status: string }[];

      if (bookingRows.length === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookingRows[0];

      if (booking.review_token !== token) {
        return res.status(403).json({ error: 'Invalid review token' });
      }

      if (!booking.nanny_id) {
        return res.status(400).json({ error: 'No nanny assigned to this booking' });
      }

      // Check if review already exists
      const existing = await sql`SELECT id FROM nanny_reviews WHERE booking_id = ${booking_id}` as { id: number }[];
      if (existing.length > 0) {
        return res.status(409).json({ error: 'Review already submitted for this booking' });
      }

      // Insert review
      const sanitizedComment = (comment || '').slice(0, 1000);
      await sql`
        INSERT INTO nanny_reviews (booking_id, nanny_id, client_name, client_email, rating, comment)
        VALUES (${booking_id}, ${booking.nanny_id}, ${booking.client_name}, ${booking.client_email || ''}, ${rating}, ${sanitizedComment})
      `;

      // Update nanny average rating
      const avgResult = await sql`
        SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating
        FROM nanny_reviews WHERE nanny_id = ${booking.nanny_id}
      ` as { avg_rating: string }[];

      if (avgResult[0]?.avg_rating) {
        await sql`UPDATE nannies SET rating = ${parseFloat(avgResult[0].avg_rating)} WHERE id = ${booking.nanny_id}`;
      }

      return res.status(201).json({ success: true, message: 'Review submitted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reviews API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
