import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  ArrowLeft,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import { calcBookedHours, parseTimeToHours, TIME_SLOTS } from "@/utils/shiftHelpers";

const API = import.meta.env.VITE_API_URL || "";

interface BookingData {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  hotel: string;
  date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  nanny_name: string;
  nanny_image: string;
}

type Step = "verify" | "extend" | "success";

const T = {
  en: {
    title: "Extend Your Booking",
    subtitle: "Need a little more time? Extend your booking in seconds.",
    verifyTitle: "Verify Your Identity",
    verifyDesc: "Enter the email address you used when booking.",
    emailPlaceholder: "your@email.com",
    verify: "Verify",
    verifying: "Verifying...",
    emailMismatch: "Email does not match this booking. Please try again.",
    bookingNotFound: "Booking not found",
    bookingNotFoundDesc: "This booking link may be invalid or expired.",
    loading: "Loading booking...",
    currentBooking: "Current Booking",
    newEndTime: "New End Time",
    selectNewEnd: "Select new end time...",
    noLaterSlots: "No later time slots available.",
    summary: "Extension Summary",
    additionalHours: "Additional Hours",
    additionalCost: "Additional Cost",
    newTotal: "New Total",
    confirmExtend: "Confirm Extension",
    extending: "Extending...",
    successTitle: "Booking Extended!",
    successDesc: "Your booking has been updated successfully.",
    newSchedule: "Updated Schedule",
    backToHome: "Back to Home",
    cancel: "Cancel",
    cannotExtend: "This booking cannot be extended.",
    cannotExtendDesc: "Only confirmed or active bookings can be extended.",
  },
  fr: {
    title: "Prolonger Votre Réservation",
    subtitle: "Besoin d'un peu plus de temps ? Prolongez votre réservation en quelques secondes.",
    verifyTitle: "Vérifiez Votre Identité",
    verifyDesc: "Entrez l'email utilisé lors de la réservation.",
    emailPlaceholder: "votre@email.com",
    verify: "Vérifier",
    verifying: "Vérification...",
    emailMismatch: "L'email ne correspond pas à cette réservation. Veuillez réessayer.",
    bookingNotFound: "Réservation introuvable",
    bookingNotFoundDesc: "Ce lien peut être invalide ou expiré.",
    loading: "Chargement...",
    currentBooking: "Réservation Actuelle",
    newEndTime: "Nouvelle Heure de Fin",
    selectNewEnd: "Sélectionner une nouvelle heure...",
    noLaterSlots: "Aucun créneau plus tard disponible.",
    summary: "Résumé de l'Extension",
    additionalHours: "Heures Supplémentaires",
    additionalCost: "Coût Additionnel",
    newTotal: "Nouveau Total",
    confirmExtend: "Confirmer l'Extension",
    extending: "Extension...",
    successTitle: "Réservation Prolongée !",
    successDesc: "Votre réservation a été mise à jour avec succès.",
    newSchedule: "Horaire Mis à Jour",
    backToHome: "Retour à l'Accueil",
    cancel: "Annuler",
    cannotExtend: "Cette réservation ne peut pas être prolongée.",
    cannotExtendDesc: "Seules les réservations confirmées ou en cours peuvent être prolongées.",
  },
};

