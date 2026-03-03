import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock,
  Activity, ArrowRight, Eye, AlertTriangle,
  Banknote, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  format, parseISO, addDays, isToday, formatDistanceToNow,
} from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking, BookingStatus } from "@/types";

// ─── Urgency Badge ───────────────────────────────────────────────

const statusConfig: Record<BookingStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-orange-50 text-orange-700 border border-orange-200" },
  confirmed: { label: "Confirmed", className: "bg-green-50 text-green-700 border border-green-200" },
  completed: { label: "Completed", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border border-red-200" },
};

function DashboardUrgencyBadge({ booking }: { booking: Booking }) {
  const status = statusConfig[booking.status] || statusConfig.pending;
  if (booking.status !== "pending") {
    return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>;
  }
  const hoursElapsed = (Date.now() - new Date(booking.createdAt).getTime()) / 3600000;
  const elapsed = formatDistanceToNow(new Date(booking.createdAt), { addSuffix: true });
  if (hoursElapsed > 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-300 animate-pulse">
        <AlertTriangle className="w-3 h-3" />
        Needs Attention
        <span className="text-[10px] font-normal opacity-70">({elapsed})</span>
      </span>
    );
  }
  if (hoursElapsed > 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-300">
        <Clock className="w-3 h-3" />
        Awaiting
        <span className="text-[10px] font-normal opacity-70">({elapsed})</span>
      </span>
    );
  }
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>{status.label}</span>;
}

// ─── Main Dashboard ──────────────────────────────────────────────

