import { useState, useMemo, Fragment } from "react";
import {
  Search,
  Users,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CircleDashed,
  X,
  Banknote,
  CreditCard,
  Wallet,
  Download,
  MessageCircle,
  Share2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { calcTotalBookedHours, parseTimeToHours } from "@/utils/shiftHelpers";
import type { Booking } from "@/types";
import { downloadInvoicePdf } from "@/utils/invoicePdf";

interface ParentSummary {
  key: string;
  name: string;
  email: string;
  phone: string;
  hotel: string;
  totalBookings: number;
  totalHours: number;
  totalPrice: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  nannyNames: string[];
  lastBookingDate: string;
  bookings: Booking[];
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-orange-50 text-orange-700 border border-orange-200" },
  confirmed: { label: "Confirmed", cls: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", cls: "bg-blue-50 text-blue-700 border border-blue-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-700 border border-red-200" },
};

const SERVICE_RATE = 10;
const TAXI_FEE = 10;

function hoursForBooking(b: Booking): number {
  if (!b.startTime || !b.endTime) return 0;
  return calcTotalBookedHours(b.startTime, b.endTime, b.extraTimes, b.date, b.endDate);
}

function bookingHasTaxi(b: Booking): boolean {
  const startH = b.startTime ? parseTimeToHours(b.startTime) : null;
  const endH = b.endTime ? parseTimeToHours(b.endTime) : null;
  if (startH == null || endH == null) return false;
  const hours = hoursForBooking(b);
  return startH >= 19 || startH < 7 || endH >= 19 || endH < 7 || hours > 12;
}

function bookingDayCount(b: Booking): number {
  if (b.endDate && b.endDate !== b.date) {
    return Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.date!).getTime()) / 86400000) + 1);
  }
  return 1;
}

function taxiFeeForBooking(b: Booking): number {
  return bookingHasTaxi(b) ? TAXI_FEE * bookingDayCount(b) : 0;
}

function basePriceForBooking(b: Booking): number {
  return (b.totalPrice || 0) - taxiFeeForBooking(b);
}

function formatClockTime(iso: string | null): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "HH:mm"); } catch { return "—"; }
}

