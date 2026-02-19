import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  CalendarDays,
  DollarSign,
  ArrowRight,
  MapPin,
  User,
} from "lucide-react";
import { useData } from "../../context/DataContext";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

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
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

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
      label: "Earnings",
      value: nannyStats?.totalEarnings ?? 0,
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
          Here's your schedule overview.
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
                          {booking.hotel || "—"}
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
