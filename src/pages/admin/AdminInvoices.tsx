import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Search, Trash2, ChevronDown,
  Plus, X, Loader2, CheckCircle,
  FileText, Pencil, Download, DollarSign, AlertCircle,
  Clock, User, Phone, Mail, Hotel, Baby, Calculator, Car,
  Share2, MessageCircle, Send, Users, ChevronRight,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import PhoneInput from "../../components/PhoneInput";
import type { Booking } from "@/types";
import { downloadInvoicePdf } from "@/utils/invoicePdf";
import { calcTotalBookedHours, parseTimeToHours } from "@/utils/shiftHelpers";

const SERVICE_RATE = 10; // €/hr — client rate (same as booking page)
const TAXI_FEE = 10;

// 24h time slots from 06:00 to 05:45 (business-day ordering, 15-min steps)
const TIME_SLOTS: string[] = [];
for (let i = 0; i < 96; i++) {
  const h = (6 + Math.floor(i / 4)) % 24;
  const m = (i % 4) * 15;
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
}

// ─── Helpers ────────────────────────────────────────────────

function calcWorkedHours(clockIn: string | null, clockOut: string | null): string {
  if (!clockIn || !clockOut) return "—";
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = Math.max(0, ms / 3600000);
  return hours.toFixed(1);
}

function formatClockTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function fmtDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "EEEE do MMMM"); } catch { return dateStr || "N/A"; }
}

// ─── Default Form ───────────────────────────────────────────

interface InvoiceForm {
  id?: number | string;
  nannyId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  clockIn: string;
  clockOut: string;
  childrenCount: string;
  childrenAges: string;
  totalPrice: string;
  notes: string;
}

const emptyForm: InvoiceForm = {
  nannyId: "", clientName: "", clientEmail: "", clientPhone: "",
  hotel: "", date: "",
  clockIn: "", clockOut: "",
  childrenCount: "1", childrenAges: "", totalPrice: "", notes: "",
};

// ─── Main Component ─────────────────────────────────────────

