import { useState, useMemo, Fragment, useRef, useEffect } from "react";
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
  Filter,
  CalendarDays,
  Download,
  TimerReset,
  Loader2,
  Share2,
  Mail,
  MessageCircle,
  FileText,
  ArrowLeft,
  Car,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, subDays } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { calcTotalBookedHours, getSaturdayPeriod, formatPeriodLabel, toDateStr, parseTimeToHours } from "@/utils/shiftHelpers";
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

const SERVICE_RATE = 10; // €/hr
const TAXI_FEE = 10;

// 24h time slots from 06:00 to 05:45 (business-day ordering, 15-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 96; i++) {
  const h = (6 + Math.floor(i / 4)) % 24;
  const m = (i % 4) * 15;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  TIME_SLOTS.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
}

function hoursForBooking(b: Booking): number {
  if (!b.startTime || !b.endTime) return 0;
  return calcTotalBookedHours(b.startTime, b.endTime, b.extraTimes, b.date, b.endDate);
}

/** Detect if a booking has a taxi fee (touches 7 PM – 7 AM window) */
function bookingHasTaxi(b: Booking): boolean {
  const startH = b.startTime ? parseTimeToHours(b.startTime) : null;
  const endH = b.endTime ? parseTimeToHours(b.endTime) : null;
  if (startH == null || endH == null) return false;
  const hours = hoursForBooking(b);
  return startH >= 19 || startH < 7 || endH >= 19 || endH < 7 || hours > 12;
}

/** Number of days a booking spans (for multi-day taxi fees) */
function bookingDayCount(b: Booking): number {
  if (b.endDate && b.endDate !== b.date) {
    return Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.date!).getTime()) / 86400000) + 1);
  }
  return 1;
}

/** Calculate the taxi fee for a booking */
function taxiFeeForBooking(b: Booking): number {
  return bookingHasTaxi(b) ? TAXI_FEE * bookingDayCount(b) : 0;
}

/** Calculate the base service charge (total - taxi) */
function basePriceForBooking(b: Booking): number {
  return (b.totalPrice || 0) - taxiFeeForBooking(b);
}

function fmtDateLong(dateStr: string): string {
  try { return format(parseISO(dateStr), "EEEE do MMMM yyyy"); } catch { return dateStr || "N/A"; }
}

function formatClockTime(iso: string | null): string {
  if (!iso) return "—";
  try { return format(new Date(iso), "HH:mm"); } catch { return "—"; }
}

