import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle,
  CalendarDays,
  DollarSign,
  ArrowRight,
  MapPin,
  User,
  TrendingUp,
  Timer,
  Loader2,
  Coffee,
  ChevronLeft,
  ChevronRight,
  Calendar,
  PlusCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useData } from "../../context/DataContext";
import { useLanguage } from "../../context/LanguageContext";
import type { Booking } from "@/types";
import {
  statusColors,
  isToday,
  calcNannyPayBreakdown,
  calcBookedHoursForBooking,
  HOURLY_RATE,
  getSaturdayPeriod,
  isDateInRange,
  toDateStr,
  estimateNannyPayBreakdown,
  calcBookedHours,
  formatPeriodLabel,
} from "@/utils/shiftHelpers";
import ExtendBookingModal from "../../components/ExtendBookingModal";

const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_SHORT_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

interface PayChartProps { bookings: Booking[]; t: (key: string) => string; locale: string }
interface TodayBookingsSectionProps {
  bookings: Booking[];
  updateBookingStatus: (id: number | string, status: string) => Promise<void>;
  fetchNannyBookings: () => Promise<void>;
  t: (key: string) => string;
}

// Simple bar chart for nanny pay with breakdown
function PayChart({ bookings, t, locale }: PayChartProps) {
  const MONTHS = locale === "fr" ? MONTHS_SHORT_FR : MONTHS_SHORT_EN;
  const monthlyPay = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; basePay: number; taxiFee: number; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        label: MONTHS[d.getMonth()],
        basePay: 0,
        taxiFee: 0,
        total: 0,
      });
    }
    bookings.forEach((b) => {
      if (b.status === "cancelled" || !b.date) return;
      const monthKey = b.date.substring(0, 7);
      const month = months.find((m) => m.key === monthKey);
      if (month) {
        const bd = calcNannyPayBreakdown(b);
        month.basePay += bd.basePay;
        month.taxiFee += bd.taxiFee;
        month.total += bd.total;
      }
    });
    return months;
  }, [bookings]);

  const maxVal = Math.max(...monthlyPay.map((m) => m.total), 1);

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t("nanny.dashboard.myPayChart")}
        </h2>
      </div>
      <div className="flex items-end gap-2 h-32">
        {monthlyPay.map((month) => {
          const heightPct = maxVal > 0 ? (month.total / maxVal) * 100 : 0;
          const baseHPct = maxVal > 0 ? (month.basePay / maxVal) * 100 : 0;
          const taxiHPct = maxVal > 0 ? (month.taxiFee / maxVal) * 100 : 0;
          return (
            <div key={month.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium">
                {month.total > 0 ? `${month.total}` : ""}
              </span>
              <div className="w-full flex justify-center">
                <div
                  className="w-full max-w-[32px] flex flex-col-reverse overflow-hidden rounded-t-md"
                  style={{ height: `${Math.max(heightPct, 2)}%`, minHeight: "4px" }}
                >
                  <div className="w-full gradient-warm" style={{ height: baseHPct > 0 ? `${(baseHPct / Math.max(heightPct, 1)) * 100}%` : "100%" }} />
                  {taxiHPct > 0 && (
                    <div className="w-full bg-orange-400" style={{ height: `${(taxiHPct / Math.max(heightPct, 1)) * 100}%` }} />
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{month.label}</span>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm gradient-warm inline-block" />
          <span className="text-[10px] text-muted-foreground">{t("nanny.dashboard.hourlyPay")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-orange-400 inline-block" />
          <span className="text-[10px] text-muted-foreground">{t("nanny.dashboard.taxiFee")}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        {t("nanny.dashboard.payInfo").replace("{rate}", String(Math.round(HOURLY_RATE)))}
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

// ─── Today's Bookings Section ─────────────────────────────────────

function TodayBookingsSection({ bookings, updateBookingStatus, fetchNannyBookings, t }: TodayBookingsSectionProps) {
  const [completeLoading, setCompleteLoading] = useState<number | string | null>(null);

  // Today's bookings (confirmed, not yet completed)
  const todayConfirmed = useMemo(
    () => bookings.filter((b) => b.status === "confirmed" && isToday(b.date)),
    [bookings]
  );

  // Today's completed bookings
  const todayCompleted = useMemo(
    () => bookings.filter((b) => b.status === "completed" && isToday(b.date)),
    [bookings]
  );

  const handleComplete = async (id: number | string) => {
    setCompleteLoading(id);
    await updateBookingStatus(id, "completed");
    await fetchNannyBookings();
    setCompleteLoading(null);
  };

  // ── STATE 1: Today has confirmed bookings — show "Mark Complete" ──
  if (todayConfirmed.length > 0) {
    return (
      <div className="bg-card border-2 border-primary/30 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Timer className="w-5 h-5 text-primary" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
            {t("nanny.dashboard.myShift")}
          </h2>
        </div>

        <div className="space-y-3">
          {todayConfirmed.map((booking) => {
            const hours = calcBookedHours(booking.startTime || "", booking.endTime || "", booking.date, booking.endDate);
            const pay = estimateNannyPayBreakdown(booking.startTime || "", booking.endTime || "", booking.date, booking.endDate);
            return (
              <div key={booking.id} className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground">{booking.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.startTime}{booking.endTime ? ` - ${booking.endTime}` : ""} · {hours.toFixed(1)}h
                      {booking.hotel ? ` · ${booking.hotel}` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    {t("shared.confirmed")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{pay.total} DH</span>
                  <button
                    onClick={() => handleComplete(booking.id)}
                    disabled={completeLoading === booking.id}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-green-600 text-white text-base font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 shadow-lg"
                  >
                    {completeLoading === booking.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                    {t("nanny.dashboard.markComplete") || "Mark Complete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── STATE 2: Today's bookings all completed ──
  if (todayCompleted.length > 0) {
    const todayBreakdown = todayCompleted.reduce(
      (acc, b) => {
        const bd = calcNannyPayBreakdown(b);
        return { basePay: acc.basePay + bd.basePay, taxiFee: acc.taxiFee + bd.taxiFee, total: acc.total + bd.total };
      },
      { basePay: 0, taxiFee: 0, total: 0 }
    );
    const todayHours = todayCompleted.reduce((sum, b) => sum + calcBookedHoursForBooking(b), 0);

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          <h2 className="font-serif text-lg sm:text-xl font-bold text-blue-800">
            {t("nanny.dashboard.shiftCompletedToday")}
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-800">{todayCompleted.length}</p>
            <p className="text-xs text-blue-600">{todayCompleted.length > 1 ? t("nanny.dashboard.shifts") : t("nanny.dashboard.shift")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-800">{todayHours.toFixed(1)}h</p>
            <p className="text-xs text-blue-600">{t("nanny.dashboard.hoursLabel")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-800">{todayBreakdown.total}</p>
            <p className="text-xs text-blue-600">{t("nanny.dashboard.madEarned")}</p>
          </div>
        </div>

        {todayBreakdown.taxiFee > 0 && (
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-blue-700">
            <span>{t("nanny.dashboard.hourlyPay")}: {todayBreakdown.basePay} DH</span>
            <span>{t("nanny.dashboard.taxiFee")}: +{todayBreakdown.taxiFee} DH</span>
          </div>
        )}
      </div>
    );
  }

  // ── STATE 3: No bookings today ──
  return (
    <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-2 mb-2">
        <Timer className="w-5 h-5 text-muted-foreground" />
        <h2 className="font-serif text-lg sm:text-xl font-bold text-foreground">
          {t("nanny.dashboard.myShift")}
        </h2>
      </div>
      <div className="text-center py-6">
        <Coffee className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">{t("nanny.dashboard.noShiftsToday")}</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t("nanny.dashboard.noShiftsHint")}
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
    updateBooking,
    updateBookingStatus,
  } = useData();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const [extendBooking, setExtendBooking] = useState<Booking | null>(null);
  const [completeLoading, setCompleteLoading] = useState<number | string | null>(null);

  const handleComplete = async (id: number | string) => {
    setCompleteLoading(id);
    await updateBookingStatus(id, "completed");
    await fetchNannyBookings();
    setCompleteLoading(null);
  };

  useEffect(() => {
    fetchNannyStats();
    fetchNannyBookings();
  }, [fetchNannyStats, fetchNannyBookings]);

  const upcomingBookings = nannyBookings
    .filter((b) => b.status === "confirmed" || b.status === "pending")
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(0, 5);

  // ── Saturday-to-Saturday cutoff period state ──
  const currentPeriod = useMemo(() => getSaturdayPeriod(), []);
  const [periodStart, setPeriodStart] = useState<Date>(currentPeriod.start);
  const [periodEnd, setPeriodEnd] = useState<Date>(currentPeriod.end);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(toDateStr(currentPeriod.start));
  const [customTo, setCustomTo] = useState(toDateStr(currentPeriod.end));

  const goToPeriod = (dir: -1 | 1) => {
    const newStart = new Date(periodStart);
    newStart.setDate(newStart.getDate() + dir * 7);
    const newEnd = new Date(newStart);
    newEnd.setDate(newStart.getDate() + 7);
    setPeriodStart(newStart);
    setPeriodEnd(newEnd);
    setShowCustom(false);
  };

  const applyCustom = () => {
    const from = new Date(customFrom + "T00:00:00");
    const to = new Date(customTo + "T00:00:00");
    if (from >= to) return;
    setPeriodStart(from);
    setPeriodEnd(to);
    setShowCustom(false);
  };

  const resetToCurrentWeek = () => {
    const p = getSaturdayPeriod();
    setPeriodStart(p.start);
    setPeriodEnd(p.end);
    setShowCustom(false);
  };

  const isCurrentWeek = periodStart.getTime() === currentPeriod.start.getTime() && periodEnd.getTime() === currentPeriod.end.getTime();

  const periodLabel = formatPeriodLabel(periodStart, periodEnd);

  // Calculate hours & pay from booked time for COMPLETED bookings within the period
  const totalActualHours = useMemo(() => {
    return nannyBookings
      .filter((b) => b.status === "completed" && isDateInRange(b.date, periodStart, periodEnd))
      .reduce((sum, b) => sum + calcBookedHoursForBooking(b), 0);
  }, [nannyBookings, periodStart, periodEnd]);

  // Calculate upcoming (confirmed/pending) hours within the period
  const upcomingHours = useMemo(() => {
    return nannyBookings
      .filter((b) => (b.status === "confirmed" || b.status === "pending") && isDateInRange(b.date, periodStart, periodEnd))
      .reduce((sum, b) => sum + calcBookedHoursForBooking(b), 0);
  }, [nannyBookings, periodStart, periodEnd]);

  const totalCombinedHours = Math.round((totalActualHours + upcomingHours) * 10) / 10;

  const payBreakdown = useMemo(() => {
    return nannyBookings
      .filter((b) => b.status === "completed" && isDateInRange(b.date, periodStart, periodEnd))
      .reduce(
        (acc, b) => {
          const bd = calcNannyPayBreakdown(b);
          return { basePay: acc.basePay + bd.basePay, taxiFee: acc.taxiFee + bd.taxiFee, total: acc.total + bd.total };
        },
        { basePay: 0, taxiFee: 0, total: 0 }
      );
  }, [nannyBookings, periodStart, periodEnd]);

  const upcomingPayBreakdown = useMemo(() => {
    return nannyBookings
      .filter((b) => (b.status === "confirmed" || b.status === "pending") && isDateInRange(b.date, periodStart, periodEnd))
      .reduce(
        (acc, b) => {
          const bd = estimateNannyPayBreakdown(b.startTime || "", b.endTime || "", b.date, b.endDate);
          return { basePay: acc.basePay + bd.basePay, taxiFee: acc.taxiFee + bd.taxiFee, total: acc.total + bd.total };
        },
        { basePay: 0, taxiFee: 0, total: 0 }
      );
  }, [nannyBookings, periodStart, periodEnd]);

  const bookedTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return nannyBookings.filter((b) => b.createdAt && b.createdAt.slice(0, 10) === todayStr).length;
  }, [nannyBookings]);

  const isLoading = !nannyStats && nannyBookings.length === 0;

  if (isLoading) return <DashboardSkeleton />;

  const statCards = [
    {
      label: t("nanny.dashboard.bookedToday"),
      value: bookedTodayCount,
      icon: PlusCircle,
      bg: "bg-emerald-50",
      color: "text-emerald-600",
      link: "/nanny/bookings",
    },
    {
      label: t("nanny.dashboard.hoursWorked"),
      value: totalCombinedHours,
      suffix: t("nanny.dashboard.hrs"),
      icon: Clock,
      bg: "bg-primary/10",
      color: "text-primary",
      subtitle: upcomingHours > 0 ? `${parseFloat(totalActualHours.toFixed(1))} done + ${parseFloat(upcomingHours.toFixed(1))} upcoming` : undefined,
    },
    {
      label: t("nanny.dashboard.completedLabel"),
      value: nannyStats?.completedBookings ?? 0,
      icon: CheckCircle,
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: t("nanny.dashboard.upcoming"),
      value: nannyStats?.upcomingBookings ?? 0,
      icon: CalendarDays,
      bg: "bg-accent/10",
      color: "text-accent",
    },
    {
      label: t("nanny.dashboard.myPay"),
      value: payBreakdown.total + upcomingPayBreakdown.total,
      suffix: "DH",
      icon: DollarSign,
      bg: "bg-orange-50",
      color: "text-orange-600",
      subtitle: upcomingPayBreakdown.total > 0 ? `${payBreakdown.total} earned + ${upcomingPayBreakdown.total} upcoming` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground">
          {t("nanny.dashboard.welcomeBack")} {nannyProfile?.name?.split(" ")[0] || ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("nanny.dashboard.scheduleOverview")}
        </p>
      </div>

      {/* ── TODAY'S BOOKINGS ── */}
      <TodayBookingsSection
        bookings={nannyBookings}
        updateBookingStatus={updateBookingStatus}
        fetchNannyBookings={fetchNannyBookings}
        t={t}
      />

      {/* Period Navigator */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => goToPeriod(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[260px] text-center">{periodLabel}</span>
          <button onClick={() => goToPeriod(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={resetToCurrentWeek} className="text-xs text-primary hover:underline ml-1">
              {t("nanny.dashboard.thisWeek") || "This week"}
            </button>
          )}
          <button
            onClick={() => { setShowCustom(!showCustom); setCustomFrom(toDateStr(periodStart)); const ed = new Date(periodEnd); ed.setDate(ed.getDate() - 1); setCustomTo(toDateStr(ed)); }}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            {t("nanny.dashboard.custom") || "Custom"}
          </button>
        </div>

        {showCustom && (
          <div className="flex items-end gap-3 flex-wrap bg-muted/50 rounded-lg p-3">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("nanny.dashboard.from") || "From"}</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("nanny.dashboard.to") || "To"}</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background" />
            </div>
            <button onClick={applyCustom} className="text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg px-4 py-1.5 transition-colors">
              {t("nanny.dashboard.apply") || "Apply"}
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          {t("nanny.dashboard.payPeriodNote") || "Pay period: Friday midnight → Friday midnight"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const cardContent = (
            <>
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
              {stat.subtitle && (
                <p className="text-[10px] text-blue-600 mt-1">{stat.subtitle}</p>
              )}
            </>
          );
          return stat.link ? (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link!)}
              className="bg-card rounded-xl border border-border p-4 sm:p-5 cursor-pointer hover:shadow-soft hover:border-primary/30 transition-all"
            >
              {cardContent}
            </div>
          ) : (
            <div
              key={stat.label}
              className="bg-card rounded-xl border border-border p-4 sm:p-5"
            >
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Pay Breakdown */}
      {(payBreakdown.total > 0 || upcomingPayBreakdown.total > 0) && (
        <div className="space-y-2">
          {payBreakdown.total > 0 && (
            <div className="bg-orange-50/50 border border-orange-200/60 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="font-medium text-foreground">{t("nanny.dashboard.payBreakdown")} ({parseFloat(totalActualHours.toFixed(1))}h completed):</span>
              <span className="text-muted-foreground">
                {t("nanny.dashboard.hourlyPay")}: <span className="font-semibold text-foreground">{payBreakdown.basePay} DH</span>
              </span>
              {payBreakdown.taxiFee > 0 && (
                <span className="text-muted-foreground">
                  {t("nanny.dashboard.taxiFee")}: <span className="font-semibold text-orange-600">+{payBreakdown.taxiFee} DH</span>
                </span>
              )}
            </div>
          )}
          {upcomingPayBreakdown.total > 0 && (
            <div className="bg-blue-50/50 border border-blue-200/60 rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <span className="font-medium text-blue-800">Upcoming ({parseFloat(upcomingHours.toFixed(1))}h scheduled):</span>
              <span className="text-blue-700">
                {t("nanny.dashboard.hourlyPay")}: <span className="font-semibold">{upcomingPayBreakdown.basePay} DH</span>
              </span>
              {upcomingPayBreakdown.taxiFee > 0 && (
                <span className="text-blue-700">
                  {t("nanny.dashboard.taxiFee")}: <span className="font-semibold text-orange-600">+{upcomingPayBreakdown.taxiFee} DH</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pay Chart */}
      <PayChart bookings={nannyBookings} t={t} locale={locale} />

      {/* Upcoming Bookings */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">
            {t("nanny.dashboard.upcomingBookings")}
          </h2>
          <Link
            to="/nanny/bookings"
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t("nanny.dashboard.viewAll")} <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>{t("nanny.dashboard.noUpcoming")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-muted-foreground border-b border-border">
                    <th className="px-5 py-3 font-medium">{t("shared.client")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.date")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.time")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.plan")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.hotel")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.status")}</th>
                    <th className="px-5 py-3 font-medium">{t("shared.actions")}</th>
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
                      <td className="px-5 py-3">
                        {booking.status === "confirmed" && !booking.clockIn && (
                          <button
                            onClick={() => handleComplete(booking.id)}
                            disabled={completeLoading === booking.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            title="Mark as completed"
                          >
                            {completeLoading === booking.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                            )}
                            Complete
                          </button>
                        )}
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
                  {booking.status === "confirmed" && !booking.clockIn && (
                    <button
                      onClick={() => handleComplete(booking.id)}
                      disabled={completeLoading === booking.id}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50 border border-emerald-200"
                    >
                      {completeLoading === booking.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Mark as Complete
                    </button>
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
            <h3 className="font-semibold text-foreground">{t("nanny.dashboard.viewCalendar")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("nanny.dashboard.seeSchedule")}
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
            <h3 className="font-semibold text-foreground">{t("nanny.dashboard.allBookings")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("nanny.dashboard.viewHistory")}
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
        </Link>
      </div>

      {/* Extend Booking Modal */}
      {extendBooking && (
        <ExtendBookingModal
          booking={extendBooking}
          onConfirm={async (newStartTime, newEndTime, newTotalPrice) => {
            await updateBooking(extendBooking.id, { startTime: newStartTime, endTime: newEndTime, totalPrice: newTotalPrice });
            await fetchNannyBookings();
          }}
          onClose={() => setExtendBooking(null)}
          t={t}
        />
      )}
    </div>
  );
}
