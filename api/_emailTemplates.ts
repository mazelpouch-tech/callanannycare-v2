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
    trackBooking: 'Track Your Booking',
    trackBookingText: 'Follow the real-time status of your booking — see when your nanny is confirmed, on the way, and more.',
    trackBookingBtn: 'Track My Booking',
    extendBooking: 'Need More Time?',
    extendBookingText: 'You can extend your booking anytime by clicking the button below.',
    extendBookingBtn: 'Extend Booking',
    rebookTitle: 'Book Again?',
    rebookText: 'Loved the experience? Rebook in seconds with your details pre-filled.',
    rebookBtn: 'Book Again',
    invoice: 'INVOICE',
    invoiceGreeting: 'Please find below the invoice for the childcare service provided by Call a Nanny.',
    caregiver: 'Caregiver',
    scheduledTime: 'Scheduled Time',
    actualTime: 'Actual Time',
    hoursWorked: 'Hours Worked',
    rate: 'Rate',
    totalAmount: 'Total Amount',
    hours: 'hours',
    perHour: '€/hour',
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
    reminderSubject: 'Booking Reminder - Tomorrow!',
    reminderGreeting: 'Your booking is tomorrow!',
    reminderText: 'Just a friendly reminder that your childcare booking is scheduled for tomorrow. Here are the details:',
    reminderNanny: 'Your Nanny',
    reminderContact: 'Need to make changes? Contact us as soon as possible.',
    reminderSeeYou: 'We look forward to seeing you!',
    // Nanny confirmed
    nannyConfirmedSubject: '🎉 Your Nanny is Confirmed!',
    nannyConfirmedGreeting: 'Great news!',
    nannyConfirmedText: 'Your nanny has accepted your booking and is ready to care for your little ones.',
    nannyProfileLabel: 'Meet Your Nanny',
    nannyExperience: 'Experience',
    nannyLanguages: 'Languages',
    nannySpecialties: 'Specialties',
    nannyRating: 'Rating',
    // Cancellation
    cancellationSubject: 'Booking Cancelled',
    cancellationText: 'Your booking has been cancelled. Here are the details:',
    cancellationReason: 'Reason',
    cancellationFeeNote: 'A cancellation fee may apply as the cancellation was made within 24 hours of your scheduled service.',
    cancellationNoFee: 'No cancellation fee applies — your booking was cancelled more than 24 hours before the scheduled service.',
    cancelledByLabel: 'Cancelled by',
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
    trackBooking: 'Suivre Votre Réservation',
    trackBookingText: 'Suivez le statut en temps réel de votre réservation — voyez quand votre nounou est confirmée, en chemin, et plus encore.',
    trackBookingBtn: 'Suivre Ma Réservation',
    extendBooking: 'Besoin de Plus de Temps ?',
    extendBookingText: 'Vous pouvez prolonger votre réservation à tout moment en cliquant sur le bouton ci-dessous.',
    extendBookingBtn: 'Prolonger la Réservation',
    rebookTitle: 'Réserver à Nouveau ?',
    rebookText: 'Vous avez aimé l\'expérience ? Réservez à nouveau en quelques secondes avec vos informations pré-remplies.',
    rebookBtn: 'Réserver à Nouveau',
    invoice: 'FACTURE',
    invoiceGreeting: 'Veuillez trouver ci-dessous la facture pour le service de garde fourni par Call a Nanny.',
    caregiver: 'Garde d\'enfants',
    scheduledTime: 'Horaire Prévu',
    actualTime: 'Horaire Réel',
    hoursWorked: 'Heures Travaillées',
    rate: 'Tarif',
    totalAmount: 'Montant Total',
    hours: 'heures',
    perHour: '€/heure',
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
    reminderSubject: 'Rappel de Réservation - Demain !',
    reminderGreeting: 'Votre réservation est demain !',
    reminderText: 'Un petit rappel : votre réservation de garde d\'enfants est prévue pour demain. Voici les détails :',
    reminderNanny: 'Votre Nounou',
    reminderContact: 'Besoin de modifications ? Contactez-nous dès que possible.',
    reminderSeeYou: 'Nous avons hâte de vous retrouver !',
    // Nanny confirmed
    nannyConfirmedSubject: '🎉 Votre Nounou est Confirmée !',
    nannyConfirmedGreeting: 'Bonne nouvelle !',
    nannyConfirmedText: 'Votre nounou a accepté votre réservation et est prête à s\'occuper de vos enfants.',
    nannyProfileLabel: 'Votre Nounou',
    nannyExperience: 'Expérience',
    nannyLanguages: 'Langues',
    nannySpecialties: 'Spécialités',
    nannyRating: 'Évaluation',
    // Cancellation
    cancellationSubject: 'Réservation Annulée',
    cancellationText: 'Votre réservation a été annulée. Voici les détails :',
    cancellationReason: 'Raison',
    cancellationFeeNote: 'Des frais d\'annulation peuvent s\'appliquer car l\'annulation a été effectuée moins de 24h avant le service.',
    cancellationNoFee: 'Aucun frais d\'annulation — votre réservation a été annulée plus de 24h avant le service.',
    cancelledByLabel: 'Annulé par',
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
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

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
      ${row(s.totalPrice, `<strong style="color:#f97316;font-size:16px;">${data.totalPrice}€</strong>`)}
    </table>

    <!-- What happens next -->
    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.whatNext}</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">${s.whatNextText}</p>
    </div>

    <!-- Track Booking CTA -->
    <div style="margin:28px 0;padding:20px;background:linear-gradient(135deg,#fff7ed,#fdf2f8);border-radius:12px;text-align:center;border:1px solid #fed7aa;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.trackBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.trackBookingText}</p>
      <a href="${baseUrl}/booking/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(249,115,22,0.3);">${s.trackBookingBtn}</a>
    </div>

    <!-- Extend Booking CTA -->
    <div style="margin:28px 0;padding:20px;background-color:#eff6ff;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">🕐 ${s.extendBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.extendBookingText}</p>
      <a href="${baseUrl}/extend/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">${s.extendBookingBtn}</a>
    </div>

    <!-- Book Again CTA -->
    <div style="margin:28px 0;padding:20px;background-color:#fdf2f8;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.rebookTitle}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.rebookText}</p>
      <a href="${baseUrl}/rebook/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f97316);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(236,72,153,0.3);">${s.rebookBtn}</a>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  await resend.emails.send({
    from: fromAddress,
    to: data.clientEmail,
    cc: ['info@callanannycare.com'],
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
// Nanny Booking Assignment Email
// ============================================================

export interface NannyAssignmentEmailData {
  nannyName: string;
  nannyEmail: string;
  bookingId: number;
  clientName: string;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  hotel: string;
  childrenCount: number;
  totalPrice: number;
}

export async function sendNannyAssignmentEmail(data: NannyAssignmentEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Nanny assignment email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

  const dateDisplay = data.endDate && data.endDate !== data.date
    ? `${data.date} — ${data.endDate}`
    : data.date;

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">Hi ${data.nannyName}! 👋</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">You have been assigned a new booking. Here are the details:</p>

    ${sectionTitle('Booking Details')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row('Booking Ref', `#${data.bookingId}`)}
      ${row('Client', data.clientName)}
      ${row('Date', dateDisplay)}
      ${row('Time', `${data.startTime} - ${data.endTime}`)}
      ${row('Location', data.hotel || 'TBD')}
      ${row('Children', `${data.childrenCount}`)}
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}/nanny" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:50px;box-shadow:0 4px 14px rgba(249,115,22,0.3);">View in Nanny Portal</a>
    </div>

    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">What to do next</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Log in to the nanny portal to confirm and manage this booking. Make sure to clock in when you arrive!</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">If you have any questions, contact us at <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.nannyEmail,
      subject: `New Booking Assigned — ${data.clientName} on ${data.date}`,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send nanny assignment email:', err);
    return false;
  }
}

