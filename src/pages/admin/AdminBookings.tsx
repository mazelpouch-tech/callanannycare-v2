import { useState, useMemo, useEffect, useRef, Fragment } from "react";
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
  ChevronLeft,
  ChevronRight,
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
  RotateCcw,
  History,
  LayoutGrid,
  List,
  Repeat2,
  StickyNote,
  Activity,
  Wand2,
} from "lucide-react";
import {
  format, parseISO, formatDistanceToNow, isToday,
  startOfWeek, addDays, subDays, addWeeks, subWeeks, isSameDay,
} from "date-fns";
import { useData } from "../../context/DataContext";
import PhoneInput from "../../components/PhoneInput";
import ExtendBookingModal from "../../components/ExtendBookingModal";
import type { DaySchedule } from "../../components/ExtendBookingModal";
import ForwardBookingModal from "../../components/ForwardBookingModal";
import type { Booking, BookingStatus, BookingPlan } from "@/types";
import { calcBookedHours, calcNannyPayBreakdown, estimateNannyPayBreakdown, HOURLY_RATE, isTomorrow as isTomorrowDate, timesOverlap } from "@/utils/shiftHelpers";
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
  recurring: boolean;
  recurringType: 'weekly' | 'biweekly' | 'monthly';
  recurringCount: string;
  status: string;
}

// 24h time slots from 06:00 to 05:45 (business-day ordering, 15-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 96; i++) {
  const h = (6 + Math.floor(i / 4)) % 24;
  const m = (i % 4) * 15;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
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

function getUrgencyLevel(createdAt: string, status: string, nannyId?: number | null): UrgencyLevel {
  if (status !== "pending") return "normal";
  if (nannyId) return "normal"; // already assigned to a nanny, no action needed
  const hoursElapsed = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  if (hoursElapsed > 3) return "critical";
  if (hoursElapsed > 1) return "warning";
  return "normal";
}