export default function AdminInvoices() {
  const { bookings, nannies, addBooking, updateBooking, deleteBooking, adminProfile, resendInvoice, markAsCollected } = useData();
  const { toDH } = useExchangeRate();

  // Filters
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "last-month" | "uncollected">("all");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InvoiceForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<number | string | null>(null);

  // View invoice
  const [viewInvoice, setViewInvoice] = useState<Booking | null>(null);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number | string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Grouped view
  const [viewMode, setViewMode] = useState<"individual" | "grouped">("grouped");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);

  // Share menu
  const [shareMenuId, setShareMenuId] = useState<number | string | null>(null);
  const [emailSending, setEmailSending] = useState<number | string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShareMenuId(null);
      }
    };
    if (shareMenuId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [shareMenuId]);

  const buildWhatsAppLink = (inv: Booking) => {
    // Use booked hours for parent-facing invoice
    const bookedH = inv.startTime && inv.endTime
      ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
      : 0;
    const hours = bookedH > 0 ? bookedH.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
    const total = inv.totalPrice || 0;
    const totalDH = toDH(total);
    const dateStr = inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A";
    const msg = [
      `*Invoice #INV-${inv.id}*`,
      `From: Call a Nanny`,
      `Date: ${dateStr}`,
      ``,
      `*Service Details*`,
      `Caregiver: ${inv.nannyName || "Unassigned"}`,
      `Time Slot: ${inv.startTime || formatClockTime(inv.clockIn)} – ${inv.endTime || formatClockTime(inv.clockOut)}`,
      `Service Hours: ${hours}h`,
      `Children: ${inv.childrenCount || 1}${inv.childrenAges ? ` (${inv.childrenAges})` : ""}`,
      ``,
      `*Total: ${total}€ (${totalDH.toLocaleString()} DH)*`,
      inv.collectedAt ? `Status: PAID` : ``,
      ``,
      `Issued by Call a Nanny · callanannycare.com`,
    ].filter(Boolean).join("\n");

    const phone = (inv.clientPhone || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleSendEmail = async (inv: Booking) => {
    if (!inv.clientEmail) {
      alert("No email address on file for this client.");
      return;
    }
    setEmailSending(inv.id);
    try {
      await resendInvoice(inv.id);
      alert(`Invoice emailed to ${inv.clientEmail}`);
    } catch {
      alert("Failed to send invoice email. Please try again.");
    }
    setEmailSending(null);
    setShareMenuId(null);
  };

  const handleShareWhatsApp = (inv: Booking) => {
    if (!inv.clientPhone) {
      alert("No phone number on file for this client.");
      return;
    }
    window.open(buildWhatsAppLink(inv), "_blank");
    setShareMenuId(null);
  };

  // Helper: combine date + time strings into a Date object
  const buildDateTime = (date: string, time: string): Date | null => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}`);
  };

  // Auto-calculate total when clock times change
  useEffect(() => {
    if (!formData.date || !formData.clockIn || !formData.clockOut) return;
    try {
      const inTime = buildDateTime(formData.date, formData.clockIn);
      const outTime = buildDateTime(formData.date, formData.clockOut);
      if (!inTime || !outTime) return;
      // If clock-out is earlier than clock-in, assume it's the next day
      if (outTime <= inTime) outTime.setDate(outTime.getDate() + 1);
      const ms = outTime.getTime() - inTime.getTime();
      if (ms <= 0) return;
      const hours = ms / 3600000;
      let total = Math.round(hours * SERVICE_RATE);
      // Add taxi fee if any part of the shift falls in night hours (7 PM – 7 AM)
      const inHour = inTime.getHours();
      const outHour = outTime.getHours();
      const touchesNight = inHour >= 19 || inHour < 7 || outHour >= 19 || outHour < 7 || hours > 12;
      if (touchesNight) total += TAXI_FEE;
      setFormData((prev) => ({ ...prev, totalPrice: String(total) }));
    } catch {
      // skip
    }
  }, [formData.date, formData.clockIn, formData.clockOut]);

  // ── Derived Data ──

  const invoices = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const da = a.clockOut ? new Date(a.clockOut).getTime() : a.date ? new Date(a.date).getTime() : 0;
        const db = b.clockOut ? new Date(b.clockOut).getTime() : b.date ? new Date(b.date).getTime() : 0;
        return sortOrder === "newest" ? db - da : da - db;
      });
  }, [bookings, sortOrder]);

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          (b.clientName || "").toLowerCase().includes(q) ||
          (b.nannyName || "").toLowerCase().includes(q) ||
          (b.clientEmail || "").toLowerCase().includes(q) ||
          String(b.id).includes(q)
      );
    }
    const now = new Date();
    if (dateFilter === "uncollected") {
      result = result.filter((b) => !b.collectedAt);
    } else if (dateFilter === "this-month") {
      const s = startOfMonth(now), e = endOfMonth(now);
      result = result.filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      });
    } else if (dateFilter === "last-month") {
      const prev = subMonths(now, 1);
      const s = startOfMonth(prev), e = endOfMonth(prev);
      result = result.filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      });
    }
    return result;
  }, [invoices, search, dateFilter]);

  const totalAmount = filteredInvoices.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const thisMonthAmount = useMemo(() => {
    const now = new Date();
    const s = startOfMonth(now), e = endOfMonth(now);
    return invoices
      .filter((b) => {
        try {
          const d = b.clockIn ? new Date(b.clockIn) : parseISO(b.date);
          return isWithinInterval(d, { start: s, end: e });
        } catch { return false; }
      })
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  }, [invoices]);

  // ── Grouped by parent ──

  interface ParentGroup {
    key: string; // clientName or clientPhone or clientEmail
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    hotel: string;
    bookings: Booking[];
    totalAmount: number;
    allPaid: boolean;
  }

  const groupedByParent = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const inv of filteredInvoices) {
      // Group by phone > email > name (best unique key)
      const key = (inv.clientPhone || "").trim() || (inv.clientEmail || "").trim().toLowerCase() || (inv.clientName || "Unknown").trim().toLowerCase();
      const existing = map.get(key) || [];
      existing.push(inv);
      map.set(key, existing);
    }
    const groups: ParentGroup[] = [];
    for (const [key, bks] of map) {
      const first = bks[0];
      groups.push({
        key,
        clientName: first.clientName || "Unknown",
        clientEmail: first.clientEmail || "",
        clientPhone: first.clientPhone || "",
        hotel: first.hotel || "",
        bookings: bks,
        totalAmount: bks.reduce((s, b) => s + (b.totalPrice || 0), 0),
        allPaid: bks.every((b) => !!b.collectedAt),
      });
    }
    return groups.sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredInvoices]);

  // ── Selection helpers ──

  const allFilteredIds = useMemo(() => filteredInvoices.map((i) => i.id), [filteredInvoices]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  }, [allSelected, allFilteredIds]);

  const toggleSelect = useCallback((id: number | string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectGroupBookings = useCallback((group: ParentGroup) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const groupIds = group.bookings.map((b) => b.id);
      const allInGroup = groupIds.every((id) => next.has(id));
      if (allInGroup) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const selectedInvoices = useMemo(() => filteredInvoices.filter((i) => selectedIds.has(i.id)), [filteredInvoices, selectedIds]);

  // ── Bulk actions ──

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    for (const inv of selectedInvoices) {
      try { await deleteBooking(inv.id); } catch { /* best-effort */ }
    }
    setSelectedIds(new Set());
    setBulkDeleting(false);
    setBulkDeleteConfirm(false);
  };

  const handleBulkEmail = async () => {
    setBulkEmailing(true);
    for (const inv of selectedInvoices) {
      if (inv.clientEmail) {
        try { await resendInvoice(inv.id); } catch { /* best-effort */ }
      }
    }
    setBulkEmailing(false);
    setSelectedIds(new Set());
    alert(`Emailed ${selectedInvoices.filter((i) => i.clientEmail).length} invoice(s).`);
  };

  const handleBulkWhatsApp = () => {
    // For grouped: build one combined message per parent phone
    const byPhone = new Map<string, Booking[]>();
    for (const inv of selectedInvoices) {
      const phone = (inv.clientPhone || "").replace(/[^0-9]/g, "");
      if (!phone) continue;
      const existing = byPhone.get(phone) || [];
      existing.push(inv);
      byPhone.set(phone, existing);
    }
    for (const [phone, invs] of byPhone) {
      const totalAll = invs.reduce((s, i) => s + (i.totalPrice || 0), 0);
      const totalDH = toDH(totalAll);
      const lines: string[] = [
        invs.length > 1 ? `*Combined Invoice — ${invs.length} bookings*` : `*Invoice #INV-${invs[0].id}*`,
        `From: Call a Nanny`,
        ``,
      ];
      for (const inv of invs) {
        const bookedH = inv.startTime && inv.endTime
          ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
          : 0;
        const hours = bookedH > 0 ? bookedH.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
        const dateStr = inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A";
        lines.push(`*#INV-${inv.id}* — ${dateStr}`);
        lines.push(`  Caregiver: ${inv.nannyName || "Unassigned"}`);
        lines.push(`  Time: ${inv.startTime || formatClockTime(inv.clockIn)} – ${inv.endTime || formatClockTime(inv.clockOut)} (${hours}h)`);
        lines.push(`  Amount: ${inv.totalPrice || 0}€`);
        lines.push(``);
      }
      lines.push(`*Grand Total: ${totalAll}€ (${totalDH.toLocaleString()} DH)*`);
      lines.push(``);
      lines.push(`Issued by Call a Nanny · callanannycare.com`);
      const msg = lines.filter(Boolean).join("\n");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    }
    if (byPhone.size === 0) {
      alert("No phone numbers found on selected invoices.");
    }
  };

  // ── Handlers ──

  const openCreate = () => {
    setFormData(emptyForm);
    setIsEditing(false);
    setFormError("");
    setShowModal(true);
  };

  /** Convert booking time strings like "18h00" or "9:30" to "HH:mm" form value */
  const bookingTimeToHHmm = (t?: string | null): string => {
    if (!t) return "";
    const h = parseTimeToHours(t);
    if (h === null) return "";
    const hh = String(Math.floor(h)).padStart(2, "0");
    const mm = String(Math.round((h - Math.floor(h)) * 60)).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const openEdit = (inv: Booking) => {
    // Extract date from clockIn or fall back to inv.date
    const editDate = inv.clockIn
      ? new Date(inv.clockIn).toISOString().slice(0, 10)
      : inv.date || "";
    // Extract time-only (HH:mm) from clockIn/clockOut, falling back to booked times
    const editClockIn = inv.clockIn
      ? new Date(inv.clockIn).toTimeString().slice(0, 5)
      : bookingTimeToHHmm(inv.startTime);
    const editClockOut = inv.clockOut
      ? new Date(inv.clockOut).toTimeString().slice(0, 5)
      : bookingTimeToHHmm(inv.endTime);
    setFormData({
      id: inv.id,
      nannyId: String(inv.nannyId || ""),
      clientName: inv.clientName || "",
      clientEmail: inv.clientEmail || "",
      clientPhone: inv.clientPhone || "",
      hotel: inv.hotel || "",
      date: editDate,
      clockIn: editClockIn,
      clockOut: editClockOut,
      childrenCount: String(inv.childrenCount || 1),
      childrenAges: inv.childrenAges || "",
      totalPrice: String(inv.totalPrice || 0),
      notes: inv.notes || "",
    });
    setIsEditing(true);
    setFormError("");
    setShowModal(true);
  };

  const handleMarkPaid = async (inv: Booking) => {
    setMarkingPaid(inv.id);
    try {
      await markAsCollected(inv.id, {
        collectedBy: adminProfile?.name || "Admin",
        paymentMethod: "cash",
      });
    } catch { /* best-effort */ }
    setMarkingPaid(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (!formData.clientName.trim()) {
      setFormError("Parent name is required");
      return;
    }
    if (!formData.nannyId) {
      setFormError("Please select a nanny");
      return;
    }
    if (!formData.date) {
      setFormError("Date is required");
      return;
    }
    if (!formData.clockIn || !formData.clockOut) {
      setFormError("Clock-in and clock-out are required");
      return;
    }
    if (!formData.totalPrice || Number(formData.totalPrice) <= 0) {
      setFormError("Total price must be greater than 0");
      return;
    }

    setFormLoading(true);
    try {
      const nanny = nannies.find((n) => n.id === Number(formData.nannyId));
      // Combine date + time into full ISO strings
      const clockInDate = buildDateTime(formData.date, formData.clockIn)!;
      const clockOutDate = buildDateTime(formData.date, formData.clockOut)!;
      // If clock-out is earlier than clock-in, assume next day
      if (clockOutDate <= clockInDate) clockOutDate.setDate(clockOutDate.getDate() + 1);

      const payload = {
        nannyId: Number(formData.nannyId),
        nannyName: nanny?.name || "",
        clientName: formData.clientName.trim(),
        clientEmail: formData.clientEmail.trim(),
        clientPhone: formData.clientPhone.trim(),
        hotel: formData.hotel.trim(),
        date: formData.date,
        clockIn: clockInDate.toISOString(),
        clockOut: clockOutDate.toISOString(),
        childrenCount: Number(formData.childrenCount) || 1,
        childrenAges: formData.childrenAges.trim(),
        totalPrice: Number(formData.totalPrice),
        notes: formData.notes.trim(),
        status: "completed" as const,
        createdBy: 'admin' as const,
        createdByName: adminProfile?.name || 'Admin',
      };

      if (isEditing && formData.id) {
        await updateBooking(formData.id, payload);
      } else {
        await addBooking(payload);
      }
      setShowModal(false);
    } catch {
      setFormError("Failed to save invoice. Please try again.");
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: number | string) => {
    await deleteBooking(id);
    setDeleteConfirm(null);
  };

  const downloadPDF = (inv: Booking) => {
    // Use booked hours for billing — clock times are recorded for transparency only
    const bookedHoursNum = inv.startTime && inv.endTime
      ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
      : 0;
    const hours = bookedHoursNum > 0 ? bookedHoursNum.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
    const hoursNum = bookedHoursNum > 0 ? bookedHoursNum : (inv.clockIn && inv.clockOut ? (new Date(inv.clockOut).getTime() - new Date(inv.clockIn).getTime()) / 3600000 : 0);
    const basePay = Math.round(hoursNum * SERVICE_RATE);
    // Detect evening shift from booked times when available, otherwise from clock times
    const startH = inv.startTime ? parseTimeToHours(inv.startTime) : (inv.clockIn ? new Date(inv.clockIn).getHours() : 0);
    const endH = inv.endTime ? parseTimeToHours(inv.endTime) : (inv.clockOut ? new Date(inv.clockOut).getHours() : 0);
    const inHour = startH ?? 0;
    const outHour = endH ?? 0;
    const hasTaxi = inHour >= 19 || inHour < 7 || outHour >= 19 || outHour < 7 || hoursNum > 12;
    const dateStr = inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A";
    const total = inv.totalPrice || 0;
    const totalDH = toDH(total);
    const isPaid = !!inv.collectedAt;

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Invoice #INV-${inv.id}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #fff; padding: 0; margin: 0; }
  .page { max-width: 480px; margin: 0 auto; background: #fff; overflow: hidden; }
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 24px 28px 20px; color: #fff; }
  .header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .header-num { font-size: 28px; font-weight: 800; margin: 2px 0 4px; }
  .header-date { font-size: 13px; opacity: 0.85; }
  .paid-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-top: 6px; }
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
  .total-box.paid { background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%); }
  .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .total-paid-note { font-size: 15px; color: rgba(255,255,255,0.9); margin-top: 8px; font-weight: 800; letter-spacing: 2px; }
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
    <div class="header-num">#INV-${inv.id}</div>
    <div class="header-date">${dateStr}</div>
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
        <div class="addr-name">${inv.clientName || "N/A"}</div>
        ${inv.clientPhone ? `<div class="addr-line"><span class="icon">&#9742;</span> ${inv.clientPhone}</div>` : ""}
        ${inv.hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${inv.hotel}</div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">SERVICE DETAILS</div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128100;</span> Caregiver</span>
        <span class="card-row-value">${inv.nannyName || "Unassigned"}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#9201;</span> Time Slot</span>
        <span class="card-row-value">${inv.startTime || formatClockTime(inv.clockIn)} – ${inv.endTime || formatClockTime(inv.clockOut)}</span>
      </div>
      <div class="card-row">
        <span class="card-row-label">Service Hours</span>
        <span class="card-row-value">${hours}h</span>
      </div>
      <div class="card-row">
        <span class="card-row-label"><span class="icon">&#128118;</span> Children</span>
        <span class="card-row-value">${inv.childrenCount || 1}${inv.childrenAges ? ` (${inv.childrenAges})` : ""}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">PRICE BREAKDOWN</div>
      <div class="card-row">
        <span class="card-row-label">${hours}h &times; ${SERVICE_RATE}&euro;/hr</span>
        <span class="card-row-value">${basePay}&euro;</span>
      </div>
      ${hasTaxi ? `<div class="card-row taxi-row">
        <span class="card-row-label"><span class="icon">&#128663;</span> Taxi fee (7 PM &ndash; 7 AM)</span>
        <span class="card-row-value">+${TAXI_FEE}&euro;</span>
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

    downloadInvoicePdf(html, `Invoice_INV-${inv.id}.pdf`);
  };

  const downloadCombinedPDF = (group: ParentGroup) => {
    const grandTotal = group.totalAmount;
    const grandTotalDH = toDH(grandTotal);
    const allPaid = group.allPaid;
    const dateRange = (() => {
      const dates = group.bookings.map((b) => b.clockIn ? new Date(b.clockIn).toISOString().slice(0, 10) : b.date).filter(Boolean).sort();
      if (dates.length === 0) return "N/A";
      if (dates.length === 1) return fmtDate(dates[0]);
      return `${fmtDate(dates[0])} — ${fmtDate(dates[dates.length - 1])}`;
    })();

    // Build service rows
    const serviceRows = group.bookings.map((inv) => {
      const bookedH = inv.startTime && inv.endTime
        ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
        : 0;
      const hours = bookedH > 0 ? bookedH.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
      const dateStr = inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A";
      const timeSlot = `${inv.startTime || formatClockTime(inv.clockIn)} – ${inv.endTime || formatClockTime(inv.clockOut)}`;
      return `
      <div class="card-row">
        <span class="card-row-label" style="flex-direction:column;align-items:flex-start;gap:2px;">
          <span style="font-weight:600;color:#1a202c;">${dateStr}</span>
          <span style="font-size:11px;">${inv.nannyName || "Unassigned"} · ${timeSlot} · ${hours}h</span>
        </span>
        <span class="card-row-value">${(inv.totalPrice || 0)}€</span>
      </div>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Combined Invoice — ${group.clientName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #2d3748; background: #fff; padding: 0; margin: 0; }
  .page { max-width: 480px; margin: 0 auto; background: #fff; overflow: hidden; }
  .header { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); padding: 24px 28px 20px; color: #fff; }
  .header-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; opacity: 0.85; }
  .header-num { font-size: 24px; font-weight: 800; margin: 2px 0 4px; }
  .header-date { font-size: 13px; opacity: 0.85; }
  .paid-badge { display: inline-block; background: rgba(255,255,255,0.25); color: #fff; padding: 6px 18px; border-radius: 20px; font-size: 14px; font-weight: 700; letter-spacing: 2px; margin-top: 6px; }
  .body-content { padding: 16px 24px 20px; }
  .addresses { display: flex; gap: 20px; margin-bottom: 16px; }
  .addr { flex: 1; }
  .addr-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a0937e; margin-bottom: 6px; }
  .addr-name { font-size: 15px; font-weight: 700; color: #1a202c; margin-bottom: 4px; }
  .addr-line { font-size: 12px; color: #718096; line-height: 1.7; display: flex; align-items: center; gap: 6px; }
  .card { background: #faf8f5; border: 1px solid #f0ece6; border-radius: 14px; padding: 14px 18px; margin-bottom: 12px; }
  .card-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #8a7e6e; margin-bottom: 10px; }
  .card-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid #f0ece6; }
  .card-row:last-child { border-bottom: none; }
  .card-row-label { font-size: 13px; color: #5a5a5a; display: flex; align-items: center; gap: 8px; }
  .card-row-value { font-size: 14px; font-weight: 700; color: #1a202c; }
  .total-box { background: linear-gradient(135deg, #c2703a 0%, #e8956e 50%, #f0b08a 100%); border-radius: 14px; padding: 18px; text-align: center; margin-top: 6px; }
  .total-box.paid { background: linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%); }
  .total-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8); margin-bottom: 6px; }
  .total-amount { font-size: 36px; font-weight: 800; color: #fff; }
  .total-amount .currency { font-size: 22px; font-weight: 600; vertical-align: super; margin-left: 2px; opacity: 0.85; }
  .total-dh { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 2px; }
  .total-paid-note { font-size: 15px; color: rgba(255,255,255,0.9); margin-top: 8px; font-weight: 800; letter-spacing: 2px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .back-bar { max-width: 480px; margin: 0 auto; padding: 12px 16px; display: flex; gap: 8px; position: sticky; top: 0; z-index: 100; background: #fff; }
  .back-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 20px; border: none; border-radius: 12px; font-size: 15px; font-weight: 700; cursor: pointer; }
  .back-btn.close { background: linear-gradient(135deg, #c2703a 0%, #e8956e 100%); color: #fff; }
  .back-btn.print { background: #f0ece6; color: #5a5a5a; }
  .back-btn.share { background: #e8f4e8; color: #16a34a; }
  @media print {
    body { background: #fff; padding: 0; margin: 0; }
    .page { max-width: 100%; margin: 0; }
    .back-bar { display: none !important; }
    @page { margin: 6mm; size: A4; }
    * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
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
    <div class="header-label">COMBINED INVOICE</div>
    <div class="header-num">${group.clientName}</div>
    <div class="header-date">${group.bookings.length} bookings · ${dateRange}</div>
    ${allPaid ? `<div class="paid-badge">&#10003; ALL PAID</div>` : ""}
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
        <div class="addr-name">${group.clientName}</div>
        ${group.clientPhone ? `<div class="addr-line"><span class="icon">&#9742;</span> ${group.clientPhone}</div>` : ""}
        ${group.clientEmail ? `<div class="addr-line"><span class="icon">&#9993;</span> ${group.clientEmail}</div>` : ""}
        ${group.hotel ? `<div class="addr-line"><span class="icon">&#127976;</span> ${group.hotel}</div>` : ""}
      </div>
    </div>

    <div class="card">
      <div class="card-title">SERVICES (${group.bookings.length} sessions)</div>
      ${serviceRows}
    </div>

    <div class="total-box${allPaid ? " paid" : ""}">
      <div class="total-label">${allPaid ? "TOTAL CHARGED" : "GRAND TOTAL"}</div>
      <div class="total-amount">${grandTotal.toLocaleString()}<span class="currency">&euro;</span></div>
      <div class="total-dh">${grandTotalDH.toLocaleString()} DH</div>
      ${allPaid ? `
      <div style="border-top:1px solid rgba(255,255,255,0.3);margin:10px 0 6px;"></div>
      <div class="total-paid-note">&#10003; ALL PAID</div>
      ` : ""}
    </div>
  </div>
</div>
</body></html>`;

    downloadInvoicePdf(html, `Combined_Invoice_${group.clientName.replace(/\s+/g, "_")}.pdf`);
  };

  const exportCSV = () => {
    const headers = ["Invoice #", "Billed To (Parent)", "Email", "Phone", "Caregiver", "Date", "Clock In", "Clock Out", "Hours", "Amount (€)", "Amount (DH)"];
    const rows = filteredInvoices.map((inv) => [
      `INV-${inv.id}`,
      inv.clientName || "",
      inv.clientEmail || "",
      inv.clientPhone || "",
      inv.nannyName || "",
      inv.date || "",
      inv.clockIn ? formatClockTime(inv.clockIn) : "",
      inv.clockOut ? formatClockTime(inv.clockOut) : "",
      calcWorkedHours(inv.clockIn, inv.clockOut),
      String(inv.totalPrice || 0),
      String(toDH(inv.totalPrice || 0)),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (field: keyof InvoiceForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const activeNannies = nannies.filter((n) => n.status === "active");

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">From Call a Nanny to parents · {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 gradient-warm text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-warm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalAmount.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">€</span></p>
              <p className="text-[10px] text-muted-foreground">{toDH(totalAmount).toLocaleString()} DH</p>
              <p className="text-xs text-muted-foreground">Total Invoiced</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{thisMonthAmount.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">€</span></p>
              <p className="text-[10px] text-muted-foreground">{toDH(thisMonthAmount).toLocaleString()} DH</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by parent, caregiver, email, or invoice #..."
            className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          />
        </div>
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="uncollected">Uncollected</option>
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="appearance-none pl-3 pr-8 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* ── View Mode Toggle + Bulk Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode("individual"); setExpandedParent(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "individual" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />Individual
          </button>
          <button
            onClick={() => setViewMode("grouped")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "grouped" ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1" />By Parent
          </button>
        </div>
        {viewMode === "individual" && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer"
              />
              Select all ({filteredInvoices.length})
            </label>
          </div>
        )}
      </div>

      {/* ── Bulk Actions Bar ── */}
      {someSelected && viewMode === "individual" && (
        <div className="flex flex-wrap items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-foreground mr-2">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button
            onClick={handleBulkEmail}
            disabled={bulkEmailing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {bulkEmailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Email
          </button>
          {bulkDeleteConfirm ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600 font-medium">Delete {selectedIds.size}?</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {bulkDeleting ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Yes, Delete"}
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
          <button
            onClick={() => { setSelectedIds(new Set()); setBulkDeleteConfirm(false); }}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* ── Invoice Table ── */}
      {viewMode === "individual" ? (
      <div className="bg-card rounded-xl border border-border shadow-soft">
        {filteredInvoices.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No invoices found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {search || dateFilter !== "all" ? "Try adjusting your filters." : "Create your first invoice or complete a booking with clock data."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Billed To (Parent)</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caregiver</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock In/Out</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className={`hover:bg-muted/50 transition-colors ${selectedIds.has(inv.id) ? "bg-primary/5" : ""}`}>
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(inv.id)}
                          onChange={() => toggleSelect(inv.id)}
                          className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="text-sm font-mono font-medium text-primary hover:underline hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          #INV-{inv.id}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-foreground">{inv.clientName || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">{inv.clientEmail || ""}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{inv.nannyName || "Unassigned"}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm text-foreground font-medium">{formatClockTime(inv.clockIn)} – {formatClockTime(inv.clockOut)}</p>
                        <p className="text-xs text-muted-foreground/70">{inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : fmtDate(inv.date)}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{calcWorkedHours(inv.clockIn, inv.clockOut)}h</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-foreground">{(inv.totalPrice || 0).toLocaleString()}€</div>
                        <div className="text-[10px] text-muted-foreground">{toDH(inv.totalPrice || 0).toLocaleString()} DH</div>
                        {inv.collectedAt && (
                          <span className="inline-flex items-center gap-0.5 mt-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                            <DollarSign className="w-3 h-3" /> Paid
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadPDF(inv)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <div className="relative" ref={shareMenuId === inv.id ? shareMenuRef : undefined}>
                            <button
                              onClick={() => setShareMenuId(shareMenuId === inv.id ? null : inv.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Share invoice"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            {shareMenuId === inv.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                                <button
                                  onClick={() => handleSendEmail(inv)}
                                  disabled={emailSending === inv.id}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  {emailSending === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 text-blue-500" />}
                                  Send by Email
                                </button>
                                <button
                                  onClick={() => handleShareWhatsApp(inv)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4 text-green-500" />
                                  Share via WhatsApp
                                </button>
                              </div>
                            )}
                          </div>
                          {!inv.collectedAt && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              disabled={markingPaid === inv.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                              title="Mark as Paid"
                            >
                              {markingPaid === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                          )}
                          {deleteConfirm === inv.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleDelete(inv.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100">Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-lg hover:bg-muted/80">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(inv.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-border">
              {filteredInvoices.map((inv) => (
                <div key={inv.id} className={`px-5 py-4 space-y-3 ${selectedIds.has(inv.id) ? "bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                        className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer"
                      />
                      <button
                        onClick={() => setViewInvoice(inv)}
                        className="text-sm font-mono font-medium text-primary hover:underline cursor-pointer"
                      >
                        #INV-{inv.id}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Billed To</p>
                      <p className="font-medium text-foreground text-sm">{inv.clientName || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{inv.clientEmail || ""}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">{(inv.totalPrice || 0).toLocaleString()}€</span>
                      <div className="text-[10px] text-muted-foreground">{toDH(inv.totalPrice || 0).toLocaleString()} DH</div>
                      {inv.collectedAt && (
                        <span className="inline-flex items-center gap-0.5 mt-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          <DollarSign className="w-3 h-3" /> Paid
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span>Caregiver: {inv.nannyName || "Unassigned"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatClockTime(inv.clockIn)} – {formatClockTime(inv.clockOut)}</span>
                    <span className="font-medium">{calcWorkedHours(inv.clockIn, inv.clockOut)}h</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => openEdit(inv)} className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => downloadPDF(inv)}
                      className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleSendEmail(inv)}
                      disabled={emailSending === inv.id}
                      className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      {emailSending === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      Email
                    </button>
                    <button
                      onClick={() => handleShareWhatsApp(inv)}
                      className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>
                    {!inv.collectedAt && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        disabled={markingPaid === inv.id}
                        className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        {markingPaid === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Mark Paid
                      </button>
                    )}
                    {deleteConfirm === inv.id ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => handleDelete(inv.id)} className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(inv.id)} className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors ml-auto">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      ) : (
      /* ── Grouped by Parent View ── */
      <div className="space-y-3">
        {groupedByParent.length === 0 ? (
          <div className="bg-card rounded-xl border border-border shadow-soft px-6 py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No invoices found</p>
          </div>
        ) : (
          groupedByParent.map((group) => {
            const isExpanded = expandedParent === group.key;
            const groupAllSelected = group.bookings.every((b) => selectedIds.has(b.id));
            return (
              <div key={group.key} className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
                {/* Parent header */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedParent(isExpanded ? null : group.key)}
                >
                  <input
                    type="checkbox"
                    checked={groupAllSelected}
                    onChange={(e) => { e.stopPropagation(); selectGroupBookings(group); }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-border text-primary focus:ring-primary/30 w-4 h-4 cursor-pointer flex-shrink-0"
                  />
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{group.clientName}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{group.bookings.length} booking{group.bookings.length !== 1 ? "s" : ""}</span>
                      {group.allPaid && (
                        <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">All Paid</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {group.clientPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{group.clientPhone}</span>}
                      {group.clientEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{group.clientEmail}</span>}
                      {group.hotel && <span className="flex items-center gap-1"><Hotel className="w-3 h-3" />{group.hotel}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-foreground">{group.totalAmount.toLocaleString()}€</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(group.totalAmount).toLocaleString()} DH</p>
                  </div>
                </div>

                {/* Expanded bookings */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Bulk actions for this group */}
                    <div className="flex items-center gap-2 px-5 py-2 bg-muted/20 border-b border-border">
                      <button
                        onClick={() => {
                          const phone = (group.clientPhone || "").replace(/[^0-9]/g, "");
                          if (!phone) { alert("No phone number for this parent."); return; }
                          // Select all group bookings and send combined WhatsApp
                          const totalAll = group.totalAmount;
                          const totalDH = toDH(totalAll);
                          const lines: string[] = [
                            group.bookings.length > 1 ? `*Combined Invoice — ${group.bookings.length} bookings*` : `*Invoice #INV-${group.bookings[0].id}*`,
                            `From: Call a Nanny`,
                            `Client: ${group.clientName}`,
                            ``,
                          ];
                          for (const inv of group.bookings) {
                            const bookedH = inv.startTime && inv.endTime
                              ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
                              : 0;
                            const hours = bookedH > 0 ? bookedH.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
                            const dateStr = inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A";
                            lines.push(`*#INV-${inv.id}* — ${dateStr}`);
                            lines.push(`  Caregiver: ${inv.nannyName || "Unassigned"}`);
                            lines.push(`  Time: ${inv.startTime || formatClockTime(inv.clockIn)} – ${inv.endTime || formatClockTime(inv.clockOut)} (${hours}h)`);
                            lines.push(`  Amount: ${inv.totalPrice || 0}€`);
                            lines.push(``);
                          }
                          lines.push(`*Grand Total: ${totalAll}€ (${totalDH.toLocaleString()} DH)*`);
                          lines.push(``);
                          lines.push(`Issued by Call a Nanny · callanannycare.com`);
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.filter(Boolean).join("\n"))}`, "_blank");
                        }}
                        className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle className="w-3 h-3" /> Send Combined WhatsApp
                      </button>
                      {group.clientEmail && (
                        <button
                          onClick={async () => {
                            for (const inv of group.bookings) {
                              try { await resendInvoice(inv.id); } catch { /* best-effort */ }
                            }
                            alert(`Emailed ${group.bookings.length} invoice(s) to ${group.clientEmail}`);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Mail className="w-3 h-3" /> Email All
                        </button>
                      )}
                      <button
                        onClick={() => downloadCombinedPDF(group)}
                        className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <Download className="w-3 h-3" /> Combined PDF
                      </button>
                    </div>
                    {/* Individual bookings list */}
                    <div className="divide-y divide-border">
                      {group.bookings.map((inv) => (
                        <div key={inv.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors ${selectedIds.has(inv.id) ? "bg-primary/5" : ""}`}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(inv.id)}
                            onChange={() => toggleSelect(inv.id)}
                            className="rounded border-border text-primary focus:ring-primary/30 w-3.5 h-3.5 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setViewInvoice(inv)}
                                className="text-xs font-mono font-medium text-primary hover:underline cursor-pointer"
                              >
                                #INV-{inv.id}
                              </button>
                              <span className="text-xs text-muted-foreground">
                                {inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">· {inv.nannyName || "Unassigned"}</span>
                              <span className="text-xs text-muted-foreground">· {inv.startTime || formatClockTime(inv.clockIn)} – {inv.endTime || formatClockTime(inv.clockOut)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-semibold text-foreground">{(inv.totalPrice || 0).toLocaleString()}€</span>
                            {inv.collectedAt && (
                              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Paid</span>
                            )}
                            <button onClick={() => openEdit(inv)} className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => downloadPDF(inv)} className="p-1 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download PDF">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {/* ── View Invoice Modal ── */}
      {viewInvoice && (() => {
        const inv = viewInvoice;
        // Use booked hours for billing
        const viewBookedH = inv.startTime && inv.endTime
          ? calcTotalBookedHours(inv.startTime, inv.endTime, inv.extraTimes, inv.date, inv.endDate)
          : 0;
        const hours = viewBookedH > 0 ? viewBookedH.toFixed(1) : calcWorkedHours(inv.clockIn, inv.clockOut);
        const hoursNum = viewBookedH > 0 ? viewBookedH : (inv.clockIn && inv.clockOut ? (new Date(inv.clockOut).getTime() - new Date(inv.clockIn).getTime()) / 3600000 : 0);
        const basePay = Math.round(hoursNum * SERVICE_RATE);
        const vStartH = inv.startTime ? parseTimeToHours(inv.startTime) : (inv.clockIn ? new Date(inv.clockIn).getHours() : 0);
        const vEndH = inv.endTime ? parseTimeToHours(inv.endTime) : (inv.clockOut ? new Date(inv.clockOut).getHours() : 0);
        const inHour = vStartH ?? 0;
        const outHour = vEndH ?? 0;
        const hasTaxi = inHour >= 19 || inHour < 7 || outHour >= 19 || outHour < 7 || hoursNum > 12;
        return (
          <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[8vh] overflow-y-auto" onClick={() => setViewInvoice(null)}>
            <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="gradient-warm px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Invoice</p>
                    <h2 className="text-2xl font-serif font-bold">#INV-{inv.id}</h2>
                  </div>
                  <button onClick={() => setViewInvoice(null)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-white/70 text-xs mt-1">{inv.clockIn ? fmtDate(new Date(inv.clockIn).toISOString().slice(0, 10)) : inv.date ? fmtDate(inv.date) : "N/A"}</p>
                {inv.collectedAt && (
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
                    <p className="text-xs text-muted-foreground">Professional Childcare</p>
                    <p className="text-xs text-muted-foreground">Marrakech, Morocco</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1">Billed To</p>
                    <p className="text-sm font-semibold text-foreground">{inv.clientName || "N/A"}</p>
                    {inv.clientEmail && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{inv.clientEmail}</p>}
                    {inv.clientPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{inv.clientPhone}</p>}
                    {inv.hotel && <p className="text-xs text-muted-foreground flex items-center gap-1"><Hotel className="w-3 h-3" />{inv.hotel}</p>}
                  </div>
                </div>

                {/* Service Details */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Details</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Caregiver</span>
                      <span className="text-sm font-medium text-foreground">{inv.nannyName || "Unassigned"}</span>
                    </div>
                    {inv.startTime && inv.endTime && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Booked Time</span>
                        <span className="text-sm font-medium text-foreground">{inv.startTime} – {inv.endTime}</span>
                      </div>
                    )}
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Clock In / Out</span>
                      <span className="text-sm font-medium text-foreground">{formatClockTime(inv.clockIn)} – {formatClockTime(inv.clockOut)}</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">Service Hours</span>
                      <span className="text-sm font-medium text-foreground">{hours}h</span>
                    </div>
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Baby className="w-3.5 h-3.5" />Children</span>
                      <span className="text-sm font-medium text-foreground">{inv.childrenCount || 1}{inv.childrenAges ? ` (${inv.childrenAges})` : ""}</span>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/30 px-4 py-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price Breakdown</p>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{hours}h × {SERVICE_RATE}€/hr</span>
                      <span className="text-sm font-medium text-foreground">{basePay}€</span>
                    </div>
                    {hasTaxi && (
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-sm text-amber-700 flex items-center gap-1.5"><Car className="w-3.5 h-3.5" />Taxi fee (7 PM – 7 AM)</span>
                        <span className="text-sm font-medium text-amber-700">+{TAXI_FEE}€</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className={`rounded-xl p-5 text-center ${inv.collectedAt ? "bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200" : "bg-gradient-to-r from-orange-50 to-pink-50"}`}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{inv.collectedAt ? "Total Charged" : "Total Amount"}</p>
                  <p className="text-3xl font-bold text-foreground">{(inv.totalPrice || 0).toLocaleString()} <span className="text-lg text-muted-foreground">€</span></p>
                  <p className="text-sm text-muted-foreground mt-1">{toDH(inv.totalPrice || 0).toLocaleString()} DH</p>
                  {inv.collectedAt && (
                    <p className="text-base font-bold text-green-600 mt-2 tracking-widest">PAID</p>
                  )}
                </div>

                {inv.notes && (
                  <div className="bg-muted/30 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{inv.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => { openEdit(inv); setViewInvoice(null); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => downloadPDF(inv)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white gradient-warm rounded-xl hover:opacity-90 transition-opacity shadow-warm"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendEmail(inv)}
                    disabled={emailSending === inv.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    {emailSending === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    Send by Email
                  </button>
                  <button
                    onClick={() => handleShareWhatsApp(inv)}
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

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-[10vh] overflow-y-auto">
          <div className="w-full max-w-lg bg-card rounded-2xl shadow-xl border border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {isEditing ? "Edit Invoice" : "Create Invoice"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Caregiver */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Caregiver (Nanny) *</label>
                <select
                  value={formData.nannyId}
                  onChange={(e) => updateField("nannyId", e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                >
                  <option value="">Select nanny...</option>
                  {activeNannies.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Billed To (Parent) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parent Name *</label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => updateField("clientName", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    autoComplete="name"
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Parent Email</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => updateField("clientEmail", e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(val) => updateField("clientPhone", val)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Hotel</label>
                  <input
                    type="text"
                    value={formData.hotel}
                    onChange={(e) => updateField("hotel", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  required
                />
              </div>

              {/* Clock In/Out */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Clock In *</label>
                  <div className="relative">
                    <select
                      value={formData.clockIn}
                      onChange={(e) => updateField("clockIn", e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                      required
                    >
                      <option value="">Select...</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Clock Out *</label>
                  <div className="relative">
                    <select
                      value={formData.clockOut}
                      onChange={(e) => updateField("clockOut", e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                      required
                    >
                      <option value="">Select...</option>
                      {TIME_SLOTS.map((t) => (
                        <option key={t} value={t}>{t.replace(":", "h")}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Auto-calc breakdown */}
              {formData.date && formData.clockIn && formData.clockOut && (() => {
                try {
                  const inT = buildDateTime(formData.date, formData.clockIn);
                  const outT = buildDateTime(formData.date, formData.clockOut);
                  if (!inT || !outT) return null;
                  if (outT <= inT) outT.setDate(outT.getDate() + 1);
                  const ms = outT.getTime() - inT.getTime();
                  if (ms <= 0) return null;
                  const hours = ms / 3600000;
                  const base = Math.round(hours * SERVICE_RATE);
                  const inHour = inT.getHours();
                  const outHour = outT.getHours();
                  const isNight = inHour >= 19 || inHour < 7 || outHour >= 19 || outHour < 7 || hours > 12;
                  return (
                    <div className="bg-blue-50 text-blue-800 text-xs px-4 py-3 rounded-lg border border-blue-100 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Calculator className="w-3.5 h-3.5" />
                        Auto-calculated breakdown
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{hours.toFixed(1)}h × {SERVICE_RATE}€/hr</span>
                        <span className="font-medium">{base}€</span>
                      </div>
                      {isNight && (
                        <div className="flex items-center justify-between text-amber-700">
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" /> Taxi fee (7 PM – 7 AM)</span>
                          <span className="font-medium">+{TAXI_FEE}€</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-bold border-t border-blue-200 pt-1 mt-1">
                        <span>Total</span>
                        <span>{isNight ? base + TAXI_FEE : base}€ <span className="font-normal text-blue-600/70">({toDH(isNight ? base + TAXI_FEE : base).toLocaleString()} DH)</span></span>
                      </div>
                    </div>
                  );
                } catch { return null; }
              })()}

              {/* Children & Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Children</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.childrenCount}
                    onChange={(e) => updateField("childrenCount", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Ages</label>
                  <input
                    type="text"
                    value={formData.childrenAges}
                    onChange={(e) => updateField("childrenAges", e.target.value)}
                    placeholder="e.g. 3, 5"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Total (€) *</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.totalPrice}
                    onChange={(e) => updateField("totalPrice", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 gradient-warm text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all shadow-warm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      {isEditing ? "Update Invoice" : "Create Invoice"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-xl hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
