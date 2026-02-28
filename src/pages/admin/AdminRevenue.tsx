import { useState, useMemo, useCallback } from "react";
import {
  DollarSign, CheckCircle, Clock, TrendingUp,
  Phone, User, Calendar, ChevronDown, ChevronUp,
  Hotel, Search, X, AlertTriangle, MessageCircle,
  ArrowUpRight, ArrowDownRight, Banknote, CreditCard, Wallet,
} from "lucide-react";
import {
  format, parseISO, isWithinInterval,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  startOfYear, endOfYear,
} from "date-fns";
import { useData } from "../../context/DataContext";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import type { Booking } from "@/types";
import { calcShiftPayBreakdown, estimateNannyPayBreakdown, HOURLY_RATE } from "@/utils/shiftHelpers";
import PaymentPanel from "../../components/PaymentPanel";

type ViewTab = "to-collect" | "collected" | "by-nanny";
type FinancialPeriod = "week" | "month" | "year" | "custom";

export default function AdminRevenue() {
  const { bookings, nannies, markAsCollected, adminProfile } = useData();
  const { toDH, rate } = useExchangeRate();

  // ── Tabs & filters ──
  const [tab, setTab] = useState<ViewTab>("to-collect");
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [nannyFilter, setNannyFilter] = useState("all");

  // ── Collection modal ──
  const [collectingBooking, setCollectingBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [collectionNote, setCollectionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Financial period filter ──
  const [financialPeriod, setFinancialPeriod] = useState<FinancialPeriod>("month");
  const [customStart, setCustomStart] = useState<string>(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));

  const now = new Date();

  const isOverdue = useCallback((b: Booking): boolean => {
    try { return parseISO(b.date) < now; } catch { return false; }
  }, [now]);

  // ── Financial summary ──
  const filteredFinancialBookings = useMemo(() => {
    let start: Date;
    let end: Date;
    if (financialPeriod === "week") {
      start = startOfWeek(now, { weekStartsOn: 6 });
      end = endOfWeek(now, { weekStartsOn: 6 });
    } else if (financialPeriod === "month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (financialPeriod === "year") {
      start = startOfYear(now);
      end = endOfYear(now);
    } else {
      try {
        start = parseISO(customStart);
        end = parseISO(customEnd);
        if (end < start) [start, end] = [end, start];
      } catch { return []; }
    }
    return bookings
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .filter((b) => {
        try { return isWithinInterval(parseISO(b.date), { start, end }); } catch { return false; }
      });
  }, [bookings, financialPeriod, customStart, customEnd]);

  const filteredRevenue = useMemo(
    () => filteredFinancialBookings.reduce((s, b) => s + (b.totalPrice || 0), 0),
    [filteredFinancialBookings]
  );
  const filteredExpenseDH = useMemo(() => {
    return filteredFinancialBookings.reduce((sum, b) => {
      if (b.clockIn && b.clockOut) return sum + calcShiftPayBreakdown(b.clockIn, b.clockOut).total;
      return sum + estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate).total;
    }, 0);
  }, [filteredFinancialBookings]);

  const filteredExpenseEUR = rate > 0 ? Math.round(filteredExpenseDH / rate) : 0;
  const filteredNetIncomeEUR = filteredRevenue - filteredExpenseEUR;

  // ── Collection lists ──
  const toCollect = useMemo(() => {
    let filtered = bookings.filter((b) => b.status === "confirmed" && !b.collectedAt);
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const aOv = isOverdue(a) ? 0 : 1;
      const bOv = isOverdue(b) ? 0 : 1;
      if (aOv !== bOv) return aOv - bOv;
      return a.date.localeCompare(b.date);
    });
  }, [bookings, nannyFilter, search, isOverdue]);

  const collected = useMemo(() => {
    let filtered = bookings.filter((b) => !!b.collectedAt);
    if (nannyFilter !== "all") filtered = filtered.filter((b) => String(b.nannyId) === nannyFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (b) => b.clientName?.toLowerCase().includes(q) || b.clientPhone?.toLowerCase().includes(q) || b.hotel?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => (b.collectedAt || "").localeCompare(a.collectedAt || ""));
  }, [bookings, nannyFilter, search]);

  const byNanny = useMemo(() => {
    const map = new Map<number, { nanny: string; toCollect: number; collected: number; toCollectCount: number; collectedCount: number }>();
    bookings.forEach((b) => {
      if (b.status === "cancelled" || b.status === "pending") return;
      const id = b.nannyId || 0;
      if (!map.has(id)) map.set(id, { nanny: b.nannyName, toCollect: 0, collected: 0, toCollectCount: 0, collectedCount: 0 });
      const entry = map.get(id)!;
      if (b.collectedAt) { entry.collected += b.totalPrice || 0; entry.collectedCount++; }
      else if (b.status === "confirmed") { entry.toCollect += b.totalPrice || 0; entry.toCollectCount++; }
    });
    return Array.from(map.values())
      .filter((e) => e.toCollect > 0 || e.collected > 0)
      .sort((a, b) => b.toCollect - a.toCollect);
  }, [bookings]);

  const totalToCollect = toCollect.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const totalCollected = collected.reduce((s, b) => s + (b.totalPrice || 0), 0);
  const overdueCount = toCollect.filter(isOverdue).length;

  const tabs: { key: ViewTab; label: string; count: number; overdue?: number }[] = [
    { key: "to-collect", label: "To Collect", count: toCollect.length, overdue: overdueCount },
    { key: "collected",  label: "Collected",  count: collected.length },
    { key: "by-nanny",   label: "By Nanny",   count: byNanny.length },
  ];

  const handleCollect = async () => {
    if (!collectingBooking) return;
    setIsSubmitting(true);
    try {
      await markAsCollected(collectingBooking.id, {
        collectedBy: adminProfile?.name || "Admin",
        paymentMethod,
        collectionNote: collectionNote.trim() || undefined,
      });
      setCollectingBooking(null);
      setPaymentMethod("cash");
      setCollectionNote("");
    } catch (err) {
      console.error("Collection failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/\s+/g, "")}`, "_blank");
  };

  // ── Booking row card ──
  const BookingCard = ({ b, variant }: { b: Booking; variant: "pending" | "collected" }) => {
    const overdue = variant === "pending" && isOverdue(b);
    const isOpen  = expandedId === b.id;

    return (
      <div className={`bg-card rounded-2xl border overflow-hidden transition-shadow ${
        overdue       ? "border-red-300"   :
        variant === "pending" ? "border-amber-200" :
        "border-green-200"
      } ${isOpen ? "shadow-md" : ""}`}>

        {/* ── Summary row — always visible ── */}
        <button
          className="w-full px-4 py-4 flex items-center gap-3 hover:bg-muted/20 transition-colors text-left"
          onClick={() => setExpandedId(isOpen ? null : b.id)}
        >
          {/* Icon */}
          <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center ${
            overdue ? "bg-red-50" : variant === "pending" ? "bg-amber-50" : "bg-green-50"
          }`}>
            {overdue
              ? <AlertTriangle className="w-4 h-4 text-red-600" />
              : variant === "pending"
              ? <DollarSign className="w-4 h-4 text-amber-600" />
              : <CheckCircle className="w-4 h-4 text-green-600" />
            }
          </div>

          {/* Client + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">{b.clientName}</span>
              {overdue && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 shrink-0">Overdue</span>
              )}
              {variant === "collected" && b.paymentMethod && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">{b.paymentMethod}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {b.nannyName} · {b.date}{b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""} · {b.startTime}–{b.endTime}
            </p>
          </div>

          {/* Amount in EUR + DH */}
          <div className="text-right shrink-0">
            <p className={`text-base font-bold ${
              overdue ? "text-red-700" : variant === "pending" ? "text-amber-700" : "text-green-700"
            }`}>{b.totalPrice}€</p>
            <p className="text-[10px] text-muted-foreground">{toDH(b.totalPrice)} DH</p>
          </div>

          {/* Chevron */}
          <div className="shrink-0 text-muted-foreground ml-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {/* ── Expanded panel ── */}
        {isOpen && (
          <div className={`border-t px-4 pb-5 pt-4 space-y-4 ${
            overdue ? "border-red-200 bg-red-50/20" : variant === "pending" ? "border-amber-100 bg-amber-50/10" : "border-green-200 bg-green-50/10"
          }`}>

            {/* Contact + booking details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {/* Contact */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Parent Contact</p>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground">{b.clientName}</span>
                </div>
                {b.clientPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${b.clientPhone}`} className="text-primary hover:underline">{b.clientPhone}</a>
                    <button
                      onClick={(e) => { e.stopPropagation(); openWhatsApp(b.clientPhone); }}
                      className="p-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                      title="WhatsApp"
                    >
                      <MessageCircle className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {b.hotel && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Hotel className="w-3.5 h-3.5 shrink-0" />
                    <span>{b.hotel}</span>
                  </div>
                )}
              </div>

              {/* Booking details */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Booking</p>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{b.date}{b.endDate && b.endDate !== b.date ? ` → ${b.endDate}` : ""}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{b.startTime} – {b.endTime}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Nanny:</span>
                  <span className="font-medium text-foreground">{b.nannyName}</span>
                </div>
                {variant === "collected" && b.collectedAt && (
                  <div className="text-xs text-green-700 bg-green-100 rounded-lg px-2 py-1">
                    Collected {(() => {
                      try {
                        return parseISO(b.collectedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                      } catch { return b.collectedAt; }
                    })()}
                    {b.collectedBy ? ` by ${b.collectedBy}` : ""}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Tracking (PaymentPanel) */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Payment Records</p>
              <PaymentPanel booking={b} />
            </div>

            {/* Mark as Collected button — only on pending */}
            {variant === "pending" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollectingBooking(b);
                  setPaymentMethod("cash");
                  setCollectionNote("");
                }}
                className={`w-full py-3 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                  overdue
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Collected — {b.totalPrice}€ ({toDH(b.totalPrice)} DH)
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">Revenue</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial summary &amp; payment collections</p>
      </div>

      {/* ── Financial Summary ── */}
      <div className="bg-card rounded-xl border border-border shadow-soft p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-serif text-base font-semibold text-foreground">Financial Summary</h3>
          </div>
          <div className="flex flex-col gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border">
              {(["week", "month", "year", "custom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setFinancialPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    financialPeriod === p
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "week" ? "Weekly" : p === "month" ? "Monthly" : p === "year" ? "Annually" : "Custom"}
                </button>
              ))}
            </div>
            {financialPeriod === "custom" && (
              <div className="flex items-center gap-2">
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                <span className="text-xs text-muted-foreground">→</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
          </div>
        </div>

        {filteredRevenue > 0 || filteredExpenseDH > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-800">Revenue</p>
                  <p className="text-[10px] text-green-600/70">From clients</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-800">{filteredRevenue.toLocaleString()}€</p>
                <p className="text-[10px] text-green-600/70">{toDH(filteredRevenue).toLocaleString()} DH</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-orange-700" />
                </div>
                <div>
                  <p className="text-xs font-medium text-orange-800">Expense</p>
                  <p className="text-[10px] text-orange-600/70">Nanny pay ({HOURLY_RATE} DH/hr)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-orange-800">{filteredExpenseEUR.toLocaleString()}€</p>
                <p className="text-[10px] text-orange-600/70">{filteredExpenseDH.toLocaleString()} DH</p>
              </div>
            </div>

            <div className={`flex items-center justify-between p-3 rounded-lg border ${filteredNetIncomeEUR >= 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${filteredNetIncomeEUR >= 0 ? "bg-blue-100" : "bg-red-100"}`}>
                  <DollarSign className={`w-4 h-4 ${filteredNetIncomeEUR >= 0 ? "text-blue-700" : "text-red-700"}`} />
                </div>
                <div>
                  <p className={`text-xs font-medium ${filteredNetIncomeEUR >= 0 ? "text-blue-800" : "text-red-800"}`}>Net Income</p>
                  <p className={`text-[10px] ${filteredNetIncomeEUR >= 0 ? "text-blue-600/70" : "text-red-600/70"}`}>Revenue − Expenses</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${filteredNetIncomeEUR >= 0 ? "text-blue-800" : "text-red-800"}`}>{filteredNetIncomeEUR.toLocaleString()}€</p>
                <p className={`text-[10px] ${filteredNetIncomeEUR >= 0 ? "text-blue-600/70" : "text-red-600/70"}`}>{(toDH(filteredRevenue) - filteredExpenseDH).toLocaleString()} DH</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground">No financial data for this period</div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-2xl border p-4 ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${overdueCount > 0 ? "text-red-600" : "text-amber-600"}`} />
            <span className={`text-xs font-medium ${overdueCount > 0 ? "text-red-700" : "text-amber-700"}`}>To Collect</span>
            {overdueCount > 0 && (
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">{overdueCount} overdue</span>
            )}
          </div>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>{totalToCollect}€</p>
          <p className={`text-xs mt-0.5 ${overdueCount > 0 ? "text-red-600/70" : "text-amber-600/70"}`}>{toDH(totalToCollect)} DH · {toCollect.length} bookings</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Collected</span>
          </div>
          <p className="text-2xl font-bold text-green-800">{totalCollected}€</p>
          <p className="text-xs text-green-600/70 mt-0.5">{toDH(totalCollected)} DH · {collected.length} bookings</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setExpandedId(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ${
                t.key === "to-collect" && (t.overdue ?? 0) > 0 ? "bg-red-500 text-white" :
                t.key === "to-collect" ? "bg-amber-400 text-white" :
                t.key === "collected" ? "bg-green-500 text-white" :
                "bg-primary/20 text-primary"
              }`}>
                {t.key === "to-collect" && (t.overdue ?? 0) > 0 ? t.overdue : t.count > 9 ? "9+" : t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      {(tab === "to-collect" || tab === "collected") && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client, phone, or hotel..."
              className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select value={nannyFilter} onChange={(e) => setNannyFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="all">All Nannies</option>
            {nannies.filter((n) => n.status === "active").map((n) => (
              <option key={n.id} value={String(n.id)}>{n.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── To Collect Tab ── */}
      {tab === "to-collect" && (
        <div className="space-y-3">
          {toCollect.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No pending collections</p>
            </div>
          ) : (
            <>
              {toCollect.map((b) => <BookingCard key={b.id} b={b} variant="pending" />)}
              <div className={`rounded-2xl border p-4 flex items-center justify-between ${overdueCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
                <p className={`text-sm font-medium ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
                  {toCollect.length} booking{toCollect.length !== 1 ? "s" : ""}
                  {overdueCount > 0 && ` · ${overdueCount} overdue`}
                </p>
                <p className={`text-lg font-bold ${overdueCount > 0 ? "text-red-800" : "text-amber-800"}`}>
                  {totalToCollect}€ <span className="text-xs font-normal opacity-70">({toDH(totalToCollect)} DH)</span>
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Collected Tab ── */}
      {tab === "collected" && (
        <div className="space-y-3">
          {collected.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">No collections yet</p>
            </div>
          ) : (
            <>
              {collected.map((b) => <BookingCard key={b.id} b={b} variant="collected" />)}
              <div className="bg-green-50 rounded-2xl border border-green-200 p-4 flex items-center justify-between">
                <p className="text-sm font-medium text-green-800">{collected.length} booking{collected.length !== 1 ? "s" : ""} collected</p>
                <p className="text-lg font-bold text-green-800">{totalCollected}€ <span className="text-xs font-normal opacity-70">({toDH(totalCollected)} DH)</span></p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── By Nanny Tab ── */}
      {tab === "by-nanny" && (
        <div className="space-y-3">
          {byNanny.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center">
              <p className="text-muted-foreground">No collection data yet</p>
            </div>
          ) : (
            byNanny.map((entry, idx) => (
              <div key={idx} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{entry.nanny.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{entry.nanny}</p>
                    <p className="text-xs text-muted-foreground">{entry.toCollectCount + entry.collectedCount} bookings</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                    <p className="text-lg font-bold text-amber-700">{entry.toCollect}€</p>
                    <p className="text-[10px] text-amber-600">{entry.toCollectCount} to collect</p>
                  </div>
                  <div className="flex-1 bg-green-50 rounded-xl p-3 text-center border border-green-100">
                    <p className="text-lg font-bold text-green-700">{entry.collected}€</p>
                    <p className="text-[10px] text-green-600">{entry.collectedCount} collected</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Mark as Collected Modal ── */}
      {collectingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => !isSubmitting && setCollectingBooking(null)} />
          <div className="relative bg-card rounded-t-3xl sm:rounded-2xl border border-border w-full sm:max-w-md mx-auto shadow-xl z-10 max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Confirm Collection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{collectingBooking.clientName} · {collectingBooking.date}</p>
              </div>
              <button
                onClick={() => !isSubmitting && setCollectingBooking(null)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Amount highlight */}
              <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                <p className="text-3xl font-bold text-green-700">{collectingBooking.totalPrice}€</p>
                <p className="text-sm text-green-600 mt-1">{toDH(collectingBooking.totalPrice)} DH</p>
              </div>

              {/* Booking summary */}
              <div className="space-y-1 text-sm bg-muted/30 rounded-xl px-4 py-3">
                <div><span className="text-muted-foreground">Nanny: </span><span className="font-medium">{collectingBooking.nannyName}</span></div>
                <div><span className="text-muted-foreground">Date: </span><span>{collectingBooking.date} · {collectingBooking.startTime}–{collectingBooking.endTime}</span></div>
                {collectingBooking.hotel && (
                  <div><span className="text-muted-foreground">Hotel: </span><span>{collectingBooking.hotel}</span></div>
                )}
              </div>

              {/* Payment method */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "cash",  label: "Cash",     Icon: Banknote  },
                    { value: "bank",  label: "Transfer", Icon: CreditCard },
                    { value: "card",  label: "Card / Tap", Icon: Wallet  },
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      onClick={() => setPaymentMethod(value)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                        paymentMethod === value
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-border bg-card text-muted-foreground hover:border-green-300"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
                <textarea
                  value={collectionNote}
                  onChange={(e) => setCollectionNote(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="px-6 pb-6 pt-2 flex gap-3">
              <button
                onClick={() => !isSubmitting && setCollectingBooking(null)}
                disabled={isSubmitting}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={isSubmitting}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Collection
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
