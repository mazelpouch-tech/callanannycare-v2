import { INVOICE_LOGO_BASE64 } from "./invoicePdf";

export interface QuotePdfData {
  parentName?: string;
  childName?: string;
  hotel?: string;
  days: number;
  hoursPerDay: number;
  isEvening: boolean;
  rate: number;
  taxiFee: number;
  notes?: string;
  quoteRef?: string;
  date?: string;
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

/**
 * Build a standalone HTML document that looks exactly like the original
 * invoice-style quote. The page includes Back / Save PDF / Share PDF buttons.
 * Save PDF & Share PDF use html2pdf.js (loaded from CDN) to produce a real
 * PDF from the rendered page — so the PDF matches what the user sees.
 */
function buildQuoteHtml(data: QuotePdfData): { html: string; ref: string } {
  const ref = data.quoteRef || generateQuoteRef();
  const dateStr = fmtDate(data.date);
  const totalHours = data.days * data.hoursPerDay;
  const baseCost = data.rate * totalHours;
  const taxiTotal = data.isEvening ? data.taxiFee * data.days : 0;
  const total = baseCost + taxiTotal;
  const totalDH = data.exchangeRate ? Math.round(total * data.exchangeRate) : null;
  const validDays = 7;

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Quote ${ref} — Call a Nanny</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #f5f5f5; padding: 0; margin: 0; }
  .page { width: 794px; min-height: 1100px; margin: 0 auto; background: #fff; overflow: hidden; }
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 36px 44px 28px; color: #fff; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .header-label { font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; opacity: 0.85; }
  .header-num { font-size: 40px; font-weight: 800; margin: 4px 0 4px; }
  .header-date { font-size: 18px; opacity: 0.85; }
  .header-logo { width: 85px; height: 85px; border-radius: 16px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 6px; }
  .quote-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 8px 26px; border-radius: 24px; font-size: 18px; font-weight: 700; letter-spacing: 3px; margin-top: 8px; }
  .body-content { padding: 28px 44px 32px; }
  .addresses { display: flex; gap: 32px; margin-bottom: 24px; }
  .addr { flex: 1; }
  .addr-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #a0937e; margin-bottom: 8px; }
  .addr-name { font-size: 22px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .addr-line { font-size: 16px; color: #718096; line-height: 1.6; display: flex; align-items: center; gap: 8px; }
  .addr-line .icon { font-size: 16px; color: #a0937e; flex-shrink: 0; }
  .card { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 16px; padding: 20px 28px; margin-bottom: 16px; }
  .card-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #8a7e6e; margin-bottom: 12px; }
  .card-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0ece6; }
  .card-row:last-child { border-bottom: none; }
  .card-row-label { font-size: 18px; color: #5a5a5a; display: flex; align-items: center; gap: 10px; }
  .card-row-label .icon { font-size: 18px; color: #a0937e; }
  .card-row-value { font-size: 18px; font-weight: 700; color: #1a202c; }
  .taxi-row .card-row-label { color: #c2703a; }
  .taxi-row .card-row-label .icon { color: #c2703a; }
  .taxi-row .card-row-value { color: #c2703a; }
  .total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 16px; padding: 24px; text-align: center; margin-top: 8px; }
  .total-label { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 52px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 30px; font-weight: 600; vertical-align: super; margin-left: 3px; opacity: 0.85; }
  .total-dh { font-size: 18px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .policy { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 16px; padding: 20px 28px; margin-top: 16px; }
  .policy-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2.5px; color: #8a7e6e; margin-bottom: 12px; }
  .policy-item { font-size: 14px; color: #5a5a5a; line-height: 1.5; padding: 3px 0; display: flex; gap: 10px; }
  .policy-item .bullet { color: #c2703a; font-weight: 700; flex-shrink: 0; }
  .notes-section { margin-top: 16px; padding: 16px 24px; background: #fffbf5; border: 1px dashed #e8d5c0; border-radius: 16px; }
  .notes-label { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #a0937e; margin-bottom: 6px; }
  .notes-text { font-size: 16px; color: #5a5a5a; line-height: 1.5; white-space: pre-wrap; }
  .footer { text-align: center; padding: 20px 44px; border-top: 1px solid #f0ece6; margin-top: 16px; }
  .footer-brand { font-size: 20px; font-weight: 700; color: #c2703a; margin-bottom: 2px; }
  .footer-line { font-size: 15px; color: #a0937e; line-height: 1.6; }
  .footer-valid { font-size: 13px; color: #c2703a; font-weight: 600; margin-top: 10px; padding: 8px 20px; background: #fff5ee; border-radius: 10px; display: inline-block; }
  .back-bar { max-width: 794px; margin: 0 auto; padding: 12px 16px; display: flex; gap: 8px; position: sticky; top: 0; z-index: 100; background: #fff; }
  .back-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; transition: opacity 0.2s; }
  .back-btn:disabled { opacity: 0.5; pointer-events: none; }
  .back-btn.close { background: linear-gradient(135deg, #c2703a 0%, #e8956e 100%); color: #fff; }
  .back-btn.print { background: #f0ece6; color: #5a5a5a; }
  .back-btn.share { background: #e8f4e8; color: #16a34a; }
  .spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .page { width: 100%; margin: 0; }
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

function savePdf(){
  var btn=document.getElementById('saveBtn');
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Saving…';
  var el=document.querySelector('.page');
  html2pdf().set({
    margin:[2,0,2,0],
    filename:'Quote_${ref}.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,letterRendering:true},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  }).from(el).save().then(function(){
    btn.disabled=false;btn.innerHTML='&#128424; Save PDF';
  }).catch(function(){
    btn.disabled=false;btn.innerHTML='&#128424; Save PDF';
    window.print();
  });
}

function sharePdf(){
  var btn=document.getElementById('shareBtn');
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Preparing…';
  var el=document.querySelector('.page');
  html2pdf().set({
    margin:[2,0,2,0],
    filename:'Quote_${ref}.pdf',
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,letterRendering:true},
    jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}
  }).from(el).outputPdf('blob').then(function(blob){
    var file=new File([blob],'Quote_${ref}.pdf',{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({title:'Quote ${ref} — Call a Nanny',files:[file]}).catch(function(){}).finally(function(){
        btn.disabled=false;btn.innerHTML='&#8599; Share PDF';
      });
    }else{
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');a.href=url;a.download='Quote_${ref}.pdf';a.click();
      setTimeout(function(){URL.revokeObjectURL(url)},5000);
      btn.disabled=false;btn.innerHTML='&#8599; Share PDF';
    }
  }).catch(function(){
    btn.disabled=false;btn.innerHTML='&#8599; Share PDF';
    window.print();
  });
}
<\/script>

<div class="back-bar">
  <button class="back-btn close" onclick="goBack()">&#8592; Back</button>
  <button class="back-btn print" id="saveBtn" onclick="savePdf()">&#128424; Save PDF</button>
  <button class="back-btn share" id="shareBtn" onclick="sharePdf()">&#8599; Share PDF</button>
</div>

<div class="page">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="header-label">QUOTE</div>
        <div class="header-num">#${ref}</div>
        <div class="header-date">${dateStr}</div>
      </div>
      <img class="header-logo" src="${INVOICE_LOGO_BASE64}" alt="Call a Nanny" />
    </div>
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
      <div class="addr">
        <div class="addr-label">PREPARED FOR</div>
        <div class="addr-name">${data.parentName || "Parent"}</div>
        ${data.childName ? `<div class="addr-line"><span class="icon">&#128118;</span> Child: ${data.childName}</div>` : ""}
        ${data.hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${data.hotel}</div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">SERVICE DETAILS</div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128197;</span> Number of Days</span>
        <span class="card-row-value">${data.days} day${data.days > 1 ? "s" : ""}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#9201;</span> Hours per Day</span>
        <span class="card-row-value">${data.hoursPerDay}h</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128338;</span> Total Hours</span>
        <span class="card-row-value">${totalHours}h</span>
      </div>
      ${data.isEvening ? `<div class="card-row">
        <span class="card-row-label"><span class="icon">&#127769;</span> Schedule</span>
        <span class="card-row-value">Evening / Night</span>
      </div>` : `<div class="card-row">
        <span class="card-row-label"><span class="icon">&#9728;&#65039;</span> Schedule</span>
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

    ${data.notes ? `<div class="notes-section">
      <div class="notes-label">NOTES</div>
      <div class="notes-text">${data.notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
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

    <div class="footer">
      <div class="footer-brand">Call a Nanny</div>
      <div class="footer-line">Professional Childcare &middot; Marrakech, Morocco</div>
      <div class="footer-line">callanannycare.vercel.app</div>
      <div class="footer-valid">Valid for ${validDays} days from ${dateStr}</div>
    </div>
  </div>
</div>
</body></html>`;

  return { html, ref };
}

/**
 * Open the quote as a beautiful HTML page in a new tab.
 * The page has Back / Save PDF / Share PDF buttons built in.
 * Save PDF and Share PDF produce real .pdf files using html2pdf.js.
 */
export function downloadQuotePdf(data: QuotePdfData): void {
  const { html, ref } = buildQuoteHtml(data);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onload = () => setTimeout(() => URL.revokeObjectURL(url), 120000);
  } else {
    // Popup blocked — download the HTML
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quote_${ref}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}

/** Alias — opens the same page where user can share */
export const shareQuotePdf = downloadQuotePdf;
