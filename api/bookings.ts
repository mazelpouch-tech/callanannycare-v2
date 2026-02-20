import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './_db.js';
import type { DbBooking, DbBookingWithNanny, BookingPlan } from '@/types';

interface CreateBookingBody {
  nanny_id?: number | null;
  client_name: string;
  client_email: string;
  client_phone?: string;
  hotel?: string;
  date: string;
  start_time: string;
  end_time?: string;
  plan?: BookingPlan;
  children_count?: number;
  children_ages?: string;
  notes?: string;
  total_price?: number;
  locale?: string;
}

interface AvailableNannyRow {
  id: number;
  name: string;
  booking_count: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      ` as DbBookingWithNanny[];
      return res.status(200).json(bookings);
    }

    if (req.method === 'POST') {
      const { nanny_id: provided_nanny_id, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price, locale } = req.body as CreateBookingBody;

      // Auto-assign nanny via round-robin if none provided
      let nanny_id = provided_nanny_id;
      if (!nanny_id) {
        const available = await sql`
          SELECT n.id, n.name, COUNT(b.id) as booking_count
          FROM nannies n
          LEFT JOIN bookings b ON b.nanny_id = n.id AND b.status != 'cancelled'
          WHERE n.available = true AND n.status = 'active'
          GROUP BY n.id, n.name
          ORDER BY booking_count ASC, n.id ASC
          LIMIT 1
        ` as AvailableNannyRow[];
        if (available.length === 0) {
          return res.status(400).json({ error: 'No nannies are currently available. Please try again later.' });
        }
        nanny_id = available[0].id;
      }

      const result = await sql`
        INSERT INTO bookings (nanny_id, client_name, client_email, client_phone, hotel, date, start_time, end_time, plan, children_count, children_ages, notes, total_price, status, locale)
        VALUES (${nanny_id}, ${client_name}, ${client_email}, ${client_phone || ''}, ${hotel || ''}, ${date}, ${start_time}, ${end_time || ''}, ${plan || 'hourly'}, ${children_count || 1}, ${children_ages || ''}, ${notes || ''}, ${total_price || 0}, 'pending', ${locale || 'en'})
        RETURNING *
      ` as DbBooking[];
      // Create notification for nanny
      if (result[0] && nanny_id) {
        try {
          await sql`
            INSERT INTO nanny_notifications (nanny_id, type, title, message, booking_id)
            VALUES (${nanny_id}, 'new_booking', 'New Booking Request',
            ${`You have a new booking request from ${client_name} on ${date}.`}, ${result[0].id})
          `;
        } catch (notifError: unknown) {
          console.error('Failed to create notification:', notifError);
        }
      }

      // Send WhatsApp Business notification (best-effort, non-blocking)
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
      const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;

      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID && WHATSAPP_BUSINESS_NUMBER) {
        try {
          const waMessage = [
            "🔔 *New Booking Received!*",
            "",
            `👤 *Client:* ${client_name}`,
            `📱 *Phone:* ${client_phone || "N/A"}`,
            `🏨 *Hotel:* ${hotel || "N/A"}`,
            `📅 *Date:* ${date}`,
            `🕐 *Time:* ${start_time}${end_time ? ` - ${end_time}` : ""}`,
            `👶 *Children:* ${children_count || 1}`,
            `💰 *Total:* ${total_price || 0} MAD`,
            "",
            "_Sent automatically by Call a Nanny_",
          ].join("\n");

          await fetch(
            `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: WHATSAPP_BUSINESS_NUMBER,
                type: "text",
                text: { body: waMessage },
              }),
            }
          );
        } catch (waError: unknown) {
          console.error("WhatsApp notification failed:", waError);
        }
      }

      // Send booking confirmation email to parent (best-effort)
      if (result[0] && client_email) {
        try {
          const { sendConfirmationEmail } = await import('./_emailTemplates.js');
          await sendConfirmationEmail({
            bookingId: result[0].id,
            clientName: client_name,
            clientEmail: client_email,
            clientPhone: client_phone || '',
            hotel: hotel || '',
            date,
            startTime: start_time,
            endTime: end_time || '',
            childrenCount: children_count || 1,
            childrenAges: children_ages || '',
            totalPrice: total_price || 0,
            notes: notes || '',
            locale: locale || 'en',
          });
        } catch (emailError: unknown) {
          console.error('Confirmation email failed:', emailError);
        }
      }

      return res.status(201).json(result[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Bookings API error:', message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
