import { getDb } from './_db.js';

export default async function handler(req, res) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const bookings = await sql`
        SELECT b.*, n.name as nanny_name, n.image as nanny_image
        FROM bookings b
        LEFT JOIN nannies n ON b.nanny_id = n.id
        ORDER BY b.created_at DESC
      `;
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { nanny_id, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price } = req.body;
      const result = await sql`
        INSERT INTO bookings (nanny_id, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price, status)
        VALUES (${nanny_id}, ${client_name}, ${client_email}, ${client_phone || ''}, ${hotel || ''}, ${date}, ${start_time}, ${end_time || ''}, ${plan || 'hourly'}, ${children_count || 1}, ${children_ages || ''}, ${notes || ''}, ${total_price || 0}, 'pending')
        RETURNING *
      `;
      // Create notification for nanny
      if (result[0] && nanny_id) {
        try {
          await sql`
            INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
            VALUES (${nanny_id}, 'new_booking', 'New Booking Request',
            ${`You have a new booking request from ${client_name} on ${date}.`}, ${result[0].id})
          `;
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
        }
      }

      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