export default function ExtendBooking() {
  const { id } = useParams<{ id: string }>();
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const s = T[locale];

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadingBooking, setLoadingBooking] = useState(true);

  const [step, setStep] = useState<Step>("verify");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [newEndTime, setNewEndTime] = useState("");
  const [extending, setExtending] = useState(false);

  // Fetch booking on mount
  useEffect(() => {
    if (!id) return;
    setLoadingBooking(true);
    fetch(`${API}/api/bookings/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data: BookingData) => {
        setBooking(data);
        setLoadingBooking(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoadingBooking(false);
      });
  }, [id]);

  // Default rate for parent price = 10€/hr
  const rate = 10;

  // Available time slots (after current end)
  const availableSlots = useMemo(() => {
    if (!booking) return [];
    const currentEnd = parseTimeToHours(booking.end_time || "");
    if (currentEnd === null) return [];
    return TIME_SLOTS.filter((slot) => {
      const slotHours = parseTimeToHours(slot.label);
      return slotHours !== null && slotHours > currentEnd;
    });
  }, [booking]);

  // Extension calculation
  const extension = useMemo(() => {
    if (!newEndTime || !booking) return null;
    const currentHours = calcBookedHours(
      booking.start_time,
      booking.end_time,
      booking.date,
      booking.end_date
    );
    const newHours = calcBookedHours(
      booking.start_time,
      newEndTime,
      booking.date,
      booking.end_date
    );
    const additionalHours = newHours - currentHours;
    const newTotalPrice = Math.round(rate * newHours);
    const additionalCost = newTotalPrice - (booking.total_price || 0);
    return { currentHours, newHours, additionalHours, newTotalPrice, additionalCost };
  }, [newEndTime, booking, rate]);

  const handleVerify = () => {
    if (!booking) return;
    setVerifying(true);
    setEmailError("");
    // Simple client-side email check
    setTimeout(() => {
      if (email.trim().toLowerCase() === booking.client_email.trim().toLowerCase()) {
        setStep("extend");
      } else {
        setEmailError(s.emailMismatch);
      }
      setVerifying(false);
    }, 600);
  };

  const handleExtend = async () => {
    if (!extension || !booking || !newEndTime) return;
    setExtending(true);
    try {
      const res = await fetch(`${API}/api/bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          end_time: newEndTime,
          total_price: extension.newTotalPrice,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setBooking((prev) =>
        prev ? { ...prev, end_time: newEndTime, total_price: extension.newTotalPrice } : prev
      );
      setStep("success");
    } catch {
      setExtending(false);
    }
  };

  const canExtend =
    booking &&
    (booking.status === "confirmed" || booking.status === "pending");

  // ─── Loading state ───
  if (loadingBooking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{s.loading}</p>
        </div>
      </div>
    );
  }

  // ─── Not found ───
  if (loadError || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full p-8 text-center">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{s.bookingNotFound}</h2>
          <p className="text-gray-500 text-sm mb-6">{s.bookingNotFoundDesc}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {s.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  // ─── Cannot extend (completed / cancelled) ───
  if (!canExtend) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-md w-full p-8 text-center">
          <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{s.cannotExtend}</h2>
          <p className="text-gray-500 text-sm mb-6">{s.cannotExtendDesc}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {s.backToHome}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-6 text-center text-white">
        <h1 className="text-2xl font-bold font-serif tracking-tight">call a nanny</h1>
        <p className="text-white/80 text-xs mt-1">Professional Childcare · Marrakech</p>
        {/* Language toggle */}
        <button
          onClick={() => setLocale((l) => (l === "en" ? "fr" : "en"))}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
        >
          {locale === "en" ? "FR" : "EN"}
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-4">
            <Clock className="w-7 h-7 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 font-serif">{s.title}</h2>
          <p className="text-gray-500 text-sm mt-2">{s.subtitle}</p>
        </div>

        {/* ─── Step 1: Email Verification ─── */}
        {step === "verify" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.verifyTitle}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{s.verifyDesc}</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Booking preview */}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{booking.client_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {booking.date} · {booking.start_time} - {booking.end_time}
                </p>
                {booking.nanny_name && (
                  <p className="text-xs text-gray-400 mt-1">
                    Nanny: {booking.nanny_name}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  placeholder={s.emailPlaceholder}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-400"
                />
                {emailError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {emailError}
                  </p>
                )}
              </div>

              <button
                onClick={handleVerify}
                disabled={!email.trim() || verifying}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {s.verifying}
                  </>
                ) : (
                  s.verify
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 2: Extend ─── */}
        {step === "extend" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Current booking summary */}
            <div className="px-6 py-5 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {s.currentBooking}
              </p>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{booking.client_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {booking.date}
                  {booking.end_date && booking.end_date !== booking.date
                    ? ` - ${booking.end_date}`
                    : ""}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-900 font-medium">
                    {booking.start_time} - {booking.end_time}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({calcBookedHours(booking.start_time, booking.end_time, booking.date, booking.end_date)}h)
                  </span>
                  <ArrowRight className="w-3 h-3 text-gray-300" />
                  <span className="text-sm font-semibold text-gray-900">
                    {booking.total_price?.toLocaleString()}€
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Time selector */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {s.newEndTime}
                </label>
                {availableSlots.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">{s.noLaterSlots}</p>
                ) : (
                  <select
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 appearance-none"
                  >
                    <option value="">{s.selectNewEnd}</option>
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
                <div className="bg-orange-50 border border-orange-200/60 rounded-xl px-4 py-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {s.summary}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{s.additionalHours}</span>
                    <span className="font-semibold text-orange-600">
                      +{extension.additionalHours.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{s.additionalCost}</span>
                    <span className="font-semibold text-orange-600">
                      +{extension.additionalCost.toLocaleString()}€
                    </span>
                  </div>
                  <div className="border-t border-orange-200/60 pt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{s.newTotal}</span>
                    <span className="text-lg font-bold text-gray-900">
                      {extension.newTotalPrice.toLocaleString()}€
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-1">
                    {booking.start_time} - {newEndTime} ({extension.newHours}h)
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setStep("verify");
                  setNewEndTime("");
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {s.cancel}
              </button>
              <button
                onClick={handleExtend}
                disabled={!extension || extending}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {extending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {s.extending}
                  </>
                ) : (
                  s.confirmExtend
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 3: Success ─── */}
        {step === "success" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-5">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{s.successTitle}</h3>
            <p className="text-gray-500 text-sm mb-6">{s.successDesc}</p>

            {/* Updated booking summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-4 mb-6 text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {s.newSchedule}
              </p>
              <p className="text-sm font-medium text-gray-900">{booking.client_name}</p>
              <p className="text-xs text-gray-500 mt-1">{booking.date}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-900 font-medium">
                  {booking.start_time} - {booking.end_time}
                </span>
                <ArrowRight className="w-3 h-3 text-gray-300" />
                <span className="text-sm font-bold text-orange-600">
                  {booking.total_price?.toLocaleString()}€
                </span>
              </div>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" />
              {s.backToHome}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
