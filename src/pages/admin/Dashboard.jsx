import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  DollarSign,
  ArrowRight,
  Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useData } from "../../context/DataContext";

const statusConfig = {
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

export default function Dashboard() {
  const { bookings, stats, updateBookingStatus } = useData();

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const statCards = [
    {
      label: "Total Bookings",
      value: stats.totalBookings,
      icon: CalendarDays,
      bgClass: "bg-primary/10",
      iconClass: "text-primary",
    },
    {
      label: "Pending",
      value: stats.pendingBookings,
      icon: Clock,
      bgClass: "bg-orange-50",
      iconClass: "text-orange-700",
    },
    {
      label: "Confirmed",
      value: stats.confirmedBookings,
      icon: CheckCircle,
      bgClass: "bg-accent/10",
      iconClass: "text-accent",
    },
    {
      label: "Revenue",
      value: `${stats.totalRevenue.toLocaleString()} MAD`,
      icon: DollarSign,
      bgClass: "bg-secondary",
      iconClass: "text-secondary-foreground",
    },
  ];

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr || "N/A";
    }
  };

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, Admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Here is what is happening with your bookings today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, bgClass, iconClass }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  {label}
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {value}
                </p>
              </div>
              <div
                className={`w-12 h-12 ${bgClass} rounded-xl flex items-center justify-center`}
              >
                <Icon className={`w-6 h-6 ${iconClass}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-card rounded-xl border border-border shadow-soft">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-lg font-semibold text-foreground">
            Recent Bookings
          </h2>
          <Link
            to="/admin/bookings"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              No bookings yet
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Bookings will appear here once clients start booking.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nanny
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recentBookings.map((booking) => {
                    const status = statusConfig[booking.status] || statusConfig.pending;
                    return (
                      <tr
                        key={booking.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-foreground">
                          {booking.clientName || booking.parentName || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {booking.nannyName || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {formatDate(booking.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground capitalize">
                          {booking.plan || "N/A"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {booking.status === "pending" && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(booking.id, "confirmed")
                                }
                                className="text-xs font-medium text-accent hover:text-accent/80 bg-accent/10 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Confirm
                              </button>
                            )}
                            {booking.status === "confirmed" && (
                              <button
                                onClick={() =>
                                  updateBookingStatus(booking.id, "completed")
                                }
                                className="text-xs font-medium text-blue-700 hover:text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Complete
                              </button>
                            )}
                            <Link
                              to="/admin/bookings"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
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
                const status = statusConfig[booking.status] || statusConfig.pending;
                return (
                  <div key={booking.id} className="px-5 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-foreground text-sm">
                        {booking.clientName || booking.parentName || "N/A"}
                      </p>
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Nanny: {booking.nannyName || "N/A"}</span>
                      <span>{formatDate(booking.date)}</span>
                      <span className="capitalize">{booking.plan || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.status === "pending" && (
                        <button
                          onClick={() =>
                            updateBookingStatus(booking.id, "confirmed")
                          }
                          className="text-xs font-medium text-accent bg-accent/10 px-3 py-1.5 rounded-lg"
                        >
                          Confirm
                        </button>
                      )}
                      {booking.status === "confirmed" && (
                        <button
                          onClick={() =>
                            updateBookingStatus(booking.id, "completed")
                          }
                          className="text-xs font-medium text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg"
                        >
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/admin/bookings"
          className="group flex items-center justify-between bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                View All Bookings
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage and track all client bookings
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          to="/admin/nannies"
          className="group flex items-center justify-between bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Manage Nannies
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add, edit, and manage nanny profiles
              </p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
