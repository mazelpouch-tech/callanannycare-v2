import { Resend } from 'resend';

// ============================================================
// Server-side bilingual strings for emails
// ============================================================

const strings = {
  en: {
    confirmSubject: 'Booking Confirmation - Call a Nanny',
    invoiceSubject: 'Invoice for Childcare Service - Call a Nanny',
    greeting: 'Dear',
    thankYou: 'Thank you for your booking!',
    bookingRef: 'Booking Reference',
    dateOfService: 'Date of Service',
    timeSlot: 'Time Slot',
    accommodation: 'Accommodation',
    children: 'Children',
    totalPrice: 'Total Price',
    whatNext: 'What happens next?',
    whatNextText: 'A qualified nanny will be assigned to your booking shortly. You will receive updates via WhatsApp or email.',
    contactUs: 'If you have any questions, contact us at',
    invoice: 'INVOICE',
    invoiceGreeting: 'Please find below the invoice for the childcare service provided by Call a Nanny.',
    caregiver: 'Caregiver',
    scheduledTime: 'Scheduled Time',
    actualTime: 'Actual Time',
    hoursWorked: 'Hours Worked',
    rate: 'Rate',
    totalAmount: 'Total Amount',
    hours: 'hours',
    perHour: 'MAD/hour',
    thankYouService: 'Thank you for choosing Call a Nanny!',
    paymentNote: 'Payment is due upon completion of service.',
    bookingDetails: 'Booking Details',
    billedTo: 'Billed To',
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    serviceDetails: 'Service Details',
    from: 'From',
    invoiceNumber: 'Invoice Number',
    invoiceDate: 'Invoice Date',
    issuedBy: 'Issued by',
  },
  fr: {
    confirmSubject: 'Confirmation de Réservation - Call a Nanny',
    invoiceSubject: 'Facture de Service de Garde - Call a Nanny',
    greeting: 'Cher(e)',
    thankYou: 'Merci pour votre réservation !',
    bookingRef: 'Référence de Réservation',
    dateOfService: 'Date du Service',
    timeSlot: 'Créneau Horaire',
    accommodation: 'Hébergement',
    children: 'Enfants',
    totalPrice: 'Prix Total',
    whatNext: 'Et maintenant ?',
    whatNextText: 'Une nounou qualifiée sera assignée à votre réservation sous peu. Vous recevrez des mises à jour par WhatsApp ou email.',
    contactUs: 'Pour toute question, contactez-nous à',
    invoice: 'FACTURE',
    invoiceGreeting: 'Veuillez trouver ci-dessous la facture pour le service de garde fourni par Call a Nanny.',
    caregiver: 'Garde d\'enfants',
    scheduledTime: 'Horaire Prévu',
    actualTime: 'Horaire Réel',
    hoursWorked: 'Heures Travaillées',
    rate: 'Tarif',
    totalAmount: 'Montant Total',
    hours: 'heures',
    perHour: 'MAD/heure',
    thankYouService: 'Merci d\'avoir choisi Call a Nanny !',
    paymentNote: 'Le paiement est dû à la fin du service.',
    bookingDetails: 'Détails de la Réservation',
    billedTo: 'Facturé à',
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    serviceDetails: 'Détails du Service',
    from: 'De',
    invoiceNumber: 'Numéro de Facture',
    invoiceDate: 'Date de Facture',
    issuedBy: 'Émis par',
  },
};

type Locale = 'en' | 'fr';
function t(locale: Locale) { return strings[locale] || strings.en; }

// ============================================================
// Shared HTML helpers
// ============================================================

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#f97316,#ec4899);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.5px;">call a nanny</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Professional Childcare Services · Marrakech</p>
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="padding:40px;">
      ${content}
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px;background-color:#fafafa;border-top:1px solid #f0f0f0;text-align:center;">
      <p style="margin:0;color:#999;font-size:12px;">Call a Nanny · Marrakech, Morocco</p>
      <p style="margin:4px 0 0;color:#999;font-size:12px;">info@callanannycare.com · callanannycare.com</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#666;font-size:14px;border-bottom:1px solid #f0f0f0;width:40%;">${label}</td>
    <td style="padding:8px 12px;color:#1a1a1a;font-size:14px;font-weight:500;border-bottom:1px solid #f0f0f0;">${value}</td>
  </tr>`;
}

function sectionTitle(title: string): string {
  return `<h3 style="margin:24px 0 12px;color:#1a1a1a;font-size:16px;font-weight:600;font-family:Georgia,'Times New Roman',serif;">${title}</h3>`;
}

// ============================================================
// Confirmation Email
// ============================================================

export interface ConfirmationEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  startTime: string;
  endTime: string;
  childrenCount: number;
  childrenAges: string;
  totalPrice: number;
  notes: string;
  locale: string;
}

export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Confirmation email skipped.');
    return;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';
  const s = t(locale);

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">${s.greeting} ${data.clientName},</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">${s.thankYou}</p>

    ${sectionTitle(s.bookingDetails)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row(s.bookingRef, `#${data.bookingId}`)}
      ${row(s.dateOfService, data.date)}
      ${row(s.timeSlot, data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : data.startTime)}
      ${row(s.accommodation, data.hotel || 'N/A')}
      ${row(s.children, `${data.childrenCount}`)}
      ${row(s.totalPrice, `<strong style="color:#f97316;font-size:16px;">${data.totalPrice} MAD</strong>`)}
    </table>

    <!-- What happens next -->
    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.whatNext}</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">${s.whatNextText}</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  await resend.emails.send({
    from: fromAddress,
    to: data.clientEmail,
    subject: s.confirmSubject,
    html: emailWrapper(content),
  });
}

