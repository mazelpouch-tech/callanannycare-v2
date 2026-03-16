import html2pdf from "html2pdf.js";
import { INVOICE_LOGO_BASE64 } from "./invoicePdf";

export interface QuotePdfData {
  /** Parent / client name */
  parentName?: string;
  /** Child name(s) */
  childName?: string;
  /** Hotel / accommodation */
  hotel?: string;
  /** Number of days */
  days: number;
  /** Hours per day */
  hoursPerDay: number;
  /** Whether evening/night booking (adds taxi supplement) */
  isEvening: boolean;
  /** Rate per hour in EUR */
  rate: number;
  /** Taxi supplement per day in EUR */
  taxiFee: number;
  /** Additional notes */
  notes?: string;
  /** Quote reference number (auto-generated if omitted) */
  quoteRef?: string;
  /** Date string for the quote */
  date?: string;
  /** EUR→DH exchange rate */
  exchangeRate?: number;
}

function fmtDate(d?: string): string {
  if (d) return d;
  const now = new Date();
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function generateQuoteRef(): string {
  const now = new Date();
  const y = String(now.getFullYear()).slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const r = String(Math.floor(Math.random() * 900) + 100);
  return `Q-${y}${m}-${r}`;
}

function buildQuoteElement(data: QuotePdfData): { el: HTMLDivElement; ref: string } {
  const ref = data.quoteRef || generateQuoteRef();
  const dateStr = fmtDate(data.date);
  const totalHours = data.days * data.hoursPerDay;
  const baseCost = data.rate * totalHours;
  const taxiTotal = data.isEvening ? data.taxiFee * data.days : 0;
  const total = baseCost + taxiTotal;
  const totalDH = data.exchangeRate ? Math.round(total * data.exchangeRate) : null;
  const validDays = 7;

  const el = document.createElement("div");
  el.innerHTML = `
<style>
  .q-page { width: 520px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748; background: #fff; }
  .q-header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 28px 28px 22px; color: #fff; }
  .q-header-logo { width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px; }
  .q-header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .q-header-num { font-size: 26px; font-weight: 800; margin: 2px 0 4px; }
  .q-header-date { font-size: 13px; opacity: 0.85; }
  .q-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 2px; margin-top: 8px; }
  .q-body { padding: 20px 24px 24px; }
  .q-addresses { display: flex; gap: 20px; margin-bottom: 18px; }
  .q-addr { flex: 1; }
  .q-addr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 6px; }
  .q-addr-name { font-size: 15px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .q-addr-line { font-size: 12px; color: #718096; line-height: 1.7; display: flex; align-items: center; gap: 6px; }
  .q-addr-line .q-icon { font-size: 12px; color: #a0937e; flex-shrink: 0; }
  .q-card { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; padding: 14px 18px; margin-bottom: 12px; }
  .q-card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 10px; }
  .q-card-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0ece6; }
  .q-card-row:last-child { border-bottom: none; }
  .q-card-row-label { font-size: 13px; color: #5a5a5a; display: flex; align-items: center; gap: 8px; }
  .q-card-row-label .q-icon { font-size: 14px; color: #a0937e; }
  .q-card-row-value { font-size: 14px; font-weight: 700; color: #1a202c; }
  .q-taxi-row .q-card-row-label { color: #c2703a; }
  .q-taxi-row .q-card-row-label .q-icon { color: #c2703a; }
  .q-taxi-row .q-card-row-value { color: #c2703a; }
  .q-total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 14px; padding: 20px; text-align: center; margin-top: 6px; }
  .q-total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .q-total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .q-total-amount .q-currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .q-total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .q-policy { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; padding: 16px 18px; margin-top: 14px; }
  .q-policy-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 10px; }
  .q-policy-item { font-size: 11px; color: #5a5a5a; line-height: 1.6; padding: 3px 0; display: flex; gap: 8px; }
  .q-policy-item .q-bullet { color: #c2703a; font-weight: 700; flex-shrink: 0; }
  .q-notes-box { background: #fffbf5; border: 1px dashed #e8d5c0; border-radius: 12px; padding: 12px 16px; margin-top: 12px; }
  .q-notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 4px; }
  .q-notes-text { font-size: 12px; color: #5a5a5a; line-height: 1.5; }
  .q-footer { text-align: center; padding: 18px 24px 22px; border-top: 1px solid #f0ece6; margin-top: 16px; }
  .q-footer-brand { font-size: 14px; font-weight: 700; color: #c2703a; }
  .q-footer-tagline { font-size: 11px; color: #a0937e; margin-top: 2px; }
  .q-footer-contact { font-size: 10px; color: #a0937e; margin-top: 6px; }
  .q-footer-valid { font-size: 10px; color: #c2703a; font-weight: 600; margin-top: 8px; padding: 6px 14px; background: #fff5ee; border-radius: 8px; display: inline-block; }
</style>

<div class="q-page">
  <div class="q-header">
    <img src="${INVOICE_LOGO_BASE64}" alt="Call a Nanny" class="q-header-logo" />
    <div class="q-header-label">QUOTE</div>
    <div class="q-header-num">${ref}</div>
    <div class="q-header-date">${dateStr}</div>
    <div class="q-badge">ESTIMATE</div>
  </div>

  <div class="q-body">
    <div class="q-addresses">
      <div class="q-addr">
        <div class="q-addr-label">FROM</div>
        <div class="q-addr-name">Call a Nanny</div>
        <div class="q-addr-line">Professional Childcare</div>
        <div class="q-addr-line">Marrakech, Morocco</div>
      </div>
      ${data.parentName || data.hotel ? `<div class="q-addr">
        <div class="q-addr-label">PREPARED FOR</div>
        ${data.parentName ? `<div class="q-addr-name">${data.parentName}</div>` : ""}
        ${data.childName ? `<div class="q-addr-line"><span class="q-icon">&#128118;</span> ${data.childName}</div>` : ""}
        ${data.hotel ? `<div class="q-addr-line"><span class="q-icon">&#127976;</span> ${data.hotel}</div>` : ""}
      </div>` : ""}
    </div>

    <div class="q-card">
      <div class="q-card-title">SERVICE DETAILS</div>
      <div class="q-card-row">
        <span class="q-card-row-label"><span class="q-icon">&#128197;</span> Duration</span>
        <span class="q-card-row-value">${data.days} day${data.days > 1 ? "s" : ""}</span>
      </div>
      <div class="q-card-row">
        <span class="q-card-row-label"><span class="q-icon">&#9201;</span> Hours per Day</span>
        <span class="q-card-row-value">${data.hoursPerDay}h</span>
      </div>
      <div class="q-card-row">
        <span class="q-card-row-label"><span class="q-icon">&#128336;</span> Total Hours</span>
        <span class="q-card-row-value">${totalHours}h</span>
      </div>
      ${data.isEvening ? `<div class="q-card-row">
        <span class="q-card-row-label"><span class="q-icon">&#127769;</span> Schedule</span>
        <span class="q-card-row-value">Evening / Night</span>
      </div>` : `<div class="q-card-row">
        <span class="q-card-row-label"><span class="q-icon">&#9728;</span> Schedule</span>
        <span class="q-card-row-value">Daytime</span>
      </div>`}
    </div>

    <div class="q-card">
      <div class="q-card-title">PRICE BREAKDOWN</div>
      <div class="q-card-row">
        <span class="q-card-row-label">${totalHours}h × ${data.rate}€/hr</span>
        <span class="q-card-row-value">${baseCost}€</span>
      </div>
      ${data.isEvening ? `<div class="q-card-row q-taxi-row">
        <span class="q-card-row-label"><span class="q-icon">&#128663;</span> Taxi supplement (${data.taxiFee}€ × ${data.days} day${data.days > 1 ? "s" : ""})</span>
        <span class="q-card-row-value">+${taxiTotal}€</span>
      </div>` : ""}
    </div>

    <div class="q-total-box">
      <div class="q-total-label">ESTIMATED TOTAL</div>
      <div class="q-total-amount">${total}<span class="q-currency">€</span></div>
      ${totalDH !== null ? `<div class="q-total-dh">≈ ${totalDH.toLocaleString()} DH</div>` : ""}
    </div>

    ${data.notes ? `<div class="q-notes-box">
      <div class="q-notes-label">Notes</div>
      <div class="q-notes-text">${data.notes.replace(/\n/g, "<br/>")}</div>
    </div>` : ""}

    <div class="q-policy">
      <div class="q-policy-title">Terms & Conditions</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> This quote is valid for ${validDays} days from the date of issue.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> A minimum booking of 3 hours applies to all reservations.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> Evening & night bookings (after 7 PM) include a ${data.taxiFee}€ taxi supplement per day for nanny transport.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> Payment is due at the end of each session. We accept cash (EUR or MAD) and bank transfer.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> Cancellations must be made at least 4 hours before the scheduled start time to avoid a cancellation fee.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> All nannies are experienced, background-checked childcare professionals.</div>
      <div class="q-policy-item"><span class="q-bullet">●</span> Final invoice amount may vary if additional hours are requested during the session.</div>
    </div>
  </div>

  <div class="q-footer">
    <div class="q-footer-brand">Call a Nanny</div>
    <div class="q-footer-tagline">Professional Childcare in Marrakech</div>
    <div class="q-footer-contact">callanannycare.vercel.app</div>
    <div class="q-footer-valid">Valid for ${validDays} days from ${dateStr}</div>
  </div>
</div>`;

  return { el, ref };
}

function getHtml2PdfOptions(filename: string) {
  return {
    margin: [2, 0, 2, 0],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
  };
}

/** Generate a real PDF blob from quote data */
export async function generateQuotePdfBlob(data: QuotePdfData): Promise<{ blob: Blob; filename: string }> {
  const { el, ref } = buildQuoteElement(data);
  document.body.appendChild(el);

  try {
    const filename = `Quote_${ref}.pdf`;
    const blob: Blob = await html2pdf()
      .set(getHtml2PdfOptions(filename))
      .from(el)
      .outputPdf("blob");
    return { blob, filename };
  } finally {
    document.body.removeChild(el);
  }
}

/** Download quote as a real PDF file */
export async function downloadQuotePdf(data: QuotePdfData): Promise<void> {
  const { el, ref } = buildQuoteElement(data);
  document.body.appendChild(el);

  try {
    const filename = `Quote_${ref}.pdf`;
    await html2pdf()
      .set(getHtml2PdfOptions(filename))
      .from(el)
      .save();
  } finally {
    document.body.removeChild(el);
  }
}

/** Share quote as a real PDF file via Web Share API, falls back to download */
export async function shareQuotePdf(data: QuotePdfData): Promise<void> {
  const { blob, filename } = await generateQuotePdfBlob(data);
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Quote ${data.quoteRef || ""} — Call a Nanny`,
        files: [file],
      });
      return;
    } catch (err) {
      // User cancelled or share failed — fall back to download
      if (err instanceof Error && err.name === "AbortError") return;
    }
  }

  // Fallback: direct download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
