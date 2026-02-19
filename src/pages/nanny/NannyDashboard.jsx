import { useEffect, useMemo } from "react";
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
} from "lucide-react";
import { useData } from "../../context/DataContext";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Helper: calculate nanny pay for a booking (250 MAD/day + 100 MAD if after 7 PM)
function calcNannyPay(booking) {
  if (booking.status === "cancelled") return 0;
  let pay = 250;
  // Check if evening booking (startTime after 7 PM / 19:00)
  const st = booking.startTime || "";
  const hour = parseInt(st.replace(/[^0-9]/g, "")) || 0;
  const isPM = st.toLowerCase().includes("pm") || st.includes("PM");
  // Handle "7:00 PM", "19:00", "8 PM" etc.
  let hour24 = hour;
  if (isPM && hour < 12) hour24 = hour + 12;
  if (hour24 >= 19) pay += 100;
  return pay;
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
        250 MAD/day · +100 MAD evening (after 7 PM)
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
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border">
          <div className="h-6 w-40 bg-muted rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border-b border-border last:border-0">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-muted rounded" />
              <div className="h-5 w-16 bg-muted rounded-full" />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NannyDashboard() {
  const {
    nannyProfile,
    nannyStats,
    nannyBookings,
    fetchNannyStats,
    fetchNannyBookings,
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