function UrgencyBadge({ booking }: { booking: Booking }) {
  const urgency = getUrgencyLevel(booking.createdAt, booking.status, booking.nannyId);
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
  const { bookings, fetchBookings, nannies, addBooking, updateBooking, updateBookingStatus, deleteBooking, fetchDeletedBookings, restoreBooking, sendBookingReminder, adminProfile } = useData();
  const { toDH } = useExchangeRate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    // If opening from a notification deep link, clear filters so the booking is visible
    if (searchParams.get("booking")) return "all";
    const param = searchParams.get("status");
    return param && statusFilters.includes(param) ? param : "all";
  });
  const [nannyFilter, setNannyFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedRow, setExpandedRow] = useState<number | string | null>(() => {
    const bookingParam = searchParams.get("booking");
    return bookingParam ? Number(bookingParam) : null;
  });
  // Track the booking ID we need to scroll to (from push notification)
  const [scrollToBooking, setScrollToBooking] = useState<string | null>(() => searchParams.get("booking"));
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);

  // Extract booking deep-link param and clean up URL on mount
  useEffect(() => {
    const bookingParam = searchParams.get("booking");
    if (bookingParam) {
      setExpandedRow(Number(bookingParam));
      setScrollToBooking(bookingParam);
      searchParams.delete("booking");
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to the target booking once it appears in the DOM (retries as bookings load)
  useEffect(() => {
    if (!scrollToBooking) return;
    const el = document.getElementById(`booking-row-${scrollToBooking}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToBooking(null);
    }
  }, [bookings, scrollToBooking]);

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
  const [rebookClientName, setRebookClientName] = useState<string | null>(null);
  const [newBookingError, setNewBookingError] = useState<string | null>(null);
  const [overrideMinHours, setOverrideMinHours] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState(false);

  const handleRebook = (booking: Booking) => {
    setNewBooking({
      nannyId: String(booking.nannyId || ""),
      clientName: booking.clientName || "",
      clientEmail: booking.clientEmail || "",
      clientPhone: booking.clientPhone || "",
      date: "",
      endDate: "",
      startTime: timeToSlotValue(booking.startTime),
      endTime: timeToSlotValue(booking.endTime),
      plan: booking.plan || "hourly",
      hotel: booking.hotel || "",
      numChildren: String(booking.childrenCount || 1),
      childrenAges: booking.childrenAges || "",
      notes: booking.notes || "",
      status: "confirmed",
      recurring: false,
      recurringType: "weekly",
      recurringCount: "4",
    });
    setRebookClientName(booking.clientName || null);
    setShowNewBooking(true);
  };
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
    recurring: false,
    recurringType: "weekly",
    recurringCount: "4",
  });
  // ── Number of days for new booking ──────────────────────────
  const [newBookingNumDays, setNewBookingNumDays] = useState(1);
  const [dayTimeOverrides, setDayTimeOverrides] = useState<Record<number, { startTime: string; endTime: string }>>({});
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  // Edit Booking Modal
  const [showEditBooking, setShowEditBooking] = useState(false);
  const [editBookingLoading, setEditBookingLoading] = useState(false);
  const [editBookingData, setEditBookingData] = useState<EditBookingForm | null>(null);

  // Extend Booking Modal
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);

  // Forward Booking Modal
  const [forwardBooking, setForwardBooking] = useState<Booking | null>(null);

  // Bulk Forward Modal
  const [bulkForwardModal, setBulkForwardModal] = useState(false);
  const [bulkForwardNannyId, setBulkForwardNannyId] = useState<number | null>(null);
  const [bulkForwardLoading, setBulkForwardLoading] = useState(false);
  const [bulkForwardError, setBulkForwardError] = useState<string | null>(null);
  const [bulkForwardSuccess, setBulkForwardSuccess] = useState(false);

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
    const startH = sh + sm / 60;
    const endH = eh + em / 60;
    return endH > startH ? endH - startH : (24 - startH) + endH;
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
    const isOvernight = (eh + em / 60) <= (sh + 0);
    const isEvening = isOvernight || sh >= 19 || sh < 7 || eh > 19 || (eh === 19 && em > 0);
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
        timesOverlap(editBookingData.startTime, editBookingData.endTime || "23:59", b.startTime, b.endTime || "23:59")
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
    const startH = sh + sm / 60;
    const endH = eh + em / 60;
    return endH > startH ? endH - startH : (24 - startH) + endH;
  }, [newBooking.startTime, newBooking.endTime]);

  const newBookingDays = newBookingNumDays;

  const newBookingPrice = useMemo(() => {
    if (!selectedNanny) return 0;
    const hourlyTotal = Math.round(selectedNanny.rate * newBookingHours * newBookingDays);
    const [sh] = (newBooking.startTime || "").split(":").map(Number);
    const [eh, em] = (newBooking.endTime || "").split(":").map(Number);
    const isOvernight = (eh + em / 60) <= (sh + 0);
    const isEvening = isOvernight || sh >= 19 || sh < 7 || eh > 19 || (eh === 19 && em > 0);
    const taxiFee = isEvening ? 10 * newBookingDays : 0;
    return hourlyTotal + taxiFee;
  }, [selectedNanny, newBookingHours, newBookingDays, newBooking.startTime, newBooking.endTime]);

  const calcDayPrice = (startT: string, endT: string, nanny: { rate: number }) => {
    if (!startT || !endT) return 0;
    const [sh, sm = 0] = startT.split(":").map(Number);
    const [eh, em = 0] = endT.split(":").map(Number);
    let hours = (eh + em / 60) - (sh + sm / 60);
    if (hours <= 0) hours += 24;
    const isEvening = sh >= 19 || sh < 7 || (eh + em / 60) > 19;
    return Math.round(nanny.rate * hours) + (isEvening ? 10 : 0);
  };

  const handleNewBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const chosenNanny = selectedNanny || bestAutoNanny;
    if (!chosenNanny || !newBooking.date || !newBooking.clientName) return;
    setNewBookingError(null);
    setNewBookingLoading(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === newBooking.startTime)?.label || newBooking.startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === newBooking.endTime)?.label || newBooking.endTime;

    // Per-day price (newBookingPrice = total for numDays, so divide back)
    const dailyPrice = Math.round(newBookingPrice / Math.max(1, newBookingNumDays));

    const baseBookingData = {
      nannyId: chosenNanny.id,
      nannyName: chosenNanny.name,
      endDate: null,
      startTime: startLabel,
      endTime: endLabel,
      plan: newBooking.plan as BookingPlan,
      totalPrice: newBookingPrice,
      extraDates: null,
      clientName: newBooking.clientName,
      clientEmail: newBooking.clientEmail,
      clientPhone: newBooking.clientPhone,
      hotel: newBooking.hotel,
      childrenCount: Number(newBooking.numChildren),
      childrenAges: newBooking.childrenAges,
      notes: newBooking.notes,
      status: newBooking.status as BookingStatus,
      createdBy: 'admin' as const,
      createdByName: adminProfile?.name || 'Admin',
    };

    try {
      if (newBooking.recurring) {
        const count = Math.max(1, Math.min(12, parseInt(newBooking.recurringCount) || 4));
        const dates: string[] = [newBooking.date];
        const offsetDays = newBooking.recurringType === 'weekly' ? 7 : newBooking.recurringType === 'biweekly' ? 14 : 30;
        for (let i = 1; i < count; i++) {
          const d = new Date(dates[dates.length - 1]);
          d.setDate(d.getDate() + offsetDays);
          dates.push(d.toISOString().slice(0, 10));
        }
        for (const date of dates) {
          await addBooking({ ...baseBookingData, date, totalPrice: dailyPrice }, { skipMinHours: overrideMinHours, skipConflictCheck: overrideConflict });
        }
      } else {
        // Generate N consecutive daily bookings from start date, respecting per-day time overrides
        const startD = new Date(newBooking.date);
        for (let i = 0; i < newBookingNumDays; i++) {
          const d = new Date(startD);
          d.setDate(d.getDate() + i);
          const override = dayTimeOverrides[i];
          const dayStartVal = override?.startTime ?? newBooking.startTime;
          const dayEndVal = override?.endTime ?? newBooking.endTime;
          const dayStartLabel = TIME_SLOTS.find((s) => s.value === dayStartVal)?.label || dayStartVal;
          const dayEndLabel = TIME_SLOTS.find((s) => s.value === dayEndVal)?.label || dayEndVal;
          const dayPrice = override ? calcDayPrice(dayStartVal, dayEndVal, chosenNanny) : dailyPrice;
          await addBooking({
            ...baseBookingData,
            date: d.toISOString().slice(0, 10),
            startTime: dayStartLabel,
            endTime: dayEndLabel,
            totalPrice: dayPrice,
          }, { skipMinHours: overrideMinHours, skipConflictCheck: overrideConflict });
        }
      }
      setShowNewBooking(false);
      setRebookClientName(null);
      setNewBookingNumDays(1);
      setDayTimeOverrides({});
      setEditingDayIdx(null);
      setOverrideMinHours(false);
      setOverrideConflict(false);
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
        recurring: false,
        recurringType: "weekly",
        recurringCount: "4",
      });
    } catch (err) {
      console.error('Booking creation failed:', err);
      setNewBookingError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.');
    } finally {
      setNewBookingLoading(false);
    }
  };

  // ── WhatsApp template modal ────────────────────────────────────
  const [waModal, setWaModal] = useState<{ booking: Booking; target: "parent" | "nanny" } | null>(null);

  const openWAModal = (booking: Booking, target: "parent" | "nanny") => {
    setWaModal({ booking, target });
  };

  const sendWA = (phone: string | undefined, message: string) => {
    const clean = phone?.replace(/\D/g, "") || "";
    const url = clean
      ? `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    setWaModal(null);
  };

  const buildParentTemplates = (b: Booking) => {
    const time = b.startTime && b.endTime ? `${b.startTime}–${b.endTime}` : b.startTime || "";
    const loc = b.hotel || "your location";
    const price = b.totalPrice ? `${b.totalPrice}€` : "";
    return [
      {
        emoji: "✅", label: "Confirmation",
        message: `Hi ${b.clientName}! Your booking with Call a Nanny is confirmed ✅\n📅 Date: ${b.date}\n🕐 Time: ${time}\n📍 ${loc}\n👶 Nanny: ${b.nannyName || "TBA"}\nSee you soon! 🤗`,
      },
      {
        emoji: "🔔", label: "Reminder",
        message: `Hi ${b.clientName}! Just a reminder that your nanny booking is tomorrow 🗓️\n📅 ${b.date} · ${time}\n👶 ${b.nannyName || "your nanny"} will be at ${loc}\nSee you then!`,
      },
      {
        emoji: "💰", label: "Payment Due",
        message: `Hi ${b.clientName}! Your session on ${b.date} (${time}) is now complete 🎉\n💶 Amount due: ${price}\nPlease arrange payment at your earliest convenience. Thank you! 🙏`,
      },
      {
        emoji: "🕐", label: "Running Late",
        message: `Hi ${b.clientName}! We wanted to let you know that ${b.nannyName || "your nanny"} is running a few minutes late today. She will arrive shortly — sorry for the wait! 🙏`,
      },
      {
        emoji: "❌", label: "Cancellation",
        message: `Hi ${b.clientName}, unfortunately your booking on ${b.date} (${time}) has been cancelled. We're sorry for the inconvenience — please contact us to reschedule. 🙏`,
      },
    ];
  };

  const buildNannyTemplates = (b: Booking) => {
    const time = b.startTime && b.endTime ? `${b.startTime}–${b.endTime}` : b.startTime || "";
    const loc = b.hotel || "client location";
    const nanny = nannies.find((n) => n.id === b.nannyId);
    const nannyName = nanny?.name || b.nannyName || "there";
    const nannyPhone = nanny?.phone || "";
    return {
      phone: nannyPhone,
      templates: [
        {
          emoji: "📋", label: "New Assignment",
          message: `Hi ${nannyName}! You have a new booking 🎉\n📅 Date: ${b.date}\n🕐 Time: ${time}\n📍 ${loc}\n👤 Client: ${b.clientName}\n👶 Children: ${b.numChildren || 1}\nPlease confirm your availability ✅`,
        },
        {
          emoji: "🔔", label: "Tomorrow Reminder",
          message: `Hi ${nannyName}! Just a reminder — you have a booking tomorrow 📅\n📅 ${b.date} · ${time}\n📍 ${loc}\n👤 ${b.clientName}\nDon't forget! See you there 💪`,
        },
        {
          emoji: "✅", label: "Booking Confirmed",
          message: `Hi ${nannyName}! Your booking for ${b.date} (${time}) with ${b.clientName} at ${loc} is officially confirmed ✅. Thank you!`,
        },
        {
          emoji: "💰", label: "Payout Ready",
          message: `Hi ${nannyName}! Your payout for the session on ${b.date} (${time}) has been processed. Please check your payment details. Thank you! 🙏`,
        },
      ],
    };
  };

  // Conflict detection
  const getConflicts = (nannyId: string, date: string, startTime: string, endTime: string) => {
    if (!nannyId || !date || !startTime) return [];
    return bookings.filter(
      (b) =>
        b.nannyId === Number(nannyId) &&
        b.date === date &&
        b.status !== "cancelled" &&
        b.startTime &&
        timesOverlap(startTime, endTime || "23:59", b.startTime, b.endTime || "23:59")
    );
  };

  const conflicts = useMemo(() => {
    if (!newBooking.nannyId || !newBooking.date) return [];
    return getConflicts(newBooking.nannyId, newBooking.date, newBooking.startTime, newBooking.endTime);
  }, [newBooking.nannyId, newBooking.date, newBooking.startTime, newBooking.endTime, bookings]);

  const suggestedNannies = useMemo(() => {
    if (!newBooking.date || !newBooking.startTime || conflicts.length === 0) return [];
    return allActiveNannies.filter((n) => {
      if (n.id === Number(newBooking.nannyId)) return false;
      return getConflicts(String(n.id), newBooking.date, newBooking.startTime, newBooking.endTime).length === 0;
    });
  }, [allActiveNannies, newBooking.nannyId, newBooking.date, newBooking.startTime, newBooking.endTime, conflicts.length, bookings]);

  // Availability map: per nanny, across ALL selected days
  const nannyAvailabilityMap = useMemo(() => {
    if (!newBooking.date || !newBooking.startTime) return null;
    const days: string[] = [];
    for (let i = 0; i < newBookingNumDays; i++) {
      const d = new Date(newBooking.date);
      d.setDate(d.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return allActiveNannies.map((n) => {
      const busyDates = days.filter(
        (date) => getConflicts(String(n.id), date, newBooking.startTime, newBooking.endTime).length > 0
      );
      return {
        nanny: n,
        freeDays: days.length - busyDates.length,
        totalDays: days.length,
        busyDates,
        busy: busyDates.length === days.length,
      };
    });
  }, [allActiveNannies, newBooking.date, newBooking.startTime, newBooking.endTime, newBookingNumDays, bookings]);

  // Best nanny for auto-assign: free on ALL N days, prefer same hotel, then fewest bookings
  const bestAutoNanny = useMemo(() => {
    if (!nannyAvailabilityMap || !newBooking.date) return null;
    const candidates = nannyAvailabilityMap
      .filter(({ nanny: n, freeDays, totalDays }) => n.available && freeDays === totalDays)
      .map(({ nanny: n }) => {
        const totalActive = bookings.filter(
          (b) => b.nannyId === n.id && b.status !== "cancelled" && !b.deletedAt
        ).length;
        const sameHotel = newBooking.hotel
          ? bookings.some((b) => b.nannyId === n.id && b.hotel === newBooking.hotel && b.status !== "cancelled")
          : false;
        return { nanny: n, totalActive, sameHotel };
      })
      .sort((a, b) => {
        if (a.sameHotel && !b.sameHotel) return -1;
        if (!a.sameHotel && b.sameHotel) return 1;
        return a.totalActive - b.totalActive;
      });
    return candidates[0]?.nanny ?? null;
  }, [nannyAvailabilityMap, newBooking.date, newBooking.hotel, bookings]);

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
    const headers = ["ID", "Client", "Email", "Phone", "Nanny", "Start Date", "End Date", "Time", "Plan", "Price", "Status", "Created By", "Created By Name", "Hotel", "Notes"];
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
      b.createdBy || "parent",
      b.createdByName || "",
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

    // Date range filter
    if (dateFrom) result = result.filter((b) => b.date >= dateFrom);
    if (dateTo)   result = result.filter((b) => b.date <= dateTo);

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date);
      const dateB = new Date(b.createdAt || b.date);
      return sortOrder === "newest" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });

    return result;
  }, [bookings, search, statusFilter, nannyFilter, sortOrder, dateFrom, dateTo]);

  // Split bookings into grouped sections: today / tomorrow / upcoming (future) / past (by status)
  const groupedBookings = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const today: typeof filteredBookings = [];
    const tomorrow: typeof filteredBookings = [];
    const upcomingPending: typeof filteredBookings = [];
    const upcomingConfirmed: typeof filteredBookings = [];
    const pastPending: typeof filteredBookings = [];
    const pastConfirmed: typeof filteredBookings = [];
    const pastCompleted: typeof filteredBookings = [];
    const pastCancelled: typeof filteredBookings = [];
    for (const b of filteredBookings) {
      try {
        if (isToday(parseISO(b.date))) { today.push(b); continue; }
        if (isTomorrowDate(b.date)) { tomorrow.push(b); continue; }
      } catch { /* ignore */ }
      const isFuture = (b.date || "") > todayStr;
      if (isFuture) {
        if (b.status === "pending") upcomingPending.push(b);
        else upcomingConfirmed.push(b);
      } else {
        if (b.status === "pending")        pastPending.push(b);
        else if (b.status === "confirmed") pastConfirmed.push(b);
        else if (b.status === "completed") pastCompleted.push(b);
        else                               pastCancelled.push(b);
      }
    }
    // Sort upcoming by date ascending (nearest first)
    const byDateAsc = (a: Booking, b: Booking) => (a.date || "").localeCompare(b.date || "");
    upcomingPending.sort(byDateAsc);
    upcomingConfirmed.sort(byDateAsc);
    return { today, tomorrow, upcomingPending, upcomingConfirmed, pastPending, pastConfirmed, pastCompleted, pastCancelled };
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

  const handleDelete = (id: number | string) => {
    deleteBooking(id, adminProfile?.name || 'Admin');
    setDeleteConfirm(null);
  };

  const toggleExpand = (id: number | string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const rowBorderColor = (status: string) => {
    switch (status) {
      case "pending":   return "border-l-orange-400";
      case "confirmed": return "border-l-green-500";
      case "completed": return "border-l-blue-400";
      case "cancelled": return "border-l-gray-300";
      default:          return "border-l-transparent";
    }
  };

  // Sub-sections — upcoming expanded by default, past collapsed
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({
    upcomingPending: true, upcomingConfirmed: true,
    pastPending: false, pastConfirmed: false, pastCompleted: false, pastCancelled: false,
  });
  const togglePrevSection = (key: string) =>
    setSectionExpanded((p) => ({ ...p, [key]: !p[key] }));

  const allGroups = [
    {
      key: "today", label: "Today\u2019s Bookings", items: groupedBookings.today,
      collapsible: false, isExpanded: true,
      bgColor: "bg-primary/5", textColor: "text-primary",
      lineColor: "bg-primary/50", badgeColor: "bg-primary", chevronColor: "text-primary",
    },
    {
      key: "tomorrow", label: "Tomorrow\u2019s Bookings", items: groupedBookings.tomorrow,
      collapsible: false, isExpanded: true,
      bgColor: "bg-primary/5", textColor: "text-primary",
      lineColor: "bg-primary/50", badgeColor: "bg-primary", chevronColor: "text-primary",
    },
    {
      key: "upcomingPending", label: "Upcoming \u00b7 Pending", items: groupedBookings.upcomingPending,
      collapsible: true, isExpanded: sectionExpanded.upcomingPending,
      bgColor: "bg-orange-50/70", textColor: "text-orange-700",
      lineColor: "bg-orange-300", badgeColor: "bg-orange-500", chevronColor: "text-orange-500",
    },
    {
      key: "upcomingConfirmed", label: "Upcoming \u00b7 Confirmed", items: groupedBookings.upcomingConfirmed,
      collapsible: true, isExpanded: sectionExpanded.upcomingConfirmed,
      bgColor: "bg-green-50/70", textColor: "text-green-700",
      lineColor: "bg-green-400", badgeColor: "bg-green-600", chevronColor: "text-green-600",
    },
    {
      key: "pastPending", label: "Past \u00b7 Pending", items: groupedBookings.pastPending,
      collapsible: true, isExpanded: sectionExpanded.pastPending,
      bgColor: "bg-orange-50/50", textColor: "text-orange-600",
      lineColor: "bg-orange-200", badgeColor: "bg-orange-400", chevronColor: "text-orange-400",
    },
    {
      key: "pastConfirmed", label: "Past \u00b7 Confirmed", items: groupedBookings.pastConfirmed,
      collapsible: true, isExpanded: sectionExpanded.pastConfirmed,
      bgColor: "bg-green-50/50", textColor: "text-green-600",
      lineColor: "bg-green-300", badgeColor: "bg-green-500", chevronColor: "text-green-500",
    },
    {
      key: "pastCompleted", label: "Past \u00b7 Completed", items: groupedBookings.pastCompleted,
      collapsible: true, isExpanded: sectionExpanded.pastCompleted,
      bgColor: "bg-blue-50/70", textColor: "text-blue-700",
      lineColor: "bg-blue-400", badgeColor: "bg-blue-600", chevronColor: "text-blue-500",
    },
    {
      key: "pastCancelled", label: "Past \u00b7 Cancelled", items: groupedBookings.pastCancelled,
      collapsible: true, isExpanded: sectionExpanded.pastCancelled,
      bgColor: "bg-gray-50/60", textColor: "text-gray-500",
      lineColor: "bg-gray-300", badgeColor: "bg-gray-400", chevronColor: "text-gray-400",
    },
  ];

  // ─── Deleted bookings audit log ───────────────────────────────
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedBookings, setDeletedBookings] = useState<typeof bookings>([]);
  const [loadingDeleted, setLoadingDeleted] = useState(false);
  const [restoring, setRestoring] = useState<number | string | null>(null);

  const openDeletedLog = async () => {
    setShowDeleted(true);
    setLoadingDeleted(true);
    try {
      const data = await fetchDeletedBookings();
      setDeletedBookings(data);
    } finally {
      setLoadingDeleted(false);
    }
  };

  const handleRestore = async (id: number | string) => {
    setRestoring(id);
    try {
      await restoreBooking(id);
      setDeletedBookings((prev) => prev.filter((b) => b.id !== id));
    } finally {
      setRestoring(null);
    }
  };
  // ─────────────────────────────────────────────────────────────

  // ── Client History Panel ─────────────────────────────────────
  const [clientHistory, setClientHistory] = useState<string | null>(null);

  const clientHistoryBookings = useMemo(() => {
    if (!clientHistory) return [];
    return [...bookings]
      .filter((b) => (b.clientName || "").toLowerCase() === clientHistory.toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, clientHistory]);

  const clientHistoryStats = useMemo(() => {
    const activeBookings = clientHistoryBookings.filter((b) => b.status !== "cancelled");
    const activeTotal = activeBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);
    const confirmed = clientHistoryBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
    const lastBooking = clientHistoryBookings[0];
    return { activeTotal, confirmed, count: clientHistoryBookings.length, lastBooking };
  }, [clientHistoryBookings]);

  const handlePrintClientFile = () => {
    if (!clientHistory || !clientHistoryStats.lastBooking) return;
    const lb = clientHistoryStats.lastBooking;
    const activeBookings = clientHistoryBookings.filter((b) => b.status !== "cancelled");
    const rows = clientHistoryBookings.map((b) => {
      const statusColor: Record<string, string> = {
        confirmed: "#16a34a", completed: "#2563eb", cancelled: "#9ca3af", pending: "#d97706"
      };
      return `<tr>
        <td>${b.date}${b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""}</td>
        <td>${b.startTime || ""}${b.endTime ? `–${b.endTime}` : ""}</td>
        <td>${b.nannyName || "—"}</td>
        <td>${b.hotel || "—"}</td>
        <td>${b.childrenCount || 1}</td>
        <td style="font-weight:600">${b.totalPrice ? b.totalPrice + "€" : "—"}</td>
        <td style="color:${statusColor[b.status] || "#333"};font-weight:600;text-transform:capitalize">${b.status}</td>
      </tr>`;
    }).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Client File — ${clientHistory}</title>
      <style>
        *{box-sizing:border-box}body{font-family:Arial,sans-serif;max-width:860px;margin:0 auto;padding:24px;color:#111}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:20px}
        h1{margin:0;font-size:22px;color:#111}h2{margin:4px 0 8px;font-size:16px;color:#555;font-weight:normal}
        .contact{font-size:13px;color:#555;line-height:1.7}
        .logo{font-size:12px;color:#888;text-align:right;line-height:1.8}
        .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
        .stat{border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
        .stat-val{font-size:20px;font-weight:700;color:#111}.stat-lbl{font-size:11px;color:#888;margin-top:2px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th{background:#f3f4f6;border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:12px;color:#555}
        td{border:1px solid #e5e7eb;padding:8px 10px}
        .total-row td{background:#f9fafb;font-weight:700;font-size:14px}
        .footer{margin-top:24px;text-align:center;font-size:11px;color:#9ca3af}
        @media print{body{padding:0}.no-print{display:none}}
      </style></head><body>
      <div class="header">
        <div>
          <h1>Client File</h1>
          <h2>${clientHistory}</h2>
          <div class="contact">
            ${lb.clientEmail ? `📧 ${lb.clientEmail}<br>` : ""}
            ${lb.clientPhone ? `📞 ${lb.clientPhone}` : ""}
          </div>
        </div>
        <div class="logo">
          <strong>Call a Nanny</strong><br>Marrakech<br>
          Generated: ${new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
        </div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-val">${clientHistoryStats.count}</div><div class="stat-lbl">Total Bookings</div></div>
        <div class="stat"><div class="stat-val">${clientHistoryStats.confirmed}</div><div class="stat-lbl">Confirmed / Completed</div></div>
        <div class="stat"><div class="stat-val">${clientHistoryStats.activeTotal}€</div><div class="stat-lbl">Total Amount (active)</div></div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Time</th><th>Nanny</th><th>Location</th><th>Children</th><th>Price</th><th>Status</th></tr></thead>
        <tbody>${rows}
          <tr class="total-row">
            <td colspan="5">Total (active bookings — confirmed, pending, completed)</td>
            <td>${clientHistoryStats.activeTotal}€</td><td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Call a Nanny — Admin System · ${new Date().toLocaleString()}</div>
      <script>window.onload=()=>window.print()</script>
    </body></html>`);
    win.document.close();
  };

  const handleSendWhatsAppSummary = () => {
    if (!clientHistory || !clientHistoryStats.lastBooking) return;
    const lb = clientHistoryStats.lastBooking;
    const phone = (lb.clientPhone || "").replace(/[\s\-\(\)]/g, "").replace(/^0/, "212");
    if (!phone) { alert("No phone number found for this client."); return; }
    const activeBookings = clientHistoryBookings.filter((b) => b.status !== "cancelled");
    const lines = [
      `📋 *Booking Summary — Call a Nanny*`,
      ``,
      `Hello ${clientHistory},`,
      `Here is a summary of your bookings:`,
      ``,
      ...activeBookings.map((b) =>
        `📅 ${b.date}${b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""} — ${b.startTime || ""}${b.endTime ? `–${b.endTime}` : ""}\n👶 ${b.nannyName || "Nanny TBD"} · ${b.hotel || ""}\n💰 ${b.totalPrice || 0}€ (${b.status})`
      ),
      ``,
      `─────────────────`,
      `💰 *Total: ${clientHistoryStats.activeTotal}€*`,
      ``,
      `Thank you for choosing us!`,
      `💕 Call a Nanny — Marrakech`,
    ];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
  };
  // ─────────────────────────────────────────────────────────────

  // ── Bulk selection ───────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredBookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookings.map((b) => b.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const [bulkLoading, setBulkLoading] = useState<string | null>(null);

  const handleBulkAction = async (action: "confirmed" | "completed" | "cancelled") => {
    if (selectedIds.size === 0) return;
    setBulkLoading(action);
    try {
      await Promise.all(
        [...selectedIds].map((id) => updateBookingStatus(id, action))
      );
      clearSelection();
    } finally {
      setBulkLoading(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} booking${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkLoading("delete");
    try {
      await Promise.all([...selectedIds].map((id) => deleteBooking(id, adminProfile?.name || "Admin")));
      clearSelection();
    } finally {
      setBulkLoading(null);
    }
  };

  const handleBulkForward = async () => {
    if (selectedIds.size === 0 || !bulkForwardNannyId) return;
    setBulkForwardLoading(true);
    setBulkForwardError(null);
    const ids = [...selectedIds];
    const failures: string[] = [];
    for (const id of ids) {
      try {
        const res = await fetch(`/api/bookings/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nanny_id: bulkForwardNannyId, skip_conflict_check: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const b = bookings.find((bk) => bk.id === id);
          failures.push(`${b?.clientName || `#${id}`} (${b?.date || ""}): ${data.error || res.statusText}`);
        }
      } catch {
        failures.push(`Booking #${id}: network error`);
      }
    }
    await fetchBookings();
    setBulkForwardLoading(false);
    if (failures.length > 0) {
      setBulkForwardError(`${ids.length - failures.length}/${ids.length} forwarded. Failed:\n${failures.join("\n")}`);
    } else {
      setBulkForwardSuccess(true);
      clearSelection();
      setTimeout(() => {
        setBulkForwardModal(false);
        setBulkForwardSuccess(false);
        setBulkForwardNannyId(null);
      }, 1200);
    }
  };
  // ─────────────────────────────────────────────────────────────

  // ── Admin notes (internal per-booking notes) ─────────────────
  const [adminNoteDrafts, setAdminNoteDrafts] = useState<Record<string | number, string>>({});
  const getAdminNoteDraft = (b: Booking) =>
    adminNoteDrafts[b.id] !== undefined ? adminNoteDrafts[b.id] : (b.adminNotes || "");
  const saveAdminNote = async (bookingId: string | number, value: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking || value === (booking.adminNotes || "")) return;
    try {
      await updateBooking(bookingId, { adminNotes: value });
    } catch { /* silent */ }
  };
  // ─────────────────────────────────────────────────────────────

  // ── Swipe actions on mobile cards ────────────────────────────
  const [swipedBookingId, setSwipedBookingId] = useState<string | number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  // ─────────────────────────────────────────────────────────────

  // ── Calendar view state ──────────────────────────────────────
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calWeekStart, setCalWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Responsive: 3-day view on mobile, 7-day on desktop
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 640
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const calDayCount = isMobile ? 3 : 7;

  const calDays = useMemo(
    () => Array.from({ length: calDayCount }, (_, i) => addDays(calWeekStart, i)),
    [calWeekStart, calDayCount]
  );

  const calByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    filteredBookings.forEach((b) => {
      const key = b.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
    );
    return map;
  }, [filteredBookings]);

  const calStatusChip = (status: string) => {
    switch (status) {
      case "pending":   return "border-l-2 border-orange-400 bg-orange-50 text-orange-800";
      case "confirmed": return "border-l-2 border-green-400 bg-green-50 text-green-800";
      case "completed": return "border-l-2 border-blue-400 bg-blue-50 text-blue-800";
      default:          return "border-l-2 border-gray-300 bg-gray-50 text-gray-500 opacity-60";
    }
  };

  const calStatusDot = (status: string) => {
    switch (status) {
      case "pending":   return "bg-orange-400";
      case "confirmed": return "bg-green-500";
      case "completed": return "bg-blue-500";
      default:          return "bg-gray-400";
    }
  };
  // ─────────────────────────────────────────────────────────────

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
          {/* View toggle */}
          <div className="flex items-center p-1 rounded-xl bg-muted/60 border border-border">
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Table view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Calendar view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openDeletedLog}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Deleted</span>
          </button>
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
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
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

        {/* Date range row */}
        <div className="flex flex-col sm:flex-row gap-3 mt-3 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              min={dateFrom || undefined}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear dates
            </button>
          )}
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === "calendar" && (
        <div className="space-y-4">
          {/* Week / period navigation */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCalWeekStart((d) =>
                    isMobile ? subDays(d, 3) : subWeeks(d, 1)
                  )
                }
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
                title={isMobile ? "Previous 3 days" : "Previous week"}
              >
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() =>
                  setCalWeekStart((d) =>
                    isMobile ? addDays(d, 3) : addWeeks(d, 1)
                  )
                }
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
                title={isMobile ? "Next 3 days" : "Next week"}
              >
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <span className="text-sm font-semibold text-foreground">
                {format(calWeekStart, "d MMM")} —{" "}
                {format(addDays(calWeekStart, calDayCount - 1), "d MMM yyyy")}
              </span>
            </div>
            <button
              onClick={() =>
                setCalWeekStart(
                  isMobile
                    ? new Date()
                    : startOfWeek(new Date(), { weekStartsOn: 1 })
                )
              }
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Today
            </button>
          </div>

          {/* Day grid: 3 cols on mobile, 7 on desktop */}
          <div className={`grid gap-2 min-w-0 ${isMobile ? "grid-cols-3" : "grid-cols-7"}`}>
            {calDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayBookings = calByDate.get(key) || [];
              const todayDay = isToday(day);

              return (
                <div key={key} className={`flex flex-col gap-1.5 min-w-0 rounded-xl border p-2 ${todayDay ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                  {/* Day header */}
                  <div className={`flex flex-col items-center py-1 rounded-lg ${todayDay ? "bg-primary text-white" : ""}`}>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${todayDay ? "text-white/80" : "text-muted-foreground"}`}>
                      {format(day, "EEE")}
                    </span>
                    <span className={`text-base font-bold leading-tight ${todayDay ? "text-white" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Bookings for this day */}
                  {dayBookings.length === 0 ? (
                    <div className="flex items-center justify-center h-8 text-[10px] text-muted-foreground/40">—</div>
                  ) : (
                    dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => { openEditModal(b); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] leading-tight transition-all hover:brightness-95 active:scale-95 ${calStatusChip(b.status)}`}
                        title={`${b.clientName} · ${b.startTime}–${b.endTime} · ${b.nannyName}`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${calStatusDot(b.status)}`} />
                          <span className="font-semibold truncate">{b.startTime}–{b.endTime}</span>
                        </div>
                        <div className="truncate font-medium">{b.clientName}</div>
                        <div className="truncate text-[9px] opacity-70">{b.nannyName}</div>
                        {b.totalPrice && (
                          <div className="font-semibold mt-0.5">{b.totalPrice}€</div>
                        )}
                      </button>
                    ))
                  )}

                  {/* Day total */}
                  {dayBookings.length > 0 && (
                    <div className="mt-auto pt-1 border-t border-border/50 text-[9px] text-muted-foreground text-center">
                      {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""}
                      {dayBookings.reduce((s, b) => s + (b.totalPrice || 0), 0) > 0 && (
                        <span className="ml-1 font-semibold text-foreground">
                          · {dayBookings.reduce((s, b) => s + (b.totalPrice || 0), 0)}€
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {[
              { label: "Pending",   dot: "bg-orange-400" },
              { label: "Confirmed", dot: "bg-green-500" },
              { label: "Completed", dot: "bg-blue-500" },
              { label: "Cancelled", dot: "bg-gray-400" },
            ].map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings Table / Cards */}
      {viewMode === "table" && filteredBookings.length === 0 ? (
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
                    {/* Select-all checkbox */}
                    <th className="pl-4 pr-2 py-3 w-8">
                      <input
                        type="checkbox"
                        className="rounded border-border accent-primary cursor-pointer"
                        checked={filteredBookings.length > 0 && selectedIds.size === filteredBookings.length}
                        onChange={toggleSelectAll}
                        title="Select all"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Contact
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
                  {allGroups.map((group) => group.items.length > 0 && (
                    <Fragment key={group.key}>
                      <tr
                        className={group.collapsible ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
                        onClick={group.collapsible ? () => togglePrevSection(group.key) : undefined}
                      >
                        <td colSpan={11} className={`px-4 py-4 ${group.bgColor} text-center`}>
                          <div className="flex items-center justify-center gap-4">
                            <div className={`flex-1 h-0.5 ${group.lineColor} rounded-full`} />
                            <span className={`text-sm font-bold ${group.textColor} whitespace-nowrap uppercase tracking-wide`}>
                              {group.label}
                            </span>
                            <span className={`${group.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                              {group.items.length}
                            </span>
                            {group.collapsible && (
                              group.isExpanded
                                ? <ChevronUp className={`w-4 h-4 ${group.chevronColor}`} />
                                : <ChevronDown className={`w-4 h-4 ${group.chevronColor}`} />
                            )}
                            <div className={`flex-1 h-0.5 ${group.lineColor} rounded-full`} />
                          </div>
                        </td>
                      </tr>
                      {(!group.collapsible || group.isExpanded) && group.items.map((booking) => {
                    const isExpanded = expandedRow === booking.id;

                    return (
                      <Fragment key={booking.id}>
                        <tr
                          id={`booking-row-${booking.id}`}
                          className={`hover:bg-muted/30 transition-colors cursor-pointer border-l-4 ${rowBorderColor(booking.status)} ${selectedIds.has(booking.id) ? "bg-primary/5" : ""}`}
                          onClick={() => toggleExpand(booking.id)}
                        >
                          {/* Row checkbox */}
                          <td className="pl-4 pr-2 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded border-border accent-primary cursor-pointer"
                              checked={selectedIds.has(booking.id)}
                              onChange={() => toggleSelect(booking.id)}
                            />
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setClientHistory(booking.clientName)}
                              className="text-sm font-medium text-foreground hover:text-primary hover:underline text-left transition-colors"
                              title="View client history"
                            >
                              {booking.clientName || "N/A"}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="text-sm text-foreground">{booking.clientEmail || "—"}</div>
                            {booking.clientPhone && (
                              <div className="text-xs text-muted-foreground mt-0.5">{booking.clientPhone}</div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              {booking.clockIn && !booking.clockOut && (
                                <span className="relative flex h-2 w-2 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                              )}
                              {booking.nannyName || "N/A"}
                            </div>
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
                              {/* Expand toggle button */}
                              <button
                                onClick={() => toggleExpand(booking.id)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                                title={isExpanded ? "Collapse" : "View details"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>

                              {/* Edit */}
                              <button
                                onClick={(e) => { e.stopPropagation(); openEditModal(booking); }}
                                className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                                title="Edit booking"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={11}
                              className="px-4 py-4 bg-muted/20"
                            >
                              {/* Quick actions — at top for easy access */}
                              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-border">
                                <button
                                  onClick={() => handleRebook(booking)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Rebook
                                </button>
                                {booking.clientPhone && (
                                  <button
                                    onClick={() => openWAModal(booking, "parent")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    WhatsApp Parent
                                  </button>
                                )}
                                <button
                                  onClick={() => openWAModal(booking, "nanny")}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  WhatsApp Nanny
                                </button>
                                <button
                                  onClick={() => setExtendBooking(booking)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <TimerReset className="w-3.5 h-3.5" />
                                  Modify Hours
                                </button>
                                {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                                  <button
                                    onClick={() => setForwardBooking(booking)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    Forward
                                  </button>
                                )}
                              </div>
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
                                {/* Admin Notes */}
                                <div className="flex items-start gap-2 col-span-1 sm:col-span-2">
                                  <StickyNote className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground mb-1">Admin Notes (internal)</p>
                                    <textarea
                                      rows={2}
                                      placeholder="Add internal notes..."
                                      className="w-full px-2.5 py-1.5 text-xs border border-amber-200 bg-amber-50/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition resize-none"
                                      value={getAdminNoteDraft(booking)}
                                      onChange={(e) => setAdminNoteDrafts((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                                      onBlur={(e) => saveAdminNote(booking.id, e.target.value)}
                                    />
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
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">
                                      Created By
                                    </p>
                                    <p className="font-medium text-foreground flex items-center gap-1.5">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        booking.createdBy === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        booking.createdBy === 'nanny' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      }`}>
                                        {booking.createdBy === 'admin' ? 'Admin' : booking.createdBy === 'nanny' ? 'Nanny' : 'Parent'}
                                      </span>
                                      {booking.createdByName && (
                                        <span className="text-muted-foreground text-xs">{booking.createdByName}</span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Activity Feed */}
                              {(() => {
                                const events: { time: string; label: string; detail?: string; color: string }[] = [];
                                if (booking.createdAt) events.push({ time: booking.createdAt, label: "Booking created", detail: booking.createdByName || booking.createdBy, color: "bg-primary/20 text-primary" });
                                if (booking.clockIn) events.push({ time: booking.clockIn, label: "Nanny clocked in", color: "bg-green-100 text-green-700" });
                                if (booking.clockOut) events.push({ time: booking.clockOut, label: "Completed", detail: "Clocked out", color: "bg-blue-100 text-blue-700" });
                                if (booking.collectedAt) events.push({ time: booking.collectedAt, label: "Payment collected", detail: `${booking.collectedBy || ""}${booking.paymentMethod ? " · " + booking.paymentMethod : ""}`, color: "bg-emerald-100 text-emerald-700" });
                                if (booking.cancelledAt) events.push({ time: booking.cancelledAt, label: "Cancelled", detail: `${booking.cancelledBy || ""}${booking.cancellationReason ? ": " + booking.cancellationReason : ""}`, color: "bg-red-100 text-red-700" });
                                if (booking.deletedAt) events.push({ time: booking.deletedAt, label: "Deleted", detail: booking.deletedBy || "", color: "bg-gray-100 text-gray-600" });
                                events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                                if (events.length <= 1) return null;
                                return (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3" />Activity</p>
                                    <div className="relative pl-4">
                                      <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-border" />
                                      {events.map((ev, i) => (
                                        <div key={i} className="relative mb-2 last:mb-0">
                                          <div className="absolute -left-[9px] top-1 w-2 h-2 rounded-full bg-border border-2 border-background" />
                                          <div className="flex items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ev.color}`}>{ev.label}</span>
                                              {ev.detail && <span className="text-[10px] text-muted-foreground ml-1.5">{ev.detail}</span>}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground/60 shrink-0 whitespace-nowrap">
                                              {(() => { try { return format(new Date(ev.time), "dd MMM, HH:mm"); } catch { return ""; } })()}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Status actions */}
                              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                                {booking.status === "pending" && (
                                  <button
                                    onClick={() => updateBookingStatus(booking.id, "confirmed")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Confirm
                                  </button>
                                )}
                                {booking.status === "pending" && (
                                  <button
                                    onClick={() => handleSendReminder(booking.id)}
                                    disabled={isReminderCooling(booking.id) || reminderLoading === booking.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-40"
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
                                    onClick={() => updateBookingStatus(booking.id, "completed")}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Complete
                                  </button>
                                )}
                                {(booking.status === "pending" || booking.status === "confirmed") && (
                                  <button
                                    onClick={() => setCancelTarget(booking)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Cancel
                                  </button>
                                )}
                                {deleteConfirm === booking.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleDelete(booking.id)}
                                      className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded-lg hover:bg-destructive/90 transition-colors"
                                    >
                                      Yes, delete
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
                                )}
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
            {allGroups.map((group) => group.items.length > 0 && (
              <Fragment key={`m-${group.key}`}>
                <div
                  className={`flex items-center gap-4 py-3 px-2 my-1 ${group.bgColor} rounded-xl ${group.collapsible ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}
                  onClick={group.collapsible ? () => togglePrevSection(group.key) : undefined}
                >
                  <div className={`flex-1 h-0.5 ${group.lineColor} rounded-full`} />
                  <span className={`text-sm font-bold ${group.textColor} whitespace-nowrap uppercase tracking-wide`}>
                    {group.label}
                  </span>
                  <span className={`${group.badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                    {group.items.length}
                  </span>
                  {group.collapsible && (
                    group.isExpanded
                      ? <ChevronUp className={`w-4 h-4 ${group.chevronColor}`} />
                      : <ChevronDown className={`w-4 h-4 ${group.chevronColor}`} />
                  )}
                  <div className={`flex-1 h-0.5 ${group.lineColor} rounded-full`} />
                </div>
                {(!group.collapsible || group.isExpanded) && group.items.map((booking) => {
              const isExpanded = expandedRow === booking.id;

              return (
                <Fragment key={`mobile-${booking.id}`}>
                {/* Swipe wrapper */}
                <div className="relative overflow-hidden rounded-xl">
                  {/* Action buttons revealed on swipe left */}
                  {swipedBookingId === booking.id && (
                    <div className="absolute right-0 top-0 bottom-0 w-40 flex items-center justify-end gap-1.5 pr-3 bg-card border border-border border-l-0 rounded-r-xl shadow-md z-10">
                      {booking.status === "pending" && (
                        <button
                          onClick={() => { updateBookingStatus(booking.id, "confirmed"); setSwipedBookingId(null); }}
                          className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg bg-green-100 text-green-700 text-[10px] font-semibold hover:bg-green-200 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Confirm
                        </button>
                      )}
                      {booking.clientPhone && (
                        <button
                          onClick={() => { openWAModal(booking, "parent"); setSwipedBookingId(null); }}
                          className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-semibold hover:bg-emerald-200 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WA
                        </button>
                      )}
                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <button
                          onClick={() => { setCancelTarget(booking); setSwipedBookingId(null); }}
                          className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg bg-red-100 text-red-700 text-[10px] font-semibold hover:bg-red-200 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                <div
                  id={`booking-row-${booking.id}`}
                  className={`bg-card rounded-xl border border-border shadow-soft overflow-hidden border-l-4 ${rowBorderColor(booking.status)} transition-transform duration-200`}
                  style={{ transform: swipedBookingId === booking.id ? 'translateX(-160px)' : 'translateX(0)' }}
                  onTouchStart={(e) => { touchStartXRef.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    if (touchStartXRef.current === null) return;
                    const diff = touchStartXRef.current - e.changedTouches[0].clientX;
                    if (diff > 60) setSwipedBookingId(booking.id);
                    else if (diff < -30) setSwipedBookingId(null);
                    touchStartXRef.current = null;
                  }}
                  onClick={() => { if (swipedBookingId === booking.id) { setSwipedBookingId(null); return; } }}
                >
                  {/* Card Header */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {booking.clientName || "N/A"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {booking.clockIn && !booking.clockOut && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {booking.nannyName || "Unassigned"}
                          </p>
                        </div>
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
                      <div className="pt-3 border-t border-border space-y-3 text-xs">
                        {/* Quick actions — top */}
                        <div className="flex flex-wrap gap-2 pb-3 border-b border-border">
                          <button
                            onClick={() => handleRebook(booking)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Rebook
                          </button>
                          {booking.clientPhone && (
                            <button
                              onClick={() => openWAModal(booking, "parent")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp Parent
                            </button>
                          )}
                          <button
                            onClick={() => openWAModal(booking, "nanny")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp Nanny
                          </button>
                          <button
                            onClick={() => setExtendBooking(booking)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <TimerReset className="w-3.5 h-3.5" />
                            Modify Hours
                          </button>
                          {(booking.status === "confirmed" || booking.status === "pending" || (booking.clockIn && !booking.clockOut)) && (
                            <button
                              onClick={() => setForwardBooking(booking)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              Forward
                            </button>
                          )}
                        </div>
                        {/* Detail fields */}
                        <div className="grid grid-cols-2 gap-3">
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
                        {/* Admin Notes (mobile) */}
                        <div className="col-span-2">
                          <p className="text-muted-foreground flex items-center gap-1"><StickyNote className="w-3 h-3 text-amber-500" />Admin Notes</p>
                          <textarea
                            rows={2}
                            placeholder="Add internal notes..."
                            className="w-full mt-1 px-2.5 py-1.5 text-xs border border-amber-200 bg-amber-50/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                            value={getAdminNoteDraft(booking)}
                            onChange={(e) => setAdminNoteDrafts((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                            onBlur={(e) => saveAdminNote(booking.id, e.target.value)}
                          />
                        </div>
                        {/* Activity feed (mobile) */}
                        {(() => {
                          const events: { time: string; label: string; detail?: string }[] = [];
                          if (booking.createdAt) events.push({ time: booking.createdAt, label: "Created", detail: booking.createdByName || undefined });
                          if (booking.clockIn) events.push({ time: booking.clockIn, label: "Clocked in" });
                          if (booking.clockOut) events.push({ time: booking.clockOut, label: "Completed" });
                          if (booking.collectedAt) events.push({ time: booking.collectedAt, label: "Collected", detail: booking.collectedBy || undefined });
                          if (booking.cancelledAt) events.push({ time: booking.cancelledAt, label: "Cancelled", detail: booking.cancelledBy || undefined });
                          events.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                          if (events.length <= 1) return null;
                          return (
                            <div className="col-span-2 space-y-1">
                              <p className="text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" />Activity</p>
                              <div className="flex flex-wrap gap-1">
                                {events.map((ev, i) => (
                                  <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                                    {ev.label}{ev.detail ? ` · ${ev.detail}` : ""} <span className="opacity-50">{(() => { try { return format(new Date(ev.time), "dd/MM HH:mm"); } catch { return ""; } })()}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="col-span-2 flex items-center gap-1.5">
                          <p className="text-muted-foreground">Created by</p>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            booking.createdBy === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            booking.createdBy === 'nanny' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {booking.createdBy === 'admin' ? 'Admin' : booking.createdBy === 'nanny' ? 'Nanny' : 'Parent'}
                          </span>
                          {booking.createdByName && (
                            <span className="text-muted-foreground text-[10px]">{booking.createdByName}</span>
                          )}
                        </div>
                        </div>
                        {/* Status actions */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                          {booking.status === "pending" && (
                            <button
                              onClick={() => updateBookingStatus(booking.id, "confirmed")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm
                            </button>
                          )}
                          {booking.status === "pending" && (
                            <button
                              onClick={() => handleSendReminder(booking.id)}
                              disabled={isReminderCooling(booking.id) || reminderLoading === booking.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-40"
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
                              onClick={() => updateBookingStatus(booking.id, "completed")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Complete
                            </button>
                          )}
                          {(booking.status === "pending" || booking.status === "confirmed") && (
                            <button
                              onClick={() => setCancelTarget(booking)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Cancel
                            </button>
                          )}
                          {deleteConfirm === booking.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(booking.id)}
                                className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded-lg hover:bg-destructive/90 transition-colors"
                              >
                                Yes, delete
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
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
                  </div>
                </div>
                </div>{/* end swipe wrapper */}
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
              <h2 className="font-serif text-lg font-bold text-foreground">
                {rebookClientName ? (
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-purple-500" />
                    Rebook — {rebookClientName}
                  </span>
                ) : "New Booking"}
              </h2>
              <button
                onClick={() => { setShowNewBooking(false); setRebookClientName(null); setNewBookingError(null); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleNewBookingSubmit} className="space-y-5">
              {/* Rebook pre-fill notice */}
              {rebookClientName && (
                <div className="flex items-start gap-2.5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-sm text-purple-700">
                  <RotateCcw className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
                  <span>
                    <span className="font-semibold">Client details pre-filled</span> from previous booking —{" "}
                    <span className="font-medium">select a date &amp; time</span> to create the new booking.
                  </span>
                </div>
              )}

              {/* API / validation error */}
              {newBookingError && (
                <div className="flex items-start gap-2.5 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{newBookingError}</span>
                </div>
              )}

              {/* Nanny Selection */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  Assign Nanny
                </label>
                {/* Visual availability grid when date + time are set */}
                {nannyAvailabilityMap ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Auto-assign card */}
                    <button
                      type="button"
                      onClick={() => setNewBooking({ ...newBooking, nannyId: "" })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                        !newBooking.nannyId
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-dashed border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 w-full mb-1">
                        <Wand2 className={`w-3 h-3 shrink-0 ${!newBooking.nannyId ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-semibold text-foreground truncate flex-1">Auto-assign</span>
                      </div>
                      {bestAutoNanny ? (
                        <>
                          <span className="text-[11px] text-green-600 font-medium truncate w-full">{bestAutoNanny.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {newBookingNumDays > 1 ? `Free all ${newBookingNumDays} days` : "Best available"}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-amber-500">
                          {newBooking.date ? `No nanny free all ${newBookingNumDays} day${newBookingNumDays > 1 ? "s" : ""}` : "Set date first"}
                        </span>
                      )}
                      {!newBooking.nannyId && (
                        <span className="text-[10px] font-medium mt-1 text-primary">Selected</span>
                      )}
                    </button>
                    {nannyAvailabilityMap.map(({ nanny: n, freeDays, totalDays, busy }) => {
                      const selected = String(n.id) === newBooking.nannyId;
                      const partial = !busy && freeDays < totalDays;
                      const dotColor = selected ? "bg-primary" : busy ? "bg-red-400" : partial ? "bg-amber-400" : "bg-green-400";
                      const cardClass = selected
                        ? "border-primary bg-primary/10 shadow-sm"
                        : busy
                        ? "border-border bg-red-50/50 hover:border-red-300 hover:bg-red-50"
                        : partial
                        ? "border-border bg-background hover:border-amber-400 hover:bg-amber-50/50"
                        : "border-border bg-background hover:border-green-400 hover:bg-green-50";
                      const statusLabel = selected
                        ? "Selected"
                        : busy
                        ? "Busy"
                        : totalDays > 1
                        ? `Free ${freeDays}/${totalDays} days`
                        : "Free";
                      const statusColor = selected
                        ? "text-primary"
                        : busy
                        ? "text-red-500"
                        : partial
                        ? "text-amber-500"
                        : "text-green-600";
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => setNewBooking({ ...newBooking, nannyId: String(n.id) })}
                          className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${cardClass}`}
                        >
                          <div className="flex items-center gap-1.5 w-full mb-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                            <span className="text-xs font-semibold text-foreground truncate flex-1">{n.name}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{n.rate}€/hr</span>
                          <span className="text-[10px] text-muted-foreground truncate w-full">{n.location}</span>
                          <span className={`text-[10px] font-medium mt-1 ${statusColor}`}>{statusLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Fallback dropdown when no date/time selected yet */
                  <select
                    value={newBooking.nannyId}
                    onChange={(e) => setNewBooking({ ...newBooking, nannyId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Auto-assign (set date & time first to preview)</option>
                    {allActiveNannies.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} — {n.rate}€/hr ({n.location})
                      </option>
                    ))}
                  </select>
                )}
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

              {/* Start Date + Days Counter */}
              <div className="space-y-3">
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
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Number of days</p>
                    {newBooking.date && newBookingNumDays > 1 && (() => {
                      const start = new Date(newBooking.date);
                      const end = new Date(newBooking.date);
                      end.setDate(end.getDate() + newBookingNumDays - 1);
                      return (
                        <p className="text-xs text-primary mt-0.5">
                          {newBooking.date} → {end.toISOString().slice(0, 10)} · {newBookingNumDays} separate bookings
                          {newBookingPrice > 0 && ` · ${Math.round(newBookingPrice / newBookingNumDays)}€/day · ${newBookingPrice}€ total`}
                        </p>
                      );
                    })()}
                    {(newBookingNumDays === 1 && newBookingPrice > 0) && (
                      <p className="text-xs text-muted-foreground mt-0.5">{newBookingPrice}€</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => setNewBookingNumDays(Math.max(1, newBookingNumDays - 1))} disabled={newBookingNumDays <= 1}
                      className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">−</button>
                    <span className="w-7 text-center font-bold text-foreground">{newBookingNumDays}</span>
                    <button type="button" onClick={() => setNewBookingNumDays(Math.min(14, newBookingNumDays + 1))} disabled={newBookingNumDays >= 14}
                      className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors disabled:opacity-30">+</button>
                  </div>
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

              {/* Per-day schedule overrides — shown when N > 1 and times are set */}
              {newBookingNumDays > 1 && newBooking.startTime && newBooking.date && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Daily schedule</p>
                  <div className="space-y-1">
                    {Array.from({ length: newBookingNumDays }, (_, i) => {
                      const d = new Date(newBooking.date);
                      d.setDate(d.getDate() + i);
                      const override = dayTimeOverrides[i];
                      const dayStart = override?.startTime ?? newBooking.startTime;
                      const dayEnd = override?.endTime ?? newBooking.endTime;
                      const startLabel = TIME_SLOTS.find((s) => s.value === dayStart)?.label ?? dayStart;
                      const endLabel = TIME_SLOTS.find((s) => s.value === dayEnd)?.label ?? dayEnd;
                      const isEditing = editingDayIdx === i;
                      return (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${override ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20"}`}>
                          <span className="text-xs font-medium text-foreground w-24 shrink-0">
                            {format(d, "EEE, MMM d")}
                          </span>
                          {isEditing ? (
                            <>
                              <select
                                value={dayStart}
                                onChange={(e) => setDayTimeOverrides((prev) => ({ ...prev, [i]: { startTime: e.target.value, endTime: dayEnd } }))}
                                className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                              >
                                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <span className="text-xs text-muted-foreground">→</span>
                              <select
                                value={dayEnd}
                                onChange={(e) => setDayTimeOverrides((prev) => ({ ...prev, [i]: { startTime: dayStart, endTime: e.target.value } }))}
                                className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                              >
                                {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                              </select>
                              <button type="button" onClick={() => setEditingDayIdx(null)} className="p-1 rounded hover:bg-muted transition-colors text-primary">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className={`text-xs flex-1 ${override ? "text-primary font-medium" : "text-muted-foreground"}`}>
                                {startLabel} → {endLabel}
                                {override && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">custom</span>}
                              </span>
                              <button type="button" onClick={() => setEditingDayIdx(i)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                <Pencil className="w-3 h-3" />
                              </button>
                              {override && (
                                <button type="button" onClick={() => { setDayTimeOverrides((prev) => { const n = { ...prev }; delete n[i]; return n; }); }} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {/* Recurring Booking */}
              <div className="rounded-xl border border-border p-3.5 bg-muted/20">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newBooking.recurring}
                    onChange={(e) => setNewBooking({ ...newBooking, recurring: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Repeat2 className="w-3.5 h-3.5 text-primary" />
                    Recurring booking
                  </span>
                </label>
                {newBooking.recurring && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <select
                      value={newBooking.recurringType}
                      onChange={(e) => setNewBooking({ ...newBooking, recurringType: e.target.value as 'weekly' | 'biweekly' | 'monthly' })}
                      className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="weekly">Weekly (every 7 days)</option>
                      <option value="biweekly">Biweekly (every 14 days)</option>
                      <option value="monthly">Monthly (every 30 days)</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Repeat</label>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={newBooking.recurringCount}
                        onChange={(e) => setNewBooking({ ...newBooking, recurringCount: e.target.value })}
                        className="w-16 px-2 py-1.5 bg-background border border-border rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <label className="text-sm text-muted-foreground">times</label>
                    </div>
                    <p className="w-full text-[11px] text-primary/70">
                      Will create {newBooking.recurringCount || 4} bookings starting from {newBooking.date || "selected date"}
                    </p>
                  </div>
                )}
              </div>

              {/* Conflict Warning */}
              {conflicts.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Scheduling conflict{overrideConflict ? " — override active" : ""}</p>
                      <p className="text-xs mt-0.5">
                        {selectedNanny?.name || "This nanny"} already has {conflicts.length} booking{conflicts.length > 1 ? "s" : ""} at this time.
                      </p>
                    </div>
                  </div>
                  {suggestedNannies.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1.5">Switch to an available nanny:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedNannies.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setNewBooking((prev) => ({ ...prev, nannyId: String(n.id) }))}
                            className="px-2.5 py-1 bg-white border border-orange-300 rounded-lg text-xs font-medium text-orange-800 hover:bg-orange-100 transition-colors"
                          >
                            {n.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {suggestedNannies.length === 0 && (
                    <p className="text-xs">No other nannies are available at this time.</p>
                  )}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideConflict}
                      onChange={(e) => setOverrideConflict(e.target.checked)}
                      className="w-4 h-4 rounded border-orange-400 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-xs font-medium">Override conflict (admin)</span>
                  </label>
                </div>
              )}

              {/* 3-hour minimum warning with admin override */}
              {newBookingHours > 0 && newBookingHours < 3 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Minimum booking duration is 3 hours (current: {Math.round(newBookingHours * 10) / 10}h)
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideMinHours}
                      onChange={(e) => setOverrideMinHours(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-medium">Override minimum hours (admin)</span>
                  </label>
                </div>
              )}

              {/* Price Summary */}
              {selectedNanny && (newBookingHours >= 3 || (overrideMinHours && newBookingHours > 0)) && (
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
                  onClick={() => { setShowNewBooking(false); setRebookClientName(null); setNewBookingError(null); }}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newBookingLoading || (!newBooking.nannyId && !bestAutoNanny) || !newBooking.date || !newBooking.clientName || !newBooking.startTime || !newBooking.endTime || (conflicts.length > 0 && !overrideConflict) || (newBookingHours > 0 && newBookingHours < 3 && !overrideMinHours)}
                  className="flex-1 gradient-warm text-white rounded-xl px-4 py-3 font-semibold hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {newBookingLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{newBooking.recurring ? `Creating ${newBooking.recurringCount || 4} bookings…` : "Creating…"}</>
                  ) : (
                    <>
                      {newBooking.recurring ? <Repeat2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {newBooking.recurring ? `Create ${newBooking.recurringCount || 4} Bookings` : "Create Booking"}
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

      {/* Modify Hours Modal */}
      {extendBooking && (
        <ExtendBookingModal
          booking={extendBooking}
          rate={nannies.find((n) => n.id === extendBooking.nannyId)?.rate || 150}
          onConfirm={async (newStartTime: string, newEndTime: string, newTotalPrice: number, perDaySchedule?: DaySchedule[]) => {
            if (perDaySchedule && perDaySchedule.length > 1) {
              // Split into individual daily bookings
              await deleteBooking(extendBooking.id, 'admin');
              for (const day of perDaySchedule) {
                await addBooking({
                  nannyId: extendBooking.nannyId,
                  nannyName: extendBooking.nannyName,
                  clientName: extendBooking.clientName,
                  clientEmail: extendBooking.clientEmail,
                  clientPhone: extendBooking.clientPhone,
                  hotel: extendBooking.hotel,
                  date: day.date,
                  endDate: null,
                  startTime: day.startTime,
                  endTime: day.endTime,
                  plan: extendBooking.plan,
                  childrenCount: extendBooking.childrenCount,
                  childrenAges: extendBooking.childrenAges,
                  notes: extendBooking.notes,
                  totalPrice: day.price,
                  status: extendBooking.status,
                  createdBy: 'admin',
                  createdByName: adminProfile?.name || 'Admin',
                }, { skipMinHours: true });
              }
            } else {
              await updateBooking(extendBooking.id, { startTime: newStartTime, endTime: newEndTime, totalPrice: newTotalPrice });
            }
            await fetchBookings();
          }}
          onClose={() => setExtendBooking(null)}
          t={(key: string) => {
            const map: Record<string, string> = {
              "modify.title": "Modify Hours",
              "modify.newStartTime": "New Start Time",
              "modify.newEndTime": "New End Time",
              "modify.defaultStartTime": "Default Start Time",
              "modify.defaultEndTime": "Default End Time",
              "modify.keepCurrent": "keep current",
              "modify.differentHoursPerDay": "Set different hours per day",
              "modify.dailySchedule": "Daily Schedule",
              "modify.hourChange": "Hour Change",
              "modify.priceChange": "Price Change",
              "modify.newTotal": "New Total",
              "modify.confirm": "Save Changes",
              "modify.saving": "Saving...",
              "modify.success": "Hours updated successfully!",
              "modify.summary": "Summary",
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
            const res = await fetch(`/api/bookings/${forwardBooking.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nanny_id: newNannyId, skip_conflict_check: true }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              const err: Error & { status?: number } = new Error(
                data.error || `Failed to forward booking (${res.status})`
              );
              err.status = res.status;
              throw err;
            }
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

      {/* Bulk Forward Modal */}
      {bulkForwardModal && (
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { if (!bulkForwardLoading) { setBulkForwardModal(false); setBulkForwardNannyId(null); setBulkForwardError(null); } }}>
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {bulkForwardSuccess ? (
              <div className="p-8 text-center">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-foreground">All bookings forwarded successfully!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-orange-500" />
                    Forward {selectedIds.size} Booking{selectedIds.size !== 1 ? "s" : ""}
                  </h2>
                  <button onClick={() => { setBulkForwardModal(false); setBulkForwardNannyId(null); setBulkForwardError(null); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {/* Selected bookings summary */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-orange-800 mb-2">{selectedIds.size} booking{selectedIds.size !== 1 ? "s" : ""} selected</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {[...selectedIds].map((id) => {
                        const b = bookings.find((bk) => bk.id === id);
                        return b ? (
                          <p key={id} className="text-xs text-orange-700">
                            {b.clientName} · {b.date} · {b.startTime}–{b.endTime} {b.nannyName ? `(${b.nannyName})` : ""}
                          </p>
                        ) : null;
                      })}
                    </div>
                  </div>

                  {/* Nanny selector */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Forward to</label>
                    <select
                      value={bulkForwardNannyId ?? ""}
                      onChange={(e) => { setBulkForwardNannyId(e.target.value ? Number(e.target.value) : null); setBulkForwardError(null); }}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                    >
                      <option value="">Select a nanny...</option>
                      {nannies.filter((n) => n.status === "active").map((n) => (
                        <option key={n.id} value={n.id}>{n.name} — {n.location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Error */}
                  {bulkForwardError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm whitespace-pre-wrap">
                      ⚠️ {bulkForwardError}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground text-center">All selected bookings will be reassigned to the chosen nanny.</p>
                </div>
                <div className="px-6 py-4 border-t border-border flex gap-3">
                  <button
                    onClick={() => { setBulkForwardModal(false); setBulkForwardNannyId(null); setBulkForwardError(null); }}
                    disabled={bulkForwardLoading}
                    className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkForward}
                    disabled={!bulkForwardNannyId || bulkForwardLoading}
                    className="flex-1 py-3 gradient-warm text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {bulkForwardLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Forwarding...</>
                    ) : (
                      `Forward ${selectedIds.size} Booking${selectedIds.size !== 1 ? "s" : ""}`
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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

      {/* ─── Deleted Bookings Audit Log Modal ─────────────────── */}
      {showDeleted && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleted(false)}
        >
          <div
            className="bg-white dark:bg-card rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Deleted Bookings</h2>
                {!loadingDeleted && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {deletedBookings.length}
                  </span>
                )}
              </div>
              <button onClick={() => setShowDeleted(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-4">
              {loadingDeleted ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : deletedBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-12 text-sm">No deleted bookings found.</p>
              ) : (
                <div className="space-y-3">
                  {deletedBookings.map((b) => (
                    <div key={b.id} className="bg-muted/40 rounded-xl border border-border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            #{b.id} — {b.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.date}{b.endDate ? ` → ${b.endDate}` : ""} · {b.startTime}{b.endTime ? ` - ${b.endTime}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{b.hotel || "No hotel"} · {b.nannyName || "Unassigned"}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${
                          b.status === 'completed' ? 'bg-green-100 text-green-700' :
                          b.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/50">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium text-red-600">Deleted by {b.deletedBy || 'Unknown'}</span>
                          {b.deletedAt && (
                            <span> · {formatDistanceToNow(new Date(b.deletedAt), { addSuffix: true })}</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRestore(b.id)}
                          disabled={restoring === b.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {restoring === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Client History Panel ── */}
      {clientHistory && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setClientHistory(null)} />
          {/* Slide-in panel */}
          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border">
              <div>
                <h2 className="font-serif text-lg font-bold text-foreground">{clientHistory}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Client history</p>
              </div>
              <button onClick={() => setClientHistory(null)} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { label: "Total bookings", value: clientHistoryStats.count },
                { label: "Confirmed", value: clientHistoryStats.confirmed },
                { label: "Total (active)", value: `${clientHistoryStats.activeTotal}€` },
              ].map((s) => (
                <div key={s.label} className="px-4 py-3 text-center">
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Contact info from last booking */}
            {clientHistoryStats.lastBooking && (
              <div className="flex items-center gap-4 px-6 py-3 bg-muted/40 border-b border-border text-xs text-muted-foreground">
                {clientHistoryStats.lastBooking.clientEmail && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{clientHistoryStats.lastBooking.clientEmail}</span>
                )}
                {clientHistoryStats.lastBooking.clientPhone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{clientHistoryStats.lastBooking.clientPhone}</span>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20">
              <button
                onClick={handleSendWhatsAppSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Send Summary via WhatsApp
              </button>
              <button
                onClick={handlePrintClientFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
            </div>

            {/* Booking list */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {clientHistoryBookings.length === 0 ? (
                <div className="px-6 py-12 text-center text-muted-foreground text-sm">No bookings found</div>
              ) : (
                clientHistoryBookings.map((b) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-orange-100 text-orange-700",
                    confirmed: "bg-green-100 text-green-700",
                    completed: "bg-blue-100 text-blue-700",
                    cancelled: "bg-gray-100 text-gray-500",
                  };
                  return (
                    <div key={b.id} className={`px-6 py-4 hover:bg-muted/30 transition-colors ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {b.endDate && b.endDate !== b.date ? `${b.date} → ${b.endDate}` : b.date}
                            </span>
                            {b.startTime && (
                              <span className="text-xs text-muted-foreground">{b.startTime}{b.endTime ? `–${b.endTime}` : ""}</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            👶 {b.nannyName || "Unassigned"} · {b.hotel || "No location"}
                          </p>
                          <p className="text-xs text-muted-foreground">{b.childrenCount || 1} child{(b.childrenCount || 1) !== 1 ? "ren" : ""}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusColors[b.status] || statusColors.pending}`}>
                            {b.status}
                          </span>
                          {b.totalPrice && (
                            <span className="text-sm font-bold text-foreground">{b.totalPrice}€</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => { setClientHistory(null); openEditModal(b); }}
                        className="mt-2 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        View details →
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky total footer */}
            {clientHistoryStats.activeTotal > 0 && (
              <div className="border-t border-border px-6 py-4 bg-card flex items-center justify-between shrink-0">
                <div>
                  <p className="text-xs text-muted-foreground">Active bookings total</p>
                  <p className="text-[10px] text-muted-foreground">(excludes cancelled)</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{clientHistoryStats.activeTotal}€</p>
                  <p className="text-xs text-muted-foreground">{toDH(clientHistoryStats.activeTotal).toLocaleString()} DH</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Bulk Action Floating Bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-card border border-border rounded-2xl shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-semibold text-foreground pr-2 border-r border-border">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkAction("confirmed")}
            disabled={!!bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {bulkLoading === "confirmed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Confirm All
          </button>
          <button
            onClick={() => handleBulkAction("completed")}
            disabled={!!bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {bulkLoading === "completed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Complete All
          </button>
          <button
            onClick={() => handleBulkAction("cancelled")}
            disabled={!!bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {bulkLoading === "cancelled" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Cancel All
          </button>
          <button
            onClick={() => { setBulkForwardModal(true); setBulkForwardError(null); setBulkForwardNannyId(null); setBulkForwardSuccess(false); }}
            disabled={!!bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Forward All
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={!!bulkLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors disabled:opacity-50"
          >
            {bulkLoading === "delete" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete
          </button>
          <button
            onClick={clearSelection}
            className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── WhatsApp Template Picker ── */}
      {waModal && (() => {
        const { booking: b, target } = waModal;
        const isParent = target === "parent";
        const parentTemplates = buildParentTemplates(b);
        const nannyData = buildNannyTemplates(b);

        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setWaModal(null)}>
            <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      WhatsApp {isParent ? "Parent" : "Nanny"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                      {isParent ? (b.clientName || "Client") : (b.nannyName || "Nanny")}
                      {" · "}{b.date}
                    </p>
                  </div>
                </div>
                <button onClick={() => setWaModal(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Templates */}
              <div className="p-4 space-y-2">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-3">
                  Choose a message template
                </p>
                {isParent
                  ? parentTemplates.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => sendWA(b.clientPhone, t.message)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-green-300 hover:bg-green-50 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{t.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-green-700">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{t.message.split("\n")[0]}</p>
                          </div>
                          <MessageCircle className="w-3.5 h-3.5 text-green-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))
                  : nannyData.templates.map((t) => (
                      <button
                        key={t.label}
                        onClick={() => sendWA(nannyData.phone, t.message)}
                        className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-blue-300 hover:bg-blue-50 transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{t.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground group-hover:text-blue-700">{t.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{t.message.split("\n")[0]}</p>
                          </div>
                          <MessageCircle className="w-3.5 h-3.5 text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))
                }
                {!isParent && !nannyData.phone && (
                  <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-1">
                    ⚠️ No phone saved for this nanny — opens WhatsApp share
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