// ============================================================
// Invite Email
// ============================================================

export interface InviteEmailData {
  nannyName: string;
  nannyEmail: string;
  inviteLink: string;
}

export async function sendInviteEmail(data: InviteEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Invite email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">Hello ${data.nannyName},</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">You've been invited to join <strong>Call a Nanny</strong> — Marrakech's trusted childcare service!</p>

    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">What to do next</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Click the button below to create your profile and set up your login. You'll need to fill in your details and create a PIN code to access the nanny portal.</p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${data.inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:50px;box-shadow:0 4px 14px rgba(249,115,22,0.3);">Complete Your Registration</a>
    </div>

    <p style="margin:0 0 4px;color:#999;font-size:13px;text-align:center;">Or copy and paste this link into your browser:</p>
    <p style="margin:0 0 24px;color:#f97316;font-size:12px;text-align:center;word-break:break-all;">${data.inviteLink}</p>

    <div style="margin:24px 0;padding:16px;background-color:#fafafa;border-radius:8px;text-align:center;">
      <p style="margin:0;color:#999;font-size:13px;">⏳ This invitation link expires in <strong>7 days</strong>.</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">If you have any questions, contact us at <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.nannyEmail,
      subject: "You're invited to join Call a Nanny!",
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send invite email:', err);
    return false;
  }
}

// ============================================================
// Invoice Email
// ============================================================

export interface InvoiceEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  startTime: string;
  endTime: string;
  clockIn: string;
  clockOut: string;
  childrenCount: number;
  childrenAges: string;
  totalPrice: number;
  nannyName: string;
  locale: string;
}

function formatClockTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return isoString;
  }
}

function calculateHours(clockIn: string, clockOut: string): string {
  try {
    const diff = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.max(0, diff / (1000 * 60 * 60));
    return hours.toFixed(1);
  } catch {
    return '0';
  }
}

export async function sendInvoiceEmail(data: InvoiceEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Invoice email skipped.');
    return;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';
  const s = t(locale);

  const actualHours = calculateHours(data.clockIn, data.clockOut);
  const clockInFormatted = formatClockTime(data.clockIn);
  const clockOutFormatted = formatClockTime(data.clockOut);

  const invoiceDate = new Date().toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const content = `
    <!-- Invoice Badge -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#fff;font-size:13px;font-weight:700;letter-spacing:2px;padding:6px 20px;border-radius:20px;">${s.invoice}</span>
    </div>

    <!-- From / To Section -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:16px;">
          <p style="margin:0 0 4px;color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${s.from}</p>
          <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:700;">Call a Nanny</p>
          <p style="margin:2px 0 0;color:#666;font-size:13px;">Professional Childcare Services</p>
          <p style="margin:2px 0 0;color:#666;font-size:13px;">Marrakech, Morocco</p>
          <p style="margin:2px 0 0;color:#666;font-size:13px;">info@callanannycare.com</p>
        </td>
        <td style="vertical-align:top;width:50%;padding-left:16px;">
          <p style="margin:0 0 4px;color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${s.billedTo}</p>
          <p style="margin:0;color:#1a1a1a;font-size:15px;font-weight:700;">${data.clientName}</p>
          <p style="margin:2px 0 0;color:#666;font-size:13px;">${data.clientEmail}</p>
          ${data.clientPhone ? `<p style="margin:2px 0 0;color:#666;font-size:13px;">${data.clientPhone}</p>` : ''}
          ${data.hotel ? `<p style="margin:2px 0 0;color:#666;font-size:13px;">${data.hotel}</p>` : ''}
        </td>
      </tr>
    </table>

    <!-- Invoice Meta -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${row(s.invoiceNumber, `INV-${data.bookingId}`)}
      ${row(s.invoiceDate, invoiceDate)}
    </table>

    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">${s.greeting} ${data.clientName},</h2>
    <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.5;">${s.invoiceGreeting}</p>

    ${sectionTitle(s.serviceDetails)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row(s.dateOfService, data.date)}
      ${row(s.caregiver, data.nannyName)}
      ${row(s.scheduledTime, data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : data.startTime)}
      ${row(s.actualTime, `${clockInFormatted} - ${clockOutFormatted}`)}
      ${row(s.hoursWorked, `${actualHours} ${s.hours}`)}
      ${row(s.children, `${data.childrenCount}`)}
      ${row(s.accommodation, data.hotel || 'N/A')}
    </table>

    <!-- Total Amount Box -->
    <div style="margin:24px 0;padding:20px;background-color:#fff7ed;border-radius:12px;text-align:center;">
      <p style="margin:0 0 4px;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${s.totalAmount}</p>
      <p style="margin:0;color:#f97316;font-size:32px;font-weight:700;">${data.totalPrice} MAD</p>
      <p style="margin:8px 0 0;color:#999;font-size:12px;">${s.paymentNote}</p>
    </div>

    <p style="margin:0 0 4px;color:#999;font-size:12px;text-align:center;font-style:italic;">${s.issuedBy}: Call a Nanny · callanannycare.com</p>
    <p style="margin:12px 0 0;color:#999;font-size:13px;text-align:center;">${s.thankYouService}</p>
    <p style="margin:4px 0 0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  await resend.emails.send({
    from: fromAddress,
    to: data.clientEmail,
    subject: `${s.invoiceSubject} #${data.bookingId}`,
    html: emailWrapper(content),
  });
}
