import { useState, useMemo, useEffect, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Filter,
  Eye,
  Check,
  XCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Baby,
  Hotel,
  Plus,
  X,
  Loader2,
  FileText,
  MessageCircle,
  AlertTriangle,
  Download,
  Pencil,
  TimerReset,
  ArrowRightLeft,
  Bell,
} from "lucide-react";
import { format, parseISO, formatDistanceToNow, isToday } from "date-fns";
import { useData } from "../../context/DataContext";
import PhoneInput from "../../components/PhoneInput";
import ExtendBookingModal from "../../components/ExtendBookingModal";
import ForwardBookingModal from "../../components/ForwardBookingModal";
import type { Booking, BookingStatus, BookingPlan } from "@/types";
import { calcBookedHours, calcNannyPayBreakdown, estimateNannyPayBreakdown, HOURLY_RATE, isTomorrow as isTomorrowDate } from "@/utils/shiftHelpers";
import { useExchangeRate } from "@/hooks/useExchangeRate";

interface EditBookingForm {
  id: number | string;
  nannyId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  plan: string;
  numChildren: string;
  childrenAges: string;
  notes: string;
  status: string;
}

interface NewBookingForm {
  nannyId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  plan: string;
  hotel: string;
  numChildren: string;
  childrenAges: string;
  notes: string;
  status: string;
}

// 24h time slots from 06:00 to 05:30 (business-day ordering, 30-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 48; i++) {
  const h = (6 + Math.floor(i / 2)) % 24;
  const m = (i % 2) * 30;
  const hh = String(h).padStart(2, "0");
  const mm = m === 0 ? "00" : "30";
  TIME_SLOTS.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
}

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  completed: {
    label: "Completed",
    className: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
};

type UrgencyLevel = "normal" | "warning" | "critical";

function getUrgencyLevel(createdAt: string, status: string): UrgencyLevel {
  if (status !== "pending") return "normal";
  const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hoursElapsed > 3) return "critical";
  if (hoursElapsed > 1) return "warning";
  return "normal";
}

function UrgencyBadge({ booking }: { booking: Booking }) {
  const urgency = getUrgencyLevel(booking.createdAt, booking.status);
  if (booking.status !== "pending" || urgency === "normal") {
    const status = statusConfig[booking.status] || statusConfig.pending;
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
        {status.label}
      </span>
    );
  }

  const elapsed = formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true });

  if (urgency === "critical") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-300 animate-pulse">
        <AlertTriangle className="w-3 h-3" />
        Needs Attention
        <span className="text-[10px] font-normal opacity-70">({elapsed})</span>
      </span>
    );
  }

  // warning
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
      <Clock className="w-3 h-3" />
      Awaiting Confirmation
      <span className="text-[10px] font-normal opacity-70">({elapsed})</span>
    </span>
  );
}

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled"];

