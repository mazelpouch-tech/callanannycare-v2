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

export function buildQuoteHtml(data: QuotePdfData): string {
  const ref = data.quoteRef || generateQuoteRef();
  const dateStr = fmtDate(data.date);
  const totalHours = data.days * data.hoursPerDay;
  const baseCost = data.rate * totalHours;
  const taxiTotal = data.isEvening ? data.taxiFee * data.days : 0;
  const total = baseCost + taxiTotal;
  const totalDH = data.exchangeRate ? Math.round(total * data.exchangeRate) : null;
  const validDays = 7;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Quote ${ref} — Call a Nanny</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #fff; }
  .page { max-width: 520px; margin: 0 auto; background: #fff; overflow: hidden; }

  /* ── Header ── */
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 28px 28px 22px; color: #fff; position: relative; }
  .header-logo { width: 48px; height: 48px; border-radius: 12px; margin-bottom: 8px; }
  .header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .header-num { font-size: 26px; font-weight: 800; margin: 2px 0 4px; }
  .header-date { font-size: 13px; opacity: 0.85; }
  .quote-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 5px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 2px; margin-top: 8px; }

  /* ── Body ── */
  .body-content { padding: 20px 24px 24px; }

  /* Addresses */
  .addresses { display: flex; gap: 20px; margin-bottom: 18px; }
  .addr { flex: 1; }
  .addr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 6px; }
  .addr-name { font-size: 15px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .addr-line { font-size: 12px; color: #718096; line-height: 1.7; display: flex; align-items: center; gap: 6px; }
  .addr-line .icon { font-size: 12px; color: #a0937e; flex-shrink: 0; }

  /* Cards */
  .card { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; padding: 14px 18px; margin-bottom: 12px; }
  .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 10px; }
  .card-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0ece6; }
  .card-row:last-child { border-bottom: none; }
  .card-row-label { font-size: 13px; color: #5a5a5a; display: flex; align-items: center; gap: 8px; }
  .card-row-label .icon { font-size: 14px; color: #a0937e; }
  .card-row-value { font-size: 14px; font-weight: 700; color: #1a202c; }
  .taxi-row .card-row-label { color: #c2703a; }
  .taxi-row .card-row-label .icon { color: #c2703a; }
  .taxi-row .card-row-value { color: #c2703a; }

  /* Total */
  .total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 14px; padding: 20px; text-align: center; margin-top: 6px; }
  .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }

  /* Policy */
  .policy { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; padding: 16px 18px; margin-top: 14px; }
  .policy-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 10px; }
  .policy-item { font-size: 11px; color: #5a5a5a; line-height: 1.6; padding: 3px 0; display: flex; gap: 8px; }
  .policy-item .bullet { color: #c2703a; font-weight: 700; flex-shrink: 0; }

  /* Notes */
  .notes-box { background: #fffbf5; border: 1px dashed #e8d5c0; border-radius: 12px; padding: 12px 16px; margin-top: 12px; }
  .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 4px; }
  .notes-text { font-size: 12px; color: #5a5a5a; line-height: 1.5; }

  /* Footer */
  .footer { text-align: center; padding: 18px 24px 22px; border-top: 1px solid #f0ece6; margin-top: 16px; }
  .footer-brand { font-size: 14px; font-weight: 700; color: #c2703a; }
  .footer-tagline { font-size: 11px; color: #a0937e; margin-top: 2px; }
  .footer-contact { font-size: 10px; color: #a0937e; margin-top: 6px; }
  .footer-valid { font-size: 10px; color: #c2703a; font-weight: 600; margin-top: 8px; padding: 6px 14px; background: #fff5ee; border-radius: 8px; display: inline-block; }

  /* Action bar */
  .back-bar { max-width: 520px; margin: 0 auto; padding: 12px 16px; display: flex; gap: 8px; position: sticky; top: 0; z-index: 100; background: #fff; }
  .back-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .back-btn.close { background: linear-gradient(135deg, #c2703a 0%, #e8956e 100%); color: #fff; }
  .back-btn.print { background: #f0ece6; color: #5a5a5a; }
  .back-btn.share { background: #e8f4e8; color: #16a34a; }

  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .page { max-width: 100%; margin: 0; }
    .back-bar { display: none !important; }
    @page { margin: 6mm; size: A4; }
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .header { break-after: avoid; }
    .body-content { break-before: avoid; }
  }
</style>
</head><body>
<script>
function goBack(){try{window.close()}catch(e){}setTimeout(function(){if(!window.closed){history.length>1?history.back():location.href='/'}},400)}
function sharePdf(){
  var title=document.title||'Quote';
  var html='<!DOCTYPE html>'+document.documentElement.outerHTML;
  var blob=new Blob([html],{type:'text/html'});
  var file=new File([blob],title.replace(/[^a-zA-Z0-9-_#]/g,'_')+'.html',{type:'text/html'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({title:title,files:[file]}).catch(function(){window.print()});
  }else if(navigator.share){
    navigator.share({title:title,text:title+' - Call a Nanny'}).catch(function(){window.print()});
  }else{window.print()}
}
</script>

<div class="back-bar">
  <button class="back-btn close" onclick="goBack()">&#8592; Back</button>
  <button class="back-btn print" onclick="window.print()">&#128424; Save PDF</button>
  <button class="back-btn share" onclick="sharePdf()">&#8599; Share</button>
</div>

<div class="page">
  <div class="header">
    <img src="${INVOICE_LOGO_BASE64}" alt="Call a Nanny" class="header-logo" />
    <div class="header-label">QUOTE</div>
    <div class="header-num">${ref}</div>
    <div class="header-date">${dateStr}</div>
    <div class="quote-badge">ESTIMATE</div>
  </div>

  <div class="body-content">
    <div class="addresses">
      <div class="addr">
        <div class="addr-label">FROM</div>
        <div class="addr-name">Call a Nanny</div>
        <div class="addr-line">Professional Childcare</div>
        <div class="addr-line">Marrakech, Morocco</div>
      </div>
      ${data.parentName || data.hotel ? `<div class="addr">
        <div class="addr-label">PREPARED FOR</div>
        ${data.parentName ? `<div class="addr-name">${data.parentName}</div>` : ""}
        ${data.childName ? `<div class="addr-line"><span class="icon">&#128118;</span> ${data.childName}</div>` : ""}
        ${data.hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${data.hotel}</div>` : ""}
      </div>` : ""}
    </div>

    <div class="card">
      <div class="card-title">SERVICE DETAILS</div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128197;</span> Duration</span>
        <span class="card-row-value">${data.days} day${data.days > 1 ? "s" : ""}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#9201;</span> Hours per Day</span>
        <span class="card-row-value">${data.hoursPerDay}h</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128336;</span> Total Hours</span>
        <span class="card-row-value">${totalHours}h</span>
      </div>
      ${data.isEvening ? `<div class="card-row">
        <span class="card-row-label"><span class="icon">&#127769;</span> Schedule</span>
        <span class="card-row-value">Evening / Night</span>
      </div>` : `<div class="card-row">
        <span class="card-row-label"><span class="icon">&#9728;</span> Schedule</span>
        <span class="card-row-value">Daytime</span>
      </div>`}
    </div>

    <div class="card">
      <div class="card-title">PRICE BREAKDOWN</div>
      <div class="card-row">
        <span class="card-row-label">${totalHours}h &times; ${data.rate}&euro;/hr</span>
        <span class="card-row-value">${baseCost}&euro;</span>
      </div>
      ${data.isEvening ? `<div class="card-row taxi-row">
        <span class="card-row-label"><span class="icon">&#128663;</span> Taxi supplement (${data.taxiFee}&euro; &times; ${data.days} day${data.days > 1 ? "s" : ""})</span>
        <span class="card-row-value">+${taxiTotal}&euro;</span>
      </div>` : ""}
    </div>

    <div class="total-box">
      <div class="total-label">ESTIMATED TOTAL</div>
      <div class="total-amount">${total}<span class="currency">&euro;</span></div>
      ${totalDH !== null ? `<div class="total-dh">&asymp; ${totalDH.toLocaleString()} DH</div>` : ""}
    </div>

    ${data.notes ? `<div class="notes-box">
      <div class="notes-label">Notes</div>
      <div class="notes-text">${data.notes.replace(/\n/g, "<br/>")}</div>
    </div>` : ""}

    <div class="policy">
      <div class="policy-title">Terms &amp; Conditions</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> This quote is valid for ${validDays} days from the date of issue.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> A minimum booking of 3 hours applies to all reservations.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> Evening &amp; night bookings (after 7 PM) include a ${data.taxiFee}&euro; taxi supplement per day for nanny transport.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> Payment is due at the end of each session. We accept cash (EUR or MAD) and bank transfer.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> Cancellations must be made at least 4 hours before the scheduled start time to avoid a cancellation fee.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> All nannies are experienced, background-checked childcare professionals.</div>
      <div class="policy-item"><span class="bullet">&#9679;</span> Final invoice amount may vary if additional hours are requested during the session.</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-brand">Call a Nanny</div>
    <div class="footer-tagline">Professional Childcare in Marrakech</div>
    <div class="footer-contact">callanannycare.vercel.app</div>
    <div class="footer-valid">Valid for ${validDays} days from ${dateStr}</div>
  </div>
</div>
</body></html>`;
}

export function downloadQuotePdf(data: QuotePdfData): void {
  const html = buildQuoteHtml(data);
  const ref = data.quoteRef || "Quote";
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    };
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ref}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
