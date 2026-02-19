import { getDb } from '../_db.js';

export default async function handler(req, res) {
  const sql = getDb();
  const { id } = req.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const result = await sql`
        SELECT b.*, n.name as nanny_name, n.image as nanny_image 
        FROM bookings b 
        LEFT JOIN nannies n ON b.nanny_id = n.id 
        WHERE b.id = ${id}
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });
      return res.status(200).json(result[0]);
    }
    
    if (req.method === 'PUT') {
      const { status, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price } = req.body;
      const result = await sql`
        UPDATE bookings SET 
          status = COALESCE(${status}, status),
          client_name = COALESCE(${client_name}, client_name),
          client_email = COALESCE(${client_email}, client_email),
          client_phone = COALESCE(${client_phone}, client_phone),
          hotel = COALESCE(${hotel}, hotel),
          date = COALESCE(${date}, date),
          start_time = COALESCE(${start_time}, start_time),
          end_time = COALESCE(${end_time}, end_time),
          plan = COALESCE(${plan}, plan),
          children_count = COALESCE(${children_count}, children_count),
          children_ages = COALESCE(${children_ages}, children_ages),
          notes = COALESCE(${notes}, notes),
          total_price = COALESCE(${total_price}, total_price),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });

      // Create notification for nanny on status change
      if (status && result[0] && result[0].nanny_id) {
        try {
          const notifMessages = {
            confirmed: { title: 'Booking Confirmed', type: 'booking_confirmed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been confirmed.` },
            cancelled: { title: 'Booking Cancelled', type: 'booking_cancelled', message: `The booking with ${result[0].client_name} on ${result[0].date} has been cancelled.` },
            completed: { title: 'Booking Completed', type: 'booking_completed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been marked as completed.` },
          };
          const notif = notifMessages[status];
          if (notif) {
            await sql`
              INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
              VALUES (${result[0].nanny_id}, ${notif.type}, ${notif.title}, ${notif.message}, ${id})
            `;
          }
        } catch (notifError) {
          console.error('Failed to create notification:', notifError);
        }
      }

      return res.status(200).json(result[0]);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM bookings WHERE id = ${id}`;
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Booking API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