// ============================================================
// Nanny Booking Reminder Email
// ============================================================

export async function sendNannyReminderEmail(data: NannyAssignmentEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Reminder email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

  const dateDisplay = data.endDate && data.endDate !== data.date
    ? `${data.date} — ${data.endDate}`
    : data.date;

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">Reminder: Please Confirm ⏰</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">Hi ${data.nannyName}, this booking is still awaiting your confirmation. Please take action as soon as possible.</p>

    ${sectionTitle('Booking Details')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row('Booking Ref', `#${data.bookingId}`)}
      ${row('Client', data.clientName)}
      ${row('Date', dateDisplay)}
      ${row('Time', `${data.startTime} - ${data.endTime}`)}
      ${row('Location', data.hotel || 'TBD')}
      ${row('Children', `${data.childrenCount}`)}
    </table>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${baseUrl}/nanny" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:50px;box-shadow:0 4px 14px rgba(239,68,68,0.3);">Confirm Now in Nanny Portal</a>
    </div>

    <div style="margin:28px 0;padding:20px;background-color:#fef2f2;border-radius:12px;border-left:4px solid #ef4444;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">Action Required</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Please log in to the nanny portal and confirm or decline this booking. If you cannot take this booking, let us know so we can assign another nanny.</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">If you have any questions, contact us at <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.nannyEmail,
      subject: `⏰ Reminder: Please Confirm Booking #${data.bookingId} — ${data.clientName}`,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send nanny reminder email:', err);
    return false;
  }
}

