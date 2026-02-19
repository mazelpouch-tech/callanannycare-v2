import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  CalendarDays,
  DollarSign,
  ArrowRight,
  MapPin,
  User,
  TrendingUp,
  PlayCircle,
  StopCircle,
  Timer,
  Loader2,
  Coffee,
} from "lucide-react";
import { useData } from "../../context/DataContext";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const HOURLY_RATE = 250 / 7; // ~35.71 MAD/hr

// Helper: check if a date string is today
function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr === todayStr;
}

// Helper: format milliseconds to HH:MM:SS
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatHoursWorked(clockIn, clockOut) {
  const ms = new Date(clockOut) - new Date(clockIn);
  const hours = ms / 3600000;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function calcShiftPay(clockIn, clockOut) {
  const ms = new Date(clockOut) - new Date(clockIn);
  const hours = ms / 3600000;
  let pay = Math.round(hours * HOURLY_RATE);
  const inHour = new Date(clockIn).getHours();
  if (inHour >= 19) pay += 100;
  return pay;
}

// Helper: calculate nanny pay for a booking
function calcNannyPay(booking) {
  if (booking.status === "cancelled") return 0;

  if (booking.clockIn && booking.clockOut) {
    const ms = new Date(booking.clockOut) - new Date(booking.clockIn);
    const hours = ms / 3600000;
    let pay = Math.round(hours * HOURLY_RATE);
    const inHour = new Date(booking.clockIn).getHours();
    if (inHour >= 19) pay += 100;
    return pay;
  }

  let pay = 250;
  const st = booking.startTime || "";
  const hour = parseInt(st.replace(/[^0-9]/g, "")) || 0;
  const isPM = st.toLowerCase().includes("pm") || st.includes("PM");
  let hour24 = hour;
  if (isPM && hour < 12) hour24 = hour + 12;
  if (hour24 >= 19) pay += 100;
  return pay;
}

// Live timer component
function LiveTimer({ clockIn, large }) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(clockIn).getTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(clockIn).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [clockIn]);

  return (
    <span className={`font-mono font-bold tabular-nums ${large ? "text-3xl sm:text-4xl" : "text-sm"}`}>
      {formatDuration(elapsed)}
    </span>
  );
}

