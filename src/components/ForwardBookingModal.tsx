import { useState, useMemo } from "react";
import { ArrowRightLeft, X, Loader2, CheckCircle, MapPin, Star } from "lucide-react";
import type { Booking, Nanny } from "@/types";

interface ForwardBookingModalProps {
  booking: Booking;
  nannies: Nanny[];
  currentNannyId: number | null;
  onConfirm: (newNannyId: number) => Promise<void>;
  onClose: () => void;
  t: (key: string) => string;
}

export default function ForwardBookingModal({
  booking,
  nannies,
  currentNannyId,
  onConfirm,
  onClose,
  t,
}: ForwardBookingModalProps) {
  const [selectedNannyId, setSelectedNannyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Filter to active nannies excluding the current one
  const availableNannies = useMemo(
    () =>
      nannies.filter(
        (n) => n.status === "active" && n.id !== currentNannyId
      ),
    [nannies, currentNannyId]
  );

  const selectedNanny = useMemo(
    () => availableNannies.find((n) => n.id === selectedNannyId) || null,
    [availableNannies, selectedNannyId]
  );

  const currentNanny = useMemo(
    () => nannies.find((n) => n.id === currentNannyId) || null,
    [nannies, currentNannyId]
  );

  const handleConfirm = async () => {
    if (!selectedNannyId) return;
    setLoading(true);
    try {
      await onConfirm(selectedNannyId);
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
            {t("forward.forwardSuccess")}
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
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            {t("forward.forwardBooking")}
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
              {" \u00B7 "}
              {booking.startTime} - {booking.endTime}
            </p>
            {currentNanny && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("forward.currentNanny")}: <span className="font-medium text-foreground">{currentNanny.name}</span>
              </p>
            )}
          </div>

          {/* Nanny selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t("forward.forwardTo")}
            </label>
            {availableNannies.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {t("forward.noOtherNannies")}
              </p>
            ) : (
              <select
                value={selectedNannyId ?? ""}
                onChange={(e) =>
                  setSelectedNannyId(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
              >
                <option value="">{t("forward.selectNanny")}</option>
                {availableNannies.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} — {n.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected nanny preview */}
          {selectedNanny && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-4 flex items-center gap-4">
              <img
                src={selectedNanny.image}
                alt={selectedNanny.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/30"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {selectedNanny.name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedNanny.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    {selectedNanny.rating}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center">
            {t("forward.forwardNote")}
          </p>
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
            disabled={!selectedNannyId || loading}
            className="flex-1 py-3 gradient-warm text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("forward.forwarding")}
              </>
            ) : (
              t("forward.confirmForward")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
