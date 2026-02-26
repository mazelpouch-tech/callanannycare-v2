import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, DollarSign, Users, Clock,
  CheckCircle, AlertTriangle,
} from "lucide-react";
import { parseISO, isToday } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";

export default function SupervisorDashboard() {
  const { bookings, nannies } = useData();
  const { toDH } = useExchangeRate();

  // Money to collect = confirmed bookings not yet collected
  const moneyToCollect = bookings
    .filter((b) => b.status === "confirmed" && !b.collectedAt)
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Pending bookings
  const pendingBookings = bookings.filter((b) => b.status === "pending");

  // Today's bookings
  const todayBookings = bookings.filter((b) => {
    try { return isToday(parseISO(b.date)); } catch { return false; }
  });

  // Today's collection progress
  const todayToCollect = todayBookings
    .filter((b) => b.status === "confirmed" && !b.collectedAt)
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const todayCollected = bookings.filter((b) => {
    try { return b.collectedAt && isToday(parseISO(b.collectedAt)); } catch { return false; }
  }).reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // Active nannies
  const activeNannies = nannies.filter((n) => n.status === "active" && n.available).length;

  // Overdue collections (booking date has passed, confirmed, not collected)
  const overdueCollections = bookings.filter((b) => {
    if (b.status !== "confirmed" || b.collectedAt) return false;
    try { return parseISO(b.date) < new Date(); } catch { return false; }
  });

  // Upcoming confirmed bookings (next 7 days)
  const upcomingBookings = useMemo(() => {
    const today = new Date();
    const week = new Date(today.getTime() + 7 * 86400000);
    return bookings
      .filter((b) => {
        if (b.status !== "confirmed" && b.status !== "pending") return false;
        try {
          const d = parseISO(b.date);
          return d >= today && d <= week;
        } catch { return false; }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supervisor Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of bookings and collections
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Collection Progress */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayCollected}€ <span className="text-sm font-normal text-muted-foreground">/ {todayToCollect + todayCollected}€</span></p>
          <p className="text-xs text-muted-foreground mt-1">Today's collections</p>
        </div>

        {/* Money to Collect */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            {overdueCollections.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {overdueCollections.length} overdue
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-foreground">{moneyToCollect}€</p>
          <p className="text-xs text-muted-foreground mt-1">
            To collect ({toDH(moneyToCollect)} DH)
          </p>
        </div>

        {/* Today Bookings */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{todayBookings.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Today's bookings</p>
        </div>

        {/* Active Nannies */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{activeNannies}</p>
          <p className="text-xs text-muted-foreground mt-1">Active nannies</p>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Bookings Alert */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Pending Bookings ({pendingBookings.length})
            </h2>
            <Link to="/supervisor/bookings?status=pending" className="text-xs text-violet-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingBookings.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No pending bookings
              </div>
            ) : (
              pendingBookings.slice(0, 5).map((b) => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{b.totalPrice}€</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Upcoming Bookings ({upcomingBookings.length})
            </h2>
            <Link to="/supervisor/bookings" className="text-xs text-violet-600 hover:underline font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {upcomingBookings.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-sm">
                No upcoming bookings
              </div>
            ) : (
              upcomingBookings.map((b) => (
                <div key={b.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    b.status === "confirmed" ? "bg-green-50" : "bg-orange-50"
                  }`}>
                    <CalendarDays className={`w-4 h-4 ${
                      b.status === "confirmed" ? "text-green-600" : "text-orange-600"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{b.totalPrice}€</span>
                    <span className={`block text-[10px] font-medium ${
                      b.status === "confirmed" ? "text-green-600" : "text-orange-600"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
