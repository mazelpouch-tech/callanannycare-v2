import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, Clock, DollarSign,
  ArrowUpRight, ArrowDownRight, Timer,
} from "lucide-react";
import {
  format, parseISO, subMonths, startOfMonth, endOfMonth,
  isWithinInterval, subDays, isAfter, isToday,
} from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking, Nanny } from "@/types";
import { calcShiftPayBreakdown, HOURLY_RATE } from "@/utils/shiftHelpers";

// ─── Mini Sparkline ──────────────────────────────────────────────

function MiniSparkline({ data, width = 80, height = 28, color = "#cd6845" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data || data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - minVal) / range) * (height - 4) - 2,
  }));
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  return (
    <svg width={width} height={height} className="inline-block">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Nanny Hours Report ─────────────────────────────────────────

function NannyHoursReport({ bookings, nannies: _nannies }: { bookings: Booking[]; nannies: Nanny[] }) {
  const nannyHours = useMemo(() => {
    const clockedBookings = bookings.filter((b) => b.clockIn && b.clockOut);
    if (clockedBookings.length === 0) return [];

    const nannyMap: Record<string, { name: string; shifts: number; totalHours: number; basePay: number; taxiFee: number; totalPay: number }> = {};
    clockedBookings.forEach((b) => {
      const nannyId = b.nannyId;
      if (nannyId == null) return;
      const nannyName = b.nannyName || "Unknown";
      if (!nannyMap[nannyId]) {
        nannyMap[nannyId] = { name: nannyName, shifts: 0, totalHours: 0, basePay: 0, taxiFee: 0, totalPay: 0 };
      }
      const ms = new Date(b.clockOut!).getTime() - new Date(b.clockIn!).getTime();
      const hours = ms / 3600000;
      const bd = calcShiftPayBreakdown(b.clockIn!, b.clockOut!);

      nannyMap[nannyId].shifts += 1;
      nannyMap[nannyId].totalHours += hours;
      nannyMap[nannyId].basePay += bd.basePay;
      nannyMap[nannyId].taxiFee += bd.taxiFee;
      nannyMap[nannyId].totalPay += bd.total;
    });

    return Object.values(nannyMap)
      .map((n) => ({ ...n, totalHours: Math.round(n.totalHours * 10) / 10 }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [bookings]);

  const totalAllHours = nannyHours.reduce((s, n) => s + n.totalHours, 0);
  const totalAllBasePay = nannyHours.reduce((s, n) => s + n.basePay, 0);
  const totalAllTaxi = nannyHours.reduce((s, n) => s + n.taxiFee, 0);
  const totalAllPay = nannyHours.reduce((s, n) => s + n.totalPay, 0);
  const totalAllShifts = nannyHours.reduce((s, n) => s + n.shifts, 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-4 h-4 text-primary" />
          Nanny Hours Report
        </h2>
        {nannyHours.length > 0 && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{totalAllShifts} shifts</span>
            <span>{totalAllHours.toFixed(1)} hrs</span>
            <span className="font-semibold text-foreground">{totalAllPay.toLocaleString()} DH</span>
            <span className="text-muted-foreground/70">({totalAllBasePay.toLocaleString()} + {totalAllTaxi} taxi)</span>
          </div>
        )}
      </div>

      {nannyHours.length === 0 && (
        <div className="px-6 py-10 text-center">
          <Timer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No shift data yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Hours will appear here once nannies start using Start Shift / End Shift.
          </p>
        </div>
      )}

      {nannyHours.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shifts</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avg/Shift</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hourly Pay</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxi Fee</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nannyHours.map((nanny, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-foreground">{nanny.name}</p>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{nanny.shifts}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{nanny.totalHours}h</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">
                      {(nanny.totalHours / nanny.shifts).toFixed(1)}h
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground text-right">
                      {nanny.basePay.toLocaleString()} DH
                    </td>
                    <td className="px-6 py-3 text-sm text-right">
                      {nanny.taxiFee > 0 ? (
                        <span className="text-orange-600 font-medium">+{nanny.taxiFee} DH</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-foreground text-right">
                      {nanny.totalPay.toLocaleString()} DH
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-6 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">{totalAllShifts}</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">{totalAllHours.toFixed(1)}h</td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground">
                    {totalAllShifts > 0 ? (totalAllHours / totalAllShifts).toFixed(1) : 0}h
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground text-right">{totalAllBasePay.toLocaleString()} DH</td>
                  <td className="px-6 py-3 text-sm font-bold text-orange-600 text-right">
                    {totalAllTaxi > 0 ? `+${totalAllTaxi.toLocaleString()} DH` : "—"}
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-foreground text-right">{totalAllPay.toLocaleString()} DH</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {nannyHours.map((nanny, i) => (
              <div key={i} className="px-5 py-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground text-sm">{nanny.name}</p>
                  <span className="text-sm font-semibold text-foreground">{nanny.totalPay.toLocaleString()} DH</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{nanny.shifts} shifts</span>
                  <span>{nanny.totalHours}h total</span>
                  <span>{(nanny.totalHours / nanny.shifts).toFixed(1)}h avg</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Hourly: {nanny.basePay} DH</span>
                  {nanny.taxiFee > 0 && (
                    <span className="text-orange-600">Taxi: +{nanny.taxiFee} DH</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 border-t border-border text-[10px] text-muted-foreground">
            Rate: {HOURLY_RATE} DH/hr ({Math.round(HOURLY_RATE * 8)} DH/8h) · +100 DH for evening shifts (7 PM - 7 AM)
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────

export default function Dashboard() {
  const { bookings, nannies, stats, adminProfile } = useData();
  const { toDH } = useExchangeRate();

  // ── Weekly sparkline (last 8 weeks) ──
  const weeklySparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = subDays(now, (7 - i) * 7);
      const weekStart = subDays(weekEnd, 7);
      return bookings.filter((b) => {
        try {
          const d = parseISO(b.date);
          return isAfter(d, weekStart) && !isAfter(d, weekEnd);
        } catch { return false; }
      }).length;
    });
  }, [bookings]);

  const revenueSparkline = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekEnd = subDays(now, (7 - i) * 7);
      const weekStart = subDays(weekEnd, 7);
      return bookings
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .filter((b) => {
          try {
            const d = parseISO(b.date);
            return isAfter(d, weekStart) && !isAfter(d, weekEnd);
          } catch { return false; }
        })
        .reduce((s, b) => s + (b.totalPrice || 0), 0);
    });
  }, [bookings]);

  // ── Trend calculations (this month vs last month) ──
  const trends = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthBookings = bookings.filter((b) => {
      try { return isAfter(parseISO(b.date), thisMonthStart); } catch { return false; }
    });
    const lastMonthBookings = bookings.filter((b) => {
      try { return isWithinInterval(parseISO(b.date), { start: lastMonthStart, end: lastMonthEnd }); } catch { return false; }
    });

    const thisRevenue = thisMonthBookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + (b.totalPrice || 0), 0);
    const lastRevenue = lastMonthBookings.filter((b) => b.status === "confirmed" || b.status === "completed").reduce((s, b) => s + (b.totalPrice || 0), 0);

    const bookingsTrend = lastMonthBookings.length > 0 ? ((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length * 100) : 0;
    const revenueTrend = lastRevenue > 0 ? ((thisRevenue - lastRevenue) / lastRevenue * 100) : 0;

    return { bookingsTrend, revenueTrend };
  }, [bookings]);

  const todaysBookings = bookings.filter((b) => { try { return isToday(parseISO(b.date)); } catch { return false; } });
  const todaysBookingsCount = todaysBookings.length;
  const avgBookingValue = stats.totalBookings > 0
    ? Math.round(stats.totalRevenue / Math.max(bookings.filter((b) => b.status === "confirmed" || b.status === "completed").length, 1))
    : 0;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <Link to="/admin/bookings" className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm hover:border-primary/30 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <MiniSparkline data={weeklySparkline} color="#cd6845" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Total Bookings</p>
            {trends.bookingsTrend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trends.bookingsTrend >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {trends.bookingsTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(Math.round(trends.bookingsTrend))}%
              </span>
            )}
          </div>
        </Link>

        {/* Revenue — links to /admin/revenue */}
        <Link to="/admin/revenue" className="bg-card rounded-xl border border-border p-5 shadow-soft hover:shadow-warm hover:border-green-300/50 transition-all cursor-pointer group">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <DollarSign className="w-5 h-5 text-green-700" />
            </div>
            <MiniSparkline data={revenueSparkline} color="#4a9e6e" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">€</span></p>
          <p className="text-[10px] text-muted-foreground">{toDH(stats.totalRevenue).toLocaleString()} DH</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            {trends.revenueTrend !== 0 && (
              <span className={`flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${trends.revenueTrend >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {trends.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(Math.round(trends.revenueTrend))}%
              </span>
            )}
          </div>
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

      {/* ── Nanny Hours Report ── */}
      <NannyHoursReport bookings={bookings} nannies={nannies} />
    </div>
  );
}