// ============================================================
// Admin Registration Invitation Email
// ============================================================

export interface AdminInviteEmailData {
  adminName: string;
  adminEmail: string;
  registrationLink: string;
}

export async function sendAdminInviteEmail(data: AdminInviteEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Admin invite email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">Welcome, ${data.adminName}!</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">You've been invited to join <strong>Call a Nanny</strong> as an administrator.</p>

    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">Complete Your Registration</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">Click the button below to set your password and activate your admin account. You'll be able to manage bookings, nannies, invoices, and more.</p>
    </div>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <a href="${data.registrationLink}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:50px;box-shadow:0 4px 14px rgba(249,115,22,0.3);">Set Your Password</a>
    </div>

    <p style="margin:0 0 4px;color:#999;font-size:13px;text-align:center;">Or copy and paste this link into your browser:</p>
    <p style="margin:0 0 24px;color:#f97316;font-size:12px;text-align:center;word-break:break-all;">${data.registrationLink}</p>

    <div style="margin:24px 0;padding:16px;background-color:#fafafa;border-radius:8px;text-align:center;">
      <p style="margin:0;color:#999;font-size:13px;">Your login email: <strong style="color:#1a1a1a;">${data.adminEmail}</strong></p>
      <p style="margin:8px 0 0;color:#999;font-size:13px;">⏳ This link expires in <strong>24 hours</strong>.</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">If you have any questions, contact us at <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.adminEmail,
      subject: "You're invited as Admin - Call a Nanny",
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send admin invite email:', err);
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
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

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
      <p style="margin:0;color:#f97316;font-size:32px;font-weight:700;">${data.totalPrice}€</p>
      <p style="margin:8px 0 0;color:#999;font-size:12px;">${s.paymentNote}</p>
    </div>

    <!-- Book Again CTA -->
    <div style="margin:24px 0;padding:20px;background-color:#fdf2f8;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.rebookTitle}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.rebookText}</p>
      <a href="${baseUrl}/rebook/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f97316);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(236,72,153,0.3);">${s.rebookBtn}</a>
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

// ============================================================
// Parent Booking Reminder Email (24h before)
// ============================================================

export interface ParentReminderEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  hotel: string;
  childrenCount: number;
  nannyName: string;
  locale: string;
}