export default function SupervisorParents() {
  const { bookings, markAsCollected, adminProfile } = useData();
  const { toDH } = useExchangeRate();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "bookings" | "recent" | "hours">("spent");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Collection modal state
  const [collectingBooking, setCollectingBooking] = useState<Booking | null>(null);
  const [collectingParent, setCollectingParent] = useState<ParentSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectionNote, setCollectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  const closeModal = () => {
    setCollectingBooking(null);
    setCollectingParent(null);
    setPaymentMethod("cash");
    setCollectionNote("");
    setBulkProgress(0);
  };

  // Single booking collection
  const handleCollect = async () => {
    if (!collectingBooking) return;
    setIsSubmitting(true);
    try {
      await markAsCollected(collectingBooking.id, {
        collectedBy: adminProfile?.name || "Supervisor",
        paymentMethod,
        collectionNote: collectionNote.trim() || undefined,
      });
      closeModal();
    } catch (err) {
      console.error("Collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk collection for all unpaid bookings of a parent
  const handleBulkCollect = async () => {
    if (!collectingParent) return;
    const unpaid = collectingParent.bookings.filter((b) => b.status !== "cancelled" && !b.collectedAt);
    if (unpaid.length === 0) return;
    setIsSubmitting(true);
    setBulkProgress(0);
    try {
      for (let i = 0; i < unpaid.length; i++) {
        await markAsCollected(unpaid[i].id, {
          collectedBy: adminProfile?.name || "Supervisor",
          paymentMethod,
          collectionNote: collectionNote.trim() || undefined,
        });
        setBulkProgress(i + 1);
      }
      closeModal();
    } catch (err) {
      console.error("Bulk collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group bookings by parent
  const parents = useMemo(() => {
    const map = new Map<string, ParentSummary>();

    bookings.forEach((b) => {
      const key = `${(b.clientName || "").trim().toLowerCase()}|${(b.clientEmail || "").trim().toLowerCase()}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          name: b.clientName || "Unknown",
          email: b.clientEmail || "",
          phone: b.clientPhone || "",
          hotel: b.hotel || "",
          totalBookings: 0,
          totalHours: 0,
          totalPrice: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          paidCount: 0,
          unpaidCount: 0,
          nannyNames: [],
          lastBookingDate: "",
          bookings: [],
        });
      }

      const parent = map.get(key)!;
      parent.bookings.push(b);

      if (!parent.lastBookingDate || b.date > parent.lastBookingDate) {
        parent.lastBookingDate = b.date;
        parent.hotel = b.hotel || parent.hotel;
        parent.phone = b.clientPhone || parent.phone;
        parent.name = b.clientName || parent.name;
      }

      if (b.status !== "cancelled") {
        parent.totalBookings++;
        parent.totalPrice += b.totalPrice || 0;
        parent.totalHours += hoursForBooking(b);

        if (b.collectedAt) {
          parent.paidAmount += b.totalPrice || 0;
          parent.paidCount++;
        } else {
          parent.unpaidAmount += b.totalPrice || 0;
          parent.unpaidCount++;
        }
      }

      if (b.nannyName && !parent.nannyNames.includes(b.nannyName)) {
        parent.nannyNames.push(b.nannyName);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalPrice - a.totalPrice);
  }, [bookings]);

  // Filter + sort
  const filteredParents = useMemo(() => {
    let result = parents;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.phone.toLowerCase().includes(q) ||
          p.hotel.toLowerCase().includes(q)
      );
    }

    if (paymentFilter === "unpaid") {
      result = result.filter((p) => p.unpaidCount > 0);
    } else if (paymentFilter === "paid") {
      result = result.filter((p) => p.unpaidCount === 0 && p.paidCount > 0);
    }

    switch (sortBy) {
      case "bookings":
        return [...result].sort((a, b) => b.totalBookings - a.totalBookings);
      case "recent":
        return [...result].sort((a, b) => (b.lastBookingDate || "").localeCompare(a.lastBookingDate || ""));
      case "hours":
        return [...result].sort((a, b) => b.totalHours - a.totalHours);
      default:
        return result;
    }
  }, [parents, search, sortBy, paymentFilter]);

  // Totals for stat cards
  const totalHours = filteredParents.reduce((s, p) => s + p.totalHours, 0);
  const totalRevenue = filteredParents.reduce((s, p) => s + p.totalPrice, 0);
  const totalPaid = filteredParents.reduce((s, p) => s + p.paidAmount, 0);
  const totalUnpaid = filteredParents.reduce((s, p) => s + p.unpaidAmount, 0);

  const toggle = (key: string) => setExpandedParent(expandedParent === key ? null : key);

  // WhatsApp share for a combined parent invoice
  const buildParentWhatsAppLink = (p: ParentSummary) => {
    const activeBookings = [...p.bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const total = p.totalPrice;
    const totalDH = toDH(total);
    const isPaid = p.unpaidCount === 0 && p.paidCount > 0;

    const bookingLines = activeBookings.map((b) => {
      const hours = hoursForBooking(b);
      const dateStr = b.date ? format(parseISO(b.date), "dd MMM yyyy") : "—";
      return `  ${dateStr} · ${b.startTime || "—"} – ${b.endTime || "—"} · ${hours.toFixed(1)}h · ${(b.totalPrice || 0)}€`;
    }).join("\n");

    const msg = [
      `*Invoice - ${p.name}*`,
      `From: Call a Nanny`,
      `Date: ${format(new Date(), "dd MMMM yyyy")}`,
      ``,
      `*Booking Details*`,
      bookingLines,
      ``,
      `*Total: ${total}€ (${totalDH.toLocaleString()} DH)*`,
      `Bookings: ${activeBookings.length} · Hours: ${p.totalHours.toFixed(1)}h`,
      isPaid ? `Status: PAID` : ``,
      ``,
      `Issued by Call a Nanny · callanannycare.com`,
    ].filter(Boolean).join("\n");

    const phone = (p.phone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleParentShareWhatsApp = (p: ParentSummary) => {
    if (!p.phone) {
      alert("No phone number on file for this parent.");
      return;
    }
    window.open(buildParentWhatsAppLink(p), "_blank");
  };

  // Download a combined invoice PDF for all (non-cancelled) bookings of a parent
  const downloadParentInvoice = (p: ParentSummary) => {
    const activeBookings = [...p.bookings]
      .filter((b) => b.status !== "cancelled")
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const bookingRows = activeBookings.map((b) => {
      const hours = hoursForBooking(b);
      const taxi = taxiFeeForBooking(b);
      const base = basePriceForBooking(b);
      const timeRange = b.clockIn && b.clockOut
        ? `${formatClockTime(b.clockIn)} – ${formatClockTime(b.clockOut)}`
        : `${b.startTime || "—"} – ${b.endTime || "—"}`;
      const dateStr = b.date ? format(parseISO(b.date), "dd MMM yyyy") : "—";
      let row = `<tr>
        <td>${dateStr}</td>
        <td>${timeRange}</td>
        <td>${hours.toFixed(1)}h</td>
        <td>${b.nannyName || "—"}</td>
        <td>${base}€</td>
      </tr>`;
      if (taxi > 0) {
        row += `<tr class="taxi-row">
          <td colspan="4" style="text-align:right;color:#c2703a;font-size:10px;">&#128663; Taxi fee (evening)</td>
          <td style="color:#c2703a;font-weight:700;">+${taxi}€</td>
        </tr>`;
      }
      return row;
    }).join("");

    const total = p.totalPrice;
    const totalDH = toDH(total);
    const invoiceDate = format(new Date(), "dd MMMM yyyy");
    const pdfTotalTaxi = activeBookings.reduce((sum, b) => sum + taxiFeeForBooking(b), 0);
    const pdfTotalService = total - pdfTotalTaxi;

    const isPaid = p.unpaidCount === 0 && p.paidCount > 0;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Invoice - ${p.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #fff; padding: 0; margin: 0; }
  .page { max-width: 480px; margin: 0 auto; background: #fff; overflow: hidden; }
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 24px 28px 20px; color: #fff; }
  .header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .header-num { font-size: 24px; font-weight: 800; margin: 2px 0 4px; }
  .header-date { font-size: 13px; opacity: 0.85; }
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
  .detail-table { width: 100%; border-collapse: collapse; }
  .detail-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8a7e6e; font-weight: 600; padding: 7px 10px; text-align: left; border-bottom: 1px solid #f0ece6; }
  .detail-table th:last-child { text-align: right; }
  .detail-table td { font-size: 11px; padding: 7px 10px; border-bottom: 1px solid #f0ece6; color: #5a5a5a; }
  .detail-table td:last-child { text-align: right; font-weight: 700; color: #1a202c; }
  .total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 14px; padding: 18px; text-align: center; margin-top: 6px; }
  .total-box.paid { background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%); }
  .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .total-paid-note { font-size: 15px; color: rgba(255,255,255,0.9); margin-top: 8px; font-weight: 800; letter-spacing: 2px; }
  .paid-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-top: 6px; }
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
  var title=document.title||'Invoice';
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
    <div class="header-label">INVOICE</div>
    <div class="header-num">${p.name}</div>
    <div class="header-date">${invoiceDate} &middot; ${activeBookings.length} booking${activeBookings.length !== 1 ? "s" : ""}</div>
    ${isPaid ? `<div class="paid-badge">&#10003; PAID</div>` : ""}
  </div>

  <div class="body-content">
    <div class="addresses">
      <div class="addr">
        <div class="addr-label">FROM</div>
        <div class="addr-name">Call a Nanny</div>
        <div class="addr-line">Elam Childcare SARL</div>
        <div class="addr-line">RC Marrakech N° 179297</div>
        <div class="addr-line">Marrakech, Morocco</div>
        <div class="addr-line" style="margin-top:6px;font-size:11px;">IBAN: MA64 011450000012210003599237</div>
        <div class="addr-line" style="font-size:11px;">SWIFT: BMCEMAMC</div>
      </div>
      <div class="addr">
        <div class="addr-label">BILLED TO</div>
        <div class="addr-name">${activeBookings[0]?.billedTo || p.name}</div>
        ${activeBookings[0]?.billedTo ? `<div class="addr-line" style="margin-top:4px;"><strong>Client:</strong> ${p.name}</div>` : ""}
        ${p.phone ? `<div class="addr-line"><span class="icon">&#9742;</span> ${p.phone}</div>` : ""}
        ${p.hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${p.hotel}</div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">BOOKING DETAILS</div>
      <table class="detail-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Hours</th>
            <th>Caregiver</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${bookingRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <div class="card-title">SUMMARY</div>
      <div class="card-row">
        <span class="card-row-label">Bookings</span>
        <span class="card-row-value">${activeBookings.length}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">Total Hours</span>
        <span class="card-row-value">${p.totalHours.toFixed(1)}h</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">${p.totalHours.toFixed(1)}h &times; ${SERVICE_RATE}&euro;/hr</span>
        <span class="card-row-value">${pdfTotalService}&euro;</span>
      </div>
      ${pdfTotalTaxi > 0 ? `<div class="card-row taxi-row">
        <span class="card-row-label"><span class="icon">&#128663;</span> Taxi fees</span>
        <span class="card-row-value">+${pdfTotalTaxi}&euro;</span>
      </div>` : ""}
    </div>

    <div class="total-box${isPaid ? " paid" : ""}">
      <div class="total-label">${isPaid ? "TOTAL CHARGED" : "TOTAL AMOUNT"}</div>
      <div class="total-amount">${total}<span class="currency">&euro;</span></div>
      <div class="total-dh">${totalDH.toLocaleString()} DH</div>
      ${isPaid ? `
      <div style="border-top:1px solid rgba(255,255,255,0.3);margin:10px 0 6px;"></div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,0.85);padding:4px 0;">
        <span>Amount Paid</span><span style="font-weight:700;">${total}&euro;</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:15px;color:#fff;font-weight:800;padding:4px 0;">
        <span>Balance Due</span><span>0&euro;</span>
      </div>
      <div class="total-paid-note">&#10003; PAID</div>
      ` : ""}
    </div>
  </div>
</div>
</body></html>`;

    downloadInvoicePdf(html, `Invoice_${p.name}.pdf`);
  };

  // Render expanded booking history
  const renderHistory = (p: ParentSummary) => {
    const sorted = [...p.bookings].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return sorted.map((b) => {
      const hours = hoursForBooking(b);
      const st = statusConfig[b.status] || statusConfig.pending;
      const isPaid = !!b.collectedAt;
      const isCancelled = b.status === "cancelled";
      return (
        <div key={b.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-xs border-b border-border/50 last:border-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="text-muted-foreground whitespace-nowrap">
              {b.date ? format(parseISO(b.date), "dd MMM yy") : "—"}
            </span>
            <span className="text-foreground whitespace-nowrap">{b.startTime} – {b.endTime}</span>
            <span className="text-muted-foreground">{hours.toFixed(1)}h</span>
            <span className="text-foreground truncate">{b.nannyName || "Unassigned"}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <span className="font-bold text-foreground">{(b.totalPrice || 0).toLocaleString()}&euro;</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
            {!isCancelled && (
              isPaid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle className="w-3 h-3" /> Paid by {b.collectedBy || "Admin"}
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCollectingBooking(b);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <CircleDashed className="w-3 h-3" /> Collect
                </button>
              )
            )}
          </div>
        </div>
      );
    });
  };

  // Payment status badge for parent row
  const paymentBadge = (p: ParentSummary, showCollectAll = false) => {
    if (p.unpaidCount === 0 && p.paidCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
          <CheckCircle className="w-3 h-3" /> All Paid
        </span>
      );
    }
    if (p.unpaidCount > 0) {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
            <CircleDashed className="w-3 h-3" /> {p.unpaidCount} unpaid
          </span>
          {showCollectAll && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCollectingParent(p);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3 h-3" /> Collect All
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Parents</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage collections from parents</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-violet-700" />
          </div>
          <p className="text-2xl font-bold text-foreground">{filteredParents.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Parents</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-blue-700" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-muted-foreground mt-1">Total Hours</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-700" />
          </div>
          <p className="text-2xl font-bold text-green-700">{totalPaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalPaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">Collected</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <CircleDashed className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalUnpaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">To Collect</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or hotel..."
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            {([
              { value: "all", label: "All" },
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => setPaymentFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  paymentFilter === f.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.value === "unpaid" && <CircleDashed className="w-3 h-3 inline mr-1 -mt-0.5" />}
                {f.value === "paid" && <CheckCircle className="w-3 h-3 inline mr-1 -mt-0.5" />}
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
          >
            <option value="spent">Most Spent</option>
            <option value="bookings">Most Bookings</option>
            <option value="recent">Most Recent</option>
            <option value="hours">Most Hours</option>
          </select>
        </div>
      </div>

      {/* Empty state */}
      {filteredParents.length === 0 && (
        <div className="bg-card rounded-xl border border-border shadow-soft p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No parents match your search" : "No booking data yet"}
          </p>
        </div>
      )}

      {/* Desktop table */}
      {filteredParents.length > 0 && (
        <div className="hidden md:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["#", "Parent", "Hotel", "Bookings", "Hours", "Total", "Payment", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredParents.map((p, i) => (
                <Fragment key={p.key}>
                  <tr
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => toggle(p.key)}
                  >
                    <td className="px-5 py-3 text-sm font-bold text-muted-foreground/40">{i + 1}</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">{p.hotel || "—"}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{p.totalBookings}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{p.totalHours.toFixed(1)}h</td>
                    <td className="px-5 py-3">
                      <p className="text-sm font-bold text-foreground">{p.totalPrice.toLocaleString()}&euro;</p>
                      <p className="text-[10px] text-muted-foreground">{toDH(p.totalPrice).toLocaleString()} DH</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        {paymentBadge(p, true)}
                        {p.unpaidCount > 0 && p.paidCount > 0 && (
                          <p className="text-[10px] text-muted-foreground">{p.paidCount} paid · {p.unpaidCount} unpaid</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadParentInvoice(p); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer w-fit"
                        >
                          <Download className="w-3 h-3" /> Invoice PDF
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleParentShareWhatsApp(p); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer w-fit"
                        >
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedParent === p.key && (
                    <tr>
                      <td colSpan={8} className="px-8 py-4 bg-muted/30">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Booking History</p>
                        {renderHistory(p)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filteredParents.length > 0 && (
        <div className="md:hidden space-y-3">
          {filteredParents.map((p, i) => (
            <div key={p.key} className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
              <div
                className="p-4 cursor-pointer active:bg-muted/30 transition-colors"
                onClick={() => toggle(p.key)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-black text-muted-foreground/30 w-6 text-center shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      {p.phone && <p className="text-xs text-muted-foreground truncate">{p.phone}</p>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{p.totalPrice.toLocaleString()}&euro;</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(p.totalPrice).toLocaleString()} DH</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                  <span>{p.totalBookings} bookings</span>
                  <span>{p.totalHours.toFixed(1)}h</span>
                  {paymentBadge(p, true)}
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadParentInvoice(p); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Invoice
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleParentShareWhatsApp(p); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                  >
                    <MessageCircle className="w-3 h-3" /> WhatsApp
                  </button>
                  {expandedParent === p.key ? (
                    <ChevronUp className="w-4 h-4 ml-auto shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
                  )}
                </div>
              </div>
              {expandedParent === p.key && (
                <div className="border-t border-border px-4 py-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Booking History</p>
                  {renderHistory(p)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Single booking collection modal */}
      {collectingBooking && !collectingParent && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && closeModal()} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

            <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Confirm Collection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{collectingBooking.clientName} · {collectingBooking.date}</p>
              </div>
              <button onClick={() => !isSubmitting && closeModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-3xl font-bold text-green-700">{collectingBooking.totalPrice}&euro;</p>
                <p className="text-sm text-green-600 mt-1">{toDH(collectingBooking.totalPrice)} DH</p>
              </div>

              <div className="space-y-1 text-sm bg-muted/30 rounded-xl px-4 py-3">
                <div><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{collectingBooking.nannyName}</span></div>
                <div><span className="text-muted-foreground">Date: </span><span>{collectingBooking.date} · {collectingBooking.startTime}–{collectingBooking.endTime}</span></div>
                {collectingBooking.hotel && (
                  <div><span className="text-muted-foreground">Hotel: </span><span>{collectingBooking.hotel}</span></div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "cash", label: "Cash", Icon: Banknote },
                    { value: "bank", label: "Transfer", Icon: CreditCard },
                    { value: "card", label: "Card / Tap", Icon: Wallet },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMethod === value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-card text-muted-foreground hover:border-green-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={collectionNote}
                  onChange={(e) => setCollectionNote(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button onClick={() => !isSubmitting && closeModal()} disabled={isSubmitting} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleCollect} disabled={isSubmitting} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirm Collection</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk collection modal (collect all for a parent) */}
      {collectingParent && (() => {
        const unpaid = collectingParent.bookings.filter((b) => b.status !== "cancelled" && !b.collectedAt);
        const bulkTotal = unpaid.reduce((s, b) => s + (b.totalPrice || 0), 0);
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && closeModal()} />
            <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

              <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Collect All Payments</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{collectingParent.name} · {unpaid.length} bookings</p>
                </div>
                <button onClick={() => !isSubmitting && closeModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-xs text-green-600 mb-1 font-medium">Total to collect</p>
                  <p className="text-3xl font-bold text-green-700">{bulkTotal.toLocaleString()}&euro;</p>
                  <p className="text-sm text-green-600 mt-1">{toDH(bulkTotal).toLocaleString()} DH</p>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 bg-muted/30 rounded-xl px-4 py-3">
                  {unpaid.map((b) => (
                    <div key={b.id} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">{b.date} · {b.startTime}–{b.endTime}</span>
                      <span className="font-medium text-foreground">{b.totalPrice}&euro;</span>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "cash", label: "Cash", Icon: Banknote },
                      { value: "bank", label: "Transfer", Icon: CreditCard },
                      { value: "card", label: "Card / Tap", Icon: Wallet },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        onClick={() => setPaymentMethod(value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === value
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-border bg-card text-muted-foreground hover:border-green-300"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="text-xs">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <textarea
                    value={collectionNote}
                    onChange={(e) => setCollectionNote(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={2}
                    className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button onClick={() => !isSubmitting && closeModal()} disabled={isSubmitting} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleBulkCollect} disabled={isSubmitting} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      <span>{bulkProgress}/{unpaid.length}</span>
                    </div>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Collect All ({unpaid.length})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
