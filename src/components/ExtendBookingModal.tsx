import { useState, useMemo } from "react";
import { Clock, X, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import type { Booking } from "@/types";
import { calcBookedHours, parseTimeToHours, TIME_SLOTS } from "@/utils/shiftHelpers";

interface ExtendBookingModalProps {
  booking: Booking;
  rate?: number; // parent rate (default 10€/hr)
  onConfirm: (newStartTime: string, newEndTime: string, newTotalPrice: number) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}

export default function ExtendBookingModal({
  booking,
  rate = 10,
  onConfirm,
  onClose,
  t,
}: ExtendBookingModalProps) {
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const currentHours = calcBookedHours(
    booking.startTime,
    booking.endTime,
    booking.date,
    booking.endDate
  );

  // Calculate the modification details
  const modification = useMemo(() => {
    const effectiveStart = newStartTime || booking.startTime;
    const effectiveEnd = newEndTime || booking.endTime;
    if (!effectiveStart || !effectiveEnd) return null;
    // If nothing changed, no modification
    if (!newStartTime && !newEndTime) return null;

    const newHours = calcBookedHours(effectiveStart, effectiveEnd, booking.date, booking.endDate);
    if (newHours <= 0) return null;

    const hoursDiff = newHours - currentHours;
    const newTotalPrice = Math.round(rate * newHours);
    const priceDiff = newTotalPrice - (booking.totalPrice || 0);

    return {
      currentHours,
      newHours,
      hoursDiff,
      newTotalPrice,
      priceDiff,
      effectiveStart,
      effectiveEnd,
    };
  }, [newStartTime, newEndTime, booking, rate, currentHours]);

  const handleConfirm = async () => {
    if (!modification) return;
    setLoading(true);
    setConflictError(null);
    try {
      await onConfirm(
        modification.effectiveStart,
        modification.effectiveEnd,
        modification.newTotalPrice
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

  // Format slot label for display
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
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md">
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
                ? ` - ${booking.endDate}`
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

          {/* New start time selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("modify.newStartTime")}
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

          {/* New end time selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("modify.newEndTime")}
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
                <span className={`font-semibold ${modification.hoursDiff > 0 ? "text-primary" : modification.hoursDiff < 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                  {modification.hoursDiff > 0 ? "+" : ""}
                  {modification.hoursDiff.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("modify.priceChange")}
                </span>
                <span className={`font-semibold ${modification.priceDiff > 0 ? "text-primary" : modification.priceDiff < 0 ? "text-orange-600" : "text-muted-foreground"}`}>
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
              <p className="text-xs text-muted-foreground text-center mt-1">
                {modification.effectiveStart} - {modification.effectiveEnd} ({modification.newHours}h)
              </p>
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
