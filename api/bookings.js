import { getDb } from './_db.js';
import { Resend } from 'resend';

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'admin@callananny.ma';

export default async function handler(req, res) {
  const sql = getDb();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
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

    // PATCH — Send parent intake form via email
    if (req.method === 'PATCH') {
      const { action } = req.body;

      if (action === 'send_intake_form') {
        const { formData } = req.body;
        if (!formData) return res.status(400).json({ error: 'Missing form data' });

        const f = formData;
        const now = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Casablanca' });

        // Build allergy section
        let allergyHtml = '';
        if (f.noAllergies) {
          allergyHtml = '<p style="color:#22c55e;font-weight:600;">&#10003; No known allergies</p>';
        } else {
          if (f.foodAllergies) allergyHtml += `<p><strong>Food:</strong> ${f.foodAllergies}</p>`;
          if (f.medicineAllergies) allergyHtml += `<p><strong>Medicine:</strong> ${f.medicineAllergies}</p>`;
          if (f.environmentAllergies) allergyHtml += `<p><strong>Environmental:</strong> ${f.environmentAllergies}</p>`;
          if (f.allergyReaction) allergyHtml += `<p><strong>Reactions & Treatment:</strong> ${f.allergyReaction}</p>`;
          if (!allergyHtml) allergyHtml = '<p style="color:#999;">None specified</p>';
        }

        // Build medical section
        let medicalHtml = '';
        if (f.medicalConditions) medicalHtml += `<p><strong>Conditions:</strong> ${f.medicalConditions}</p>`;
        if (f.currentMedications) medicalHtml += `<p><strong>Medications:</strong> ${f.currentMedications}</p>`;
        if (f.medicationAuth) medicalHtml += `<p><strong>Nanny authorized for meds:</strong> ${f.medicationAuth === 'yes' ? 'Yes' : 'No'}</p>`;
        if (f.doctorName) medicalHtml += `<p><strong>Doctor:</strong> ${f.doctorName}${f.doctorPhone ? ` (${f.doctorPhone})` : ''}</p>`;
        if (!medicalHtml) medicalHtml = '<p style="color:#999;">None specified</p>';

        // Build special needs section
        let needsHtml = '';
        if (f.specialNeeds) needsHtml += `<p><strong>Special needs:</strong> ${f.specialNeeds}</p>`;
        if (f.behaviorNotes) needsHtml += `<p><strong>Behavior notes:</strong> ${f.behaviorNotes}</p>`;
        if (f.dietaryRestrictions) needsHtml += `<p><strong>Dietary restrictions:</strong> ${f.dietaryRestrictions}</p>`;
        if (f.favoriteActivities) needsHtml += `<p><strong>Favorite activities:</strong> ${f.favoriteActivities}</p>`;
        if (f.napSchedule) needsHtml += `<p><strong>Nap/sleep schedule:</strong> ${f.napSchedule}</p>`;
        if (!needsHtml) needsHtml = '<p style="color:#999;">None specified</p>';

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#d4613e,#d97a50);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:24px;font-weight:700;">New Child Information Form</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Fiche de Renseignements Enfant</p>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;">Received: ${now}</p>
    </div>

    <div style="background:white;border-radius:0 0 16px 16px;padding:24px;border:1px solid #e8e2dc;border-top:none;">

      <!-- Parent Info -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#128100; Parent / Guardian
        </h2>
        <table style="width:100%;font-size:14px;color:#333;">
          <tr><td style="padding:4px 8px;font-weight:600;width:120px;">Name:</td><td style="padding:4px 8px;">${f.parentName}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:600;">Phone:</td><td style="padding:4px 8px;">${f.parentPhone}</td></tr>
          ${f.parentEmail ? `<tr><td style="padding:4px 8px;font-weight:600;">Email:</td><td style="padding:4px 8px;">${f.parentEmail}</td></tr>` : ''}
          <tr><td style="padding:4px 8px;font-weight:600;">Hotel:</td><td style="padding:4px 8px;">${f.hotel}</td></tr>
        </table>
      </div>

      <!-- Child Info -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#128118; Child Information
        </h2>
        <table style="width:100%;font-size:14px;color:#333;">
          <tr><td style="padding:4px 8px;font-weight:600;width:120px;">Name:</td><td style="padding:4px 8px;">${f.childFirstName} ${f.childLastName || ''}</td></tr>
          ${f.childDob ? `<tr><td style="padding:4px 8px;font-weight:600;">DOB:</td><td style="padding:4px 8px;">${f.childDob}</td></tr>` : ''}
          ${f.childAge ? `<tr><td style="padding:4px 8px;font-weight:600;">Age:</td><td style="padding:4px 8px;">${f.childAge}</td></tr>` : ''}
          ${f.childGender ? `<tr><td style="padding:4px 8px;font-weight:600;">Gender:</td><td style="padding:4px 8px;">${f.childGender === 'boy' ? 'Boy / Garcon' : 'Girl / Fille'}</td></tr>` : ''}
        </table>
      </div>

      <!-- Allergies -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#9888;&#65039; Allergies
        </h2>
        <div style="font-size:14px;color:#333;">
          ${allergyHtml}
        </div>
      </div>

      <!-- Medical -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#129657; Medical Information
        </h2>
        <div style="font-size:14px;color:#333;">
          ${medicalHtml}
        </div>
      </div>

      <!-- Special Needs -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#129504; Special Needs & Behavior
        </h2>
        <div style="font-size:14px;color:#333;">
          ${needsHtml}
        </div>
      </div>

      <!-- Emergency -->
      <div style="margin-bottom:24px;">
        <h2 style="margin:0 0 12px;font-size:16px;color:#d4613e;border-bottom:2px solid #f0e8e0;padding-bottom:8px;">
          &#128222; Emergency Contact
        </h2>
        <table style="width:100%;font-size:14px;color:#333;">
          <tr><td style="padding:4px 8px;font-weight:600;width:120px;">Name:</td><td style="padding:4px 8px;">${f.emergencyName}</td></tr>
          ${f.emergencyRelation ? `<tr><td style="padding:4px 8px;font-weight:600;">Relation:</td><td style="padding:4px 8px;">${f.emergencyRelation}</td></tr>` : ''}
          <tr><td style="padding:4px 8px;font-weight:600;">Phone:</td><td style="padding:4px 8px;">${f.emergencyPhone}</td></tr>
        </table>
      </div>

      <!-- Consent -->
      <div style="background:#f8f5f0;border-radius:12px;padding:16px;margin-bottom:16px;">
        <h2 style="margin:0 0 8px;font-size:14px;color:#d4613e;">Consent</h2>
        <p style="margin:4px 0;font-size:13px;color:#666;">Photo consent: <strong>${f.photoConsent ? '&#10003; Yes' : '&#10007; No'}</strong></p>
        <p style="margin:4px 0;font-size:13px;color:#666;">Terms agreed: <strong>${f.agreeTerms ? '&#10003; Yes' : '&#10007; No'}</strong></p>
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#999;font-size:12px;">
      <p style="margin:0;">call a nanny &mdash; Trusted Childcare in Marrakech</p>
    </div>
  </div>
</body>
</html>`;

        // Send email via Resend
        if (process.env.RESEND_API_KEY) {
          try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
              from: 'call a nanny <onboarding@resend.dev>',
              to: [NOTIFY_EMAIL],
              subject: `New Child Form: ${f.childFirstName} ${f.childLastName || ''} (${f.parentName})`,
              html: emailHtml,
            });
          } catch (emailErr) {
            console.error('Email send failed:', emailErr);
            // Don't fail the request if email fails
          }
        } else {
          console.warn('RESEND_API_KEY not set — email not sent');
        }

        return res.status(200).json({ success: true, message: 'Form received' });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