export async function sendParentReminderEmail(data: ParentReminderEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Parent reminder email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';
  const s = t(locale);
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

  const content = `
    <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">${s.greeting} ${data.clientName},</h2>
    <p style="margin:0 0 24px;color:#666;font-size:16px;line-height:1.5;">${s.reminderText}</p>

    ${sectionTitle(s.bookingDetails)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row(s.bookingRef, `#${data.bookingId}`)}
      ${row(s.dateOfService, data.date)}
      ${row(s.timeSlot, data.startTime && data.endTime ? `${data.startTime} - ${data.endTime}` : data.startTime)}
      ${row(s.accommodation, data.hotel || 'N/A')}
      ${row(s.children, `${data.childrenCount}`)}
      ${row(s.reminderNanny, data.nannyName)}
    </table>

    <!-- Track Booking CTA -->
    <div style="margin:28px 0;padding:20px;background:linear-gradient(135deg,#fff7ed,#fdf2f8);border-radius:12px;text-align:center;border:1px solid #fed7aa;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.trackBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.trackBookingText}</p>
      <a href="${baseUrl}/booking/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(249,115,22,0.3);">${s.trackBookingBtn}</a>
    </div>

    <!-- Extend Booking CTA -->
    <div style="margin:28px 0;padding:20px;background-color:#eff6ff;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">🕐 ${s.extendBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.extendBookingText}</p>
      <a href="${baseUrl}/extend/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">${s.extendBookingBtn}</a>
    </div>

    <div style="margin:28px 0;padding:20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <h3 style="margin:0 0 8px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.reminderSeeYou}</h3>
      <p style="margin:0;color:#666;font-size:14px;line-height:1.5;">${s.reminderContact}</p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      subject: `${s.reminderSubject} — ${data.date}`,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send parent reminder email:', err);
    return false;
  }
}

// ============================================================
// Nanny Confirmed Email (sent to parent when nanny accepts)
// ============================================================

export interface NannyConfirmedEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  hotel: string;
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  childrenCount: number;
  childrenAges: string;
  totalPrice: number;
  nannyName: string;
  nannyImage: string;
  nannyBio: string;
  nannyExperience: string;
  nannyRating: number;
  nannyLanguages: string[];
  nannySpecialties: string[];
  locale: string;
}

