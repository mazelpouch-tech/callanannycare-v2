import { useState, useEffect, useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
  parseISO,
  isAfter,
  addDays,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MapPin,
  User,
  Clock,
  Ban,
  Loader2,
  TimerReset,
  ArrowRightLeft,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import ExtendBookingModal from "../../components/ExtendBookingModal";
import ForwardBookingModal from "../../components/ForwardBookingModal";
import type { Booking, BookingStatus } from "@/types";

const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 96; i++) {
  const h = (6 + Math.floor(i / 4)) % 24;
  const m = (i % 4) * 15;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  TIME_SLOTS.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
}

const RATE = 10;
const TAXI_FEE = 10;

const parseTime = (t: string) => {
  if (!t) return "";
  if (t.includes(":")) {
    return TIME_SLOTS.find((s) => s.value === t) ? t : "";
  }
  const m = t.match(/^(\d{1,2})h(\d{2})$/i);
  return m ? `${parseInt(m[1])}:${m[2]}` : "";
};

interface BlockedDate {
  id: number;
  date: string;
  reason: string;
  created_at: string;
}

const statusDot: Record<BookingStatus, string> = {
  pending: "bg-yellow-400",
  confirmed: "bg-green-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
};

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const API_BASE = "/api";

export default function NannyCalendar() {
  const { nannyBookings, fetchNannyBookings, updateBookingStatus, updateBooking, nannyProfile, nannies } = useData();
  const { t } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [blockReason, setBlockReason] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [forwardBooking, setForwardBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", startTime: "", endTime: "", hotel: "", numChildren: "1", childrenAges: "", notes: "" });
  const [editLoading, setEditLoading] = useState(false);

  const handleComplete = async (id: number | string) => {
    setActionLoading(id);
    await updateBookingStatus(id, "completed");
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const openEditModal = (booking: Booking) => {
    setEditForm({
      startDate: booking.date || "",
      endDate: booking.endDate || "",
      startTime: parseTime(booking.startTime),
      endTime: parseTime(booking.endTime),
      hotel: booking.hotel || "",
      numChildren: String(booking.childrenCount || 1),
      childrenAges: booking.childrenAges || "",
      notes: booking.notes || "",
    });
    setEditBooking(booking);
  };

  const handleEditSubmit = async () => {
    if (!editBooking) return;
    setEditLoading(true);
    const startLabel = TIME_SLOTS.find((s) => s.value === editForm.startTime)?.label || editForm.startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === editForm.endTime)?.label || editForm.endTime;

    const [sh, sm] = (editForm.startTime || "0:0").split(":").map(Number);
    const [eh, em] = (editForm.endTime || "0:0").split(":").map(Number);
    const startH = sh + sm / 60;
    const endH = eh + em / 60;
    const hours = endH > startH ? endH - startH : 24 - startH + endH;
    const startDateObj = new Date(editForm.startDate);
    const endDateObj = editForm.endDate ? new Date(editForm.endDate) : startDateObj;
    const dayCount = Math.max(1, Math.round((endDateObj.getTime() - startDateObj.getTime()) / 86400000) + 1);
    const isEvening = endH <= startH || sh >= 19 || sh < 7 || eh > 19 || (eh === 19 && em > 0);
    const taxiFee = isEvening ? TAXI_FEE * dayCount : 0;
    const totalPrice = RATE * hours * dayCount + taxiFee;

    try {
      await updateBooking(editBooking.id, {
        date: editForm.startDate,
        endDate: editForm.endDate || null,
        startTime: startLabel,
        endTime: endLabel,
        hotel: editForm.hotel,
        childrenCount: parseInt(editForm.numChildren) || 1,
        childrenAges: editForm.childrenAges,
        notes: editForm.notes,
        totalPrice,
      });
      await fetchNannyBookings();
      setEditBooking(null);
    } catch (err) {
      console.error("Edit booking failed:", err);
      alert("Failed to save booking changes. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    fetchNannyBookings();
  }, [fetchNannyBookings]);

  // Fetch blocked dates from profile endpoint
  const fetchBlockedDates = useCallback(async () => {
    if (!nannyProfile?.id) return;
    try {
      const res = await fetch(`${API_BASE}/nanny/profile?nannyId=${nannyProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        setBlockedDates(data.blocked_dates || []);
      }
    } catch {
      console.warn("Failed to fetch blocked dates");
    }
  }, [nannyProfile]);

  useEffect(() => {
    fetchBlockedDates();
  }, [fetchBlockedDates]);

  // Set of blocked date strings for quick lookup
  const blockedDateSet = useMemo(() => {
    return new Set(blockedDates.map((bd) => bd.date));
  }, [blockedDates]);

  // Get blocked date info for a specific date
  const getBlockedInfo = useCallback(
    (dateKey: string) => blockedDates.find((bd) => bd.date === dateKey) || null,
    [blockedDates]
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    const addToDate = (key: string, b: Booking) => {
      if (!map[key]) map[key] = [];
      if (!map[key].find((x) => x.id === b.id)) map[key].push(b);
    };
    nannyBookings.forEach((b: Booking) => {
      if (!b.date) return;
      const start = parseISO(b.date);
      const end = b.endDate ? parseISO(b.endDate) : start;
      let current = start;
      while (!isAfter(current, end)) {
        addToDate(format(current, "yyyy-MM-dd"), b);
        current = addDays(current, 1);
      }
      if (b.extraDates) {
        b.extraDates.forEach((d) => addToDate(d, b));
      }
    });
    return map;
  }, [nannyBookings]);

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate[key] || [];
  }, [selectedDate, bookingsByDate]);

  const selectedDateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const isSelectedBlocked = selectedDateKey ? blockedDateSet.has(selectedDateKey) : false;
  const selectedBlockedInfo = selectedDateKey ? getBlockedInfo(selectedDateKey) : null;
  const isPast = selectedDate ? isBefore(startOfDay(selectedDate), startOfDay(new Date())) : false;

  const handleToggleBlock = async () => {
    if (!nannyProfile?.id || !selectedDateKey) return;
    setBlockLoading(true);
    try {
      const res = await fetch(`${API_BASE}/nanny/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nannyId: nannyProfile.id,
          action: isSelectedBlocked ? "unblock_date" : "block_date",
          date: selectedDateKey,
          reason: isSelectedBlocked ? undefined : blockReason,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedDates(data.blocked_dates || []);
        setBlockReason("");
      }
    } catch {
      console.warn("Failed to toggle block date");
    } finally {
      setBlockLoading(false);
    }
  };

  const weekDays = [t("shared.mon"), t("shared.tue"), t("shared.wed"), t("shared.thu"), t("shared.fri"), t("shared.sat"), t("shared.sun")];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          {t("nanny.calendar.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("nanny.calendar.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 sm:p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted/50 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-lg text-foreground">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-muted/50 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayBookings = bookingsByDate[dateKey] || [];
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const selected = selectedDate && isSameDay(day, selectedDate);
              const isBlocked = blockedDateSet.has(dateKey);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(day)}
                  className={`relative min-h-[52px] sm:min-h-[64px] p-1 rounded-lg text-sm transition-all ${
                    !inMonth
                      ? "text-muted-foreground/30"
                      : selected
                      ? "bg-accent/15 border-2 border-accent"
                      : isBlocked
                      ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                      : today
                      ? "bg-primary/5 ring-2 ring-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <span
                    className={`block text-xs sm:text-sm font-medium ${
                      !inMonth
                        ? ""
                        : isBlocked
                        ? "text-red-500 dark:text-red-400"
                        : today
                        ? "text-primary font-bold"
                        : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Blocked indicator */}
                  {isBlocked && inMonth && (
                    <div className="flex justify-center mt-0.5">
                      <Ban className="w-3 h-3 text-red-400" />
                    </div>
                  )}

                  {/* Booking dots */}
                  {dayBookings.length > 0 && inMonth && !isBlocked && (
                    <div className="flex gap-0.5 justify-center mt-1 flex-wrap">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div
                          key={b.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            statusDot[b.status] || "bg-gray-400"
                          }`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Show booking dots even on blocked dates */}
                  {dayBookings.length > 0 && inMonth && isBlocked && (
                    <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
                      {dayBookings.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          className={`w-1 h-1 rounded-full ${
                            statusDot[b.status] || "bg-gray-400"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
            {Object.entries(statusDot).map(([status, color]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                <span className="text-xs text-muted-foreground">
                  {t(`shared.${status}`)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <Ban className="w-3 h-3 text-red-400" />
              <span className="text-xs text-muted-foreground">
                {t("nanny.calendar.blocked")}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : t("nanny.calendar.selectDay")}
            </h3>
            {selectedDate && (
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-muted-foreground">
                  {selectedDayBookings.length} {selectedDayBookings.length !== 1 ? t("nanny.calendar.bookingsLabel") : t("nanny.calendar.booking")}
                </p>
                {isSelectedBlocked && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {t("nanny.calendar.blocked")}
                  </span>
                )}
              </div>
            )}
          </div>

          {!selectedDate ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {t("nanny.calendar.clickDate")}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Block/Unblock control */}
              {selectedDate && !isPast && (
                <div className="p-4 space-y-3">
                  {isSelectedBlocked ? (
                    <>
                      {selectedBlockedInfo?.reason && (
                        <p className="text-sm text-red-600 italic">
                          {selectedBlockedInfo.reason}
                        </p>
                      )}
                      <button
                        onClick={handleToggleBlock}
                        disabled={blockLoading}
                        className="w-full py-2.5 px-4 border border-green-300 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {blockLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          t("nanny.calendar.unblockDate")
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        placeholder={t("nanny.calendar.reasonPlaceholder")}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-red-300/50"
                      />
                      <button
                        onClick={handleToggleBlock}
                        disabled={blockLoading}
                        className="w-full py-2.5 px-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {blockLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Ban className="w-4 h-4" />
                            {t("nanny.calendar.blockDate")}
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Bookings list */}
              {selectedDayBookings.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  {t("nanny.calendar.noBookings")}
                </div>
              ) : (
                selectedDayBookings.map((booking) => (
                  <div key={booking.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground text-sm">
                          {booking.clientName}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                          statusColors[booking.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.startTime}
                      {booking.endTime ? ` - ${booking.endTime}` : ""}
                      <span className="ml-2 capitalize text-xs bg-muted px-1.5 py-0.5 rounded">
                        {booking.plan}
                      </span>
                    </div>
                    {booking.extraTimes && booking.extraTimes.length > 0 && booking.extraTimes.map((et, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {et.startTime} - {et.endTime}
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                          evening
                        </span>
                      </div>
                    ))}

                    {booking.hotel && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.hotel}
                      </div>
                    )}

                    {/* Action buttons — Extend / Forward / Complete / Edit */}
                    {(booking.status === "pending" || booking.status === "confirmed") && (
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => setExtendBooking(booking)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
                          >
                            <TimerReset className="w-3.5 h-3.5" />
                            {t("extend.extendShift")}
                          </button>
                        )}
                        <button
                          onClick={() => setForwardBooking(booking)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium hover:bg-orange-100 transition-colors"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          {t("forward.forwardShift")}
                        </button>
                        {booking.status === "confirmed" && (
                          <button
                            onClick={() => handleComplete(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(booking)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Extend Booking Modal */}
      {extendBooking && (
        <ExtendBookingModal
          booking={extendBooking}
          onConfirm={async (newStartTime, newEndTime, newTotalPrice) => {
            await updateBooking(extendBooking.id, { startTime: newStartTime, endTime: newEndTime, totalPrice: newTotalPrice });
            await fetchNannyBookings();
          }}
          onClose={() => setExtendBooking(null)}
          t={t}
        />
      )}

      {/* Forward Booking Modal */}
      {forwardBooking && (
        <ForwardBookingModal
          booking={forwardBooking}
          nannies={nannies}
          currentNannyId={nannyProfile?.id ?? null}
          onConfirm={async (newNannyId) => {
            const newNanny = nannies.find((n) => n.id === newNannyId);
            await updateBooking(forwardBooking.id, {
              nannyId: newNannyId,
              nannyName: newNanny?.name || "",
            });
            await fetchNannyBookings();
          }}
          onClose={() => setForwardBooking(null)}
          t={t}
        />
      )}

      {/* Edit Booking Modal */}
      {editBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-serif text-xl font-bold text-foreground">Edit Booking — {editBooking.clientName}</h2>
              <button onClick={() => setEditBooking(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.date")} *</label>
                  <input
                    type="date"
                    required
                    value={editForm.startDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.endDate")}</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    min={editForm.startDate}
                    onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.startTime")} *</label>
                  <div className="relative">
                    <select
                      required
                      value={editForm.startTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none"
                    >
                      <option value="">{t("shared.select")}</option>
                      {TIME_SLOTS.map((ts) => (
                        <option key={ts.value} value={ts.value}>{ts.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.endTime")}</label>
                  <div className="relative">
                    <select
                      value={editForm.endTime}
                      onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none"
                    >
                      <option value="">{t("shared.select")}</option>
                      {TIME_SLOTS.map((ts) => (
                        <option key={ts.value} value={ts.value}>{ts.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.hotelLocation")}</label>
                <input
                  type="text"
                  value={editForm.hotel}
                  onChange={(e) => setEditForm((f) => ({ ...f, hotel: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.children")}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editForm.numChildren}
                    onChange={(e) => setEditForm((f) => ({ ...f, numChildren: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.ages")}</label>
                  <input
                    type="text"
                    value={editForm.childrenAges}
                    onChange={(e) => setEditForm((f) => ({ ...f, childrenAges: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("shared.notes")}</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBooking(null)}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("shared.cancel")}
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={editLoading || !editForm.startDate || !editForm.startTime}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 gradient-warm text-white text-sm font-medium rounded-lg shadow-warm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
