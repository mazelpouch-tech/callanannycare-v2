import { useState, useMemo } from "react";
import { Clock, X, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import type { Booking } from "@/types";
import { calcBookedHours, parseTimeToHours, TIME_SLOTS } from "@/utils/shiftHelpers";

interface ExtendBookingModalProps {
  booking: Booking;
  rate?: number; // parent rate (default 150 MAD/hr)
  onConfirm: (newEndTime: string, newTotalPrice: number) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}

export default function ExtendBookingModal({
  booking,
  rate = 150,
  onConfirm,
  onClose,
  t,
}: ExtendBookingModalProps) {
  const [newEndTime, setNewEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Filter time slots to only show times AFTER current end time
  const availableSlots = useMemo(() => {
    const currentEnd = parseTimeToHours(booking.endTime || "");
    if (currentEnd === null) return [];
    return TIME_SLOTS.filter((slot) => {
      const slotHours = parseTimeToHours(slot.label);
      return slotHours !== null && slotHours > currentEnd;
    });
  }, [booking.endTime]);

  // Calculate the extension details
  const extension = useMemo(() => {
    if (!newEndTime) return null;
    const currentHours = calcBookedHours(
      booking.startTime,
      booking.endTime,
      booking.date,
      booking.endDate
    );
    const newHours = calcBookedHours(
      booking.startTime,
      newEndTime,
      booking.date,
      booking.endDate
    );
    const additionalHours = newHours - currentHours;
    const newTotalPrice = Math.round(rate * newHours);
    const additionalCost = newTotalPrice - (booking.totalPrice || 0);
    return { currentHours, newHours, additionalHours, newTotalPrice, additionalCost };
  }, [newEndTime, booking, rate]);

  const handleConfirm = async () => {
    if (!extension || !newEndTime) return;
    setLoading(true);
    try {
      await onConfirm(newEndTime, extension.newTotalPrice);
      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-8 text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-foreground">
            {t("extend.extendSuccess")}
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
            {t("extend.extendBooking")}
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
                ({calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate)}h)
              </span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                {booking.totalPrice?.toLocaleString()} MAD
              </span>
            </div>
          </div>

          {/* New end time selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("extend.newEndTime")}
            </label>
            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {t("extend.noLaterSlots")}
              </p>
            ) : (
              <select
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                <option value="">{t("extend.selectNewEnd")}</option>
                {availableSlots.map((slot) => (
                  <option key={slot.value} value={slot.label}>
                    {slot.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Extension summary */}
          {extension && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("extend.summary")}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("extend.additionalHours")}
                </span>
                <span className="font-semibold text-primary">
                  +{extension.additionalHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("extend.additionalCost")}
                </span>
                <span className="font-semibold text-primary">
                  +{extension.additionalCost.toLocaleString()} MAD
                </span>
              </div>
              <div className="border-t border-primary/20 pt-2 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  {t("extend.newTotal")}
                </span>
                <span className="text-lg font-bold text-foreground">
                  {extension.newTotalPrice.toLocaleString()} MAD
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {booking.startTime} - {newEndTime} ({extension.newHours}h)
              </p>
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
            disabled={!extension || loading}
            className="flex-1 py-3 gradient-warm text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("extend.extending")}
              </>
            ) : (
              t("extend.confirmExtend")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