export async function sendNannyConfirmedEmail(data: NannyConfirmedEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Nanny confirmed email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';
  const s = t(locale);
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

  const dateDisplay = data.endDate && data.endDate !== data.date
    ? `${data.date} — ${data.endDate}`
    : data.date;

  const nannyPhoto = data.nannyImage
    ? `<img src="${data.nannyImage}" alt="${data.nannyName}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #fed7aa;display:block;margin:0 auto 12px;" />`
    : `<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ec4899);display:block;margin:0 auto 12px;text-align:center;line-height:80px;"><span style="color:#fff;font-size:28px;font-weight:700;">${data.nannyName.charAt(0)}</span></div>`;

  const starsCount = Math.min(Math.round(data.nannyRating), 5);
  const starsHtml = Array(starsCount).fill('&#11088;').join('');
  const languagesList = data.nannyLanguages.length > 0 ? data.nannyLanguages.join(' &middot; ') : 'N/A';
  const specialtiesTags = data.nannySpecialties
    .map(sp => `<span style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;color:#c2410c;font-size:11px;padding:3px 10px;border-radius:20px;margin:3px 3px 0 0;">${sp}</span>`)
    .join('');

  const content = `
    <!-- Congratulatory banner -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:48px;margin-bottom:8px;">&#127881;</div>
      <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:24px;font-family:Georgia,'Times New Roman',serif;">${s.nannyConfirmedGreeting}</h2>
      <p style="margin:0;color:#666;font-size:15px;line-height:1.5;">${s.nannyConfirmedText}</p>
    </div>

    <!-- Nanny Profile Card -->
    ${sectionTitle(s.nannyProfileLabel)}
    <div style="border:1px solid #fed7aa;border-radius:16px;overflow:hidden;margin-bottom:24px;">
      <div style="background:linear-gradient(135deg,#fff7ed,#fdf2f8);padding:24px;text-align:center;">
        ${nannyPhoto}
        <p style="margin:0;font-size:20px;font-weight:700;color:#1a1a1a;">${data.nannyName}</p>
        <p style="margin:4px 0 8px;color:#f97316;font-size:14px;">${starsHtml} ${data.nannyRating.toFixed(1)}</p>
        ${data.nannyBio ? `<p style="margin:0;color:#666;font-size:13px;font-style:italic;line-height:1.5;">${data.nannyBio}</p>` : ''}
      </div>
      <div style="padding:16px 20px;background:#fff;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row(s.nannyExperience, data.nannyExperience || 'N/A')}
          ${row(s.nannyLanguages, languagesList)}
          ${row(s.nannyRating, `${data.nannyRating.toFixed(1)} / 5`)}
        </table>
        ${data.nannySpecialties.length > 0 ? `
          <div style="margin-top:12px;">
            <p style="margin:0 0 6px;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${s.nannySpecialties}</p>
            <div>${specialtiesTags}</div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Booking Details -->
    ${sectionTitle(s.bookingDetails)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row(s.bookingRef, `#${data.bookingId}`)}
      ${row(s.dateOfService, dateDisplay)}
      ${row(s.timeSlot, `${data.startTime} - ${data.endTime}`)}
      ${row(s.accommodation, data.hotel || 'N/A')}
      ${row(s.children, `${data.childrenCount}${data.childrenAges ? ' (' + data.childrenAges + ')' : ''}`)}
      ${row(s.totalPrice, `<strong style="color:#f97316;font-size:16px;">${data.totalPrice}&euro;</strong>`)}
    </table>

    <!-- Track CTA -->
    <div style="margin:28px 0;padding:20px;background:linear-gradient(135deg,#fff7ed,#fdf2f8);border-radius:12px;text-align:center;border:1px solid #fed7aa;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.trackBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">${s.trackBookingText}</p>
      <a href="${baseUrl}/booking/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(249,115,22,0.3);">${s.trackBookingBtn}</a>
    </div>

    <!-- Extend + Rebook CTAs -->
    <div style="margin:28px 0;padding:20px;background-color:#eff6ff;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">&#128336; ${s.extendBooking}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.extendBookingText}</p>
      <a href="${baseUrl}/extend/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(59,130,246,0.3);">${s.extendBookingBtn}</a>
    </div>

    <div style="margin:28px 0;padding:20px;background-color:#fdf2f8;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.rebookTitle}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;line-height:1.5;">${s.rebookText}</p>
      <a href="${baseUrl}/rebook/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f97316);color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;box-shadow:0 2px 8px rgba(236,72,153,0.3);">${s.rebookBtn}</a>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      cc: ['info@callanannycare.com'],
      subject: s.nannyConfirmedSubject,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send nanny confirmed email:', err);
    return false;
  }
}

// ============================================================
// Cancellation Email (sent to parent when booking is cancelled)
// ============================================================

export interface CancellationEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  hotel: string;
  date: string;
  startTime: string;
  endTime: string;
  childrenCount: number;
  totalPrice: number;
  cancellationReason: string;
  cancelledBy: string;
  hasCancellationFee: boolean;
  locale: string;
}