export default function AdminParents() {
  const { bookings, nannies, markAsCollected, updateBooking, adminProfile, resendInvoice } = useData();
  const { toDH } = useExchangeRate();

  // Invoice detail view
  const [viewParentInvoice, setViewParentInvoice] = useState<ParentSummary | null>(null);
  const [emailSending, setEmailSending] = useState<number | string | null>(null);
  const [emailSendingParent, setEmailSendingParent] = useState(false);
  const [editingBilledTo, setEditingBilledTo] = useState(false);
  const [billedToValue, setBilledToValue] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "bookings" | "recent" | "hours">("spent");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("week");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = previous, etc.
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Collection modal state (single booking OR bulk parent)
  const [collectingBooking, setCollectingBooking] = useState<Booking | null>(null);
  const [collectingParent, setCollectingParent] = useState<ParentSummary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectionNote, setCollectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  // Modify hours modal state (single booking)
  const [modifyingBooking, setModifyingBooking] = useState<Booking | null>(null);
  const [modifyStart, setModifyStart] = useState("");
  const [modifyEnd, setModifyEnd] = useState("");
  const [modifySaving, setModifySaving] = useState(false);

  // Bulk modify hours modal state (all bookings for a parent)
  const [bulkModifyParent, setBulkModifyParent] = useState<ParentSummary | null>(null);
  const [bulkModifyStart, setBulkModifyStart] = useState("");
  const [bulkModifyEnd, setBulkModifyEnd] = useState("");
  const [bulkModifySaving, setBulkModifySaving] = useState(false);
  const [bulkModifyProgress, setBulkModifyProgress] = useState(0);

  const closeModal = () => {
    setCollectingBooking(null);
    setCollectingParent(null);
    setPaymentMethod("cash");
    setCollectionNote("");
    setBulkProgress(0);
  };

  const closeModifyModal = () => {
    setModifyingBooking(null);
    setModifyStart("");
    setModifyEnd("");
    setModifySaving(false);
  };

  const openModifyModal = (b: Booking) => {
    setModifyingBooking(b);
    setModifyStart(b.startTime || "");
    setModifyEnd(b.endTime || "");
  };

  const closeBulkModifyModal = () => {
    setBulkModifyParent(null);
    setBulkModifyStart("");
    setBulkModifyEnd("");
    setBulkModifySaving(false);
    setBulkModifyProgress(0);
  };

  const openBulkModifyModal = (p: ParentSummary) => {
    const active = p.bookings.filter((b) => b.status !== "cancelled");
    if (active.length === 0) return;
    setBulkModifyParent(p);
    // Pre-fill with the most common start/end from active bookings
    setBulkModifyStart(active[0]?.startTime || "");
    setBulkModifyEnd(active[0]?.endTime || "");
  };

  const handleBulkModifyHours = async () => {
    if (!bulkModifyParent || !bulkModifyStart || !bulkModifyEnd) return;
    const active = bulkModifyParent.bookings.filter((b) => b.status !== "cancelled");
    if (active.length === 0) return;
    setBulkModifySaving(true);
    setBulkModifyProgress(0);
    try {
      for (let i = 0; i < active.length; i++) {
        const b = active[i];
        // Calculate new price for this booking
        const sH = parseInt(bulkModifyStart.split("h")[0]);
        const sM = parseInt(bulkModifyStart.split("h")[1] || "0");
        const eH = parseInt(bulkModifyEnd.split("h")[0]);
        const eM = parseInt(bulkModifyEnd.split("h")[1] || "0");
        const startDec = sH + sM / 60;
        const endDec = eH + eM / 60;
        const hours = endDec > startDec ? endDec - startDec : (24 - startDec) + endDec;
        const days = b.endDate && b.endDate !== b.date
          ? Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.date).getTime()) / 86400000) + 1)
          : 1;
        const isOvernight = endDec <= startDec;
        const isEvening = isOvernight || sH >= 19 || sH < 7 || eH > 19 || (eH === 19 && eM > 0);
        const taxiFee = isEvening ? TAXI_FEE * days : 0;
        const rate = nannies.find((n) => n.id === b.nannyId)?.rate ?? SERVICE_RATE;
        const newPrice = Math.round(rate * hours * days) + taxiFee;

        await updateBooking(b.id, {
          startTime: bulkModifyStart,
          endTime: bulkModifyEnd,
          totalPrice: newPrice,
        }, { skipConflictCheck: true });
        setBulkModifyProgress(i + 1);
      }
      closeBulkModifyModal();
    } catch (err) {
      console.error("Bulk modify hours failed:", err);
      setBulkModifySaving(false);
    }
  };

  const handleModifyHours = async () => {
    if (!modifyingBooking || !modifyStart || !modifyEnd) return;
    setModifySaving(true);
    try {
      // Calculate new price using the assigned nanny's actual rate
      const rate = nannies.find((n) => n.id === modifyingBooking.nannyId)?.rate ?? SERVICE_RATE;
      const startH = parseFloat(modifyStart.replace("h", ".").replace(/(\d{2})\.(\d{2})/, (_, h, m) => String(parseInt(h) + parseInt(m) / 60)));
      const endH = parseFloat(modifyEnd.replace("h", ".").replace(/(\d{2})\.(\d{2})/, (_, h, m) => String(parseInt(h) + parseInt(m) / 60)));
      const hours = endH > startH ? endH - startH : (24 - startH) + endH;
      const days = modifyingBooking.endDate && modifyingBooking.endDate !== modifyingBooking.date
        ? Math.max(1, Math.round((new Date(modifyingBooking.endDate).getTime() - new Date(modifyingBooking.date).getTime()) / 86400000) + 1)
        : 1;
      // Check evening hours for taxi fee
      const sH = parseInt(modifyStart.split("h")[0]);
      const eH = parseInt(modifyEnd.split("h")[0]);
      const eM = parseInt(modifyEnd.split("h")[1] || "0");
      const isOvernight = (eH + eM / 60) <= sH;
      const isEvening = isOvernight || sH >= 19 || sH < 7 || eH > 19 || (eH === 19 && eM > 0);
      const taxiFee = isEvening ? TAXI_FEE * days : 0;
      const newPrice = Math.round(rate * hours * days) + taxiFee;

      await updateBooking(modifyingBooking.id, {
        startTime: modifyStart,
        endTime: modifyEnd,
        totalPrice: newPrice,
      }, { skipConflictCheck: true });
      closeModifyModal();
    } catch (err) {
      console.error("Modify hours failed:", err);
      setModifySaving(false);
    }
  };

  // Single booking collection
  const handleCollect = async () => {
    if (!collectingBooking) return;
    setIsSubmitting(true);
    try {
      await markAsCollected(collectingBooking.id, {
        collectedBy: adminProfile?.name || "Admin",
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
          collectedBy: adminProfile?.name || "Admin",
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

  // Saturday-to-Saturday period for the week filter
  const satPeriod = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getSaturdayPeriod(ref);
  }, [weekOffset]);

  const satPeriodLabel = useMemo(() => formatPeriodLabel(satPeriod.start, satPeriod.end), [satPeriod]);

  // Compute date range from filter
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (dateFilter) {
      case "today":
        return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
      case "week":
        return { from: toDateStr(satPeriod.start), to: toDateStr(new Date(satPeriod.end.getTime() - 1)) };
      case "month":
        return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") };
      case "custom":
        return { from: dateFrom, to: dateTo };
      default:
        return null;
    }
  }, [dateFilter, dateFrom, dateTo, satPeriod]);

  // Filter bookings by date range first
  const dateFilteredBookings = useMemo(() => {
    if (!dateRange || (!dateRange.from && !dateRange.to)) return bookings;
    return bookings.filter((b) => {
      if (!b.date) return false;
      if (dateRange.from && b.date < dateRange.from) return false;
      if (dateRange.to && b.date > dateRange.to) return false;
      return true;
    });
  }, [bookings, dateRange]);

  // Group bookings by parent
  const parents = useMemo(() => {
    const map = new Map<string, ParentSummary>();

    dateFilteredBookings.forEach((b) => {
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
  }, [dateFilteredBookings]);

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

  const handleParentSendEmail = async (p: ParentSummary) => {
    if (!p.email) {
      alert("No email address on file for this parent.");
      return;
    }
    const completedBookings = p.bookings.filter((b) => b.status === "completed" && b.clockOut);
    if (completedBookings.length === 0) {
      alert("No completed bookings to send invoices for.");
      return;
    }
    setEmailSendingParent(true);
    try {
      for (const b of completedBookings) {
        await resendInvoice(b.id);
      }
      alert(`Invoice email(s) sent to ${p.email}`);
    } catch {
      alert("Failed to send invoice email. Please try again.");
    }
    setEmailSendingParent(false);
  };

  // WhatsApp/Email for single booking in history
  const buildBookingWhatsAppLink = (b: Booking) => {
    const hours = hoursForBooking(b);
    const total = b.totalPrice || 0;
    const totalDH = toDH(total);
    const dateStr = b.date ? format(parseISO(b.date), "EEEE do MMMM yyyy") : "N/A";
    const msg = [
      `*Invoice #INV-${b.id}*`,
      `From: Call a Nanny`,
      `Date: ${dateStr}`,
      ``,
      `*Service Details*`,
      `Caregiver: ${b.nannyName || "Unassigned"}`,
      `Time: ${b.startTime || "—"} – ${b.endTime || "—"}`,
      `Hours: ${hours.toFixed(1)}h`,
      `Children: ${b.childrenCount || 1}${b.childrenAges ? ` (${b.childrenAges})` : ""}`,
      ``,
      `*Total: ${total}€ (${totalDH.toLocaleString()} DH)*`,
      b.collectedAt ? `Status: PAID` : ``,
      ``,
      `Issued by Call a Nanny · callanannycare.com`,
    ].filter(Boolean).join("\n");

    const phone = (b.clientPhone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleBookingShareWhatsApp = (b: Booking) => {
    if (!b.clientPhone) {
      alert("No phone number on file for this client.");
      return;
    }
    window.open(buildBookingWhatsAppLink(b), "_blank");
  };

  const handleBookingSendEmail = async (b: Booking) => {
    if (!b.clientEmail) {
      alert("No email address on file for this client.");
      return;
    }
    setEmailSending(b.id);
    try {
      await resendInvoice(b.id);
      alert(`Invoice emailed to ${b.clientEmail}`);
    } catch {
      alert("Failed to send invoice email. Please try again.");
    }
    setEmailSending(null);
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
        <span class="card-row-label">Service (${p.totalHours.toFixed(1)}h)</span>
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
            {!isCancelled && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await updateBooking(b.id, { totalPrice: (b.totalPrice || 0) + TAXI_FEE });
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer"
                title="Add 10€ taxi fee"
              >
                <Car className="w-3 h-3" /> +{TAXI_FEE}&euro;
              </button>
            )}
            {!isCancelled && (b.totalPrice || 0) > TAXI_FEE && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await updateBooking(b.id, { totalPrice: (b.totalPrice || 0) - TAXI_FEE });
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
                title="Remove 10€ taxi fee"
              >
                <Car className="w-3 h-3" /> -{TAXI_FEE}&euro;
              </button>
            )}
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
            {!isCancelled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openModifyModal(b);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <TimerReset className="w-3 h-3" /> Modify
              </button>
            )}
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
            {!isCancelled && b.status === "completed" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleBookingSendEmail(b); }}
                  disabled={emailSending === b.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {emailSending === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} Email
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleBookingShareWhatsApp(b); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </button>
              </>
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
        <p className="text-muted-foreground text-sm mt-1">Overview of all parents who booked</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-primary" />
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
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-purple-700" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalRevenue.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalRevenue).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-green-700" />
          </div>
          <p className="text-2xl font-bold text-green-700">{totalPaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalPaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">Collected</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft col-span-2 lg:col-span-1">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center mb-3">
            <CircleDashed className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString()}&euro;</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">{toDH(totalUnpaid).toLocaleString()} DH</p>
          <p className="text-xs text-muted-foreground mt-1">To Collect</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        {/* Row 1: Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone or hotel..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="spent">Sort: Most Spent</option>
            <option value="bookings">Sort: Most Bookings</option>
            <option value="recent">Sort: Most Recent</option>
            <option value="hours">Sort: Most Hours</option>
          </select>
        </div>

        {/* Row 2: Payment filter + Date filter */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Payment status pills */}
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

          {/* Date period pills */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
            {([
              { value: "all", label: "All Time" },
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "month", label: "This Month" },
              { value: "custom", label: "Custom" },
            ] as const).map((f) => (
              <button
                key={f.value}
                onClick={() => { setDateFilter(f.value); if (f.value === "week") setWeekOffset(0); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  dateFilter === f.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.value === "custom" && <CalendarDays className="w-3 h-3 inline mr-1 -mt-0.5" />}
                {f.label}
              </button>
            ))}
          </div>

          {/* Saturday-period week navigation */}
          {dateFilter === "week" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekOffset((o) => o - 1)}
                className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{satPeriodLabel}</span>
              <button
                onClick={() => setWeekOffset((o) => o + 1)}
                className="p-1.5 rounded-lg bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  Current
                </button>
              )}
            </div>
          )}

          {/* Custom date inputs */}
          {dateFilter === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>
          )}

          {/* Active filter count + reset */}
          {(paymentFilter !== "all" || dateFilter !== "week" || weekOffset !== 0) && (
            <button
              onClick={() => { setPaymentFilter("all"); setDateFilter("week"); setWeekOffset(0); setDateFrom(""); setDateTo(""); }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Reset filters
            </button>
          )}
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
                {["#", "Parent", "Hotel", "Bookings", "Hours", "Total Spent", "Payment", "Nannies", "Last Booking"].map((h) => (
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
                      {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
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
                        <button
                          onClick={(e) => { e.stopPropagation(); openBulkModifyModal(p); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer w-fit"
                        >
                          <TimerReset className="w-3 h-3" /> Modify All
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadParentInvoice(p); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer w-fit"
                        >
                          <Download className="w-3 h-3" /> Invoice PDF
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setViewParentInvoice(p); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer w-fit"
                        >
                          <Share2 className="w-3 h-3" /> Share Invoice
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground max-w-[140px] truncate">{p.nannyNames.join(", ") || "—"}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {p.lastBookingDate ? format(parseISO(p.lastBookingDate), "dd MMM yyyy") : "—"}
                    </td>
                  </tr>
                  {expandedParent === p.key && (
                    <tr>
                      <td colSpan={9} className="px-8 py-4 bg-muted/30">
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
                      {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
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
                    onClick={(e) => { e.stopPropagation(); openBulkModifyModal(p); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <TimerReset className="w-3 h-3" /> Modify All
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadParentInvoice(p); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Invoice PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewParentInvoice(p); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3 h-3" /> Share
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
                {/* Total amount */}
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                  <p className="text-xs text-green-600 mb-1 font-medium">Total to collect</p>
                  <p className="text-3xl font-bold text-green-700">{bulkTotal.toLocaleString()}&euro;</p>
                  <p className="text-sm text-green-600 mt-1">{toDH(bulkTotal).toLocaleString()} DH</p>
                </div>

                {/* List of unpaid bookings */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Unpaid Bookings</label>
                  <div className="bg-muted/30 rounded-xl overflow-hidden divide-y divide-border/50">
                    {unpaid.map((b, idx) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSubmitting && bulkProgress > idx ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          ) : isSubmitting && bulkProgress === idx ? (
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full shrink-0" />
                          ) : (
                            <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="text-muted-foreground whitespace-nowrap">
                            {b.date ? format(parseISO(b.date), "dd MMM yy") : "—"}
                          </span>
                          <span className="text-foreground whitespace-nowrap">{b.startTime}–{b.endTime}</span>
                          <span className="text-foreground truncate">{b.nannyName || "—"}</span>
                        </div>
                        <span className="font-bold text-foreground shrink-0">{(b.totalPrice || 0).toLocaleString()}&euro;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment method */}
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

                {/* Note */}
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
                    <><span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> {bulkProgress}/{unpaid.length}</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Collect All ({unpaid.length})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Modify Hours Modal */}
      {bulkModifyParent && (() => {
        const active = bulkModifyParent.bookings.filter((b) => b.status !== "cancelled");

        // Price preview calculation
        let previewTotal = 0;
        let previewTaxiTotal = 0;
        if (bulkModifyStart && bulkModifyEnd) {
          const sH = parseInt(bulkModifyStart.split("h")[0]);
          const sM = parseInt(bulkModifyStart.split("h")[1] || "0");
          const eH = parseInt(bulkModifyEnd.split("h")[0]);
          const eM = parseInt(bulkModifyEnd.split("h")[1] || "0");
          const startDec = sH + sM / 60;
          const endDec = eH + eM / 60;
          const hours = endDec > startDec ? endDec - startDec : (24 - startDec) + endDec;
          const isOvernight = endDec <= startDec;
          const isEvening = isOvernight || sH >= 19 || sH < 7 || eH > 19 || (eH === 19 && eM > 0);
          active.forEach((b) => {
            const days = b.endDate && b.endDate !== b.date
              ? Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.date).getTime()) / 86400000) + 1)
              : 1;
            const taxiFee = isEvening ? TAXI_FEE * days : 0;
            previewTaxiTotal += taxiFee;
            const rate = nannies.find((n) => n.id === b.nannyId)?.rate ?? SERVICE_RATE;
            previewTotal += Math.round(rate * hours * days) + taxiFee;
          });
        }
        const currentTotal = active.reduce((s, b) => s + (b.totalPrice || 0), 0);
        const priceDiff = previewTotal - currentTotal;

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !bulkModifySaving && closeBulkModifyModal()} />
            <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

              <div className="px-6 pt-6 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <TimerReset className="w-5 h-5 text-primary" />
                    Modify All Hours
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bulkModifyParent.name} &middot; {active.length} booking{active.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => !bulkModifySaving && closeBulkModifyModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 pb-4 space-y-4">
                {/* List of bookings that will be modified */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Bookings to modify</label>
                  <div className="bg-muted/30 rounded-xl overflow-hidden divide-y divide-border/50 max-h-40 overflow-y-auto">
                    {active.map((b, idx) => (
                      <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {bulkModifySaving && bulkModifyProgress > idx ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          ) : bulkModifySaving && bulkModifyProgress === idx ? (
                            <span className="animate-spin w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full shrink-0" />
                          ) : (
                            <CircleDashed className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <span className="text-muted-foreground whitespace-nowrap">
                            {b.date ? format(parseISO(b.date), "dd MMM yy") : "—"}
                          </span>
                          <span className="text-foreground whitespace-nowrap">{b.startTime}–{b.endTime}</span>
                          <span className="text-foreground truncate">{b.nannyName || "—"}</span>
                        </div>
                        <span className="font-bold text-foreground shrink-0">{(b.totalPrice || 0).toLocaleString()}&euro;</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Time selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">New Start Time</label>
                    <select
                      value={bulkModifyStart}
                      onChange={(e) => setBulkModifyStart(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    >
                      <option value="">Select...</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={`bms-${slot.value}`} value={slot.label}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">New End Time</label>
                    <select
                      value={bulkModifyEnd}
                      onChange={(e) => setBulkModifyEnd(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                    >
                      <option value="">Select...</option>
                      {TIME_SLOTS.map((slot) => (
                        <option key={`bme-${slot.value}`} value={slot.label}>{slot.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview new total price */}
                {bulkModifyStart && bulkModifyEnd && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current total</span>
                      <span className="font-medium text-foreground">{currentTotal.toLocaleString()}&euro;</span>
                    </div>
                    {previewTaxiTotal > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Taxi fees included</span>
                        <span className="text-orange-600 font-medium">{previewTaxiTotal}&euro;</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm border-t border-primary/20 pt-1.5">
                      <span className="font-medium text-foreground">New Total</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-foreground">{previewTotal.toLocaleString()}&euro;</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({toDH(previewTotal).toLocaleString()} DH)</span>
                        {priceDiff !== 0 && (
                          <p className={`text-xs font-medium ${priceDiff > 0 ? "text-primary" : "text-orange-600"}`}>
                            {priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()}&euro;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 pt-2 flex gap-3">
                <button onClick={() => !bulkModifySaving && closeBulkModifyModal()} disabled={bulkModifySaving} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button
                  onClick={handleBulkModifyHours}
                  disabled={bulkModifySaving || !bulkModifyStart || !bulkModifyEnd}
                  className="flex-1 py-3 gradient-warm text-white font-semibold rounded-xl text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bulkModifySaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {bulkModifyProgress}/{active.length}</>
                  ) : (
                    <><TimerReset className="w-4 h-4" /> Modify All ({active.length})</>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modify Hours Modal */}
      {modifyingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !modifySaving && closeModifyModal()} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="px-6 pt-6 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <TimerReset className="w-5 h-5 text-primary" />
                  Modify Hours
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {modifyingBooking.clientName} &middot; {modifyingBooking.date}
                  {modifyingBooking.endDate && modifyingBooking.endDate !== modifyingBooking.date ? ` → ${modifyingBooking.endDate}` : ""}
                </p>
              </div>
              <button onClick={() => !modifySaving && closeModifyModal()} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-4 space-y-4">
              {/* Current info */}
              <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current</span>
                  <span className="font-medium text-foreground">
                    {modifyingBooking.startTime} – {modifyingBooking.endTime}
                    <span className="text-xs text-muted-foreground ml-1">({hoursForBooking(modifyingBooking).toFixed(1)}h)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-bold text-foreground">{(modifyingBooking.totalPrice || 0).toLocaleString()}&euro;</span>
                </div>
              </div>

              {/* Time selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
                  <select
                    value={modifyStart}
                    onChange={(e) => setModifyStart(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select...</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`ms-${slot.value}`} value={slot.label}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">End Time</label>
                  <select
                    value={modifyEnd}
                    onChange={(e) => setModifyEnd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select...</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`me-${slot.value}`} value={slot.label}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview new price */}
              {modifyStart && modifyEnd && (() => {
                const sH = parseInt(modifyStart.split("h")[0]);
                const sM = parseInt(modifyStart.split("h")[1] || "0");
                const eH = parseInt(modifyEnd.split("h")[0]);
                const eM = parseInt(modifyEnd.split("h")[1] || "0");
                const startDec = sH + sM / 60;
                const endDec = eH + eM / 60;
                const hours = endDec > startDec ? endDec - startDec : (24 - startDec) + endDec;
                const days = modifyingBooking.endDate && modifyingBooking.endDate !== modifyingBooking.date
                  ? Math.max(1, Math.round((new Date(modifyingBooking.endDate).getTime() - new Date(modifyingBooking.date).getTime()) / 86400000) + 1)
                  : 1;
                const isOvernight = endDec <= startDec;
                const isEvening = isOvernight || sH >= 19 || sH < 7 || eH > 19 || (eH === 19 && eM > 0);
                const taxiFee = isEvening ? TAXI_FEE * days : 0;
                const rate = nannies.find((n) => n.id === modifyingBooking.nannyId)?.rate ?? SERVICE_RATE;
                const newPrice = Math.round(rate * hours * days) + taxiFee;
                const priceDiff = newPrice - (modifyingBooking.totalPrice || 0);

                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">New hours</span>
                      <span className="font-medium text-foreground">{(hours * days).toFixed(1)}h ({days > 1 ? `${days} days × ${hours.toFixed(1)}h` : `${hours.toFixed(1)}h`})</span>
                    </div>
                    {taxiFee > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Taxi fee</span>
                        <span className="text-orange-600 font-medium">{taxiFee}&euro;</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm border-t border-primary/20 pt-1.5">
                      <span className="font-medium text-foreground">New Price</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-foreground">{newPrice.toLocaleString()}&euro;</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({toDH(newPrice).toLocaleString()} DH)</span>
                        {priceDiff !== 0 && (
                          <p className={`text-xs font-medium ${priceDiff > 0 ? "text-primary" : "text-orange-600"}`}>
                            {priceDiff > 0 ? "+" : ""}{priceDiff.toLocaleString()}&euro;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button onClick={() => !modifySaving && closeModifyModal()} disabled={modifySaving} className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleModifyHours}
                disabled={modifySaving || !modifyStart || !modifyEnd}
                className="flex-1 py-3 gradient-warm text-white font-semibold rounded-xl text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {modifySaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : (
                  <><TimerReset className="w-4 h-4" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parent Invoice Share Modal ── */}
      {viewParentInvoice && (() => {
        const p = viewParentInvoice;
        const activeBookings = [...p.bookings]
          .filter((b) => b.status !== "cancelled")
          .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        const total = p.totalPrice;
        const totalDH = toDH(total);
        const isPaid = p.unpaidCount === 0 && p.paidCount > 0;
        const totalTaxi = activeBookings.reduce((sum, b) => sum + taxiFeeForBooking(b), 0);
        const totalService = total - totalTaxi;
        return (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto" onClick={() => setViewParentInvoice(null)}>
            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="gradient-warm px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Invoice</p>
                    <h2 className="text-2xl font-serif font-bold">{p.name}</h2>
                  </div>
                  <button onClick={() => setViewParentInvoice(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-white/70 text-xs mt-1">{format(new Date(), "dd MMMM yyyy")} · {activeBookings.length} booking{activeBookings.length !== 1 ? "s" : ""}</p>
                {isPaid && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-green-500/90 text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-lg">
                    <DollarSign className="w-4 h-4" /> PAID
                  </div>
                )}
              </div>

              <div className="p-6 space-y-5">
                {/* From / To */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">From</p>
                    <p className="text-sm font-semibold text-foreground">Call a Nanny</p>
                    <p className="text-xs text-muted-foreground">Elam Childcare SARL</p>
                    <p className="text-xs text-muted-foreground">RC Marrakech N° 179297</p>
                    <p className="text-xs text-muted-foreground">Marrakech, Morocco</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">IBAN: MA64 0114...9237</p>
                    <p className="text-xs text-muted-foreground font-mono">SWIFT: BMCEMAMC</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Billed To</p>
                    <p className="text-sm font-semibold text-foreground">{activeBookings[0]?.billedTo || p.name}</p>
                    {activeBookings[0]?.billedTo && <p className="text-xs text-muted-foreground">Client: {p.name}</p>}
                    {p.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</p>}
                    {p.phone && <p className="text-xs text-muted-foreground flex items-center gap-1">{p.phone}</p>}
                    {p.hotel && <p className="text-xs text-muted-foreground flex items-center gap-1">{p.hotel}</p>}
                    {/* Editable Billed To */}
                    {editingBilledTo ? (
                      <div className="mt-2 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={billedToValue}
                          onChange={(e) => setBilledToValue(e.target.value)}
                          placeholder="e.g. Club Med La Palmeraie"
                          className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = billedToValue.trim();
                              activeBookings.forEach((b) => updateBooking(b.id, { billedTo: val }));
                              setEditingBilledTo(false);
                            } else if (e.key === "Escape") {
                              setEditingBilledTo(false);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const val = billedToValue.trim();
                            activeBookings.forEach((b) => updateBooking(b.id, { billedTo: val }));
                            setEditingBilledTo(false);
                          }}
                          className="px-2 py-1 text-xs font-medium text-white bg-primary rounded-lg hover:opacity-90"
                        >Save</button>
                        <button onClick={() => setEditingBilledTo(false)} className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setBilledToValue(activeBookings[0]?.billedTo || ""); setEditingBilledTo(true); }}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        {activeBookings[0]?.billedTo ? `Billed to: ${activeBookings[0].billedTo}` : "Add billed to..."}
                      </button>
                    )}
                  </div>
                </div>

                {/* Booking Details */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</p>
                  </div>
                  <div className="divide-y divide-border max-h-48 overflow-y-auto">
                    {activeBookings.map((b) => {
                      const hours = hoursForBooking(b);
                      const taxi = taxiFeeForBooking(b);
                      const base = basePriceForBooking(b);
                      return (
                        <div key={b.id} className="px-4 py-2 text-xs">
                          <div className="flex justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{b.date ? format(parseISO(b.date), "dd MMM") : "—"}</span>
                              <span className="text-foreground">{b.startTime || "—"} – {b.endTime || "—"}</span>
                              <span className="text-muted-foreground">{hours.toFixed(1)}h</span>
                            </div>
                            <span className="font-bold text-foreground">{base}€</span>
                          </div>
                          {taxi > 0 && (
                            <div className="flex justify-between mt-1 text-amber-700">
                              <span className="flex items-center gap-1 pl-[calc(3rem+12px)]"><Car className="w-3 h-3" /> Taxi fee (evening)</span>
                              <span className="font-bold">+{taxi}€</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Bookings</span>
                      <span className="text-sm font-medium text-foreground">{activeBookings.length}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Total Hours</span>
                      <span className="text-sm font-medium text-foreground">{p.totalHours.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Service ({p.totalHours.toFixed(1)}h)</span>
                      <span className="text-sm font-medium text-foreground">{totalService}€</span>
                    </div>
                    {totalTaxi > 0 && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-sm text-amber-700 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" /> Taxi fees</span>
                        <span className="text-sm font-medium text-amber-700">+{totalTaxi}€</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className={`rounded-xl p-5 text-center ${isPaid ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200" : "bg-gradient-to-r from-orange-50 to-pink-50"}`}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{isPaid ? "Total Charged" : "Total Amount"}</p>
                  <p className="text-3xl font-bold text-foreground">{total.toLocaleString()} <span className="text-lg text-muted-foreground">€</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{totalDH.toLocaleString()} DH</p>
                  {isPaid && (
                    <p className="text-base font-bold text-green-600 mt-2 tracking-widest">PAID</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setViewParentInvoice(null)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => { downloadParentInvoice(p); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white gradient-warm rounded-xl hover:opacity-90 transition-opacity shadow-warm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleParentSendEmail(p)}
                    disabled={emailSendingParent}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    {emailSendingParent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send by Email
                  </button>
                  <button
                    onClick={() => handleParentShareWhatsApp(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Share via WhatsApp
                  </button>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-border text-center">
                <p className="text-[10px] text-muted-foreground">Issued by Call a Nanny · callanannycare.com</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