// Simple bar chart for nanny pay
function PayChart({ bookings }) {
  const monthlyPay = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTHS_SHORT[d.getMonth()],
        total: 0,
      });
    }
    bookings.forEach((b) => {
      if (b.status === "cancelled" || !b.date) return;
      const monthKey = b.date.substring(0, 7);
      const month = months.find((m) => m.key === monthKey);
      if (month) month.total += calcNannyPay(b);
    });
    return months;
  }, [bookings]);

  const maxVal = Math.max(...monthlyPay.map((m) => m.total), 1);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          My Pay (6 months)
        </h2>
      </div>
      <div className="flex items-end gap-2 h-32">
        {monthlyPay.map((month) => {
          const heightPct = maxVal > 0 ? (month.total / maxVal) * 100 : 0;
          return (
            <div key={month.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                {month.total > 0 ? `${month.total}` : ""}
              </span>
              <div className="w-full flex justify-center">
                <div
                  className="w-full max-w-[32px] rounded-t-md gradient-warm transition-all duration-500"
                  style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: "4px" }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{month.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        250 MAD/7h ({Math.round(HOURLY_RATE)} MAD/hr) · +100 MAD evening (after 7 PM)
      </p>
    </div>
  );
}

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-32 bg-muted rounded mt-2" />
      </div>
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="h-16 w-full bg-muted rounded-lg" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="w-9 h-9 bg-muted rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── My Shift Section (prominent, always visible) ────────────────

function MyShiftSection({ bookings, clockInBooking, clockOutBooking, fetchNannyBookings }) {
  const [actionLoading, setActionLoading] = useState(false);

  // Find active shift (clocked in, not clocked out)
  const activeShift = useMemo(
    () => bookings.find((b) => b.clockIn && !b.clockOut && b.status !== "cancelled"),
    [bookings]
  );

  // Today's confirmed bookings (not yet clocked in)
  const todayReadyBookings = useMemo(
    () => bookings.filter((b) => b.status === "confirmed" && !b.clockIn && isToday(b.date)),
    [bookings]
  );

  // Today's completed shifts (has clock data)
  const todayCompleted = useMemo(
    () => bookings.filter((b) => b.clockIn && b.clockOut && isToday(b.date)),
    [bookings]
  );

  const handleStartShift = async (id) => {
    setActionLoading(true);
    await clockInBooking(id);
    await fetchNannyBookings();
    setActionLoading(false);
  };

  const handleEndShift = async (id) => {
    setActionLoading(true);
    await clockOutBooking(id);
    await fetchNannyBookings();
    setActionLoading(false);
  };

  // ── STATE 1: Active shift in progress ──
  if (activeShift) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-green-800">
            Shift in Progress
          </h2>
        </div>

        <div className="text-center py-4">
          <LiveTimer clockIn={activeShift.clockIn} large />
          <p className="text-sm text-green-700 mt-2">
            {activeShift.clientName} · {activeShift.hotel || "No hotel"} · {activeShift.plan}
          </p>
          <p className="text-xs text-green-600 mt-1">
            Started at {new Date(activeShift.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <button
          onClick={() => handleEndShift(activeShift.id)}
          disabled={actionLoading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-4 px-6 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 shadow-lg"
        >
          {actionLoading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <StopCircle className="w-6 h-6" />
          )}
          End Shift
        </button>
      </div>
    );
  }

  // ── STATE 2: Today has confirmed bookings ready to start ──
  if (todayReadyBookings.length > 0) {
    return (
      <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
            My Shift
          </h2>
        </div>

        <div className="space-y-3">
          {todayReadyBookings.map((booking) => (
            <div key={booking.id} className="bg-muted/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{booking.clientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.startTime}{booking.endTime ? ` - ${booking.endTime}` : ""} · {booking.plan}
                    {booking.hotel ? ` · ${booking.hotel}` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                  Confirmed
                </span>
              </div>

              <button
                onClick={() => handleStartShift(booking.id)}
                disabled={actionLoading}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
              >
                {actionLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <PlayCircle className="w-6 h-6" />
                )}
                Start Shift
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STATE 3: Today's shift completed ──
  if (todayCompleted.length > 0) {
    const totalHoursToday = todayCompleted.reduce((sum, b) => {
      const ms = new Date(b.clockOut) - new Date(b.clockIn);
      return sum + ms / 3600000;
    }, 0);
    const totalPayToday = todayCompleted.reduce((sum, b) => sum + calcShiftPay(b.clockIn, b.clockOut), 0);

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-blue-800">
            Shift Completed Today
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-800">{todayCompleted.length}</p>
            <p className="text-xs text-blue-600">Shift{todayCompleted.length > 1 ? "s" : ""}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-800">{formatHoursWorked(todayCompleted[0].clockIn, todayCompleted[todayCompleted.length - 1].clockOut)}</p>
            <p className="text-xs text-blue-600">Hours</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-800">{totalPayToday}</p>
            <p className="text-xs text-blue-600">MAD earned</p>
          </div>
        </div>
      </div>
    );
  }

  // ── STATE 4: No shifts today ──
  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
          My Shift
        </h2>
      </div>
      <div className="text-center py-6">
        <Coffee className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No shifts scheduled today</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          When you have a confirmed booking for today, you can start your shift here.
        </p>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────

export default function NannyDashboard() {
  const {
    nannyProfile,
    nannyStats,
    nannyBookings,
    fetchNannyStats,
    fetchNannyBookings,
    clockInBooking,
    clockOutBooking,
  } = useData();

  useEffect(() => {
    fetchNannyStats();
    fetchNannyBookings();
  }, [fetchNannyStats, fetchNannyBookings]);

  const upcomingBookings = nannyBookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 5);

  const isLoading = !nannyStats && nannyBookings.length === 0;

  if (isLoading) return <DashboardSkeleton />;

  const statCards = [
    {
      label: "Hours Worked",
      value: nannyStats?.totalHoursWorked ?? 0,
      suffix: "hrs",
      icon: Clock,
      bg: "bg-primary/10",
      color: "text-primary",
    },
    {
      label: "Completed",
      value: nannyStats?.completedBookings ?? 0,
      icon: CheckCircle,
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Upcoming",
      value: nannyStats?.upcomingBookings ?? 0,
      icon: CalendarDays,
      bg: "bg-accent/10",
      color: "text-accent",
    },
    {
      label: "My Pay",
      value: nannyBookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + calcNannyPay(b), 0),
      suffix: "MAD",
      icon: DollarSign,
      bg: "bg-orange-50",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          Welcome back, {nannyProfile?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your schedule overview.
        </p>
      </div>

      {/* ── MY SHIFT (prominent, always visible) ── */}
      <MyShiftSection
        bookings={nannyBookings}
        clockInBooking={clockInBooking}
        clockOutBooking={clockOutBooking}
        fetchNannyBookings={fetchNannyBookings}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">
                {stat.value}
                {stat.suffix && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    {stat.suffix}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Pay Chart */}
      <PayChart bookings={nannyBookings} />

      {/* Upcoming Bookings */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">
            Upcoming Bookings
          </h2>
          <Link
            to="/nanny/bookings"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No upcoming bookings</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Plan</th>
                    <th className="px-5 py-3 font-medium">Hotel</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {booking.clientName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {booking.date}
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        {booking.startTime}
                        {booking.endTime ? ` - ${booking.endTime}` : ""}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm capitalize">
                          {booking.plan}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {booking.hotel || "\u2014"}
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {upcomingBookings.map((booking) => (
                <div key={booking.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
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
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>{booking.date}</span>
                    <span>
                      {booking.startTime}
                      {booking.endTime ? ` - ${booking.endTime}` : ""}
                    </span>
                    <span className="capitalize">{booking.plan}</span>
                  </div>
                  {booking.hotel && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5" />
                      {booking.hotel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/nanny/calendar"
          className="bg-card rounded-xl border border-border p-5 hover:shadow-soft transition-shadow flex items-center gap-4"
        >
          <div className="bg-accent/10 w-12 h-12 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">View Calendar</h3>
            <p className="text-sm text-muted-foreground">
              See your full schedule
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
        </Link>

        <Link
          to="/nanny/bookings"
          className="bg-card rounded-xl border border-border p-5 hover:shadow-soft transition-shadow flex items-center gap-4"
        >
          <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">All Bookings</h3>
            <p className="text-sm text-muted-foreground">
              View your booking history
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
        </Link>
      </div>
    </div>
  );
}
