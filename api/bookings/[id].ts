import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_db.js';
import type { DbBookingWithNanny, BookingStatus, BookingPlan } from '@/types';

interface UpdateBookingBody {
  nanny_id?: number | null;
  status?: BookingStatus;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  hotel?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  plan?: BookingPlan;
  children_count?: number;
  children_ages?: string;
  notes?: string;
  total_price?: number;
  clock_in?: string | null;
  clock_out?: string | null;
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
      const result = await sql`
        SELECT b.*, n.name as nanny_name, n.image as nanny_image
        FROM bookings b
        LEFT JOIN nannies n ON b.nanny_id = n.id
        WHERE b.id = ${id}
      ` as DbBookingWithNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });
      return res.status(200).json(result[0]);
    }
    
    if (req.method === 'PUT') {
      const { nanny_id, status, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price, clock_in, clock_out } = req.body as UpdateBookingBody;
      const result = await sql`
        UPDATE bookings SET
          nanny_id = COALESCE(${nanny_id !== undefined ? nanny_id : null}, nanny_id),
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
          clock_in = COALESCE(${clock_in ? clock_in : null}, clock_in),
          clock_out = COALESCE(${clock_out ? clock_out : null}, clock_out),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      ` as DbBookingWithNanny[];
      if (result.length === 0) return res.status(404).json({ error: 'Booking not found' });

      // Create notification for nanny on status change
      if (status && result[0] && result[0].nanny_id) {
        try {
          const notifMessages = {
            confirmed: { title: 'Booking Confirmed', type: 'booking_confirmed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been confirmed.` },
            cancelled: { title: 'Booking Cancelled', type: 'booking_cancelled', message: `The booking with ${result[0].client_name} on ${result[0].date} has been cancelled.` },
            completed: { title: 'Booking Completed', type: 'booking_completed', message: `Your booking with ${result[0].client_name} on ${result[0].date} has been marked as completed.` },
          };
          const notif = notifMessages[status as keyof typeof notifMessages];
          if (notif) {
            await sql`
              INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
              VALUES (${result[0].nanny_id}, ${notif.type}, ${notif.title}, ${notif.message}, ${id})
            `;
          }
        } catch (notifError: unknown) {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Booking API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
