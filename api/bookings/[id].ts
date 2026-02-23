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
  end_date?: string | null;
  start_time?: string;
  end_time?: string;
  plan?: BookingPlan;
  children_count?: number;
  children_ages?: string;
  notes?: string;
  total_price?: number;
  clock_in?: string | null;
  clock_out?: string | null;
  resend_invoice?: boolean;
  send_reminder?: boolean;
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
      const { nanny_id, status, client_name, client_email, client_phone, hotel, date, end_date, start_time, end_time, plan, children_count, children_ages, notes, total_price, clock_in, clock_out, resend_invoice, send_reminder } = req.body as UpdateBookingBody;
      const result = await sql`
        UPDATE bookings SET
          nanny_id = COALESCE(${nanny_id !== undefined ? nanny_id : null}, nanny_id),
          status = COALESCE(${status}, status),
          client_name = COALESCE(${client_name}, client_name),
          client_email = COALESCE(${client_email}, client_email),
          client_phone = COALESCE(${client_phone}, client_phone),
          hotel = COALESCE(${hotel}, hotel),
          date = COALESCE(${date}, date),
          end_date = COALESCE(${end_date !== undefined ? end_date : null}, end_date),
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

      // Send assignment email when nanny_id is changed (nanny reassigned/assigned)
      if (nanny_id !== undefined && nanny_id && result[0]) {
        try {
          const nannyRows = await sql`SELECT name, email FROM nannies WHERE id = ${nanny_id}` as { name: string; email: string | null }[];
          if (nannyRows[0]?.email) {
            const { sendNannyAssignmentEmail } = await import('../_emailTemplates.js');
            await sendNannyAssignmentEmail({
              nannyName: nannyRows[0].name,
              nannyEmail: nannyRows[0].email,
              bookingId: result[0].id,
              clientName: result[0].client_name,
              date: result[0].date,
              endDate: result[0].end_date || null,
              startTime: result[0].start_time,
              endTime: result[0].end_time || '',
              hotel: result[0].hotel || '',
              childrenCount: result[0].children_count || 1,
              totalPrice: result[0].total_price || 0,
            });
          }
        } catch (nannyEmailError: unknown) {
          console.error('Nanny assignment email failed:', nannyEmailError);
        }
      }

      // Send invoice when booking is completed with clock_out (nanny checkout)
      if (status === 'completed' && clock_out && result[0]) {
        // Query nanny name for the invoice
        let invoiceNannyName = 'Your Nanny';
        try {
          const nannyRows = await sql`
            SELECT name FROM nannies WHERE id = ${result[0].nanny_id}
          ` as { name: string }[];
          invoiceNannyName = nannyRows[0]?.name || 'Your Nanny';
        } catch { /* ignore */ }

        const clockInTime = result[0].clock_in || clock_out;
        const clockOutTime = clock_out;

        // Calculate hours worked
        let hoursWorked = '0';
        try {
          const diff = new Date(clockOutTime).getTime() - new Date(clockInTime).getTime();
          hoursWorked = Math.max(0, diff / 3600000).toFixed(1);
        } catch { /* ignore */ }

        // 1. Send invoice email (if parent has email)
        if (result[0].client_email) {
          try {
            const { sendInvoiceEmail } = await import('../_emailTemplates.js');
            await sendInvoiceEmail({
              bookingId: result[0].id,
              clientName: result[0].client_name,
              clientEmail: result[0].client_email,
              clientPhone: result[0].client_phone,
              hotel: result[0].hotel,
              date: result[0].date,
              startTime: result[0].start_time,
              endTime: result[0].end_time,
              clockIn: clockInTime,
              clockOut: clockOutTime,
              childrenCount: result[0].children_count,
              childrenAges: result[0].children_ages,
              totalPrice: result[0].total_price,
              nannyName: invoiceNannyName,
              locale: result[0].locale || 'en',
            });
          } catch (invoiceError: unknown) {
            console.error('Invoice email failed:', invoiceError);
          }
        }

        // 2. Send invoice via WhatsApp to parent (if phone is available)
        const parentPhone = result[0].client_phone;
        const WA_TOKEN = process.env.WHATSAPP_TOKEN;
        const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID;

        if (WA_TOKEN && WA_PHONE_ID && parentPhone) {
          try {
            // Format phone: ensure it starts with country code, strip spaces/dashes
            let formattedPhone = parentPhone.replace(/[\s\-\(\)]/g, '');
            if (formattedPhone.startsWith('0')) formattedPhone = '212' + formattedPhone.slice(1);
            if (!formattedPhone.startsWith('+') && !formattedPhone.match(/^\d{10,}/)) formattedPhone = '+' + formattedPhone;
            formattedPhone = formattedPhone.replace('+', '');

            const clockInFmt = new Date(clockInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
            const clockOutFmt = new Date(clockOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            const waInvoice = [
              '📄 *INVOICE — Call a Nanny*',
              '',
              `📋 *Invoice #:* INV-${result[0].id}`,
              `👤 *Billed To:* ${result[0].client_name}`,
              `👩‍👧 *Caregiver:* ${invoiceNannyName}`,
              `📅 *Date:* ${result[0].date}`,
              `🕐 *Time:* ${clockInFmt} – ${clockOutFmt}`,
              `⏱ *Hours:* ${hoursWorked}h`,
              `👶 *Children:* ${result[0].children_count || 1}`,
              '',
              `💰 *Total: ${result[0].total_price || 0} MAD*`,
              '',
              '_Thank you for choosing Call a Nanny!_',
              '_Payment is due upon completion of service._',
              '',
              '📧 info@callanannycare.com',
              '🌐 callanannycare.com',
            ].join('\n');

            await fetch(
              `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WA_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: formattedPhone,
                  type: 'text',
                  text: { body: waInvoice },
                }),
              }
            );
          } catch (waError: unknown) {
            console.error('WhatsApp invoice to parent failed:', waError);
          }
        }

        // 3. Send invoice notification to business WhatsApp
        const WA_BIZ_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER;
        if (WA_TOKEN && WA_PHONE_ID && WA_BIZ_NUMBER) {
          try {
            const waBizMsg = [
              '✅ *Shift Completed — Invoice Sent*',
              '',
              `📋 *Invoice #:* INV-${result[0].id}`,
              `👤 *Parent:* ${result[0].client_name}`,
              `👩‍👧 *Nanny:* ${invoiceNannyName}`,
              `📅 *Date:* ${result[0].date}`,
              `⏱ *Hours:* ${hoursWorked}h`,
              `💰 *Amount:* ${result[0].total_price || 0} MAD`,
              '',
              `_Invoice sent to parent${result[0].client_email ? ' via email & WhatsApp' : parentPhone ? ' via WhatsApp' : ''}_`,
            ].join('\n');

            await fetch(
              `https://graph.facebook.com/v18.0/${WA_PHONE_ID}/messages`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${WA_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: WA_BIZ_NUMBER,
                  type: 'text',
                  text: { body: waBizMsg },
                }),
              }
            );
          } catch (waBizError: unknown) {
            console.error('WhatsApp business notification failed:', waBizError);
          }
        }
      }

      // Resend invoice email on admin request
      if (resend_invoice && result[0] && result[0].client_email && result[0].status === 'completed' && result[0].clock_out) {
        try {
          const nannyRows2 = await sql`
            SELECT name FROM nannies WHERE id = ${result[0].nanny_id}
          ` as { name: string }[];
          const nannyName2 = nannyRows2[0]?.name || 'Your Nanny';

          const { sendInvoiceEmail: resendInvoiceFn } = await import('../_emailTemplates.js');
          await resendInvoiceFn({
            bookingId: result[0].id,
            clientName: result[0].client_name,
            clientEmail: result[0].client_email,
            clientPhone: result[0].client_phone,
            hotel: result[0].hotel,
            date: result[0].date,
            startTime: result[0].start_time,
            endTime: result[0].end_time,
            clockIn: result[0].clock_in || result[0].clock_out,
            clockOut: result[0].clock_out,
            childrenCount: result[0].children_count,
            childrenAges: result[0].children_ages,
            totalPrice: result[0].total_price,
            nannyName: nannyName2,
            locale: result[0].locale || 'en',
          });
        } catch (resendError: unknown) {
          console.error('Resend invoice email failed:', resendError);
        }
      }

      // Send reminder email to nanny for pending bookings
      if (send_reminder && result[0] && result[0].nanny_id && result[0].status === 'pending') {
        try {
          const nannyRowsR = await sql`SELECT name, email FROM nannies WHERE id = ${result[0].nanny_id}` as { name: string; email: string | null }[];
          if (nannyRowsR[0]?.email) {
            const { sendNannyReminderEmail } = await import('../_emailTemplates.js');
            await sendNannyReminderEmail({
              nannyName: nannyRowsR[0].name,
              nannyEmail: nannyRowsR[0].email,
              bookingId: result[0].id,
              clientName: result[0].client_name,
              date: result[0].date,
              endDate: result[0].end_date || null,
              startTime: result[0].start_time,
              endTime: result[0].end_time || '',
              hotel: result[0].hotel || '',
              childrenCount: result[0].children_count || 1,
              totalPrice: result[0].total_price || 0,
            });
          }
        } catch (reminderError: unknown) {
          console.error('Reminder email failed:', reminderError);
        }
        return res.status(200).json({ ...result[0], reminded: true });
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
