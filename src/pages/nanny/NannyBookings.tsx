import { useEffect, useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  ClipboardList,
  CheckCircle,
  XCircle,
  MessageCircle,
  Loader2,
  PlayCircle,
  StopCircle,
  Timer,
  Plus,
  X,
} from "lucide-react";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import { Fragment } from "react";
import PhoneInput from "../../components/PhoneInput";
import {
  statusColors,
  formatDuration,
  formatHoursWorked,
  calcShiftPay,
  isToday,
} from "@/utils/shiftHelpers";

// 24h time slots from 07:00 to 23:30 (30-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let h = 7; h <= 23; h++) {
  const hh = String(h).padStart(2, "0");
  TIME_SLOTS.push({ value: `${h}:00`, label: `${hh}h00` });
  TIME_SLOTS.push({ value: `${h}:30`, label: `${hh}h30` });
}

interface LiveTimerProps { clockIn: string }

interface BookingFormData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  hotel: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  numChildren: string;
  childrenAges: string;
  notes: string;
}

const emptyForm: BookingFormData = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  hotel: "",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  numChildren: "1",
  childrenAges: "",
  notes: "",
};

const RATE = 150; // MAD per hour
const TAXI_FEE = 100; // MAD flat fee for night bookings

// Live timer component
function LiveTimer({ clockIn }: LiveTimerProps) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(clockIn).getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(clockIn).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className="font-mono text-sm font-bold tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
}

