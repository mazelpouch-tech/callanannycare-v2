import { useState, useMemo } from "react";
import { Clock, X, ArrowRight, Loader2, CheckCircle, Pencil, Check } from "lucide-react";
import type { Booking } from "@/types";
import { calcBookedHours, parseTimeToHours, TIME_SLOTS } from "@/utils/shiftHelpers";

export interface DaySchedule {
  date: string;
  startTime: string;
  endTime: string;
  price: number;
}

interface ExtendBookingModalProps {
  booking: Booking;
  rate?: number;
  onConfirm: (
    newStartTime: string,
    newEndTime: string,
    newTotalPrice: number,
    perDaySchedule?: DaySchedule[]
  ) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}

/** Generate all date strings (YYYY-MM-DD) in a range */
function getDateRange(startDate: string, endDate: string | null): string[] {
  if (!endDate || endDate === startDate) return [startDate];
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates.length > 0 ? dates : [startDate];
}

/** Format YYYY-MM-DD to "Mon, Mar 3" */
function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function calcHours(startTime: string, endTime: string): number {
  const s = parseTimeToHours(startTime);
  const e = parseTimeToHours(endTime);
  if (s === null || e === null) return 0;
  return e > s ? e - s : (24 - s) + e;
}

export default function ExtendBookingModal({
  booking,
  rate = 10,
  onConfirm,
  onClose,
  t,
}: ExtendBookingModalProps) {
  // Single-day state (also serves as default for all days)
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

  // Multi-day state
  const [perDayMode, setPerDayMode] = useState(false);
  const [dayOverrides, setDayOverrides] = useState<Record<number, { startTime: string; endTime: string }>>({});
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const dates = useMemo(
    () => getDateRange(booking.date, booking.endDate),
    [booking.date, booking.endDate]
  );
  const isMultiDay = dates.length > 1;

  const currentHours = calcBookedHours(
    booking.startTime,
    booking.endTime,
    booking.date,
    booking.endDate
  );

  // Build the per-day schedule
  const perDaySchedule = useMemo((): DaySchedule[] => {
    const baseStart = newStartTime || booking.startTime;
    const baseEnd = newEndTime || booking.endTime;

    return dates.map((date, i) => {
      const override = perDayMode ? dayOverrides[i] : undefined;
      const dayStart = override?.startTime || baseStart;
      const dayEnd = override?.endTime || baseEnd;
      const hours = calcHours(dayStart, dayEnd);
      return { date, startTime: dayStart, endTime: dayEnd, price: Math.round(rate * hours) };
    });
  }, [dates, newStartTime, newEndTime, perDayMode, dayOverrides, booking, rate]);

  // Calculate totals
  const modification = useMemo(() => {
    const baseStart = newStartTime || booking.startTime;
    const baseEnd = newEndTime || booking.endTime;
    const hasBaseChange = !!newStartTime || !!newEndTime;
    const hasOverrides = perDayMode && Object.keys(dayOverrides).length > 0;
    if (!hasBaseChange && !hasOverrides) return null;

    const totalHours = perDaySchedule.reduce((sum, d) => sum + calcHours(d.startTime, d.endTime), 0);
    if (totalHours <= 0) return null;

    const newTotalPrice = perDaySchedule.reduce((sum, d) => sum + d.price, 0);
    const hoursDiff = totalHours - currentHours;
    const priceDiff = newTotalPrice - (booking.totalPrice || 0);

    return {
      currentHours,
      totalHours,
      hoursDiff,
      newTotalPrice,
      priceDiff,
      effectiveStart: baseStart,
      effectiveEnd: baseEnd,
    };
  }, [newStartTime, newEndTime, perDayMode, dayOverrides, perDaySchedule, booking, currentHours]);

  const handleConfirm = async () => {
    if (!modification) return;
    setLoading(true);
    setConflictError(null);
    try {
      const hasCustomDays = perDayMode && Object.keys(dayOverrides).length > 0;
      await onConfirm(
        modification.effectiveStart,
        modification.effectiveEnd,
        modification.newTotalPrice,
        (isMultiDay || hasCustomDays) ? perDaySchedule : undefined
      );
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err: unknown) {
      setLoading(false);
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 409) {
        setConflictError(
          err instanceof Error
            ? err.message
            : "Modifying this booking would create a scheduling conflict."
        );
      }
    }
  };

  const slotLabel = (timeStr: string) => {
    const parsed = parseTimeToHours(timeStr);
    if (parsed === null) return timeStr;
    const h = Math.floor(parsed);
    const m = Math.round((parsed - h) * 60);
    return `${String(h).padStart(2, "0")}h${m === 0 ? "00" : String(m).padStart(2, "0")}`;
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">
            {t("modify.success")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {t("modify.title")}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Current booking summary */}
          <div className="bg-muted/30 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-foreground">
              {booking.clientName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {booking.date}
              {booking.endDate && booking.endDate !== booking.date
                ? ` → ${booking.endDate} (${dates.length} days)`
                : ""}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-foreground font-medium">
                {booking.startTime} - {booking.endTime}
              </span>
              <span className="text-xs text-muted-foreground">
                ({currentHours}h)
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {booking.totalPrice?.toLocaleString()}€
              </span>
            </div>
          </div>

          {/* Default start/end time selectors */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {isMultiDay ? t("modify.defaultStartTime") : t("modify.newStartTime")}
            </label>
            <select
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="">
                {slotLabel(booking.startTime)} ({t("modify.keepCurrent")})
              </option>
              {TIME_SLOTS.map((slot) => (
                <option key={`ms-${slot.value}`} value={slot.label}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {isMultiDay ? t("modify.defaultEndTime") : t("modify.newEndTime")}
            </label>
            <select
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
            >
              <option value="">
                {slotLabel(booking.endTime)} ({t("modify.keepCurrent")})
              </option>
              {TIME_SLOTS.map((slot) => (
                <option key={`me-${slot.value}`} value={slot.label}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          {/* Multi-day: per-day schedule toggle + overrides */}
          {isMultiDay && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={perDayMode}
                  onChange={(e) => {
                    setPerDayMode(e.target.checked);
                    if (!e.target.checked) {
                      setDayOverrides({});
                      setEditingDayIdx(null);
                    }
                  }}
                  className="w-4 h-4 rounded border-primary/40 text-primary focus:ring-primary/30"
                />
                <span className="text-sm font-medium text-foreground">
                  {t("modify.differentHoursPerDay")}
                </span>
              </label>

              {perDayMode && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {t("modify.dailySchedule")}
                  </p>
                  {dates.map((date, i) => {
                    const override = dayOverrides[i];
                    const dayStart = override?.startTime || newStartTime || booking.startTime;
                    const dayEnd = override?.endTime || newEndTime || booking.endTime;
                    const isEditing = editingDayIdx === i;

                    return (
                      <div
                        key={date}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          override
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-muted/20"
                        }`}
                      >
                        <span className="text-xs font-medium text-foreground w-24 shrink-0">
                          {formatShortDate(date)}
                        </span>
                        {isEditing ? (
                          <>
                            <select
                              value={override?.startTime || ""}
                              onChange={(e) =>
                                setDayOverrides((prev) => ({
                                  ...prev,
                                  [i]: {
                                    startTime: e.target.value || dayStart,
                                    endTime: override?.endTime || dayEnd,
                                  },
                                }))
                              }
                              className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              <option value="">
                                {slotLabel(newStartTime || booking.startTime)} (default)
                              </option>
                              {TIME_SLOTS.map((s) => (
                                <option key={s.value} value={s.label}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <span className="text-xs text-muted-foreground">→</span>
                            <select
                              value={override?.endTime || ""}
                              onChange={(e) =>
                                setDayOverrides((prev) => ({
                                  ...prev,
                                  [i]: {
                                    startTime: override?.startTime || dayStart,
                                    endTime: e.target.value || dayEnd,
                                  },
                                }))
                              }
                              className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                            >
                              <option value="">
                                {slotLabel(newEndTime || booking.endTime)} (default)
                              </option>
                              {TIME_SLOTS.map((s) => (
                                <option key={s.value} value={s.label}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setEditingDayIdx(null)}
                              className="p-1 rounded hover:bg-muted transition-colors text-primary"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              className={`text-xs flex-1 ${
                                override ? "text-primary font-medium" : "text-muted-foreground"
                              }`}
                            >
                              {slotLabel(dayStart)} → {slotLabel(dayEnd)}
                              {override && (
                                <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">
                                  custom
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingDayIdx(i)}
                              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {override && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDayOverrides((prev) => {
                                    const n = { ...prev };
                                    delete n[i];
                                    return n;
                                  })
                                }
                                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modification summary */}
          {modification && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("modify.summary")}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("modify.hourChange")}
                </span>
                <span
                  className={`font-semibold ${
                    modification.hoursDiff > 0
                      ? "text-primary"
                      : modification.hoursDiff < 0
                      ? "text-orange-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {modification.hoursDiff > 0 ? "+" : ""}
                  {modification.hoursDiff.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("modify.priceChange")}
                </span>
                <span
                  className={`font-semibold ${
                    modification.priceDiff > 0
                      ? "text-primary"
                      : modification.priceDiff < 0
                      ? "text-orange-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {modification.priceDiff > 0 ? "+" : ""}
                  {modification.priceDiff.toLocaleString()}€
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {t("modify.newTotal")}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {modification.newTotalPrice.toLocaleString()}€
                </span>
              </div>
              {!perDayMode && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {modification.effectiveStart} - {modification.effectiveEnd} ({modification.totalHours}h)
                </p>
              )}
              {perDayMode && isMultiDay && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {dates.length} days · {modification.totalHours}h total
                </p>
              )}
            </div>
          )}

          {/* Conflict warning */}
          {conflictError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              {conflictError}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            {t("shared.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!modification || loading}
            className="flex-1 py-3 gradient-warm text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("modify.saving")}
              </>
            ) : (
              t("modify.confirm")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