export async function sendCancellationEmail(data: CancellationEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Cancellation email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';
  const s = t(locale);
  const baseUrl = process.env.SITE_URL || 'https://callanannycare.vercel.app';

  const cancelledByMap: Record<string, Record<string, string>> = {
    en: { admin: 'Call a Nanny Service', nanny: 'Your Nanny', parent: 'You' },
    fr: { admin: 'Service Call a Nanny', nanny: 'Votre Nounou', parent: 'Vous-m\u00eame' },
  };
  const cancelledByDisplay = cancelledByMap[locale]?.[data.cancelledBy] || data.cancelledBy;

  const content = `
    <!-- Cancellation banner -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">&#10060;</div>
      <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">${s.greeting} ${data.clientName},</h2>
      <p style="margin:0;color:#666;font-size:15px;">${s.cancellationText}</p>
    </div>

    <!-- Booking Details -->
    ${sectionTitle(s.bookingDetails)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;">
      ${row(s.bookingRef, `#${data.bookingId}`)}
      ${row(s.dateOfService, data.date)}
      ${row(s.timeSlot, `${data.startTime} - ${data.endTime}`)}
      ${row(s.accommodation, data.hotel || 'N/A')}
      ${row(s.children, `${data.childrenCount}`)}
      ${row(s.totalPrice, `${data.totalPrice}&euro;`)}
      ${data.cancellationReason ? row(s.cancellationReason, data.cancellationReason) : ''}
      ${row(s.cancelledByLabel, cancelledByDisplay)}
    </table>

    <!-- Fee notice -->
    <div style="margin:24px 0;padding:16px 20px;border-radius:12px;border-left:4px solid ${data.hasCancellationFee ? '#ef4444' : '#22c55e'};background:${data.hasCancellationFee ? '#fef2f2' : '#f0fdf4'};">
      <p style="margin:0;color:${data.hasCancellationFee ? '#991b1b' : '#166534'};font-size:14px;line-height:1.5;">
        ${data.hasCancellationFee ? s.cancellationFeeNote : s.cancellationNoFee}
      </p>
    </div>

    <!-- Rebook CTA -->
    <div style="margin:24px 0;padding:20px;background:#fdf2f8;border-radius:12px;text-align:center;">
      <h3 style="margin:0 0 6px;color:#1a1a1a;font-size:15px;font-weight:600;">${s.rebookTitle}</h3>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">${s.rebookText}</p>
      <a href="${baseUrl}/rebook/${data.bookingId}" style="display:inline-block;background:linear-gradient(135deg,#ec4899,#f97316);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:50px;">${s.rebookBtn}</a>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">${s.contactUs} <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      cc: ['info@callanannycare.com'],
      subject: `${s.cancellationSubject} #${data.bookingId}`,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send cancellation email:', err);
    return false;
  }
}

// ============================================================
// Review Request Email (sent to parent after booking completes)
// ============================================================

export interface ReviewRequestEmailData {
  bookingId: number;
  clientName: string;
  clientEmail: string;
  date: string;
  nannyName: string;
  reviewUrl: string;
  locale: string;
}

