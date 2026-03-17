import { useState } from "react";
import { Calculator, Copy, Check, Moon, Sun, Plus, Minus, FileDown, Share2, Loader2, CheckCircle, RotateCcw } from "lucide-react";
import { downloadQuotePdf, shareQuotePdf, generateQuoteRef } from "@/utils/quotePdf";
import type { QuotePdfData } from "@/utils/quotePdf";
import { useExchangeRate } from "@/hooks/useExchangeRate";

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [pdfDone, setPdfDone] = useState(false);
  const { toDH, rate: exchangeRate } = useExchangeRate();

  const totalHours = hoursPerDay * days;
  const baseCost = RATE * totalHours;
  const taxiTotal = isEvening ? TAXI_FEE * days : 0;
  const totalPrice = baseCost + taxiTotal;
  const totalDH = toDH(totalPrice);

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

  const getQuoteData = (): QuotePdfData => ({
    parentName: parentName || undefined,
    childName: childName || undefined,
    hotel: hotel || undefined,
    days,
    hoursPerDay,
    isEvening,
    rate: RATE,
    taxiFee: TAXI_FEE,
    notes: notes || undefined,
    quoteRef: generateQuoteRef(),
    exchangeRate,
  });

  const generatePdf = async () => {
    setPdfLoading(true);
    try { await downloadQuotePdf(getQuoteData()); setPdfDone(true); } finally { setPdfLoading(false); }
  };

  const handleShare = async () => {
    setShareLoading(true);
    try { await shareQuotePdf(getQuoteData()); setPdfDone(true); } finally { setShareLoading(false); }
  };

  const resetForm = () => {
    setDays(1); setHoursPerDay(3); setIsEvening(false);
    setParentName(""); setChildName(""); setHotel(""); setNotes("");
    setPdfDone(false);
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
            disabled={pdfLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {pdfLoading ? "Generating…" : "Save PDF"}
          </button>
          <button
            onClick={handleShare}
            disabled={shareLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-60"
          >
            {shareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            {shareLoading ? "Preparing…" : "Share PDF"}
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="w-full flex items-center justify-center gap-2 bg-white border border-primary/30 text-primary py-2 rounded-lg hover:bg-primary/5 transition-colors font-medium text-sm"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy Text for WhatsApp
            </>
          )}
        </button>

        {pdfDone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              PDF ready!
            </div>
            <button
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-green-200 text-green-700 text-xs font-medium hover:bg-green-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              New Quote
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          Save or share a real PDF quote with the parent
        </p>
      </div>
    </div>
  );
}
