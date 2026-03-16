import { useState } from "react";
import { Calculator, Copy, Check, Moon, Sun, Plus, Minus, FileDown } from "lucide-react";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { INVOICE_LOGO_BASE64, downloadInvoicePdf } from "../../utils/invoicePdf";

const RATE = 10; // EUR per hour
const TAXI_FEE = 10; // EUR flat fee per evening/night day

export default function AdminQuotes() {
  const [days, setDays] = useState(1);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [isEvening, setIsEvening] = useState(false);
  const [parentName, setParentName] = useState("");
  const [childName, setChildName] = useState("");
  const [hotel, setHotel] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const { toDH } = useExchangeRate();

  const totalHours = hoursPerDay * days;
  const baseCost = RATE * totalHours;
  const taxiTotal = isEvening ? TAXI_FEE * days : 0;
  const totalPrice = baseCost + taxiTotal;
  const totalDH = toDH(totalPrice);

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const quoteRef = `QTE-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const quoteText = [
    `--- Call a Nanny - Quote ---`,
    ``,
    ...(parentName ? [`Parent: ${parentName}`] : []),
    ...(childName ? [`Child: ${childName}`] : []),
    ...(hotel ? [`Hotel: ${hotel}`] : []),
    ``,
    `${days} day${days > 1 ? "s" : ""} x ${hoursPerDay} hour${hoursPerDay !== 1 ? "s" : ""}/day = ${totalHours} total hours`,
    `Rate: ${RATE}€/hour`,
    ...(isEvening ? [`Evening supplement: ${TAXI_FEE}€/day x ${days} day${days > 1 ? "s" : ""} = ${taxiTotal}€`] : []),
    ``,
    `Total: ${totalPrice}€ (${totalDH.toLocaleString()} DH)`,
    ...(notes ? [``, `Notes: ${notes}`] : []),
    ``,
    `---`,
    `callanannycare.vercel.app`,
  ].join("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(quoteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generatePdf = () => {
    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Quote ${quoteRef}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #fff; padding: 0; margin: 0; }
  .page { max-width: 480px; margin: 0 auto; background: #fff; overflow: hidden; }
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 24px 28px 20px; color: #fff; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .header-num { font-size: 28px; font-weight: 800; margin: 2px 0 4px; }
  .header-date { font-size: 13px; opacity: 0.85; }
  .header-logo { width: 60px; height: 60px; border-radius: 12px; object-fit: contain; background: rgba(255,255,255,0.2); padding: 4px; }
  .quote-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-top: 6px; }
  .body-content { padding: 16px 24px 20px; }
  .addresses { display: flex; gap: 20px; margin-bottom: 16px; }
  .addr { flex: 1; }
  .addr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 6px; }
  .addr-name { font-size: 15px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .addr-line { font-size: 12px; color: #718096; line-height: 1.7; display: flex; align-items: center; gap: 6px; }
  .addr-line .icon { font-size: 12px; color: #a0937e; flex-shrink: 0; }
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
  .total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 14px; padding: 18px; text-align: center; margin-top: 6px; }
  .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .notes-section { margin-top: 12px; padding: 12px 16px; background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; }
  .notes-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 6px; }
  .notes-text { font-size: 13px; color: #5a5a5a; line-height: 1.6; white-space: pre-wrap; }
  .validity { text-align: center; margin-top: 14px; font-size: 11px; color: #a0937e; letter-spacing: 0.5px; }
  .footer { text-align: center; padding: 16px 24px; border-top: 1px solid #f0ece6; margin-top: 12px; }
  .footer-brand { font-size: 14px; font-weight: 700; color: #c2703a; margin-bottom: 2px; }
  .footer-line { font-size: 11px; color: #a0937e; line-height: 1.6; }
  .back-bar { max-width: 480px; margin: 0 auto; padding: 12px 16px; display: flex; gap: 8px; position: sticky; top: 0; z-index: 100; background: #fff; }
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
    <div class="header-top">
      <div>
        <div class="header-label">QUOTE</div>
        <div class="header-num">#${quoteRef}</div>
        <div class="header-date">${today}</div>
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
        <div class="addr-name">${parentName || "Parent"}</div>
        ${childName ? `<div class="addr-line"><span class="icon">&#128118;</span> Child: ${childName}</div>` : ""}
        ${hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${hotel}</div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">SERVICE DETAILS</div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128197;</span> Number of Days</span>
        <span class="card-row-value">${days} day${days > 1 ? "s" : ""}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#9201;</span> Hours per Day</span>
        <span class="card-row-value">${hoursPerDay}h</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128338;</span> Total Hours</span>
        <span class="card-row-value">${totalHours}h</span>
      </div>
      ${isEvening ? `<div class="card-row">
        <span class="card-row-label"><span class="icon">&#127769;</span> Evening / Night</span>
        <span class="card-row-value">Yes</span>
      </div>` : ""}
    </div>

    <div class="card">
      <div class="card-title">PRICE BREAKDOWN</div>
      <div class="card-row">
        <span class="card-row-label">${totalHours}h &times; ${RATE}&euro;/hr</span>
        <span class="card-row-value">${baseCost}&euro;</span>
      </div>
      ${isEvening ? `<div class="card-row taxi-row">
        <span class="card-row-label"><span class="icon">&#128663;</span> Taxi supplement (${TAXI_FEE}&euro; &times; ${days} day${days > 1 ? "s" : ""})</span>
        <span class="card-row-value">+${taxiTotal}&euro;</span>
      </div>` : ""}
    </div>

    <div class="total-box">
      <div class="total-label">ESTIMATED TOTAL</div>
      <div class="total-amount">${totalPrice}<span class="currency">&euro;</span></div>
      <div class="total-dh">${totalDH.toLocaleString()} DH</div>
    </div>

    ${notes ? `<div class="notes-section">
      <div class="notes-label">NOTES</div>
      <div class="notes-text">${notes.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>` : ""}

    <div class="validity">This quote is valid for 30 days from the date of issue.</div>

    <div class="footer">
      <div class="footer-brand">Call a Nanny</div>
      <div class="footer-line">Professional Childcare &middot; Marrakech, Morocco</div>
      <div class="footer-line">info@callanannycare.com &middot; +212 656-643375</div>
      <div class="footer-line" style="margin-top:4px;">callanannycare.com</div>
    </div>
  </div>
</div>
</body></html>`;

    downloadInvoicePdf(html, `Quote_${quoteRef}.pdf`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Calculator className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">Quick Quote</h1>
      </div>

      <p className="text-muted-foreground text-sm">
        Generate a price quote without needing parent or child details. Just enter the number of days and hours.
      </p>

      {/* Calculator Card */}
      <div className="bg-white border rounded-xl shadow-sm p-5 space-y-5">
        {/* Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDays((d) => Math.max(1, d - 1))}
              className="p-2 rounded-lg border hover:bg-gray-50 active:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-2xl font-bold w-12 text-center">{days}</span>
            <button
              onClick={() => setDays((d) => d + 1)}
              className="p-2 rounded-lg border hover:bg-gray-50 active:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Hours per Day */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hours per Day</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHoursPerDay((h) => Math.max(1, h - 1))}
              className="p-2 rounded-lg border hover:bg-gray-50 active:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-2xl font-bold w-12 text-center">{hoursPerDay}</span>
            <button
              onClick={() => setHoursPerDay((h) => h + 1)}
              className="p-2 rounded-lg border hover:bg-gray-50 active:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Evening Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Evening / Night Booking?</label>
          <button
            onClick={() => setIsEvening((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isEvening
                ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                : "bg-gray-50 border-gray-200 text-gray-600"
            }`}
          >
            {isEvening ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {isEvening ? "Yes — +10€/day taxi supplement" : "No — daytime booking"}
          </button>
        </div>

        <hr />

        {/* Optional Details */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700">
            Optional details (parent name, hotel…)
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Parent Name</label>
              <input
                type="text"
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Child Name</label>
              <input
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                placeholder="e.g. Emma"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hotel / Accommodation</label>
              <input
                type="text"
                value={hotel}
                onChange={(e) => setHotel(e.target.value)}
                placeholder="e.g. Four Seasons"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional info…"
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </details>
      </div>

      {/* Quote Result */}
      <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-lg">Quote Summary</h2>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">
              {days} day{days > 1 ? "s" : ""} × {hoursPerDay}h/day × {RATE}€/h
            </span>
            <span className="font-medium">{baseCost}€</span>
          </div>
          {isEvening && (
            <div className="flex justify-between">
              <span className="text-gray-600">
                Evening supplement ({TAXI_FEE}€ × {days} day{days > 1 ? "s" : ""})
              </span>
              <span className="font-medium">{taxiTotal}€</span>
            </div>
          )}
        </div>

        <hr className="border-primary/20" />

        <div className="flex justify-between items-center text-xl font-bold">
          <span>Total</span>
          <div className="text-right">
            <span className="text-primary">{totalPrice}€</span>
            <p className="text-xs font-normal text-gray-500">{totalDH.toLocaleString()} DH</p>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button
            onClick={generatePdf}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <FileDown className="h-4 w-4" /> Generate PDF
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-primary/30 text-primary py-2.5 rounded-lg hover:bg-primary/5 transition-colors font-medium"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy Text
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Generate a PDF quote to share, or copy text for WhatsApp
        </p>
      </div>
    </div>
  );
}
