import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, CheckCircle, Clock,
  Phone, Mail, User, Calendar, ChevronDown, ChevronUp,
  Hotel, Search, X,
} from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking } from "@/types";

type ViewTab = "to-collect" | "collected" | "by-nanny" | "by-month";

export default function SupervisorRevenue() {
  const { bookings, nannies } = useData();
  const { toDH } = useExchangeRate();
  const [tab, setTab] = useState<ViewTab>("to-collect");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [nannyFilter, setNannyFilter] = useState("all");

  const now = new Date();

  // Bookings to collect = confirmed (paid by parent, not yet completed)
  const toCollect = useMemo(() => {
    let filtered = bookings.filter((b) => b.status === "confirmed");
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings, nannyFilter, search]);

  // Collected = completed bookings
  const collected = useMemo(() => {
    let filtered = bookings.filter((b) => b.status === "completed");
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [bookings, nannyFilter, search]);

  // Revenue by nanny
  const byNanny = useMemo(() => {
    const map = new Map<number, { nanny: string; confirmed: number; completed: number; total: number; bookings: Booking[] }>();
    bookings.forEach((b) => {
      if (b.status === "cancelled") return;
      const id = b.nannyId || 0;
      if (!map.has(id)) map.set(id, { nanny: b.nannyName, confirmed: 0, completed: 0, total: 0, bookings: [] });
      const entry = map.get(id)!;
      entry.total += b.totalPrice || 0;
      if (b.status === "confirmed") entry.confirmed += b.totalPrice || 0;
      if (b.status === "completed") entry.completed += b.totalPrice || 0;
      entry.bookings.push(b);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [bookings]);

  // Revenue by month (last 6 months)
  const byMonth = useMemo(() => {
    const months: { label: string; start: Date; end: Date; revenue: number; count: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const monthBookings = bookings.filter((b) => {
        if (b.status === "cancelled") return false;
        try { return isWithinInterval(parseISO(b.date), { start, end }); } catch { return false; }
      });
      months.push({
        label: format(d, "MMMM yyyy"),
        start,
        end,
        revenue: monthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
        count: monthBookings.length,
      });
    }
    return months;
  }, [bookings, now]);

  const totalToCollect = toCollect.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalCollected = collected.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalRevenue = bookings
    .filter((b) => b.status !== "cancelled")
    .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  const tabs: { key: ViewTab; label: string }[] = [
    { key: "to-collect", label: "To Collect" },
    { key: "collected", label: "Collected" },
    { key: "by-nanny", label: "By Nanny" },
    { key: "by-month", label: "By Month" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue & Collections</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track money to collect and revenue per nanny
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">To Collect</p>
              <p className="text-xl font-bold text-foreground">{totalToCollect}€</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{toDH(totalToCollect)} DH · {toCollect.length} bookings</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-xl font-bold text-foreground">{totalCollected}€</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{toDH(totalCollected)} DH · {collected.length} bookings</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-xl font-bold text-foreground">{totalRevenue}€</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{toDH(totalRevenue)} DH</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters (for to-collect and collected tabs) */}
      {(tab === "to-collect" || tab === "collected") && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, phone, or hotel..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={nannyFilter}
            onChange={(e) => setNannyFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          >
            <option value="all">All Nannies</option>
            {nannies.filter((n) => n.status === "active").map((n) => (
              <option key={n.id} value={String(n.id)}>{n.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* To Collect Tab */}
      {tab === "to-collect" && (
        <div className="space-y-3">
          {toCollect.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Nothing to collect!</p>
              <p className="text-xs text-muted-foreground mt-1">All confirmed bookings have been collected</p>
            </div>
          ) : (
            toCollect.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl border border-amber-200 overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-amber-700">{b.totalPrice}€</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(b.totalPrice)} DH</p>
                  </div>
                  {expandedId === b.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>

                {expandedId === b.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-amber-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      {/* Parent Contact - prominently displayed */}
                      <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                        <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-3">Parent Contact</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-amber-700" />
                            <span className="text-foreground font-medium">{b.clientName}</span>
                          </div>
                          <a href={`tel:${b.clientPhone}`} className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium">
                            <Phone className="w-4 h-4" />
                            <span>{b.clientPhone || "No phone"}</span>
                          </a>
                          <a href={`mailto:${b.clientEmail}`} className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900">
                            <Mail className="w-4 h-4" />
                            <span>{b.clientEmail}</span>
                          </a>
                          {b.hotel && (
                            <div className="flex items-center gap-2 text-sm">
                              <Hotel className="w-4 h-4 text-amber-700" />
                              <span className="text-foreground">{b.hotel}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Booking Info */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booking Details</h4>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Booking #: </span>
                          <span className="text-foreground font-medium">{b.id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{b.date}{b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{b.startTime} – {b.endTime}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Nanny: </span>
                          <span className="text-foreground font-medium">{b.nannyName}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Plan: </span>
                          <span className="text-foreground capitalize">{b.plan}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {toCollect.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 flex items-center justify-between">
              <p className="text-sm font-medium text-amber-800">
                Total to collect: {toCollect.length} booking{toCollect.length !== 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold text-amber-800">
                {totalToCollect}€ ({toDH(totalToCollect)} DH)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Collected Tab */}
      {tab === "collected" && (
        <div className="space-y-3">
          {collected.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No completed bookings yet</p>
            </div>
          ) : (
            collected.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl border border-green-200 overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{b.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.nannyName} · {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green-700">{b.totalPrice}€</p>
                    <p className="text-[10px] text-muted-foreground">{toDH(b.totalPrice)} DH</p>
                  </div>
                  {expandedId === b.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>

                {expandedId === b.id && (
                  <div className="px-5 pb-5 pt-0 border-t border-green-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Contact</h4>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{b.clientName}</span>
                        </div>
                        <a href={`tel:${b.clientPhone}`} className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{b.clientPhone || "No phone"}</span>
                        </a>
                        <a href={`mailto:${b.clientEmail}`} className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{b.clientEmail}</span>
                        </a>
                        {b.hotel && (
                          <div className="flex items-center gap-2 text-sm">
                            <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{b.hotel}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</h4>
                        <div className="text-sm"><span className="text-muted-foreground">Booking #: </span><span className="font-medium">{b.id}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{b.nannyName}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Date: </span><span>{b.date}</span></div>
                        <div className="text-sm"><span className="text-muted-foreground">Time: </span><span>{b.startTime}–{b.endTime}</span></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {collected.length > 0 && (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-5 flex items-center justify-between">
              <p className="text-sm font-medium text-green-800">
                Total collected: {collected.length} booking{collected.length !== 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold text-green-800">
                {totalCollected}€ ({toDH(totalCollected)} DH)
              </p>
            </div>
          )}
        </div>
      )}

      {/* By Nanny Tab */}
      {tab === "by-nanny" && (
        <div className="space-y-3">
          {byNanny.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-muted-foreground">No revenue data</p>
            </div>
          ) : (
            byNanny.map((entry, idx) => (
              <div key={idx} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                      <span className="text-violet-700 font-bold text-sm">{entry.nanny.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{entry.nanny}</p>
                      <p className="text-xs text-muted-foreground">{entry.bookings.length} bookings</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{entry.total}€</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{entry.confirmed}€</p>
                    <p className="text-[10px] text-amber-600">To Collect</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{entry.completed}€</p>
                    <p className="text-[10px] text-green-600">Collected</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* By Month Tab */}
      {tab === "by-month" && (
        <div className="space-y-3">
          {byMonth.map((month, idx) => (
            <div key={idx} className="bg-card rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{month.label}</p>
                  <p className="text-xs text-muted-foreground">{month.count} bookings</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">{month.revenue}€</p>
                  <p className="text-xs text-muted-foreground">{toDH(month.revenue)} DH</p>
                </div>
              </div>
              {/* Bar */}
              <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${byMonth[0].revenue > 0 ? (month.revenue / byMonth[0].revenue) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
