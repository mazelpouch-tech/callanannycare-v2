import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Search,
  MapPin,
  X,
  Save,
  Send,
  ShieldBan,
  ShieldCheck,
  Link2,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  DollarSign,
  Eye,
  Download,
  FileText,
  Timer,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import ImageUpload from "../../components/ImageUpload";
import { useData } from "../../context/DataContext";
import PhoneInput from "../../components/PhoneInput";
import type { Nanny, NannyStatus, Booking } from "@/types";
import { exportPayrollExcel } from "@/utils/exportPayroll";
import {
  startOfWeek, startOfMonth, endOfMonth,
  subMonths, format as fmtDate, format,
} from "date-fns";
import {
  calcNannyPayBreakdown,
  estimateNannyPayBreakdown,
  calcBookedHours,
  calcActualHoursWorked,
  HOURLY_RATE,
  getSaturdayPeriod,
  isDateInRange,
  toDateStr,
  formatPeriodLabel,
} from "@/utils/shiftHelpers";

// ─── Nanny Hours Report with Mark-as-Paid ─────────────────────────

interface NannyPaymentRecord {
  id: number;
  nanny_id: number;
  period_start: string;
  period_end: string;
  amount: number;
  paid_by: string;
  created_at: string;
}

function NannyHoursReport({ bookings }: { bookings: Booking[] }) {
  const { adminProfile } = useData();
  const currentPeriod = getSaturdayPeriod();
  const [periodStart, setPeriodStart] = useState<Date>(currentPeriod.start);
  const [periodEnd, setPeriodEnd] = useState<Date>(currentPeriod.end);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState(toDateStr(currentPeriod.start));
  const [customTo, setCustomTo] = useState(toDateStr(currentPeriod.end));

  // Payment tracking
  const [paidNannyIds, setPaidNannyIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [expandedMismatch, setExpandedMismatch] = useState<number | null>(null);

  const periodKey = `${toDateStr(periodStart)}|${toDateStr(periodEnd)}`;

  // Fetch existing payments for this period
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/nannies?action=payments&period_start=${toDateStr(periodStart)}&period_end=${toDateStr(periodEnd)}`);
        if (res.ok) {
          const data = await res.json() as NannyPaymentRecord[];
          setPaidNannyIds(new Set(data.map((p) => p.nanny_id)));
        }
      } catch { /* ignore */ }
    };
    fetchPayments();
    setSelectedIds(new Set());
  }, [periodKey]);

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

  const nannyHours = useMemo(() => {
    const completedBookings = bookings.filter(
      (b) => b.status === "completed" && b.startTime && b.endTime && isDateInRange(b.date, periodStart, periodEnd)
    );
    if (completedBookings.length === 0) return [];

    const nannyMap: Record<number, { nannyId: number; name: string; shifts: number; totalHours: number; actualHours: number; clockedShifts: number; basePay: number; taxiFee: number; totalPay: number }> = {};
    completedBookings.forEach((b) => {
      const nannyId = b.nannyId;
      if (nannyId == null) return;
      const nannyName = b.nannyName || "Unknown";
      if (!nannyMap[nannyId]) {
        nannyMap[nannyId] = { nannyId, name: nannyName, shifts: 0, totalHours: 0, actualHours: 0, clockedShifts: 0, basePay: 0, taxiFee: 0, totalPay: 0 };
      }
      const hours = calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);
      const bd = estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate);

      nannyMap[nannyId].shifts += 1;
      nannyMap[nannyId].totalHours += hours;
      nannyMap[nannyId].basePay += bd.basePay;
      nannyMap[nannyId].taxiFee += bd.taxiFee;
      nannyMap[nannyId].totalPay += bd.total;

      // Track actual hours: use clock data when available, otherwise assume booked hours
      if (b.clockIn && b.clockOut) {
        nannyMap[nannyId].actualHours += calcActualHoursWorked(b.clockIn, b.clockOut);
      } else {
        nannyMap[nannyId].actualHours += hours;
      }
      nannyMap[nannyId].clockedShifts += 1;
    });

    return Object.values(nannyMap)
      .map((n) => ({ ...n, totalHours: Math.round(n.totalHours * 10) / 10, actualHours: Math.round(n.actualHours * 10) / 10 }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [bookings, periodStart, periodEnd]);

  // Per-booking mismatch details: find which specific bookings cause hours discrepancies
  const bookingMismatches = useMemo(() => {
    const completedBookings = bookings.filter(
      (b) => b.status === "completed" && b.startTime && b.endTime && b.clockIn && b.clockOut && isDateInRange(b.date, periodStart, periodEnd)
    );
    const result: Record<number, Array<{ id: number; date: string; clientName: string; startTime: string; endTime: string; booked: number; actual: number; diff: number; clockIn: string; clockOut: string }>> = {};
    completedBookings.forEach((b) => {
      const nannyId = b.nannyId;
      if (nannyId == null) return;
      const booked = Math.round(calcBookedHours(b.startTime, b.endTime, b.date, b.endDate) * 10) / 10;
      const actual = Math.round(calcActualHoursWorked(b.clockIn!, b.clockOut!) * 10) / 10;
      const diff = Math.round((actual - booked) * 10) / 10;
      if (Math.abs(diff) >= 0.1) {
        if (!result[nannyId]) result[nannyId] = [];
        result[nannyId].push({
          id: b.id,
          date: b.date,
          clientName: b.clientName || "Unknown",
          startTime: b.startTime,
          endTime: b.endTime,
          booked,
          actual,
          diff,
          clockIn: b.clockIn!,
          clockOut: b.clockOut!,
        });
      }
    });
    return result;
  }, [bookings, periodStart, periodEnd]);

  const totalAllHours = nannyHours.reduce((s, n) => s + n.totalHours, 0);
  const totalAllActual = nannyHours.reduce((s, n) => s + n.actualHours, 0);
  const totalAllBasePay = nannyHours.reduce((s, n) => s + n.basePay, 0);
  const totalAllTaxi = nannyHours.reduce((s, n) => s + n.taxiFee, 0);
  const totalAllPay = nannyHours.reduce((s, n) => s + n.totalPay, 0);
  const totalAllShifts = nannyHours.reduce((s, n) => s + n.shifts, 0);

  // Unpaid nannies (have hours but not paid)
  const unpaidNannies = nannyHours.filter((n) => !paidNannyIds.has(n.nannyId));
  const allPaid = nannyHours.length > 0 && unpaidNannies.length === 0;

  const toggleSelect = (nannyId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nannyId)) next.delete(nannyId);
      else next.add(nannyId);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    if (selectedIds.size === unpaidNannies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unpaidNannies.map((n) => n.nannyId)));
    }
  };

  const markSelectedPaid = async () => {
    if (selectedIds.size === 0) return;
    setPayLoading(true);
    setPayError("");
    try {
      const payments = nannyHours
        .filter((n) => selectedIds.has(n.nannyId))
        .map((n) => ({
          nannyId: n.nannyId,
          periodStart: toDateStr(periodStart),
          periodEnd: toDateStr(periodEnd),
          amount: n.totalPay,
          paidBy: adminProfile?.name || "Admin",
        }));
      const res = await fetch("/api/nannies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "record_payments", payments }),
      });
      if (res.ok) {
        setPaidNannyIds((prev) => {
          const next = new Set(prev);
          selectedIds.forEach((id) => next.add(id));
          return next;
        });
        setSelectedIds(new Set());
      } else {
        const data = await res.json().catch(() => ({}));
        setPayError(data.error || "Failed to save payment. Please try again.");
      }
    } catch {
      setPayError("Network error. Please check your connection.");
    }
    setPayLoading(false);
  };

  const undoPaid = async (nannyId: number) => {
    setPayError("");
    try {
      const res = await fetch("/api/nannies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "undo_payments",
          nannyIds: [nannyId],
          periodStart: toDateStr(periodStart),
          periodEnd: toDateStr(periodEnd),
        }),
      });
      if (res.ok) {
        setPaidNannyIds((prev) => {
          const next = new Set(prev);
          next.delete(nannyId);
          return next;
        });
      } else {
        setPayError("Failed to undo payment.");
      }
    } catch {
      setPayError("Network error.");
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-soft">
      {/* Header with period navigation */}
      <div className="px-6 py-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-semibold text-foreground flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            Nanny Hours &amp; Pay
          </h2>
          {nannyHours.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
              <span>{totalAllShifts} shifts</span>
              <span>{totalAllHours.toFixed(1)} hrs</span>
              <span className="font-semibold text-foreground">{totalAllPay.toLocaleString()} DH</span>
              {allPaid && <span className="text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />All Paid</span>}
            </div>
          )}
        </div>

        {/* Period navigation row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => goToPeriod(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-[280px] text-center">{periodLabel}</span>
          <button onClick={() => goToPeriod(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Next week">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={resetToCurrentWeek} className="text-xs text-primary hover:underline ml-1">
              This week
            </button>
          )}
          <button
            onClick={() => { setShowCustom(!showCustom); setCustomFrom(toDateStr(periodStart)); const ed = new Date(periodEnd); ed.setDate(ed.getDate() - 1); setCustomTo(toDateStr(ed)); }}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            Custom
          </button>
        </div>

        {/* Custom date picker */}
        {showCustom && (
          <div className="flex items-end gap-3 flex-wrap bg-muted/50 rounded-lg p-3">
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">From</label>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background" />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground uppercase tracking-wider mb-1">To</label>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background" />
            </div>
            <button onClick={applyCustom} className="text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg px-4 py-1.5 transition-colors">
              Apply
            </button>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          Pay period: Saturday midnight → Saturday midnight
        </p>
      </div>

      {nannyHours.length === 0 && (
        <div className="px-6 py-10 text-center">
          <Timer className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No completed bookings for this period</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Hours will appear here once bookings are marked as completed.
          </p>
        </div>
      )}

      {nannyHours.length > 0 && (
        <>
          {/* Mark as Paid toolbar */}
          {unpaidNannies.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-100">
              <div className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllUnpaid}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 transition-colors"
                  >
                    {selectedIds.size === unpaidNannies.length ? (
                      <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Circle className="w-4 h-4 text-amber-400" />
                    )}
                    Select All ({unpaidNannies.length} unpaid)
                  </button>
                </div>
                <button
                  onClick={markSelectedPaid}
                  disabled={selectedIds.size === 0 || payLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {payLoading ? "Saving..." : "Mark Paid"}
                </button>
              </div>
              {selectedIds.size > 0 && (() => {
                const sel = nannyHours.filter((n) => selectedIds.has(n.nannyId));
                const selShifts = sel.reduce((s, n) => s + n.shifts, 0);
                const selHours = sel.reduce((s, n) => s + n.totalHours, 0);
                const selBasePay = sel.reduce((s, n) => s + n.basePay, 0);
                const selTaxi = sel.reduce((s, n) => s + n.taxiFee, 0);
                const selTotal = sel.reduce((s, n) => s + n.totalPay, 0);
                return (
                  <div className="px-6 pb-3 -mt-1">
                    <div className="bg-amber-100/60 rounded-lg px-4 py-2.5 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-900">
                          {selectedIds.size} nanny{selectedIds.size > 1 ? "s" : ""} selected
                        </span>
                        <span className="text-sm font-bold text-amber-900">
                          {selTotal.toLocaleString()} DH
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-amber-800">
                        <span>{selShifts} shift{selShifts !== 1 ? "s" : ""}</span>
                        <span>{selHours.toFixed(1)}h total</span>
                        <span>Hourly: {selBasePay.toLocaleString()} DH</span>
                        {selTaxi > 0 && (
                          <span className="text-orange-600 font-medium">Taxi: +{selTaxi.toLocaleString()} DH</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {payError && (
            <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100">
              <span className="text-xs text-red-700 font-medium">{payError}</span>
              <button onClick={() => setPayError("")} className="ml-auto text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          )}

          {allPaid && (
            <div className="flex items-center gap-2 px-6 py-3 bg-green-50 border-b border-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">All nannies are paid for this period</span>
            </div>
          )}

          {/* Hours discrepancy alert */}
          {(() => {
            const mismatches = nannyHours
              .map((n) => ({ ...n, diff: Math.round((n.actualHours - n.totalHours) * 10) / 10 }))
              .filter((n) => Math.abs(n.diff) >= 0.2);
            if (mismatches.length === 0) return null;
            return (
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-red-800">
                    Hours mismatch — {mismatches.length} nanny{mismatches.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="space-y-1 pl-5">
                  {mismatches.map((n) => (
                    <div key={n.nannyId} className="space-y-1">
                      <button
                        onClick={() => setExpandedMismatch(expandedMismatch === n.nannyId ? null : n.nannyId)}
                        className="flex items-center justify-between text-xs w-full hover:bg-red-100/50 rounded px-1 py-0.5 transition-colors"
                      >
                        <span className="flex items-center gap-1 text-red-800 font-medium">
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedMismatch === n.nannyId ? "rotate-180" : ""}`} />
                          {n.name}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-red-700/70">Booked {n.totalHours}h</span>
                          <span className="text-red-700/70">Actual {n.actualHours}h</span>
                          <span className={`font-semibold ${n.diff > 0 ? "text-red-700" : "text-blue-700"}`}>
                            {n.diff > 0 ? `+${n.diff}h` : `${n.diff}h`}
                          </span>
                        </span>
                      </button>
                      {expandedMismatch === n.nannyId && bookingMismatches[n.nannyId] && (
                        <div className="ml-4 space-y-1 border-l-2 border-red-200 pl-3 py-1">
                          <div className="text-[10px] font-semibold text-red-700/60 uppercase tracking-wider mb-1">
                            Bookings with discrepancies
                          </div>
                          {bookingMismatches[n.nannyId].map((bm) => (
                            <div key={bm.id} className="flex items-center justify-between text-[11px] bg-white/60 rounded px-2 py-1.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-red-900 font-medium">
                                  #{bm.id} — {bm.clientName}
                                </span>
                                <span className="text-red-700/60">
                                  {bm.date ? format(new Date(bm.date + "T00:00:00"), "EEE, dd MMM") : "—"} · {bm.startTime}–{bm.endTime}
                                </span>
                                <span className="text-red-700/50 text-[10px]">
                                  Clocked: {format(new Date(bm.clockIn), "HH:mm")} → {format(new Date(bm.clockOut), "HH:mm")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-right">
                                <span className="text-red-700/70">{bm.booked}h</span>
                                <span className="text-red-700/70">→</span>
                                <span className="text-red-700/70">{bm.actual}h</span>
                                <span className={`font-bold ${bm.diff > 0 ? "text-red-700" : "text-blue-700"}`}>
                                  {bm.diff > 0 ? `+${bm.diff}h` : `${bm.diff}h`}
                                </span>
                              </div>
                            </div>
                          ))}
                          {!bookingMismatches[n.nannyId]?.length && (
                            <div className="text-[11px] text-red-700/50 italic">
                              Small rounding differences across multiple bookings
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nanny</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shifts</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actual</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Diff</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hourly Pay</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Taxi Fee</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pay</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {nannyHours.map((nanny) => {
                  const isPaid = paidNannyIds.has(nanny.nannyId);
                  const isSelected = selectedIds.has(nanny.nannyId);
                  return (
                    <tr key={nanny.nannyId} className={`transition-colors ${isPaid ? "bg-green-50/50" : "hover:bg-muted/50"}`}>
                      <td className="px-6 py-3">
                        {isPaid ? (
                          <button onClick={() => undoPaid(nanny.nannyId)} title="Undo paid" className="text-green-600 hover:text-red-500 transition-colors">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => toggleSelect(nanny.nannyId)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {isSelected ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{nanny.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{nanny.shifts}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{nanny.totalHours}h</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{nanny.actualHours}h</td>
                      <td className="px-4 py-3 text-sm">
                        {(() => {
                          const diff = Math.round((nanny.actualHours - nanny.totalHours) * 10) / 10;
                          if (Math.abs(diff) < 0.2) return <span className="text-green-600">0h</span>;
                          return diff > 0
                            ? <span className="text-red-600 font-medium">+{diff}h</span>
                            : <span className="text-blue-600 font-medium">{diff}h</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                        {nanny.basePay.toLocaleString()} DH
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {nanny.taxiFee > 0 ? (
                          <span className="text-orange-600 font-medium">+{nanny.taxiFee} DH</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">
                        {nanny.totalPay.toLocaleString()} DH
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                            Unpaid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td className="px-6 py-3"></td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{totalAllShifts}</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{totalAllHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground">{Math.round(totalAllActual * 10) / 10}h</td>
                  <td className="px-4 py-3 text-sm font-bold">
                    {(() => {
                      const diff = Math.round((totalAllActual - totalAllHours) * 10) / 10;
                      if (Math.abs(diff) < 0.2) return <span className="text-green-600">0h</span>;
                      return diff > 0
                        ? <span className="text-red-600">+{diff}h</span>
                        : <span className="text-blue-600">{diff}h</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground text-right">{totalAllBasePay.toLocaleString()} DH</td>
                  <td className="px-4 py-3 text-sm font-bold text-orange-600 text-right">
                    {totalAllTaxi > 0 ? `+${totalAllTaxi.toLocaleString()} DH` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground text-right">{totalAllPay.toLocaleString()} DH</td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-border">
            {nannyHours.map((nanny) => {
              const isPaid = paidNannyIds.has(nanny.nannyId);
              const isSelected = selectedIds.has(nanny.nannyId);
              return (
                <div key={nanny.nannyId} className={`px-5 py-4 space-y-1 ${isPaid ? "bg-green-50/50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <button onClick={() => undoPaid(nanny.nannyId)} className="text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={() => toggleSelect(nanny.nannyId)} className="text-muted-foreground">
                          {isSelected ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Circle className="w-4 h-4" />}
                        </button>
                      )}
                      <p className="font-medium text-foreground text-sm">{nanny.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{nanny.totalPay.toLocaleString()} DH</span>
                      {isPaid ? (
                        <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">Paid</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Unpaid</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
                    <span>{nanny.shifts} shifts</span>
                    <span>Booked: {nanny.totalHours}h</span>
                    <span>Actual: {nanny.actualHours}h</span>
                    {(() => {
                      const diff = Math.round((nanny.actualHours - nanny.totalHours) * 10) / 10;
                      if (Math.abs(diff) < 0.2) return null;
                      return diff > 0
                        ? <span className="text-red-600 font-medium">+{diff}h over</span>
                        : <span className="text-blue-600 font-medium">{diff}h under</span>;
                    })()}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pl-6">
                    <span>Hourly: {nanny.basePay} DH</span>
                    {nanny.taxiFee > 0 && (
                      <span className="text-orange-600">Taxi: +{nanny.taxiFee} DH</span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Mobile period totals */}
            <div className="px-5 py-3 bg-muted/30 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-foreground">Period Total</span>
                <span className="text-sm font-bold text-foreground">{totalAllPay.toLocaleString()} DH</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{totalAllShifts} shifts</span>
                <span>{totalAllHours.toFixed(1)}h</span>
                <span>Hourly: {totalAllBasePay.toLocaleString()} DH</span>
                {totalAllTaxi > 0 && (
                  <span className="text-orange-600">Taxi: +{totalAllTaxi.toLocaleString()} DH</span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-t border-border text-[10px] text-muted-foreground">
            Rate: {HOURLY_RATE} DH/hr ({Math.round(HOURLY_RATE * 8)} DH/8h) · +100 DH for evening shifts (7 PM - 7 AM)
          </div>
        </>
      )}
    </div>
  );
}

// ─── Admin Nannies Page ─────────────────────────────────────────

const emptyForm = {
  name: "",
  location: "",
  rate: "",
  bio: "",
  languages: "",
  experience: "",
  specialties: "",
  image: "",
  email: "",
  pin: "",
  phone: "",
  available: true,
};

const STATUS_BADGES: Record<NannyStatus, { label: string; bg: string; text: string; border: string }> = {
  active: { label: "Active", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  invited: { label: "Invited", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  blocked: { label: "Blocked", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export default function AdminNannies() {
  const {
    nannies, bookings, addNanny, updateNanny, deleteNanny, bulkDeleteNannies,
    toggleNannyAvailability,
    inviteNanny, toggleNannyStatus, resendInvite, bulkUpdateNannyRate,
    impersonateNanny, adminProfile,
  } = useData();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingNanny, setEditingNanny] = useState<Nanny | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Bulk selection state
  const [bulkSelected, setBulkSelected] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  // Invite modal state
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showManualLink, setShowManualLink] = useState(false);

  const filteredNannies = useMemo(() => {
    if (!search.trim()) return nannies;
    const query = search.toLowerCase();
    return nannies.filter(
      (n) =>
        n.name?.toLowerCase().includes(query) ||
        n.location?.toLowerCase().includes(query) ||
        n.email?.toLowerCase().includes(query)
    );
  }, [nannies, search]);

  // Bulk selection helpers
  const toggleBulkSelect = (id: number) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (bulkSelected.size === filteredNannies.length) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filteredNannies.map((n) => n.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (bulkSelected.size === 0) return;
    setBulkDeleteLoading(true);
    await bulkDeleteNannies(Array.from(bulkSelected), {
      deletedByName: adminProfile?.name || "Admin",
      deletedByEmail: adminProfile?.email || "",
    });
    setBulkSelected(new Set());
    setBulkDeleteConfirm(false);
    setBulkDeleteLoading(false);
  };

  const handleBulkToggleAvailability = async (available: boolean) => {
    for (const id of bulkSelected) {
      const nanny = nannies.find((n) => n.id === id);
      if (nanny && nanny.available !== available) {
        await toggleNannyAvailability(id);
      }
    }
    setBulkSelected(new Set());
  };

  // --- Add/Edit Modal ---
  const openAddModal = () => {
    setEditingNanny(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (nanny: Nanny) => {
    setEditingNanny(nanny);
    setForm({
      name: nanny.name || "",
      location: nanny.location || "",
      rate: String(nanny.rate || ""),
      bio: nanny.bio || "",
      languages: Array.isArray(nanny.languages)
        ? nanny.languages.join(", ")
        : nanny.languages || "",
      experience: nanny.experience || "",
      specialties: Array.isArray(nanny.specialties)
        ? nanny.specialties.join(", ")
        : nanny.specialties || "",
      image: nanny.image || "",
      email: nanny.email || "",
      pin: nanny.pin || "",
      phone: nanny.phone || "",
      available: nanny.available ?? true,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingNanny(null);
    setForm(emptyForm);
  };

  const handleFormChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nannyData = {
      name: form.name.trim(),
      location: form.location.trim(),
      rate: Number(form.rate) || 0,
      bio: form.bio.trim(),
      languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
      experience: form.experience.trim(),
      specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
      image: form.image.trim(),
      email: form.email.trim(),
      pin: form.pin.trim(),
      phone: form.phone.trim(),
      available: form.available,
      rating: editingNanny?.rating || 5.0,
    };
    if (editingNanny) {
      updateNanny(editingNanny.id, nannyData);
    } else {
      addNanny(nannyData);
    }
    closeModal();
  };

  const handleDelete = (id: number) => {
    deleteNanny(id);
    setDeleteConfirm(null);
  };

  // --- Invite Modal ---
  const openInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteError("");
    setInviteLink("");
    setInviteEmailSent(false);
    setLinkCopied(false);
    setShowManualLink(false);
    setInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setInviteModalOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteError("");
    setInviteLink("");
    setInviteEmailSent(false);
    setLinkCopied(false);
    setShowManualLink(false);
  };

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    const result = await inviteNanny({ name: inviteName.trim(), email: inviteEmail.trim() });
    if (result.success) {
      setInviteLink(result.inviteLink);
      setInviteEmailSent(result.emailSent ?? false);
    } else {
      setInviteError(result.error);
    }
    setInviteLoading(false);
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // --- Bulk Rate Modal ---
  const [bulkRateModalOpen, setBulkRateModalOpen] = useState(false);
  const [bulkRateValue, setBulkRateValue] = useState("");
  const [bulkRateLoading, setBulkRateLoading] = useState(false);
  const [bulkRateError, setBulkRateError] = useState("");
  const [bulkRateSuccess, setBulkRateSuccess] = useState("");

  const handleBulkRateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rate = Number(bulkRateValue);
    if (!rate || rate <= 0) { setBulkRateError("Please enter a valid positive rate."); return; }
    setBulkRateLoading(true);
    setBulkRateError("");
    const result = await bulkUpdateNannyRate(rate);
    setBulkRateLoading(false);
    if (result.success) {
      setBulkRateSuccess(`Rate updated to ${rate} €/hr for ${result.nannyCount} nannies.`);
      setTimeout(() => { setBulkRateModalOpen(false); setBulkRateSuccess(""); setBulkRateValue(""); }, 2000);
    } else {
      setBulkRateError(result.error || "Failed to update rates.");
    }
  };

  // Resend invite handler
  const [resendLoading, setResendLoading] = useState<number | null>(null);
  const [resendLink, setResendLink] = useState<{ id: number; link: string } | null>(null);

  const handleResendInvite = async (nannyId: number) => {
    setResendLoading(nannyId);
    const result = await resendInvite(nannyId);
    if (result.success) {
      const sent = (result as { emailSent?: boolean }).emailSent;
      setResendLink({ id: nannyId, link: sent ? 'email_sent' : result.inviteLink });
      if (!sent) { try { await navigator.clipboard.writeText(result.inviteLink); } catch {} }
      setTimeout(() => setResendLink(null), 4000);
    }
    setResendLoading(null);
  };

  // --- Payroll Export Modal ---
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const today = new Date();
  const todayStr = fmtDate(today, 'yyyy-MM-dd');
  const [payrollFrom, setPayrollFrom] = useState('');
  const [payrollTo, setPayrollTo] = useState(todayStr);
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<'all' | 'completed' | 'confirmed'>('all');
  const [selectedNannyIds, setSelectedNannyIds] = useState<number[]>([]); // empty = all

  const PRESETS = useMemo(() => [
    {
      label: 'This Week',
      from: fmtDate(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: todayStr,
    },
    {
      label: 'This Month',
      from: fmtDate(startOfMonth(today), 'yyyy-MM-dd'),
      to: todayStr,
    },
    {
      label: 'Last Month',
      from: fmtDate(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
      to: fmtDate(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
    },
    { label: 'All Time', from: '', to: todayStr },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const applyPreset = useCallback((from: string, to: string) => {
    setPayrollFrom(from);
    setPayrollTo(to);
  }, []);

  const toggleNannySelection = useCallback((id: number) => {
    setSelectedNannyIds((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }, []);

  // Live preview: per-nanny summary matching all current filters
  const payrollPreview = useMemo(() => {
    const to = payrollTo || todayStr;
    const filtered = bookings.filter((b) => {
      if (b.status === 'cancelled' || b.deletedAt) return false;
      if (b.date > to) return false;
      if (payrollFrom && b.date < payrollFrom) return false;
      if (payrollStatusFilter !== 'all' && b.status !== payrollStatusFilter) return false;
      if (selectedNannyIds.length > 0 && (!b.nannyId || !selectedNannyIds.includes(b.nannyId))) return false;
      return true;
    });

    const byNanny = new Map<string, { bookings: number; hours: number; pay: number }>();
    for (const b of filtered) {
      const key = b.nannyName || 'Unassigned';
      if (!byNanny.has(key)) byNanny.set(key, { bookings: 0, hours: 0, pay: 0 });
      const s = byNanny.get(key)!;
      s.bookings++;
      const aP = calcNannyPayBreakdown(b);
      const eP = estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate);
      const pay = aP.total > 0 ? aP : eP;
      s.pay += pay.total;
      s.hours += calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);
    }

    const rows = Array.from(byNanny.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, s]) => ({ name, ...s }));

    return {
      rows,
      totalBookings: filtered.length,
      totalHours: rows.reduce((s, r) => s + r.hours, 0),
      totalPay: rows.reduce((s, r) => s + r.pay, 0),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, payrollFrom, payrollTo, payrollStatusFilter, selectedNannyIds]);

  const handlePayrollDownload = useCallback(() => {
    exportPayrollExcel(nannies, bookings, {
      fromDate: payrollFrom || '',
      toDate: payrollTo || todayStr,
      nannyIds: selectedNannyIds,
      statusFilter: payrollStatusFilter,
    });
    setPayrollModalOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nannies, bookings, payrollFrom, payrollTo, selectedNannyIds, payrollStatusFilter]);

  // Status badge helper
  const renderStatusBadge = (status: NannyStatus) => {
    const badge = STATUS_BADGES[status] || STATUS_BADGES.active;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-bold text-foreground">
            Manage Nannies
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {nannies.length} nann{nannies.length !== 1 ? "ies" : "y"} registered
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setPayrollModalOpen(true)}
            className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
            title="Download Excel payroll report: hours worked & pay owed per nanny"
          >
            <Download className="w-4 h-4" />
            Download Payroll
          </button>
          <button
            onClick={() => { setBulkRateValue(""); setBulkRateError(""); setBulkRateSuccess(""); setBulkRateModalOpen(true); }}
            className="bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Set All Rates
          </button>
          <button
            onClick={openInviteModal}
            className="bg-accent text-white font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Invite Nanny
          </button>
          <button
            onClick={openAddModal}
            className="gradient-warm text-white font-semibold px-5 py-2.5 rounded-xl shadow-warm hover:opacity-90 transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" />
            Add Nanny
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, location, or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* Nanny Hours & Pay Report */}
      <NannyHoursReport bookings={bookings} />

      {/* Bulk Selection Bar */}
      {bulkSelected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">
              {bulkSelected.size} nann{bulkSelected.size !== 1 ? "ies" : "y"} selected
            </span>
            <button
              onClick={() => setBulkSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkToggleAvailability(true)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
            >
              <ToggleRight className="w-3.5 h-3.5" />
              Set Available
            </button>
            <button
              onClick={() => handleBulkToggleAvailability(false)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <ToggleLeft className="w-3.5 h-3.5" />
              Set Unavailable
            </button>
            {bulkDeleteConfirm ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {bulkDeleteLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {bulkDeleteLoading ? "Deleting..." : `Confirm Delete (${bulkSelected.size})`}
                </button>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  className="text-xs font-medium px-3 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nannies Grid */}
      {filteredNannies.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center shadow-soft">
          <Search className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="font-medium text-foreground text-lg">No nannies found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search
              ? "Try adjusting your search terms."
              : "Invite your first nanny to get started."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                        {bulkSelected.size === filteredNannies.length && filteredNannies.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Nanny
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Location
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Account
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Availability
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredNannies.map((nanny) => (
                    <tr
                      key={nanny.id}
                      className={`hover:bg-muted/30 transition-colors ${nanny.status === "blocked" ? "opacity-60" : ""} ${bulkSelected.has(nanny.id) ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-4">
                        <button onClick={() => toggleBulkSelect(nanny.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                          {bulkSelected.has(nanny.id) ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {nanny.image ? (
                            <img
                              src={nanny.image}
                              alt={nanny.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                              <UserPlus className="w-5 h-5 text-primary/60" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {nanny.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {nanny.email || "No email"}
                            </p>
                            {nanny.phone && (
                              <p className="text-xs text-muted-foreground">
                                {nanny.phone}
                              </p>
                            )}
                            <p className="text-xs mt-0.5">
                              {nanny.status === "invited" ? (
                                <span className="text-amber-500 italic">PIN: Pending</span>
                              ) : nanny.pin ? (
                                <span className="font-mono text-primary/70">PIN: {nanny.pin}</span>
                              ) : (
                                <span className="text-muted-foreground/50 italic">No PIN</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          {nanny.location || "—"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-foreground">
                        {nanny.rate} €/hr
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(nanny.status || "active")}
                          {resendLink?.id === nanny.id && (
                            <span className="text-xs text-green-600 font-medium">{resendLink?.link === 'email_sent' ? 'Invite re-sent!' : 'Link copied!'}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => toggleNannyAvailability(nanny.id)}
                          className="flex items-center gap-2 group"
                          title={nanny.available ? "Click to mark unavailable" : "Click to mark available"}
                        >
                          {nanny.available ? (
                            <>
                              <ToggleRight className="w-7 h-7 text-accent" />
                              <span className="text-xs font-semibold text-accent">Available</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                              <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Block / Unblock */}
                          {nanny.status !== "invited" && (
                            <button
                              onClick={() => toggleNannyStatus(nanny.id)}
                              className={`p-2 rounded-lg transition-colors ${
                                nanny.status === "blocked"
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              }`}
                              title={nanny.status === "blocked" ? "Unblock nanny" : "Block nanny"}
                            >
                              {nanny.status === "blocked" ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                <ShieldBan className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Resend Invite (invited only) */}
                          {nanny.status === "invited" && (
                            <button
                              onClick={() => handleResendInvite(nanny.id)}
                              disabled={resendLoading === nanny.id}
                              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              title="Resend invitation (copies new link)"
                            >
                              {resendLoading === nanny.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Link2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* View as Nanny */}
                          {nanny.status === "active" && (
                            <button
                              onClick={() => { impersonateNanny(nanny); navigate("/nanny"); }}
                              className="p-2 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
                              title={`View portal as ${nanny.name}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(nanny)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit nanny"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          {deleteConfirm === nanny.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(nanny.id)}
                                className="text-xs font-medium text-white bg-destructive px-2.5 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg hover:bg-muted/80 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(nanny.id)}
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="Delete nanny"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {/* Mobile Select All */}
            <div className="flex items-center gap-3 mb-3 px-1">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                {bulkSelected.size === filteredNannies.length && filteredNannies.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                Select All
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredNannies.map((nanny) => (
              <div
                key={nanny.id}
                className={`bg-card rounded-xl border shadow-soft overflow-hidden ${nanny.status === "blocked" ? "opacity-60" : ""} ${bulkSelected.has(nanny.id) ? "border-primary/40 bg-primary/5" : "border-border"}`}
              >
                <div className="p-4 space-y-3">
                  {/* Nanny Header */}
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleBulkSelect(nanny.id)} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      {bulkSelected.has(nanny.id) ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    {nanny.image ? (
                      <img
                        src={nanny.image}
                        alt={nanny.name}
                        className="w-14 h-14 rounded-full object-cover ring-2 ring-border shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border shrink-0">
                        <UserPlus className="w-6 h-6 text-primary/60" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-semibold text-foreground truncate">
                        {nanny.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{nanny.location || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        {renderStatusBadge(nanny.status || "active")}
                        <span className="text-xs font-medium text-foreground">
                          {nanny.rate} €/hr
                        </span>
                      </div>
                      <p className="text-xs mt-1">
                        {nanny.status === "invited" ? (
                          <span className="text-amber-500 italic">PIN: Pending</span>
                        ) : nanny.pin ? (
                          <span className="font-mono text-primary/70">PIN: {nanny.pin}</span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">No PIN</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleNannyAvailability(nanny.id)}
                      className="flex items-center gap-2"
                    >
                      {nanny.available ? (
                        <>
                          <ToggleRight className="w-7 h-7 text-accent" />
                          <span className="text-xs font-semibold text-accent">Available</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Unavailable</span>
                        </>
                      )}
                    </button>

                    {/* Block/Unblock on mobile */}
                    {nanny.status !== "invited" && (
                      <button
                        onClick={() => toggleNannyStatus(nanny.id)}
                        className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                          nanny.status === "blocked"
                            ? "text-green-600 bg-green-50"
                            : "text-red-600 bg-red-50"
                        }`}
                      >
                        {nanny.status === "blocked" ? (
                          <><ShieldCheck className="w-3.5 h-3.5" /> Unblock</>
                        ) : (
                          <><ShieldBan className="w-3.5 h-3.5" /> Block</>
                        )}
                      </button>
                    )}
                    {nanny.status === "invited" && (
                      <button
                        onClick={() => handleResendInvite(nanny.id)}
                        disabled={resendLoading === nanny.id}
                        className="p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 text-amber-600 bg-amber-50 disabled:opacity-50"
                      >
                        {resendLoading === nanny.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <><Link2 className="w-3.5 h-3.5" /> Resend</>
                        )}
                      </button>
                    )}
                  </div>

                  {resendLink?.id === nanny.id && (
                    <p className="text-xs text-green-600 font-medium text-center">{resendLink?.link === 'email_sent' ? 'Invite email re-sent!' : 'New invite link copied!'}</p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex border-t border-border divide-x divide-border">
                  {nanny.status === "active" && (
                    <button
                      onClick={() => { impersonateNanny(nanny); navigate("/nanny"); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View as
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(nanny)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>

                  {deleteConfirm === nanny.id ? (
                    <div className="flex-1 flex items-center justify-center gap-1.5 py-2.5">
                      <button
                        onClick={() => handleDelete(nanny.id)}
                        className="text-xs font-medium text-white bg-destructive px-2 py-1 rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(nanny.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        </>
      )}

      {/* Invite Nanny Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closeInviteModal}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                <Send className="w-5 h-5 text-accent" />
                Invite a Nanny
              </h2>
              <button
                onClick={closeInviteModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!inviteLink ? (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enter the nanny's name and email. An invitation email will be sent automatically with a registration link.
                  </p>

                  {inviteError && (
                    <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg border border-red-100">
                      {inviteError}
                    </div>
                  )}

                  <form onSubmit={handleInvite} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        required
                        placeholder="e.g. Layla Mansouri"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        placeholder="layla@example.com"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={inviteLoading || !inviteName.trim() || !inviteEmail.trim()}
                      className="w-full bg-accent text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send Invitation
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Success */}
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6 text-green-500" />
                    </div>
                    {inviteEmailSent ? (
                      <>
                        <p className="font-medium text-foreground">Invitation Sent!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          An email has been sent to <strong>{inviteEmail}</strong> with a registration link.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-foreground">Invitation Created!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Email could not be sent. Share the link below with <strong>{inviteName}</strong>.
                        </p>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mb-4">
                    This link expires in 7 days. The nanny will fill in their profile and create a PIN to log in.
                  </p>

                  {/* Collapsible manual link */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={() => setShowManualLink(!showManualLink)}
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1 mx-auto"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {showManualLink ? "Hide link" : "Copy link manually"}
                    </button>
                    {showManualLink && (
                      <div className="bg-muted/50 rounded-xl p-3 mt-2">
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-foreground bg-background rounded-lg px-3 py-2 break-all border border-border">
                            {inviteLink}
                          </code>
                          <button
                            onClick={() => copyLink(inviteLink)}
                            className={`p-2 rounded-lg transition-colors shrink-0 ${
                              linkCopied
                                ? "text-green-600 bg-green-50"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                            }`}
                            title="Copy link"
                          >
                            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        {linkCopied && (
                          <p className="text-xs text-green-600 mt-1.5 font-medium">Copied to clipboard!</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeInviteModal}
                    className="w-full bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-card rounded-2xl border border-border shadow-warm w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
              <h2 className="font-serif text-lg font-semibold text-foreground">
                {editingNanny ? "Edit Nanny" : "Add New Nanny"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  required
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Location *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleFormChange("location", e.target.value)}
                  required
                  placeholder="e.g. Gueliz, Marrakech"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Rate and Experience */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Rate (€/hr) *</label>
                  <input
                    type="number"
                    value={form.rate}
                    onChange={(e) => handleFormChange("rate", e.target.value)}
                    required
                    min="0"
                    placeholder="150"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Experience</label>
                  <input
                    type="text"
                    value={form.experience}
                    onChange={(e) => handleFormChange("experience", e.target.value)}
                    placeholder="e.g. 5 years"
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => handleFormChange("bio", e.target.value)}
                  rows={3}
                  placeholder="Short bio about the nanny..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Languages <span className="text-xs text-muted-foreground font-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.languages}
                  onChange={(e) => handleFormChange("languages", e.target.value)}
                  placeholder="Arabic, French, English"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Specialties <span className="text-xs text-muted-foreground font-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.specialties}
                  onChange={(e) => handleFormChange("specialties", e.target.value)}
                  placeholder="Infants, Toddlers, Creative Play"
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Profile Photo Upload */}
              <ImageUpload
                currentImage={form.image}
                onImageChange={(base64) => handleFormChange("image", base64)}
              />

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <PhoneInput
                  value={form.phone}
                  onChange={(val) => handleFormChange("phone", val)}
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>

              {/* Portal Login Credentials */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Nanny Portal Login
                </p>
                {editingNanny?.status === "invited" ? (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                    PIN will be set by the nanny during registration.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        placeholder="nanny@callananny.ma"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">PIN Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.pin}
                        onChange={(e) => handleFormChange("pin", e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all tracking-widest font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium text-foreground">Available for bookings</label>
                <button
                  type="button"
                  onClick={() => handleFormChange("available", !form.available)}
                  className="flex items-center gap-2"
                >
                  {form.available ? (
                    <ToggleRight className="w-8 h-8 text-accent" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  )}
                </button>
              </div>

              {/* Form Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 gradient-warm text-white font-semibold py-2.5 rounded-xl shadow-warm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingNanny ? "Save Changes" : "Add Nanny"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payroll Download Modal */}
      {payrollModalOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-xl flex flex-col max-h-[90vh]">

            {/* ── Sticky Header ── */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-serif text-lg font-bold text-foreground leading-tight">Download Payroll</h2>
                  <p className="text-xs text-muted-foreground">Filter, preview, then download</p>
                </div>
              </div>
              <button
                onClick={() => setPayrollModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Date Range */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Date Range</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.from, p.to)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all text-left ${
                        payrollFrom === p.from && payrollTo === p.to
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {p.label}
                      {p.label === 'All Time' && (
                        <span className="block text-[10px] opacity-70">from first booking</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">From</label>
                    <input
                      type="date"
                      value={payrollFrom}
                      max={payrollTo || todayStr}
                      onChange={(e) => setPayrollFrom(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Leave empty = all time</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">To</label>
                    <input
                      type="date"
                      value={payrollTo}
                      min={payrollFrom || undefined}
                      max={todayStr}
                      onChange={(e) => setPayrollTo(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Booking Status</p>
                <div className="flex gap-2">
                  {(['all', 'completed', 'confirmed'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setPayrollStatusFilter(s)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                        payrollStatusFilter === s
                          ? s === 'completed'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : s === 'confirmed'
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-foreground text-background border-foreground'
                          : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nanny Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nannies</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedNannyIds([])}
                      className={`text-xs font-medium px-2 py-0.5 rounded-lg transition-colors ${
                        selectedNannyIds.length === 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All
                    </button>
                    {selectedNannyIds.length > 0 && (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">
                        {selectedNannyIds.length} selected
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {nannies.filter((n) => n.status !== 'invited').map((n) => {
                    const checked = selectedNannyIds.length === 0 || selectedNannyIds.includes(n.id);
                    const explicit = selectedNannyIds.includes(n.id);
                    return (
                      <label
                        key={n.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm ${
                          selectedNannyIds.length === 0
                            ? 'border-border bg-background text-foreground opacity-70'
                            : explicit
                              ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedNannyIds.length === 0 ? true : explicit}
                          onChange={() => {
                            if (selectedNannyIds.length === 0) {
                              // Switch from "all" mode: select only this one's inverse
                              setSelectedNannyIds(nannies.filter((x) => x.id !== n.id).map((x) => x.id));
                            } else {
                              toggleNannySelection(n.id);
                            }
                          }}
                          className="accent-blue-600 w-3.5 h-3.5 shrink-0"
                        />
                        <span className="truncate">{n.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Table */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Preview — {payrollPreview.totalBookings} booking{payrollPreview.totalBookings !== 1 ? 's' : ''}
                </p>
                {payrollPreview.rows.length === 0 ? (
                  <div className="bg-muted/40 rounded-xl py-6 text-center text-sm text-muted-foreground border border-border">
                    No bookings match the selected filters
                  </div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden text-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Nanny</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Jobs</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Hours</th>
                          <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Pay (DH)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payrollPreview.rows.map((row) => (
                          <tr key={row.name} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-medium text-foreground truncate max-w-[140px]">{row.name}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{row.bookings}</td>
                            <td className="px-3 py-2 text-right text-muted-foreground">{row.hours.toFixed(1)}h</td>
                            <td className="px-3 py-2 text-right font-semibold text-foreground">{row.pay.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-blue-50 border-t-2 border-blue-200">
                          <td className="px-3 py-2 font-bold text-blue-900 text-xs uppercase tracking-wide">Total</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-900">{payrollPreview.totalBookings}</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-900">{payrollPreview.totalHours.toFixed(1)}h</td>
                          <td className="px-3 py-2 text-right font-bold text-blue-900">{payrollPreview.totalPay.toLocaleString()} DH</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ── Sticky Footer ── */}
            <div className="flex gap-3 px-6 py-4 border-t border-border shrink-0">
              <button
                type="button"
                onClick={handlePayrollDownload}
                disabled={payrollPreview.totalBookings === 0}
                className="flex-1 bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Excel ({payrollPreview.totalBookings})
              </button>
              <button
                type="button"
                onClick={() => setPayrollModalOpen(false)}
                className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Rate Modal */}
      {bulkRateModalOpen && (
        <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="font-serif text-lg font-bold text-foreground">Set All Nanny Rates</h2>
              </div>
              <button onClick={() => setBulkRateModalOpen(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This will update the hourly rate for all <strong>active</strong> and <strong>invited</strong> nannies at once.
            </p>
            <form onSubmit={handleBulkRateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Hourly Rate (€/hr)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={bulkRateValue}
                  onChange={(e) => setBulkRateValue(e.target.value)}
                  placeholder="e.g. 150"
                  required
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
              {bulkRateError && <p className="text-sm text-destructive">{bulkRateError}</p>}
              {bulkRateSuccess && <p className="text-sm text-emerald-600 font-medium">{bulkRateSuccess}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={bulkRateLoading}
                  className="flex-1 bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {bulkRateLoading ? "Updating..." : "Apply to All"}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkRateModalOpen(false)}
                  className="flex-1 bg-muted text-muted-foreground font-semibold py-2.5 rounded-xl hover:bg-muted/80 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
