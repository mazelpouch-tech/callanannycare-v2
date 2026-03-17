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
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
  // Condensed single-page layout — tighter spacing, smaller fonts, compact policy
  el.innerHTML = `
<style>
  .q-page { width: 520px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2d3748; background: #fff; }
  /* Compact header */
  .q-header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 16px 22px 14px; color: #fff; display: flex; gap: 14px; align-items: center; }
  .q-header-logo { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
  .q-header-info { flex: 1; }
  .q-header-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .q-header-num { font-size: 20px; font-weight: 800; margin: 1px 0 2px; }
  .q-header-date { font-size: 11px; opacity: 0.85; }
  .q-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 3px 12px; border-radius: 12px; font-size: 9px; font-weight: 700; letter-spacing: 2px; margin-top: 4px; }
  /* Body */
  .q-body { padding: 12px 20px 10px; }
  /* Addresses — inline row */
  .q-addresses { display: flex; gap: 16px; margin-bottom: 10px; }
  .q-addr { flex: 1; }
  .q-addr-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 3px; }
  .q-addr-name { font-size: 12px; font-weight: 700; color: #1a202c; margin-bottom: 2px; }
  .q-addr-line { font-size: 10px; color: #718096; line-height: 1.5; display: flex; align-items: center; gap: 4px; }
  .q-addr-line .q-icon { font-size: 10px; color: #a0937e; flex-shrink: 0; }
  /* Cards — merged service + price side by side */
  .q-cards-row { display: flex; gap: 10px; margin-bottom: 8px; }
  .q-card { flex: 1; background: #faf8f5; border: 1px solid #f0ece6; border-radius: 10px; padding: 10px 12px; }
  .q-card-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8a7e6e; margin-bottom: 6px; }
  .q-card-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid #f0ece6; }
  .q-card-row:last-child { border-bottom: none; }
  .q-card-row-label { font-size: 10px; color: #5a5a5a; display: flex; align-items: center; gap: 4px; }
  .q-card-row-label .q-icon { font-size: 11px; color: #a0937e; }
  .q-card-row-value { font-size: 11px; font-weight: 700; color: #1a202c; }
  .q-taxi-row .q-card-row-label { color: #c2703a; }
  .q-taxi-row .q-card-row-label .q-icon { color: #c2703a; }
  .q-taxi-row .q-card-row-value { color: #c2703a; }
  /* Total — compact */
  .q-total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 10px; padding: 14px; text-align: center; }
  .q-total-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 2px; }
  .q-total-amount { font-size: 28px; font-weight: 800; color: #fff; }
  .q-total-amount .q-currency { font-size: 18px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .q-total-dh { font-size: 11px; color: rgba(255,255,255,0.75); margin-top: 1px; }
  /* Notes — compact */
  .q-notes-box { background: #fffbf5; border: 1px dashed #e8d5c0; border-radius: 8px; padding: 8px 12px; margin-top: 8px; }
  .q-notes-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 2px; }
  .q-notes-text { font-size: 10px; color: #5a5a5a; line-height: 1.4; }
  /* Policy — condensed single block */
  .q-policy { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 8px; padding: 10px 12px; margin-top: 8px; }
  .q-policy-title { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #8a7e6e; margin-bottom: 5px; }
  .q-policy-text { font-size: 9px; color: #5a5a5a; line-height: 1.5; }
  .q-policy-text span { color: #c2703a; font-weight: 600; }
  /* Footer — single line */
  .q-footer { text-align: center; padding: 10px 20px; border-top: 1px solid #f0ece6; margin-top: 8px; }
  .q-footer-line { font-size: 9px; color: #a0937e; }
  .q-footer-line strong { color: #c2703a; font-weight: 700; }
  .q-footer-valid { font-size: 8px; color: #c2703a; font-weight: 600; margin-top: 4px; }
</style>

<div class="q-page">
  <div class="q-header">
    <img src="${INVOICE_LOGO_BASE64}" alt="Call a Nanny" class="q-header-logo" />
    <div class="q-header-info">
      <div class="q-header-label">QUOTE</div>
      <div class="q-header-num">${ref}</div>
      <div class="q-header-date">${dateStr}</div>
      <div class="q-badge">ESTIMATE</div>
    </div>
  </div>

  <div class="q-body">
    <div class="q-addresses">
      <div class="q-addr">
        <div class="q-addr-label">FROM</div>
        <div class="q-addr-name">Call a Nanny</div>
        <div class="q-addr-line">Professional Childcare · Marrakech</div>
      </div>
      ${data.parentName || data.hotel ? `<div class="q-addr">
        <div class="q-addr-label">PREPARED FOR</div>
        ${data.parentName ? `<div class="q-addr-name">${data.parentName}</div>` : ""}
        ${data.childName ? `<div class="q-addr-line"><span class="q-icon">&#128118;</span> ${data.childName}</div>` : ""}
        ${data.hotel ? `<div class="q-addr-line"><span class="q-icon">&#127976;</span> ${data.hotel}</div>` : ""}
      </div>` : ""}
    </div>

    <div class="q-cards-row">
      <div class="q-card">
        <div class="q-card-title">SERVICE</div>
        <div class="q-card-row">
          <span class="q-card-row-label"><span class="q-icon">&#128197;</span> Duration</span>
          <span class="q-card-row-value">${data.days} day${data.days > 1 ? "s" : ""}</span>
        </div>
        <div class="q-card-row">
          <span class="q-card-row-label"><span class="q-icon">&#9201;</span> Per day</span>
          <span class="q-card-row-value">${data.hoursPerDay}h</span>
        </div>
        <div class="q-card-row">
          <span class="q-card-row-label"><span class="q-icon">&#128336;</span> Total</span>
          <span class="q-card-row-value">${totalHours}h</span>
        </div>
        <div class="q-card-row">
          <span class="q-card-row-label">${data.isEvening ? `<span class="q-icon">&#127769;</span> Evening` : `<span class="q-icon">&#9728;</span> Daytime`}</span>
          <span class="q-card-row-value">${data.isEvening ? "Yes" : "No"}</span>
        </div>
      </div>

      <div class="q-card">
        <div class="q-card-title">PRICING</div>
        <div class="q-card-row">
          <span class="q-card-row-label">${totalHours}h × ${data.rate}€</span>
          <span class="q-card-row-value">${baseCost}€</span>
        </div>
        ${data.isEvening ? `<div class="q-card-row q-taxi-row">
          <span class="q-card-row-label"><span class="q-icon">&#128663;</span> Taxi ×${data.days}</span>
          <span class="q-card-row-value">+${taxiTotal}€</span>
        </div>` : ""}
      </div>
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
      <div class="q-policy-text">
        Quote valid <span>${validDays} days</span> from issue.
        Minimum <span>3 hours</span> per booking.
        Evening bookings (after 7 PM) include <span>${data.taxiFee}€ taxi supplement</span>/day.
        Payment due at end of session — cash (EUR/MAD) or bank transfer.
        Cancellations require <span>4 hours notice</span>.
        All nannies are experienced & background-checked.
        Final amount may vary if extra hours are requested.
      </div>
    </div>
  </div>

  <div class="q-footer">
    <div class="q-footer-line"><strong>Call a Nanny</strong> · Professional Childcare · Marrakech · callanannycare.vercel.app</div>
    <div class="q-footer-valid">Valid ${validDays} days from ${dateStr}</div>
  </div>
</div>`;

  return { el, ref };
}

function getHtml2PdfOptions(filename: string) {
  return {
    margin: [4, 4, 4, 4],
    filename,
    image: { type: "jpeg", quality: 0.95 },
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