export default function NannyBookings() {
  const { nannyBookings, fetchNannyBookings, updateBookingStatus, clockInBooking, clockOutBooking, addBooking, nannyProfile } = useData();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  // New booking form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchNannyBookings();
  }, [fetchNannyBookings]);

  // Find active shift (clocked in but not clocked out)
  const activeShift = useMemo(
    () => nannyBookings.find((b) => b.clockIn && !b.clockOut && b.status !== "cancelled"),
    [nannyBookings]
  );

  const handleAccept = async (id: number | string) => {
    setActionLoading(id);
    await updateBookingStatus(id, "confirmed");
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleDecline = async (id: number | string) => {
    setActionLoading(id);
    await updateBookingStatus(id, "cancelled");
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleClockIn = async (id: number | string) => {
    setActionLoading(id);
    await clockInBooking(id);
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const handleClockOut = async (id: number | string) => {
    setActionLoading(id);
    await clockOutBooking(id);
    await fetchNannyBookings();
    setActionLoading(null);
  };

  const openWhatsApp = (phone: string, clientName: string, date: string) => {
    const text = encodeURIComponent(
      `Hi ${clientName}, this is your nanny from call a nanny regarding your booking on ${date}. `
    );
    const num = phone?.replace(/\D/g, "");
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  };

  const handleFormChange = (field: keyof BookingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.startDate || !formData.startTime) return;
    setFormLoading(true);

    // Calculate price (hidden from nanny, stored for admin)
    const [sh, sm] = (formData.startTime || "0:0").split(":").map(Number);
    const [eh, em] = (formData.endTime || "0:0").split(":").map(Number);
    const hours = Math.max(0, (eh + em / 60) - (sh + sm / 60));
    const startDate = new Date(formData.startDate);
    const endDate = formData.endDate ? new Date(formData.endDate) : startDate;
    const dayCount = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    const isEvening = eh > 19 || (eh === 19 && em > 0) || sh < 7;
    const taxiFee = isEvening ? TAXI_FEE * dayCount : 0;
    const totalPrice = RATE * hours * dayCount + taxiFee;

    // Format times for display
    const startLabel = TIME_SLOTS.find(s => s.value === formData.startTime)?.label || formData.startTime;
    const endLabel = TIME_SLOTS.find(s => s.value === formData.endTime)?.label || formData.endTime;

    try {
      await addBooking({
        nannyId: nannyProfile?.id ?? undefined,
        nannyName: nannyProfile?.name ?? "",
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        hotel: formData.hotel,
        date: formData.startDate,
        endDate: formData.endDate || null,
        startTime: startLabel,
        endTime: endLabel,
        plan: "hourly",
        childrenCount: parseInt(formData.numChildren) || 1,
        childrenAges: formData.childrenAges,
        notes: formData.notes,
        totalPrice,
        status: "confirmed",
      });
      setShowForm(false);
      setFormData(emptyForm);
      await fetchNannyBookings();
    } catch {
      // error handled by context
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let result = [...nannyBookings];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.clientName?.toLowerCase().includes(q) ||
          b.hotel?.toLowerCase().includes(q) ||
          b.clientEmail?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }
    result.sort((a, b) =>
      sortOrder === "newest"
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || "")
    );
    return result;
  }, [nannyBookings, search, statusFilter, sortOrder]);

  const pendingCount = nannyBookings.filter((b) => b.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
            {t("nanny.bookings.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {pendingCount > 0
              ? `${pendingCount} ${t("nanny.bookings.pendingReview")}`
              : t("nanny.bookings.viewAllDesc")}
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 gradient-warm text-white text-sm font-medium rounded-lg shadow-warm hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{t("nanny.bookings.newBooking")}</span>
        </button>
      </div>

      {/* New Booking Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-serif text-xl font-bold text-foreground">{t("nanny.bookings.newBooking")}</h2>
              <button onClick={() => { setShowForm(false); setFormData(emptyForm); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleNewBooking} className="p-5 space-y-4">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.clientName")} *</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => handleFormChange("clientName", e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder={t("nanny.bookings.parentPlaceholder")}
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.email")}</label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleFormChange("clientEmail", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder={t("nanny.bookings.emailPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.phone")}</label>
                  <PhoneInput
                    value={formData.clientPhone}
                    onChange={(v) => handleFormChange("clientPhone", v)}
                  />
                </div>
              </div>

              {/* Hotel */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.hotelLocation")}</label>
                <input
                  type="text"
                  value={formData.hotel}
                  onChange={(e) => handleFormChange("hotel", e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder={t("nanny.bookings.hotelPlaceholder")}
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.date")} *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleFormChange("startDate", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.endDate")}</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate}
                    onChange={(e) => handleFormChange("endDate", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              {/* Start / End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.startTime")} *</label>
                  <div className="relative">
                    <select
                      required
                      value={formData.startTime}
                      onChange={(e) => handleFormChange("startTime", e.target.value)}
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
                      value={formData.endTime}
                      onChange={(e) => handleFormChange("endTime", e.target.value)}
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

              {/* Children */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("shared.children")}</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.numChildren}
                    onChange={(e) => handleFormChange("numChildren", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">{t("nanny.bookings.ages")}</label>
                  <input
                    type="text"
                    value={formData.childrenAges}
                    onChange={(e) => handleFormChange("childrenAges", e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    placeholder={t("nanny.bookings.agesPlaceholder")}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">{t("shared.notes")}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  placeholder={t("nanny.bookings.notesPlaceholder")}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormData(emptyForm); }}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  {t("shared.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !formData.clientName || !formData.startDate || !formData.startTime}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 gradient-warm text-white text-sm font-medium rounded-lg shadow-warm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t("nanny.bookings.createBooking")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Shift Banner */}
      {activeShift && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
              <Timer className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-semibold text-green-800">{t("nanny.bookings.activeShift")}</p>
              <p className="text-sm text-green-700">
                {activeShift.clientName} · {activeShift.hotel || t("shared.noHotel")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 px-3 py-1.5 rounded-lg">
              <LiveTimer clockIn={activeShift.clockIn!} />
            </div>
            <button
              onClick={() => handleClockOut(activeShift.id)}
              disabled={actionLoading === activeShift.id}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === activeShift.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              {t("nanny.bookings.endShift")}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("nanny.bookings.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="all">{t("shared.allStatuses")}</option>
          <option value="pending">{t("shared.pending")}</option>
          <option value="confirmed">{t("shared.confirmed")}</option>
          <option value="completed">{t("shared.completed")}</option>
          <option value="cancelled">{t("shared.cancelled")}</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="px-4 py-2.5 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="newest">{t("shared.newestFirst")}</option>
          <option value="oldest">{t("shared.oldestFirst")}</option>
        </select>
      </div>

      {/* Results */}
      <div className="bg-card rounded-xl border border-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{t("nanny.bookings.noBookings")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 font-medium">{t("shared.client")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.date")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.time")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.plan")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.status")}</th>
                    <th className="px-5 py-3 font-medium">{t("nanny.bookings.shift")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((booking) => (
                    <Fragment key={booking.id}>
                      <tr className="border-b border-border hover:bg-muted/30">
                        <td className="px-5 py-3 font-medium text-foreground">
                          {booking.clientName}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {booking.date}{booking.endDate ? ` → ${booking.endDate}` : ""}
                        </td>
                        <td className="px-5 py-3 text-sm text-muted-foreground">
                          {booking.startTime}
                          {booking.endTime ? ` - ${booking.endTime}` : ""}
                        </td>
                        <td className="px-5 py-3 text-sm capitalize">
                          {booking.plan}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                              statusColors[booking.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {/* Clock data */}
                          {booking.clockIn && booking.clockOut ? (
                            <div className="text-xs">
                              <span className="font-medium text-blue-700">
                                {formatHoursWorked(booking.clockIn!, booking.clockOut!)}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                · {calcShiftPay(booking.clockIn!, booking.clockOut!)} MAD
                              </span>
                            </div>
                          ) : booking.clockIn && !booking.clockOut ? (
                            <div className="flex items-center gap-1.5 text-green-700">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                              <LiveTimer clockIn={booking.clockIn!} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Accept/Decline for pending */}
                            {booking.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleAccept(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                  title="Accept booking"
                                >
                                  {actionLoading === booking.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDecline(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                  title="Decline booking"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {/* Start Shift for confirmed bookings today, no active shift elsewhere */}
                            {booking.status === "confirmed" && !booking.clockIn && isToday(booking.date) && !activeShift && (
                              <button
                                onClick={() => handleClockIn(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="Start Shift"
                              >
                                {actionLoading === booking.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="w-3.5 h-3.5" />
                                )}
                                {t("nanny.bookings.startShift")}
                              </button>
                            )}
                            {/* End Shift for active shift */}
                            {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                              <button
                                onClick={() => handleClockOut(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                title="End Shift"
                              >
                                {actionLoading === booking.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <StopCircle className="w-3.5 h-3.5" />
                                )}
                                {t("nanny.bookings.endShift")}
                              </button>
                            )}
                            {/* WhatsApp parent */}
                            {booking.clientPhone && (
                              <button
                                onClick={() =>
                                  openWhatsApp(
                                    booking.clientPhone,
                                    booking.clientName,
                                    booking.date
                                  )
                                }
                                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                title="WhatsApp client"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            {/* Expand */}
                            <button
                              onClick={() =>
                                setExpandedId(
                                  expandedId === booking.id ? null : booking.id
                                )
                              }
                              className="p-1.5 rounded hover:bg-muted/50"
                            >
                              {expandedId === booking.id ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === booking.id && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-5 py-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">{t("shared.email")}</span>
                                <p className="font-medium">{booking.clientEmail}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("shared.phone")}</span>
                                <p className="font-medium">{booking.clientPhone || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("shared.hotel")}</span>
                                <p className="font-medium">{booking.hotel || "—"}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{t("shared.children")}</span>
                                <p className="font-medium">
                                  {booking.childrenCount || 1}
                                  {booking.childrenAges
                                    ? ` (ages: ${booking.childrenAges})`
                                    : ""}
                                </p>
                              </div>
                              {booking.clockIn && (
                                <div>
                                  <span className="text-muted-foreground">{t("nanny.bookings.clockedIn")}</span>
                                  <p className="font-medium">{new Date(booking.clockIn).toLocaleTimeString()}</p>
                                </div>
                              )}
                              {booking.clockOut && (
                                <div>
                                  <span className="text-muted-foreground">{t("nanny.bookings.clockedOut")}</span>
                                  <p className="font-medium">{new Date(booking.clockOut).toLocaleTimeString()}</p>
                                </div>
                              )}
                              {booking.notes && (
                                <div className="col-span-full">
                                  <span className="text-muted-foreground">{t("shared.notes")}</span>
                                  <p className="font-medium">{booking.notes}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((booking) => (
                <div key={booking.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">
                      {booking.clientName}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${
                        statusColors[booking.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      {booking.date}{booking.endDate ? ` → ${booking.endDate}` : ""} · {booking.startTime}
                      {booking.endTime ? ` - ${booking.endTime}` : ""}
                    </div>
                    {booking.hotel && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {booking.hotel}
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="capitalize">{booking.plan}</span>
                    </div>
                  </div>

                  {/* Shift info */}
                  {booking.clockIn && booking.clockOut && (
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                        {formatHoursWorked(booking.clockIn!, booking.clockOut!)}
                      </span>
                      <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-medium">
                        {calcShiftPay(booking.clockIn!, booking.clockOut!)} MAD
                      </span>
                    </div>
                  )}
                  {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-700 text-xs font-medium">{t("nanny.bookings.active")}</span>
                      <LiveTimer clockIn={booking.clockIn!} />
                    </div>
                  )}

                  {/* Action buttons for mobile */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {booking.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAccept(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {actionLoading === booking.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          {t("nanny.bookings.accept")}
                        </button>
                        <button
                          onClick={() => handleDecline(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          {t("nanny.bookings.decline")}
                        </button>
                      </>
                    )}

                    {/* Start Shift for confirmed bookings today */}
                    {booking.status === "confirmed" && !booking.clockIn && isToday(booking.date) && !activeShift && (
                      <button
                        onClick={() => handleClockIn(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4" />
                        )}
                        Start Shift
                      </button>
                    )}

                    {/* End Shift for active shift */}
                    {booking.clockIn && !booking.clockOut && booking.status !== "cancelled" && (
                      <button
                        onClick={() => handleClockOut(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === booking.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <StopCircle className="w-4 h-4" />
                        )}
                        {t("nanny.bookings.endShift")}
                      </button>
                    )}
                  </div>

                  {/* WhatsApp + details toggle */}
                  <div className="flex items-center gap-2 mt-2">
                    {booking.clientPhone && (
                      <button
                        onClick={() =>
                          openWhatsApp(booking.clientPhone, booking.clientName, booking.date)
                        }
                        className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === booking.id ? null : booking.id)
                      }
                      className="text-xs text-accent hover:underline"
                    >
                      {expandedId === booking.id ? t("nanny.bookings.hideDetails") : t("nanny.bookings.showDetails")}
                    </button>
                  </div>

                  {expandedId === booking.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">{t("shared.email")}:</span>{" "}
                        {booking.clientEmail}
                      </p>
                      <p>
                        <span className="text-muted-foreground">{t("shared.phone")}:</span>{" "}
                        {booking.clientPhone || "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">{t("shared.children")}:</span>{" "}
                        {booking.childrenCount || 1}
                        {booking.childrenAges
                          ? ` (ages: ${booking.childrenAges})`
                          : ""}
                      </p>
                      {booking.clockIn && (
                        <p>
                          <span className="text-muted-foreground">{t("nanny.bookings.clockedIn")}:</span>{" "}
                          {new Date(booking.clockIn).toLocaleTimeString()}
                        </p>
                      )}
                      {booking.clockOut && (
                        <p>
                          <span className="text-muted-foreground">{t("nanny.bookings.clockedOut")}:</span>{" "}
                          {new Date(booking.clockOut).toLocaleTimeString()}
                        </p>
                      )}
                      {booking.notes && (
                        <p>
                          <span className="text-muted-foreground">{t("shared.notes")}:</span>{" "}
                          {booking.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