export default function AdminBookings() {
  const { bookings, fetchBookings, nannies, addBooking, updateBooking, updateBookingStatus, deleteBooking, sendBookingReminder } = useData();
  const { toDH } = useExchangeRate();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const param = searchParams.get("status");
    return param && statusFilters.includes(param) ? param : "all";
  });
  const [nannyFilter, setNannyFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedRow, setExpandedRow] = useState<number | string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);

  // Reminder cooldown tracking (booking ID → timestamp)
  const [remindedBookings, setRemindedBookings] = useState<Record<string, number>>({});
  const [reminderLoading, setReminderLoading] = useState<number | string | null>(null);

  const handleSendReminder = async (bookingId: number | string) => {
    setReminderLoading(bookingId);
    try {
      await sendBookingReminder(bookingId);
      setRemindedBookings((prev) => ({ ...prev, [String(bookingId)]: Date.now() }));
    } catch (err) {
      console.error("Reminder failed:", err);
    }
    setReminderLoading(null);
  };

  const isReminderCooling = (bookingId: number | string) => {
    const ts = remindedBookings[String(bookingId)];
    if (!ts) return false;
    return Date.now() - ts < 30 * 60 * 1000; // 30 minutes
  };


  // New Booking Modal
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingLoading, setNewBookingLoading] = useState(false);
  const [newBooking, setNewBooking] = useState<NewBookingForm>({
    nannyId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    date: "",
    endDate: "",
    startTime: "",
    endTime: "",
    plan: "hourly",
    hotel: "",
    numChildren: "1",
    childrenAges: "",
    notes: "",
    status: "confirmed",
  });

  // Edit Booking Modal
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [editBookingLoading, setEditBookingLoading] = useState(false);
  const [editBookingData, setEditBookingData] = useState<EditBookingForm | null>(null);

  // Extend Booking Modal
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);

  // Forward Booking Modal
  const [forwardBooking, setForwardBooking] = useState<Booking | null>(null);

  // Cancel Confirmation Modal
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      await updateBookingStatus(cancelTarget.id, "cancelled", {
        reason: cancelReason.trim(),
        cancelledBy: "admin",
      });
    } catch (err) {
      console.error("Cancel failed:", err);
    }
    setCancelLoading(false);
    setCancelTarget(null);
    setCancelReason("");
  };

  // Auto-refresh bookings every 30s to pick up nanny confirmations
  useEffect(() => {
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [fetchBookings]);

  /** Convert stored time label (e.g. "19h30") to TIME_SLOTS value (e.g. "19:30") */
  const timeToSlotValue = (t: string): string => {
    if (!t) return "";
    // Already in value format (contains ":")
    if (t.includes(":")) {
      const match = TIME_SLOTS.find((s) => s.value === t);
      return match ? match.value : "";
    }
    // Label format "09h00" / "19h30"
    const m = t.match(/^(\d{1,2})h(\d{2})$/i);
    if (m) {
      const candidate = `${parseInt(m[1])}:${m[2]}`;
      const match = TIME_SLOTS.find((s) => s.value === candidate);
      return match ? match.value : "";
    }
    return "";
  };

  const openEditModal = (booking: Booking) => {
    setEditBookingData({
      id: booking.id,
      nannyId: String(booking.nannyId || ""),
      clientName: booking.clientName || "",
      clientEmail: booking.clientEmail || "",
      clientPhone: booking.clientPhone || "",
      date: booking.date || "",
      endDate: booking.endDate || "",
      startTime: timeToSlotValue(booking.startTime),
      endTime: timeToSlotValue(booking.endTime),
      plan: booking.plan || "hourly",
      hotel: booking.hotel || "",
      numChildren: String(booking.childrenCount || "1"),
      childrenAges: booking.childrenAges || "",
      notes: booking.notes || "",
      status: booking.status || "pending",
    });
    setShowEditBooking(true);
  };

  const allActiveNannies = useMemo(
    () => nannies.filter((n) => n.status === "active"),
    [nannies]
  );

  const editSelectedNanny = useMemo(
    () => nannies.find((n) => n.id === Number(editBookingData?.nannyId)),
    [nannies, editBookingData?.nannyId]
  );

  const editBookingHours = useMemo(() => {
    if (!editBookingData) return 0;
    if (!editBookingData.startTime || !editBookingData.endTime) return 0;
    const [sh, sm] = editBookingData.startTime.split(":").map(Number);
    const [eh, em] = editBookingData.endTime.split(":").map(Number);
    return Math.max(0, (eh + em / 60) - (sh + sm / 60));
  }, [editBookingData]);

  const editBookingDays = useMemo(() => {
    if (!editBookingData?.date) return 1;
    if (!editBookingData.endDate || editBookingData.endDate === editBookingData.date) return 1;
    const d1 = new Date(editBookingData.date).getTime();
    const d2 = new Date(editBookingData.endDate).getTime();
    return isNaN(d1) || isNaN(d2) ? 1 : Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  }, [editBookingData]);

  const editBookingPrice = useMemo(() => {
    if (!editSelectedNanny) return 0;
    const hourlyTotal = Math.round(editSelectedNanny.rate * editBookingHours * editBookingDays);
    // Taxi fee: 10€ per day if shift touches the 7PM–7AM window
    const [sh] = (editBookingData?.startTime || "").split(":").map(Number);
    const [eh, em] = (editBookingData?.endTime || "").split(":").map(Number);
    const isEvening = (eh > 19 || (eh === 19 && em > 0)) || sh < 7;
    const taxiFee = isEvening ? 10 * editBookingDays : 0;
    return hourlyTotal + taxiFee;
  }, [editSelectedNanny, editBookingHours, editBookingDays, editBookingData]);

  const editConflicts = useMemo(() => {
    if (!editBookingData?.nannyId || !editBookingData?.date) return [];
    return bookings.filter(
      (b) =>
        b.id !== editBookingData.id &&
        b.nannyId === Number(editBookingData.nannyId) &&
        b.date === editBookingData.date &&
        b.status !== "cancelled" &&
        b.startTime &&
        editBookingData.startTime &&
        !(b.endTime && editBookingData.endTime && (editBookingData.endTime <= b.startTime || editBookingData.startTime >= b.endTime))
    );
  }, [editBookingData, bookings]);

  const handleEditBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editBookingData) return;
    setEditBookingLoading(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === editBookingData.startTime)?.label || editBookingData.startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === editBookingData.endTime)?.label || editBookingData.endTime;

    await updateBooking(editBookingData.id, {
      nannyId: Number(editBookingData.nannyId),
      nannyName: editSelectedNanny?.name || "",
      clientName: editBookingData.clientName,
      clientEmail: editBookingData.clientEmail,
      clientPhone: editBookingData.clientPhone,
      hotel: editBookingData.hotel,
      date: editBookingData.date,
      endDate: editBookingData.endDate || null,
      startTime: startLabel,
      endTime: endLabel,
      plan: editBookingData.plan as BookingPlan,
      childrenCount: Number(editBookingData.numChildren),
      childrenAges: editBookingData.childrenAges,
      notes: editBookingData.notes,
      totalPrice: editBookingPrice,
      status: editBookingData.status as BookingStatus,
    });

    setEditBookingLoading(false);
    setShowEditBooking(false);
    setEditBookingData(null);
  };

  const availableNannies = useMemo(
    () => nannies.filter((n) => n.available && n.status === "active"),
    [nannies]
  );

  const selectedNanny = useMemo(
    () => nannies.find((n) => n.id === Number(newBooking.nannyId)),
    [nannies, newBooking.nannyId]
  );

  const newBookingHours = useMemo(() => {
    if (!newBooking.startTime || !newBooking.endTime) return 0;
    const [sh, sm] = newBooking.startTime.split(":").map(Number);
    const [eh, em] = newBooking.endTime.split(":").map(Number);
    return Math.max(0, (eh + em / 60) - (sh + sm / 60));
  }, [newBooking.startTime, newBooking.endTime]);

  const newBookingDays = useMemo(() => {
    if (!newBooking.date) return 1;
    if (!newBooking.endDate || newBooking.endDate === newBooking.date) return 1;
    const d1 = new Date(newBooking.date).getTime();
    const d2 = new Date(newBooking.endDate).getTime();
    return isNaN(d1) || isNaN(d2) ? 1 : Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
  }, [newBooking.date, newBooking.endDate]);

  const newBookingPrice = useMemo(() => {
    if (!selectedNanny) return 0;
    const hourlyTotal = Math.round(selectedNanny.rate * newBookingHours * newBookingDays);
    const [sh] = (newBooking.startTime || "").split(":").map(Number);
    const [eh, em] = (newBooking.endTime || "").split(":").map(Number);
    const isEvening = (eh > 19 || (eh === 19 && em > 0)) || sh < 7;
    const taxiFee = isEvening ? 10 * newBookingDays : 0;
    return hourlyTotal + taxiFee;
  }, [selectedNanny, newBookingHours, newBookingDays, newBooking.startTime, newBooking.endTime]);

  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedNanny || !newBooking.date || !newBooking.clientName) return;
    setNewBookingLoading(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === newBooking.startTime)?.label || newBooking.startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === newBooking.endTime)?.label || newBooking.endTime;

    await addBooking({
      nannyId: selectedNanny.id,
      nannyName: selectedNanny.name,
      date: newBooking.date,
      endDate: newBooking.endDate || null,
      startTime: startLabel,
      endTime: endLabel,
      plan: newBooking.plan as BookingPlan,
      totalPrice: newBookingPrice,
      clientName: newBooking.clientName,
      clientEmail: newBooking.clientEmail,
      clientPhone: newBooking.clientPhone,
      hotel: newBooking.hotel,
      childrenCount: Number(newBooking.numChildren),
      childrenAges: newBooking.childrenAges,
      notes: newBooking.notes,
      status: newBooking.status as BookingStatus,
    });

    setNewBookingLoading(false);
    setShowNewBooking(false);
    setNewBooking({
      nannyId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      date: "",
      endDate: "",
      startTime: "",
      endTime: "",
      plan: "hourly",
      hotel: "",
      numChildren: "1",
      childrenAges: "",
      notes: "",
      status: "confirmed",
    });
  };

  // WhatsApp helpers
  const whatsAppParent = (phone: string, clientName: string, date: string) => {
    const text = encodeURIComponent(
      `Hi ${clientName}, this is call a nanny. Regarding your booking on ${date} — `
    );
    window.open(`https://wa.me/${phone?.replace(/\D/g, "")}?text=${text}`, "_blank");
  };

  const whatsAppNanny = (booking: Booking) => {
    const nanny = nannies.find((n) => n.id === booking.nannyId);
    if (!nanny?.email) return;
    // We don't have nanny phone, so use the booking info
    const text = encodeURIComponent(
      `Hi ${nanny.name}, you have a booking with ${booking.clientName} on ${booking.date} at ${booking.hotel || "TBD"}. `
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  // Conflict detection
  const getConflicts = (nannyId: string, date: string, startTime: string, endTime: string) => {
    if (!nannyId || !date) return [];
    return bookings.filter(
      (b) =>
        b.nannyId === Number(nannyId) &&
        b.date === date &&
        b.status !== "cancelled" &&
        b.startTime &&
        startTime &&
        !(b.endTime && endTime && (endTime <= b.startTime || startTime >= b.endTime))
    );
  };

  const conflicts = useMemo(() => {
    if (!newBooking.nannyId || !newBooking.date) return [];
    return getConflicts(newBooking.nannyId, newBooking.date, newBooking.startTime, newBooking.endTime);
  }, [newBooking.nannyId, newBooking.date, newBooking.startTime, newBooking.endTime, bookings]);

  // Unique nanny names for filter dropdown
  const uniqueNannyNames = useMemo(() => {
    const names = new Set<string>();
    bookings.forEach((b) => {
      if (b.nannyName) names.add(b.nannyName);
    });
    return Array.from(names).sort();
  }, [bookings]);

  // CSV export
  const exportCSV = () => {
    const headers = ["ID", "Client", "Email", "Phone", "Nanny", "Start Date", "End Date", "Time", "Plan", "Price", "Status", "Hotel", "Notes"];
    const rows = filteredBookings.map((b) => [
      b.id,
      b.clientName || "",
      b.clientEmail || "",
      b.clientPhone || "",
      b.nannyName || "",
      b.date || "",
      b.endDate || "",
      `${b.startTime || ""}${b.endTime ? " - " + b.endTime : ""}`,
      b.plan || "",
      b.totalPrice || 0,
      b.status || "",
      b.hotel || "",
      (b.notes || "").replace(/,/g, ";"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (b) =>
          (b.clientName || "").toLowerCase().includes(query) ||
          (b.nannyName || "").toLowerCase().includes(query) ||
          (b.clientEmail || "").toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Nanny filter
    if (nannyFilter !== "all") {
      result = result.filter((b) => b.nannyName === nannyFilter);
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [bookings, search, statusFilter, nannyFilter, sortOrder]);

  // Split bookings into grouped sections: today / tomorrow / previous
  const groupedBookings = useMemo(() => {
    const today: typeof filteredBookings = [];
    const tomorrow: typeof filteredBookings = [];
    const previous: typeof filteredBookings = [];
    for (const b of filteredBookings) {
      try {
        if (isToday(parseISO(b.date))) { today.push(b); continue; }
        if (isTomorrowDate(b.date)) { tomorrow.push(b); continue; }
      } catch { /* ignore */ }
      previous.push(b);
    }
    return { today, tomorrow, previous };
  }, [filteredBookings]);

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr || "N/A";
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr || "N/A";
  };

  const truncateId = (id: number | string) => {
    if (!id) return "N/A";
    return typeof id === "string" && id.length > 8
      ? `${id.slice(0, 8)}...`
      : id;
  };

  const handleDelete = (id: number | string) => {
    deleteBooking(id);
    setDeleteConfirm(null);
  };

  const toggleExpand = (id: number | string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Manage Bookings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => setShowNewBooking(true)}
            className="flex items-center gap-2 gradient-warm text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shadow-warm"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client or nanny name..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              {statusFilters.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Nanny Filter */}
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={nannyFilter}
              onChange={(e) => setNannyFilter(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              <option value="all">All Nannies</option>
              {uniqueNannyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>

          {/* Sort */}
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bookings Table / Cards */}
      {filteredBookings.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-soft">
          <Calendar className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-medium text-foreground text-lg">No bookings found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || statusFilter !== "all" || nannyFilter !== "all"
              ? "Try adjusting your search or filters."
              : "Bookings will appear here once clients start booking."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nanny
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Price / Nanny Pay
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {([
                    { label: "Today\u2019s Bookings", items: groupedBookings.today },
                    { label: "Tomorrow\u2019s Bookings", items: groupedBookings.tomorrow },
                    { label: "Previous Bookings", items: groupedBookings.previous },
                  ] as const).map((group) => group.items.length > 0 && (
                    <Fragment key={group.label}>
                      <tr>
                        <td colSpan={12} className="px-4 py-4 bg-primary/5 text-center">
                          <div className="flex items-center justify-center gap-4">
                            <div className="flex-1 h-0.5 bg-primary/50 rounded-full" />
                            <span className="text-sm font-bold text-primary whitespace-nowrap uppercase tracking-wide">
                              {group.label}
                            </span>
                            <div className="flex-1 h-0.5 bg-primary/50 rounded-full" />
                          </div>
                        </td>
                      </tr>
                      {group.items.map((booking) => {
                    const isExpanded = expandedRow === booking.id;

                    return (
                      <Fragment key={booking.id}>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="text-xs font-mono text-muted-foreground">{truncateId(booking.id)}</div>
                            {booking.createdBy && (
                              <div className="text-[10px] text-muted-foreground/70 mt-0.5">by {booking.createdBy}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                            {booking.clientName || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.clientEmail || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.clientPhone || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {booking.nannyName || "N/A"}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {formatDate(booking.date)}{booking.endDate ? ` → ${formatDate(booking.endDate)}` : ""}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            {formatTime(booking.startTime)}{booking.endTime ? ` - ${booking.endTime}` : ""}
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                            {(() => {
                              const h = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
                              return h > 0 ? `${h}h` : "—";
                            })()}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground capitalize">
                            {booking.plan || "N/A"}
                          </td>
                          <td className="px-4 py-3.5">
                            {(() => {
                              const hours = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
                              const nannyRate = nannies.find((n) => n.id === booking.nannyId)?.rate || 150;
                              const actualPay = calcNannyPayBreakdown(booking);
                              const estPay = actualPay.total > 0
                                ? actualPay
                                : estimateNannyPayBreakdown(booking.startTime, booking.endTime, booking.date, booking.endDate);
                              const isActual = actualPay.total > 0;

                              return (
                                <>
                                  <div className="text-sm font-medium text-foreground">
                                    {booking.totalPrice ? `${booking.totalPrice.toLocaleString()}€` : "N/A"}
                                  </div>
                                  {booking.totalPrice && (
                                    <div className="text-[10px] text-muted-foreground">{toDH(booking.totalPrice).toLocaleString()} DH</div>
                                  )}
                                  {hours > 0 && (
                                    <div className="text-[11px] text-muted-foreground">
                                      {nannyRate}/hr × {hours}h
                                    </div>
                                  )}
                                  {estPay.total > 0 && (
                                    <div className="text-[11px] mt-0.5">
                                      <span className={isActual ? "text-emerald-600 font-medium" : "text-emerald-600/70"}>
                                        {estPay.basePay} DH
                                      </span>
                                      {estPay.taxiFee > 0 && (
                                        <span className={isActual ? "text-orange-500 font-medium" : "text-orange-500/70"}>
                                          {" "}+ {estPay.taxiFee} DH taxi
                                        </span>
                                      )}
                                      {!isActual && (
                                        <span className="text-muted-foreground/50 italic ml-0.5">est.</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3.5">
                            <UrgencyBadge booking={booking} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Expand / View */}
                              <button
                                onClick={() => toggleExpand(booking.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="View details"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => openEditModal(booking)}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                title="Edit booking"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Extend */}
                              {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                                <button
                                  onClick={() => setExtendBooking(booking)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Extend booking"
                                >
                                  <TimerReset className="w-4 h-4" />
                                </button>
                              )}

                              {/* Forward */}
                              {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                                <button
                                  onClick={() => setForwardBooking(booking)}
                                  className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
                                  title="Forward to another nanny"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                </button>
                              )}

                              {/* Confirm */}
                              {booking.status === "pending" && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "confirmed")
                                  }
                                  className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors"
                                  title="Confirm booking"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Send Reminder */}
                              {booking.status === "pending" && (
                                <button
                                  onClick={() => handleSendReminder(booking.id)}
                                  disabled={isReminderCooling(booking.id) || reminderLoading === booking.id}
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                                  title={isReminderCooling(booking.id) ? "Reminder sent" : "Send reminder to nanny"}
                                >
                                  {reminderLoading === booking.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Bell className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Complete */}
                              {booking.status === "confirmed" && (
                                <button
                                  onClick={() =>
                                    updateBookingStatus(booking.id, "completed")
                                  }
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Mark as completed"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {/* Cancel */}
                              {(booking.status === "pending" ||
                                booking.status === "confirmed") && (
                                <button
                                  onClick={() => setCancelTarget(booking)}
                                  className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors"
                                  title="Cancel booking"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}


                              {/* Delete */}
                              {deleteConfirm === booking.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(booking.id)}
                                    className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded-lg hover:bg-destructive/90 transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(booking.id)}
                                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                                  title="Delete booking"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={12}
                              className="px-4 py-4 bg-muted/20"
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <Hotel className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Hotel / Location
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.hotel || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Baby className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Children
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.childrenCount || "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Children Ages
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.childrenAges
                                        ? Array.isArray(booking.childrenAges)
                                          ? booking.childrenAges.join(", ")
                                          : booking.childrenAges
                                        : "N/A"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Notes
                                    </p>
                                    <p className="font-medium text-foreground">
                                      {booking.notes || "None"}
                                    </p>
                                  </div>
                                </div>
                                {(() => {
                                  const hours = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
                                  const nannyRate = nannies.find((n) => n.id === booking.nannyId)?.rate || 150;
                                  const actualPay = calcNannyPayBreakdown(booking);
                                  const estPay = actualPay.total > 0
                                    ? actualPay
                                    : estimateNannyPayBreakdown(booking.startTime, booking.endTime, booking.date, booking.endDate);
                                  const isActual = actualPay.total > 0;

                                  return (
                                    <>
                                      {hours > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                          <div>
                                            <p className="text-xs text-muted-foreground">
                                              Client Price
                                            </p>
                                            <p className="font-medium text-foreground">
                                              {nannyRate}€/hr × {hours}h = <span className="font-bold">{booking.totalPrice?.toLocaleString()}€</span>
                                            </p>
                                            {booking.totalPrice && (
                                              <p className="text-xs text-muted-foreground mt-0.5">≈ {toDH(booking.totalPrice).toLocaleString()} DH</p>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {estPay.total > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                                          <div>
                                            <p className="text-xs text-muted-foreground">
                                              Nanny Pay {!isActual && <span className="italic">(estimated)</span>}
                                            </p>
                                            <p className="font-medium text-foreground">
                                              <span className="text-emerald-600">{estPay.basePay} DH</span>
                                              <span className="text-muted-foreground mx-1">hourly ({HOURLY_RATE} DH/hr)</span>
                                              {estPay.taxiFee > 0 && (
                                                <>
                                                  <span className="text-orange-500">+ {estPay.taxiFee} DH</span>
                                                  <span className="text-muted-foreground ml-1">taxi</span>
                                                </>
                                              )}
                                              <span className="text-foreground ml-2 font-bold">= {estPay.total} DH</span>
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              {/* Quick actions */}
                              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                                {booking.clientPhone && (
                                  <button
                                    onClick={() => whatsAppParent(booking.clientPhone, booking.clientName, booking.date)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    WhatsApp Parent
                                  </button>
                                )}
                                <button
                                  onClick={() => whatsAppNanny(booking)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  WhatsApp Nanny
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {([
              { label: "Today\u2019s Bookings", items: groupedBookings.today },
              { label: "Tomorrow\u2019s Bookings", items: groupedBookings.tomorrow },
              { label: "Previous Bookings", items: groupedBookings.previous },
            ] as const).map((group) => group.items.length > 0 && (
              <Fragment key={`m-${group.label}`}>
                <div className="flex items-center gap-4 py-3 px-2 my-1 bg-primary/5 rounded-xl">
                  <div className="flex-1 h-0.5 bg-primary/50 rounded-full" />
                  <span className="text-sm font-bold text-primary whitespace-nowrap uppercase tracking-wide">
                    {group.label}
                  </span>
                  <div className="flex-1 h-0.5 bg-primary/50 rounded-full" />
                </div>
                {group.items.map((booking) => {
              const isExpanded = expandedRow === booking.id;

              return (
                <Fragment key={`mobile-${booking.id}`}>
                <div
                  className="bg-card rounded-xl border border-border shadow-soft overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.clientName || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ID: {truncateId(booking.id)}
                          {booking.createdBy && (
                            <span className="text-[10px] text-muted-foreground/70 ml-1.5">· by {booking.createdBy}</span>
                          )}
                        </p>
                      </div>
                      <UrgencyBadge booking={booking} />
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{booking.nannyName || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDate(booking.date)}{booking.endDate ? ` → ${formatDate(booking.endDate)}` : ""}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {formatTime(booking.startTime)}{booking.endTime ? ` - ${booking.endTime}` : ""}
                          {(() => {
                            const h = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
                            return h > 0 ? ` (${h}h)` : "";
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          {booking.clientEmail || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{booking.clientPhone || "N/A"}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {booking.totalPrice ? `${booking.totalPrice.toLocaleString()}€` : "N/A"}
                        </span>
                        {booking.totalPrice && (
                          <span className="text-[10px] text-muted-foreground ml-1">({toDH(booking.totalPrice).toLocaleString()} DH)</span>
                        )}
                        {(() => {
                          const hours = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
                          const nannyRate = nannies.find((n) => n.id === booking.nannyId)?.rate || 150;
                          const actualPay = calcNannyPayBreakdown(booking);
                          const estPay = actualPay.total > 0
                            ? actualPay
                            : estimateNannyPayBreakdown(booking.startTime, booking.endTime, booking.date, booking.endDate);
                          const isActual = actualPay.total > 0;

                          return (
                            <>
                              {hours > 0 && (
                                <div className="text-[10px]">{nannyRate}/hr × {hours}h</div>
                              )}
                              {estPay.total > 0 && (
                                <div className="text-[10px] mt-0.5">
                                  Nanny: <span className={isActual ? "text-emerald-600 font-medium" : "text-emerald-600/70"}>{estPay.basePay}</span>
                                  {estPay.taxiFee > 0 && (
                                    <span className={isActual ? "text-orange-500 font-medium" : "text-orange-500/70"}> + {estPay.taxiFee} taxi</span>
                                  )}
                                  {!isActual && <span className="text-muted-foreground/50 italic ml-0.5">est.</span>}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Hotel className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Hotel</p>
                            <p className="font-medium text-foreground">
                              {booking.hotel || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Baby className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-muted-foreground">Children</p>
                            <p className="font-medium text-foreground">
                              {booking.childrenCount || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Notes</p>
                          <p className="font-medium text-foreground mt-0.5">
                            {booking.notes || "None"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center border-t border-border divide-x divide-border">
                    <button
                      onClick={() => toggleExpand(booking.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" /> Less
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" /> Details
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openEditModal(booking)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>

                    {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                      <button
                        onClick={() => setExtendBooking(booking)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <TimerReset className="w-3.5 h-3.5" /> Extend
                      </button>
                    )}

                    {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                      <button
                        onClick={() => setForwardBooking(booking)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Forward
                      </button>
                    )}

                    {booking.status === "pending" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "confirmed")
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Confirm
                      </button>
                    )}

                    {booking.status === "pending" && (
                      <button
                        onClick={() => handleSendReminder(booking.id)}
                        disabled={isReminderCooling(booking.id) || reminderLoading === booking.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                      >
                        {reminderLoading === booking.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                        {isReminderCooling(booking.id) ? "Reminded" : "Remind"}
                      </button>
                    )}

                    {booking.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "completed")
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete
                      </button>
                    )}

                    {(booking.status === "pending" ||
                      booking.status === "confirmed") && (
                      <button
                        onClick={() => setCancelTarget(booking)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}


                    {deleteConfirm === booking.id ? (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
                        <button
                          onClick={() => handleDelete(booking.id)}
                          className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(booking.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
                </Fragment>
              );
            })}
              </Fragment>
            ))}
          </div>
        </>
      )}

      {/* ===== New Booking Modal ===== */}
      {showNewBooking && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-foreground">New Booking</h2>
              <button
                onClick={() => setShowNewBooking(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewBookingSubmit} className="space-y-5">
              {/* Nanny Selection */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Select Nanny <span className="text-destructive">*</span>
                </label>
                <select
                  value={newBooking.nannyId}
                  onChange={(e) => setNewBooking({ ...newBooking, nannyId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  <option value="">Choose a nanny...</option>
                  {availableNannies.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} — {n.rate}€/hr ({n.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Client Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBooking.clientName}
                    onChange={(e) => setNewBooking({ ...newBooking, clientName: e.target.value })}
                    placeholder="Full name"
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={newBooking.clientEmail}
                    onChange={(e) => setNewBooking({ ...newBooking, clientEmail: e.target.value })}
                    placeholder="client@email.com"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone
                  </label>
                  <PhoneInput
                    value={newBooking.clientPhone}
                    onChange={(val) => setNewBooking({ ...newBooking, clientPhone: val })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                    Hotel / Accommodation
                  </label>
                  <input
                    type="text"
                    value={newBooking.hotel}
                    onChange={(e) => setNewBooking({ ...newBooking, hotel: e.target.value })}
                    placeholder="e.g. Royal Mansour"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Start Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newBooking.endDate}
                    min={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Start Time <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={newBooking.startTime}
                    onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`s-${slot.value}`} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    End Time <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={newBooking.endTime}
                    onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`e-${slot.value}`} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Children & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Baby className="w-3.5 h-3.5 text-muted-foreground" />
                    Children
                  </label>
                  <select
                    value={newBooking.numChildren}
                    onChange={(e) => setNewBooking({ ...newBooking, numChildren: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Baby className="w-3.5 h-3.5 text-muted-foreground" />
                    Ages
                  </label>
                  <input
                    type="text"
                    value={newBooking.childrenAges}
                    onChange={(e) => setNewBooking({ ...newBooking, childrenAges: e.target.value })}
                    placeholder="e.g. 3, 5"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Check className="w-3.5 h-3.5 text-muted-foreground" />
                    Status
                  </label>
                  <select
                    value={newBooking.status}
                    onChange={(e) => setNewBooking({ ...newBooking, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Notes <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={newBooking.notes}
                  onChange={(e) => setNewBooking({ ...newBooking, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Conflict Warning */}
              {conflicts.length > 0 && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Scheduling conflict!</p>
                    <p className="text-xs mt-0.5">
                      {selectedNanny?.name || "This nanny"} already has {conflicts.length} booking{conflicts.length > 1 ? "s" : ""} on this date.
                    </p>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              {selectedNanny && newBookingHours > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{selectedNanny.name}</span>
                    <span className="mx-1.5">·</span>
                    {selectedNanny.rate}€/hr × {newBookingHours} hrs
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{newBookingPrice.toLocaleString()}€</div>
                    <div className="text-xs text-muted-foreground">{toDH(newBookingPrice).toLocaleString()} DH</div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBooking(false)}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newBookingLoading || !newBooking.nannyId || !newBooking.date || !newBooking.clientName || !newBooking.startTime || !newBooking.endTime}
                  className="flex-1 gradient-warm text-white rounded-xl px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {newBookingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Booking
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Edit Booking Modal ===== */}
      {showEditBooking && editBookingData && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-lg font-bold text-foreground">Edit Booking</h2>
              <button
                onClick={() => { setShowEditBooking(false); setEditBookingData(null); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditBookingSubmit} className="space-y-5">
              {/* Nanny Selection */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Assign Nanny <span className="text-destructive">*</span>
                </label>
                <select
                  value={editBookingData.nannyId}
                  onChange={(e) => setEditBookingData({ ...editBookingData, nannyId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                >
                  <option value="">Choose a nanny...</option>
                  {allActiveNannies.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} — {n.rate}€/hr ({n.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    Client Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={editBookingData.clientName}
                    onChange={(e) => setEditBookingData({ ...editBookingData, clientName: e.target.value })}
                    placeholder="Full name"
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={editBookingData.clientEmail}
                    onChange={(e) => setEditBookingData({ ...editBookingData, clientEmail: e.target.value })}
                    placeholder="client@email.com"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    Phone
                  </label>
                  <PhoneInput
                    value={editBookingData.clientPhone}
                    onChange={(val) => setEditBookingData({ ...editBookingData, clientPhone: val })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                    Hotel / Accommodation
                  </label>
                  <input
                    type="text"
                    value={editBookingData.hotel}
                    onChange={(e) => setEditBookingData({ ...editBookingData, hotel: e.target.value })}
                    placeholder="e.g. Royal Mansour"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Start Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    value={editBookingData.date}
                    onChange={(e) => setEditBookingData({ ...editBookingData, date: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editBookingData.endDate}
                    min={editBookingData.date}
                    onChange={(e) => setEditBookingData({ ...editBookingData, endDate: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    Start Time <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={editBookingData.startTime}
                    onChange={(e) => setEditBookingData({ ...editBookingData, startTime: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`es-${slot.value}`} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    End Time <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={editBookingData.endTime}
                    onChange={(e) => setEditBookingData({ ...editBookingData, endTime: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Select time</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`ee-${slot.value}`} value={slot.value}>{slot.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Children & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Baby className="w-3.5 h-3.5 text-muted-foreground" />
                    Children
                  </label>
                  <select
                    value={editBookingData.numChildren}
                    onChange={(e) => setEditBookingData({ ...editBookingData, numChildren: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Baby className="w-3.5 h-3.5 text-muted-foreground" />
                    Ages
                  </label>
                  <input
                    type="text"
                    value={editBookingData.childrenAges}
                    onChange={(e) => setEditBookingData({ ...editBookingData, childrenAges: e.target.value })}
                    placeholder="e.g. 3, 5"
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Check className="w-3.5 h-3.5 text-muted-foreground" />
                    Status
                  </label>
                  <select
                    value={editBookingData.status}
                    onChange={(e) => setEditBookingData({ ...editBookingData, status: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Notes <span className="text-xs text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={editBookingData.notes}
                  onChange={(e) => setEditBookingData({ ...editBookingData, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                />
              </div>

              {/* Conflict Warning */}
              {editConflicts.length > 0 && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Scheduling conflict!</p>
                    <p className="text-xs mt-0.5">
                      {editSelectedNanny?.name || "This nanny"} already has {editConflicts.length} other booking{editConflicts.length > 1 ? "s" : ""} on this date.
                    </p>
                  </div>
                </div>
              )}

              {/* Price Summary */}
              {editSelectedNanny && editBookingHours > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{editSelectedNanny.name}</span>
                    <span className="mx-1.5">·</span>
                    {editSelectedNanny.rate}€/hr × {editBookingHours} hrs
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-foreground">{editBookingPrice.toLocaleString()}€</div>
                    <div className="text-xs text-muted-foreground">{toDH(editBookingPrice).toLocaleString()} DH</div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditBooking(false); setEditBookingData(null); }}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editBookingLoading || !editBookingData.nannyId || !editBookingData.date || !editBookingData.clientName || !editBookingData.startTime || !editBookingData.endTime}
                  className="flex-1 gradient-warm text-white rounded-xl px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {editBookingLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Booking Modal */}
      {extendBooking && (
        <ExtendBookingModal
          booking={extendBooking}
          rate={nannies.find((n) => n.id === extendBooking.nannyId)?.rate || 150}
          onConfirm={async (newEndTime, newTotalPrice) => {
            await updateBooking(extendBooking.id, { endTime: newEndTime, totalPrice: newTotalPrice });
            await fetchBookings();
          }}
          onClose={() => setExtendBooking(null)}
          t={(key: string) => {
            const map: Record<string, string> = {
              "extend.extendBooking": "Extend Booking",
              "extend.newEndTime": "New End Time",
              "extend.selectNewEnd": "Select new end time",
              "extend.additionalHours": "Additional Hours",
              "extend.additionalCost": "Additional Cost",
              "extend.newTotal": "New Total",
              "extend.confirmExtend": "Confirm Extension",
              "extend.extending": "Extending...",
              "extend.extendSuccess": "Booking extended successfully!",
              "extend.noLaterSlots": "No later time slots available",
              "extend.summary": "Extension Summary",
              "shared.cancel": "Cancel",
            };
            return map[key] || key;
          }}
        />
      )}

      {/* Forward Booking Modal */}
      {forwardBooking && (
        <ForwardBookingModal
          booking={forwardBooking}
          nannies={nannies}
          currentNannyId={forwardBooking.nannyId}
          onConfirm={async (newNannyId) => {
            const newNanny = nannies.find((n) => n.id === newNannyId);
            await updateBooking(forwardBooking.id, {
              nannyId: newNannyId,
              nannyName: newNanny?.name || "",
            });
            await fetchBookings();
          }}
          onClose={() => setForwardBooking(null)}
          t={(key: string) => {
            const map: Record<string, string> = {
              "forward.forwardBooking": "Forward Booking",
              "forward.forwardShift": "Forward",
              "forward.selectNanny": "Select a nanny...",
              "forward.forwardTo": "Forward to",
              "forward.confirmForward": "Confirm Forward",
              "forward.forwarding": "Forwarding...",
              "forward.forwardSuccess": "Booking forwarded successfully!",
              "forward.noOtherNannies": "No other active nannies available",
              "forward.forwardNote": "The new nanny will be notified by email about this assignment.",
              "forward.currentNanny": "Current Nanny",
              "shared.cancel": "Cancel",
            };
            return map[key] || key;
          }}
        />
      )}

      {/* Cancel Confirmation Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
                  <p className="text-sm text-gray-500">#{String(cancelTarget.id)} — {cancelTarget.clientName}</p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-orange-800">
                  <strong>⚠️ This will notify the parent and nanny</strong> via email and WhatsApp that this booking has been cancelled.
                </p>
              </div>

              <div className="mb-4 text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Date:</span> {cancelTarget.date}</p>
                <p><span className="font-medium">Time:</span> {cancelTarget.startTime} - {cancelTarget.endTime}</p>
                <p><span className="font-medium">Hotel:</span> {cancelTarget.hotel || 'N/A'}</p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason for cancellation <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Client requested cancellation, nanny unavailable..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => { setCancelTarget(null); setCancelReason(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</>
                ) : (
                  <>Yes, Cancel It</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