export async function sendReviewRequestEmail(data: ReviewRequestEmailData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Review request email skipped.');
    return false;
  }

  const resend = new Resend(apiKey);
  const locale: Locale = data.locale === 'fr' ? 'fr' : 'en';

  const subjectText = locale === 'fr'
    ? `Votre avis compte — Réservation #${data.bookingId}`
    : `How was your experience? — Booking #${data.bookingId}`;

  const greeting = locale === 'fr' ? 'Cher(e)' : 'Dear';
  const introText = locale === 'fr'
    ? `Nous espérons que vous avez apprécié le service de <strong>${data.nannyName}</strong> le ${data.date}. Votre avis nous aide à améliorer nos services !`
    : `We hope you enjoyed the service from <strong>${data.nannyName}</strong> on ${data.date}. Your feedback helps us improve!`;
  const ctaText = locale === 'fr' ? 'Laisser un Avis' : 'Leave a Review';
  const thankYouText = locale === 'fr' ? 'Merci beaucoup pour votre confiance !' : 'Thank you so much for trusting us!';
  const onlyMinute = locale === 'fr' ? 'Cela ne prend qu\'une minute !' : 'It only takes a minute!';

  const content = `
    <!-- Star banner -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">&#11088;</div>
      <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:24px;font-family:Georgia,'Times New Roman',serif;">${locale === 'fr' ? 'Votre Avis Compte !' : 'Your Feedback Matters!'}</h2>
    </div>

    <p style="margin:0 0 8px;color:#1a1a1a;font-size:16px;">${greeting} ${data.clientName},</p>
    <p style="margin:0 0 24px;color:#666;font-size:15px;line-height:1.5;">${introText}</p>

    <!-- CTA Button -->
    <div style="text-align:center;margin:32px 0;">
      <p style="margin:0 0 16px;color:#666;font-size:14px;">${onlyMinute}</p>
      <a href="${data.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#f97316,#ec4899);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:50px;box-shadow:0 4px 14px rgba(249,115,22,0.3);">⭐ ${ctaText}</a>
    </div>

    <div style="margin:24px 0;padding:16px;background-color:#fff7ed;border-radius:12px;text-align:center;border:1px solid #fed7aa;">
      <p style="margin:0;color:#666;font-size:13px;">${thankYouText}</p>
    </div>

    <p style="margin:0;color:#999;font-size:12px;text-align:center;">
      ${locale === 'fr' ? 'Ou copiez ce lien dans votre navigateur :' : 'Or copy and paste this link in your browser:'}
    </p>
    <p style="margin:4px 0 0;color:#f97316;font-size:11px;text-align:center;word-break:break-all;">${data.reviewUrl}</p>
  `;

  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.clientEmail,
      subject: subjectText,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send review request email:', err);
    return false;
  }
}

// ============================================================
// Rate Update Notification Email (sent to super admins when supervisor changes rates)
// ============================================================

export interface RateUpdateNotificationData {
  updatedByName: string;
  updatedByEmail: string;
  newRate: number;
  nannyCount: number;
  adminEmails: string[];
}

export async function sendRateUpdateNotificationEmail(data: RateUpdateNotificationData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured. Rate update notification email skipped.');
    return false;
  }

  if (data.adminEmails.length === 0) return false;

  const resend = new Resend(apiKey);
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'Call a Nanny <onboarding@resend.dev>';

  const content = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;margin-bottom:8px;">&#128178;</div>
      <h2 style="margin:0 0 6px;color:#1a1a1a;font-size:22px;font-family:Georgia,'Times New Roman',serif;">Nanny Rate Updated</h2>
      <p style="margin:0;color:#666;font-size:15px;">A supervisor has changed the hourly rate for all nannies.</p>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      ${row('Updated By', `${data.updatedByName} (${data.updatedByEmail})`)}
      ${row('New Hourly Rate', `<strong style="color:#f97316;font-size:16px;">${data.newRate} €/hr</strong>`)}
      ${row('Nannies Affected', `${data.nannyCount} nannies`)}
      ${row('Updated At', new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }))}
    </table>

    <div style="margin:24px 0;padding:16px 20px;background-color:#fff7ed;border-radius:12px;border-left:4px solid #f97316;">
      <p style="margin:0;color:#92400e;font-size:14px;line-height:1.5;">
        This is an automated notification. If this change was not expected, please review it in the admin dashboard and contact your team.
      </p>
    </div>

    <p style="margin:0;color:#999;font-size:13px;text-align:center;">Call a Nanny &mdash; <a href="mailto:info@callanannycare.com" style="color:#f97316;">info@callanannycare.com</a></p>
  `;

  try {
    await resend.emails.send({
      from: fromAddress,
      to: data.adminEmails,
      subject: `[Action] Nanny rates updated to ${data.newRate} €/hr by ${data.updatedByName}`,
      html: emailWrapper(content),
    });
    return true;
  } catch (err) {
    console.error('Failed to send rate update notification email:', err);
    return false;
  }
}
