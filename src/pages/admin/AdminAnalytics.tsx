import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp, Users, CalendarDays, DollarSign,
  ArrowRight, Clock, Star,
} from "lucide-react";
import {
  format, parseISO, startOfMonth, subMonths, endOfMonth, isWithinInterval,
} from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";

// ─── Mini bar (reusable) ────────────────────────────────────────
function Bar({ pct, color = "bg-primary" }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.max(pct, 2)}%` }}
      />
    </div>
  );
}

// ─── Section wrapper ────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-serif text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function AdminAnalytics() {
  const { bookings, nannies } = useData();
  const { toDH } = useExchangeRate();

  const now = new Date();

  // ── Revenue by nanny ─────────────────────────────────────────
  const revenueByNanny = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; shifts: number; avgValue: number }>();
    bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .forEach((b) => {
        const name = b.nannyName || "Unassigned";
        if (!map.has(name)) map.set(name, { name, revenue: 0, shifts: 0, avgValue: 0 });
        const e = map.get(name)!;
        e.revenue += b.totalPrice || 0;
        e.shifts++;
      });
    const arr = Array.from(map.values()).map((e) => ({ ...e, avgValue: e.shifts > 0 ? Math.round(e.revenue / e.shifts) : 0 }));
    arr.sort((a, b) => b.revenue - a.revenue);
    const max = arr[0]?.revenue || 1;
    return arr.map((e) => ({ ...e, pct: Math.round((e.revenue / max) * 100) }));
  }, [bookings]);

  // ── Top clients ──────────────────────────────────────────────
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; email: string; phone: string; spent: number; bookings: number; lastDate: string }>();
    bookings.forEach((b) => {
      const name = b.clientName || "Unknown";
      if (!map.has(name)) map.set(name, { name, email: b.clientEmail || "", phone: b.clientPhone || "", spent: 0, bookings: 0, lastDate: "" });
      const e = map.get(name)!;
      e.spent += b.totalPrice || 0;
      e.bookings++;
      if (!e.lastDate || b.date > e.lastDate) e.lastDate = b.date;
    });
    return Array.from(map.values()).sort((a, b) => b.spent - a.spent).slice(0, 10);
  }, [bookings]);

  // ── Busiest days of week ─────────────────────────────────────
  const dayOfWeekData = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    bookings.forEach((b) => {
      try {
        const d = parseISO(b.date).getDay(); // 0=Sun, 1=Mon...
        const idx = d === 0 ? 6 : d - 1; // Mon=0, Sun=6
        counts[idx]++;
      } catch { /* skip */ }
    });
    const max = Math.max(...counts, 1);
    return days.map((label, i) => ({ label, count: counts[i], pct: Math.round((counts[i] / max) * 100) }));
  }, [bookings]);

  // ── Busiest hours ────────────────────────────────────────────
  const hourData = useMemo(() => {
    const counts = Array.from({ length: 24 }, () => 0);
    bookings.forEach((b) => {
      if (!b.startTime) return;
      const h = parseInt(b.startTime.split(":")[0], 10);
      if (h >= 0 && h < 24) counts[h]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map((count, h) => ({
      hour: h,
      label: h < 12 ? `${h === 0 ? 12 : h}am` : h === 12 ? "12pm" : `${h - 12}pm`,
      count,
      pct: Math.round((count / max) * 100),
    })).filter((d) => d.hour >= 6 && d.hour <= 22); // show 6am–10pm
  }, [bookings]);

  // ── Monthly revenue trend (last 6 months) ───────────────────
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const monthBookings = bookings.filter((b) => {
        try { return isWithinInterval(parseISO(b.date), { start: monthStart, end: monthEnd }); } catch { return false; }
      });
      const revenue = monthBookings
        .filter((b) => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + (b.totalPrice || 0), 0);
      const count = monthBookings.length;
      return { label: format(monthStart, "MMM"), revenue, count };
    });
  }, [bookings]);

  const maxMonthRevenue = Math.max(...monthlyTrend.map((m) => m.revenue), 1);
  const maxMonthCount = Math.max(...monthlyTrend.map((m) => m.count), 1);

  // ── Summary stats ─────────────────────────────────────────────
  const totalRevenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + (b.totalPrice || 0), 0);
  const totalCompleted = bookings.filter((b) => b.status === "completed").length;
  const totalClients = new Set(bookings.map((b) => b.clientName).filter(Boolean)).size;
  const avgBookingValue = totalCompleted > 0 ? Math.round(totalRevenue / totalCompleted) : 0;

  // ── Nanny utilisation ─────────────────────────────────────────
  const nannyUtilisation = useMemo(() => {
    const activeNannies = nannies.filter((n) => n.status === "active");
    return activeNannies.map((n) => {
      const shifts = bookings.filter(
        (b) => b.nannyId === n.id && (b.status === "confirmed" || b.status === "completed")
      ).length;
      return { name: n.name, shifts, location: n.location };
    }).sort((a, b) => b.shifts - a.shifts);
  }, [nannies, bookings]);

  const maxShifts = Math.max(...nannyUtilisation.map((n) => n.shifts), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Business insights across all bookings</p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `${totalRevenue.toLocaleString()}€`, sub: `${toDH(totalRevenue).toLocaleString()} DH`, icon: DollarSign, color: "text-green-700", bg: "bg-green-50" },
          { label: "Total Bookings", value: bookings.length, sub: `${totalCompleted} completed`, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
          { label: "Unique Clients", value: totalClients, sub: `${topClients[0]?.name || "—"} is top client`, icon: Users, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Avg Booking Value", value: `${avgBookingValue}€`, sub: `${toDH(avgBookingValue).toLocaleString()} DH`, icon: Star, color: "text-orange-700", bg: "bg-orange-50" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Trend */}
      <Section title="Monthly Revenue & Bookings" subtitle="Last 6 months">
        <div className="space-y-4">
          {monthlyTrend.map((m) => (
            <div key={m.label} className="grid grid-cols-[40px_1fr_80px] gap-3 items-center">
              <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
              <div className="space-y-1">
                {/* Revenue bar */}
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-green-500 transition-all duration-700"
                    style={{ width: `${Math.max((m.revenue / maxMonthRevenue) * 100, 2)}%` }}
                  />
                </div>
                {/* Booking count bar */}
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-primary/60 transition-all duration-700"
                    style={{ width: `${Math.max((m.count / maxMonthCount) * 100, 2)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">{m.revenue.toLocaleString()}€</p>
                <p className="text-[10px] text-muted-foreground">{m.count} bookings</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 pt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-green-500 inline-block" /> Revenue</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-primary/60 inline-block" /> Bookings</span>
          </div>
        </div>
      </Section>

      {/* Two-column: Days of week + Busiest hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Busiest days */}
        <Section title="Bookings by Day" subtitle="Which days are most popular">
          <div className="space-y-3">
            {dayOfWeekData.map((d) => (
              <div key={d.label} className="flex items-center gap-3">
                <span className="w-8 text-xs font-medium text-muted-foreground">{d.label}</span>
                <div className="flex-1">
                  <Bar pct={d.pct} color="bg-primary" />
                </div>
                <span className="w-8 text-right text-xs font-bold text-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Busiest hours */}
        <Section title="Bookings by Start Time" subtitle="Most common shift start hours">
          <div className="space-y-2.5">
            {hourData.map((d) => (
              <div key={d.hour} className="flex items-center gap-3">
                <span className="w-10 text-xs font-medium text-muted-foreground text-right">{d.label}</span>
                <div className="flex-1">
                  <Bar pct={d.pct} color="bg-blue-500" />
                </div>
                <span className="w-6 text-right text-xs font-bold text-foreground">{d.count}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* Revenue by Nanny */}
      <Section title="Revenue by Nanny" subtitle="Total revenue generated per nanny (confirmed + completed bookings)">
        {revenueByNanny.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        ) : (
          <div className="space-y-4">
            {revenueByNanny.map((e, i) => (
              <div key={e.name} className="flex items-center gap-4">
                <span className="w-5 text-xs font-bold text-muted-foreground text-right">{i + 1}</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{e.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{e.shifts} shift{e.shifts !== 1 ? "s" : ""}</span>
                      <span className="text-sm font-bold text-foreground">{e.revenue.toLocaleString()}€</span>
                    </div>
                  </div>
                  <Bar pct={e.pct} color="bg-orange-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Nanny Utilisation */}
      <Section title="Nanny Utilisation" subtitle="Active nannies ranked by number of confirmed shifts">
        {nannyUtilisation.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No active nannies</p>
        ) : (
          <div className="space-y-3">
            {nannyUtilisation.map((n) => (
              <div key={n.name} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                  {n.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{n.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{n.shifts} shift{n.shifts !== 1 ? "s" : ""}</span>
                  </div>
                  <Bar pct={Math.round((n.shifts / maxShifts) * 100)} color="bg-green-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Top Clients */}
      <Section title="Top Clients" subtitle="Clients ranked by total spend">
        {topClients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No client data yet</p>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto -mx-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["#", "Client", "Bookings", "Total Spent", "Last Booking", ""].map((h) => (
                      <th key={h} className={`px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topClients.map((c, i) => (
                    <tr key={c.name} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-3 text-sm font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{c.bookings}</span>
                          <div className="w-16">
                            <Bar pct={Math.round((c.bookings / (topClients[0]?.bookings || 1)) * 100)} color="bg-blue-400" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-sm font-bold text-foreground">{c.spent.toLocaleString()}€</p>
                        <p className="text-[10px] text-muted-foreground">{toDH(c.spent).toLocaleString()} DH</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-muted-foreground">{c.lastDate || "—"}</td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to={`/admin/bookings`}
                          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 justify-end"
                        >
                          View <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {topClients.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <span className="text-lg font-black text-muted-foreground/30 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.bookings} bookings · Last: {c.lastDate || "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{c.spent.toLocaleString()}€</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(c.spent).toLocaleString()} DH</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Status breakdown */}
      <Section title="Booking Status Breakdown" subtitle="Overall distribution across all bookings">
        {(() => {
          const counts = {
            confirmed: bookings.filter((b) => b.status === "confirmed").length,
            completed: bookings.filter((b) => b.status === "completed").length,
            pending: bookings.filter((b) => b.status === "pending").length,
            cancelled: bookings.filter((b) => b.status === "cancelled").length,
          };
          const total = bookings.length || 1;
          const items = [
            { label: "Completed", count: counts.completed, color: "bg-blue-500", pct: Math.round((counts.completed / total) * 100) },
            { label: "Confirmed", count: counts.confirmed, color: "bg-green-500", pct: Math.round((counts.confirmed / total) * 100) },
            { label: "Pending", count: counts.pending, color: "bg-orange-400", pct: Math.round((counts.pending / total) * 100) },
            { label: "Cancelled", count: counts.cancelled, color: "bg-gray-400", pct: Math.round((counts.cancelled / total) * 100) },
          ];
          return (
            <div className="space-y-3">
              {/* Stacked bar */}
              <div className="flex w-full h-4 rounded-full overflow-hidden gap-0.5">
                {items.map((s) => (
                  <div key={s.label} className={`${s.color} h-full transition-all duration-700`} style={{ width: `${s.pct}%` }} title={`${s.label}: ${s.count}`} />
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {items.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${s.color} shrink-0`} />
                    <div>
                      <p className="text-xs font-semibold text-foreground">{s.count} <span className="font-normal text-muted-foreground">({s.pct}%)</span></p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Section>
    </div>
  );
}