export default function Dashboard() {
  const { bookings, stats, adminProfile, updateBookingStatus } = useData();
  const { toDH } = useExchangeRate();

  const todaysBookings = bookings.filter((b) => { try { return isToday(parseISO(b.date)); } catch { return false; } });
  const todaysBookingsCount = todaysBookings.length;

  // Bookings SCHEDULED for today, sorted by start time
  const recentBookings = [...todaysBookings]
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  // Amount to collect today = confirmed/completed bookings today not yet collected
  const toCollectToday = todaysBookings
    .filter((b) => (b.status === "confirmed" || b.status === "completed") && !b.collectedAt)
    .reduce((s, b) => s + (b.totalPrice || 0), 0);
  const toCollectTodayCount = todaysBookings.filter(
    (b) => (b.status === "confirmed" || b.status === "completed") && !b.collectedAt
  ).length;


  const avgBookingValue = stats.totalBookings > 0
    ? Math.round(stats.totalRevenue / Math.max(bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length, 1))
    : 0;

  // New bookings = bookings created today (any status: pending, confirmed, cancelled)
  const newBookingsToday = useMemo(() => {
    return bookings.filter((b) => {
      try { return isToday(parseISO(b.createdAt)); } catch { return false; }
    });
  }, [bookings]);
  const newBookingsTodayCount = newBookingsToday.length;
  const newBookingsPending = newBookingsToday.filter((b) => b.status === "pending").length;
  const newBookingsConfirmed = newBookingsToday.filter((b) => b.status === "confirmed").length;

  // ── 3-Day Agenda with navigation ──
  const [agendaStart, setAgendaStart] = useState(() => new Date());
  const agendaDays = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    return Array.from({ length: 3 }, (_, i) => {
      const day = addDays(agendaStart, i);
      const dateStr = format(day, "yyyy-MM-dd");
      const dayBookings = bookings
        .filter((b) => b.date === dateStr && b.status !== "cancelled")
        .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
      return { day, dateStr, bookings: dayBookings, isToday: dateStr === todayStr };
    });
  }, [bookings, agendaStart]);

  const agendaStatusDot = (status: string) => {
    switch (status) {
      case "pending":   return "bg-orange-400";
      case "confirmed": return "bg-green-500";
      case "completed": return "bg-blue-500";
      default:          return "bg-gray-400";
    }
  };

  const agendaStatusChip = (status: string) => {
    switch (status) {
      case "pending":   return "border-l-2 border-orange-400 bg-orange-50/80";
      case "confirmed": return "border-l-2 border-green-400 bg-green-50/80";
      case "completed": return "border-l-2 border-blue-400 bg-blue-50/80";
      default:          return "border-l-2 border-gray-300 bg-gray-50/80";
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Welcome back{adminProfile?.name ? `, ${adminProfile.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here is your business overview.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* New Bookings (created today) */}
        <Link to="/admin/bookings" className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm hover:border-purple-300/50 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Activity className="w-5 h-5 text-purple-700" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">{newBookingsPending} pending · {newBookingsConfirmed} confirmed</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{newBookingsTodayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">New Bookings Today</p>
        </Link>

        {/* Pending Bookings */}
        <Link to="/admin/bookings?status=pending" className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm hover:border-orange-300/50 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <Clock className="w-5 h-5 text-orange-700" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Avg Value</p>
              <p className="text-xs font-semibold text-foreground">{avgBookingValue.toLocaleString()}€ <span className="text-[10px] font-normal text-muted-foreground">({toDH(avgBookingValue).toLocaleString()} DH)</span></p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.pendingBookings}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Bookings</p>
        </Link>

        {/* Today's Bookings */}
        <Link to="/admin/bookings" className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm hover:border-accent/30 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <CalendarDays className="w-5 h-5 text-accent" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Pending Today</p>
              <p className="text-xs font-semibold text-foreground">{todaysBookings.filter(b => b.status === "pending").length}</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{todaysBookingsCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Today&apos;s Bookings</p>
        </Link>
      </div>

      {/* ── 3-Day Agenda (calendar-style) ── */}
      <div className="space-y-4">
        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAgendaStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 3); return n; })}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setAgendaStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 3); return n; })}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {format(agendaDays[0].day, "d MMM")} — {format(agendaDays[agendaDays.length - 1].day, "d MMM yyyy")}
            </span>
          </div>
          <button
            onClick={() => setAgendaStart(new Date())}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Today
          </button>
        </div>

        {/* Day columns */}
        <div className="grid grid-cols-3 gap-2">
          {agendaDays.map(({ day, dateStr, bookings: dayBookings, isToday: isDayToday }) => {
            const dayTotal = dayBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);
            return (
              <div key={dateStr} className={`flex flex-col gap-1.5 min-w-0 rounded-xl border p-2 ${isDayToday ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                {/* Day header */}
                <div className={`flex flex-col items-center py-1 rounded-lg ${isDayToday ? "bg-primary text-white" : ""}`}>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${isDayToday ? "text-white/80" : "text-muted-foreground"}`}>
                    {format(day, "EEE")}
                  </span>
                  <span className={`text-base font-bold leading-tight ${isDayToday ? "text-white" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                </div>

                {/* Booking cards */}
                {dayBookings.length === 0 ? (
                  <div className="flex items-center justify-center h-16 text-[10px] text-muted-foreground/40">—</div>
                ) : (
                  dayBookings.map((b) => (
                    <div
                      key={b.id}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] leading-tight ${agendaStatusChip(b.status)}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agendaStatusDot(b.status)}`} />
                        <span className="font-semibold truncate">{b.startTime}–{b.endTime}</span>
                      </div>
                      <div className="truncate font-medium">{b.clientName}</div>
                      <div className="truncate text-[9px] opacity-70">{b.nannyName || "Unassigned"}</div>
                      {b.totalPrice ? <div className="font-semibold mt-0.5">{b.totalPrice}€</div> : null}
                    </div>
                  ))
                )}

                {/* Day footer */}
                {dayBookings.length > 0 && (
                  <div className="text-center text-[10px] text-muted-foreground pt-1 border-t border-border/50 mt-auto">
                    {dayBookings.length} booking{dayBookings.length !== 1 ? "s" : ""} · <span className="font-semibold text-foreground">{dayTotal}€</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> Pending</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Confirmed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" /> Cancelled</span>
        </div>
      </div>


      {/* ── Today's Schedule ── */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Today's Schedule
            {recentBookings.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary">{recentBookings.length}</span>
            )}
          </h2>
          <Link to="/admin/bookings" className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* To Collect Today banner */}
        {toCollectTodayCount > 0 && (
          <div className="flex items-center justify-between gap-4 px-6 py-3 bg-green-50 border-b border-green-100">
            <div className="flex items-center gap-2.5">
              <Banknote className="w-4 h-4 text-green-700 shrink-0" />
              <span className="text-sm font-semibold text-green-800">
                To collect today: {toCollectToday.toLocaleString()}€
                <span className="ml-1 text-xs font-normal text-green-600">({toDH(toCollectToday).toLocaleString()} DH)</span>
              </span>
            </div>
            <span className="text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium">
              {toCollectTodayCount} booking{toCollectTodayCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No bookings scheduled today</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Today's appointments will appear here sorted by start time.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((booking) => {
                    const collected = !!booking.collectedAt;
                    return (
                      <tr key={booking.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-foreground">{booking.clientName || "N/A"}</p>
                          <p className="text-xs text-muted-foreground">{booking.clientEmail || ""}</p>
                        </td>
                        <td className="px-6 py-4">
                          {booking.nannyName ? (
                            <div className="flex items-center gap-2">
                              {booking.nannyImage ? (
                                <img src={booking.nannyImage} alt={booking.nannyName} className="w-7 h-7 rounded-full object-cover border border-border" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {booking.nannyName.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-foreground">{booking.nannyName}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                            {booking.startTime || "—"}{booking.endTime ? `–${booking.endTime}` : ""}
                          </div>
                          {booking.hotel && <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[140px]">📍 {booking.hotel}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-foreground">{(booking.totalPrice || 0).toLocaleString()}€</div>
                          <div className="text-[10px] text-muted-foreground">{toDH(booking.totalPrice || 0).toLocaleString()} DH</div>
                          {collected && <div className="flex items-center gap-1 text-[10px] text-green-600 mt-0.5"><CheckCircle2 className="w-3 h-3" /> Collected</div>}
                        </td>
                        <td className="px-6 py-4">
                          <DashboardUrgencyBadge booking={booking} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.status === "pending" && (
                              <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 px-3 py-1.5 rounded-lg transition-colors">
                                Confirm
                              </button>
                            )}
                            {booking.status === "confirmed" && (
                              <button onClick={() => updateBookingStatus(booking.id, "completed")} className="text-xs font-medium text-blue-700 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                                Complete
                              </button>
                            )}
                            <Link to="/admin/bookings" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {recentBookings.map((booking) => {
                const collected = !!booking.collectedAt;
                return (
                  <div key={booking.id} className="px-5 py-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground text-sm truncate">{booking.clientName || "N/A"}</p>
                      <DashboardUrgencyBadge booking={booking} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {booking.nannyName ? (
                        <div className="flex items-center gap-1">
                          {booking.nannyImage ? (
                            <img src={booking.nannyImage} alt={booking.nannyName} className="w-4 h-4 rounded-full object-cover border border-border" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                              {booking.nannyName.charAt(0)}
                            </div>
                          )}
                          <span className="font-medium text-foreground">{booking.nannyName}</span>
                        </div>
                      ) : (
                        <span className="italic">Unassigned</span>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {booking.startTime || "—"}{booking.endTime ? `–${booking.endTime}` : ""}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-foreground">{(booking.totalPrice || 0).toLocaleString()}€</span>
                      {collected && <span className="text-green-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />Collected</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.status === "pending" && (
                        <button onClick={() => updateBookingStatus(booking.id, "confirmed")} className="text-xs font-medium text-accent bg-accent/10 px-3 py-1.5 rounded-lg">
                          Confirm
                        </button>
                      )}
                      {booking.status === "confirmed" && (
                        <button onClick={() => updateBookingStatus(booking.id, "completed")} className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
