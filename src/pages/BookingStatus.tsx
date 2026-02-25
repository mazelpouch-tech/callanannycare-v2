import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  ArrowLeft,
  Clock,
  MapPin,
  Users,
  Phone,
  CalendarDays,
  Timer,
  CircleDot,
  RefreshCw,
  MessageCircle,
  Star,
  XCircle,
  AlertTriangle,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";

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
  nanny_id: number | null;
  nanny_name: string | null;
  nanny_image: string | null;
  children_count: number;
  children_ages: string;
  notes: string;
  clock_in: string | null;
  clock_out: string | null;
  plan: string;
  created_at: string;
}

type Step = "verify" | "status";

const T = {
  en: {
    title: "Track Your Booking",
    subtitle: "Check the real-time status of your childcare booking.",
    verifyTitle: "Verify Your Identity",
    verifyDesc: "Enter the email address you used when booking.",
    emailPlaceholder: "your@email.com",
    verify: "Verify",
    verifying: "Verifying...",
    emailMismatch: "Email does not match this booking. Please try again.",
    bookingNotFound: "Booking not found",
    bookingNotFoundDesc: "This booking link may be invalid or expired.",
    loading: "Loading booking...",
    backToHome: "Back to Home",
    bookingRef: "Booking Ref",
    statusTitle: "Booking Status",
    yourNanny: "Your Nanny",
    nannyPending: "A nanny will be assigned shortly",
    bookingDetails: "Booking Details",
    dateLabel: "Date",
    timeLabel: "Time",
    hotelLabel: "Location",
    childrenLabel: "Children",
    totalLabel: "Total",
    notesLabel: "Notes",
    timeline: "Timeline",
    submitted: "Booking Submitted",
    confirmed: "Nanny Confirmed",
    shiftStarted: "Shift Started",
    shiftCompleted: "Shift Completed",
    clockedIn: "Clocked in at",
    clockedOut: "Clocked out at",
    liveUpdates: "Auto-refreshes every 30 seconds",
    lastUpdated: "Last updated",
    extendBooking: "Extend Booking",
    rebookBooking: "Book Again",
    contactNanny: "WhatsApp Nanny",
    pending: "Pending",
    confirmedStatus: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    active: "Active",
    cancelBooking: "Cancel Booking",
    cancelTitle: "Cancel Booking",
    cancelWarning: "This will notify your nanny and the Call a Nanny team.",
    cancelFeeWarning: "⚠️ Your booking is within 24 hours. A cancellation fee may apply.",
    cancelNoFee: "✅ No cancellation fee — you are cancelling more than 24 hours before your service.",
    cancelReasonLabel: "Reason for cancellation",
    cancelReasonPlaceholder: "e.g. Change of plans, schedule conflict...",
    keepBooking: "Keep Booking",
    yesCancelIt: "Yes, Cancel It",
    cancelling: "Cancelling...",
    cancelSuccess: "Booking cancelled successfully.",
    modifyBooking: "Modify Booking",
    modifyTitle: "Modify Your Booking",
    saveChanges: "Save Changes",
    date: "Date",
    endDate: "End Date",
    startTime: "Start Time",
    endTime: "End Time",
    select: "Select",
    hotel: "Hotel / Location",
    children: "Children",
    ages: "Ages",
    notes: "Notes",
    modifySuccess: "Booking updated successfully!",
  },
  fr: {
    title: "Suivre Votre Réservation",
    subtitle: "Consultez le statut en temps réel de votre réservation de garde.",
    verifyTitle: "Vérifiez Votre Identité",
    verifyDesc: "Entrez l'email utilisé lors de la réservation.",
    emailPlaceholder: "votre@email.com",
    verify: "Vérifier",
    verifying: "Vérification...",
    emailMismatch: "L'email ne correspond pas à cette réservation. Veuillez réessayer.",
    bookingNotFound: "Réservation introuvable",
    bookingNotFoundDesc: "Ce lien peut être invalide ou expiré.",
    loading: "Chargement...",
    backToHome: "Retour à l'Accueil",
    bookingRef: "Réf. Réservation",
    statusTitle: "Statut de la Réservation",
    yourNanny: "Votre Nounou",
    nannyPending: "Une nounou sera assignée sous peu",
    bookingDetails: "Détails de la Réservation",
    dateLabel: "Date",
    timeLabel: "Heure",
    hotelLabel: "Lieu",
    childrenLabel: "Enfants",
    totalLabel: "Total",
    notesLabel: "Notes",
    timeline: "Chronologie",
    submitted: "Réservation Soumise",
    confirmed: "Nounou Confirmée",
    shiftStarted: "Quart Commencé",
    shiftCompleted: "Quart Terminé",
    clockedIn: "Pointage entrée à",
    clockedOut: "Pointage sortie à",
    liveUpdates: "Actualisation automatique toutes les 30 secondes",
    lastUpdated: "Dernière mise à jour",
    extendBooking: "Prolonger la Réservation",
    rebookBooking: "Réserver à Nouveau",
    contactNanny: "WhatsApp Nounou",
    pending: "En attente",
    confirmedStatus: "Confirmée",
    completed: "Terminée",
    cancelled: "Annulée",
    active: "Active",
    cancelBooking: "Annuler la Réservation",
    cancelTitle: "Annuler la Réservation",
    cancelWarning: "Cela notifiera votre nounou et l'équipe Call a Nanny.",
    cancelFeeWarning: "⚠️ Votre réservation est dans moins de 24 heures. Des frais d'annulation peuvent s'appliquer.",
    cancelNoFee: "✅ Aucun frais d'annulation — vous annulez plus de 24 heures avant votre service.",
    cancelReasonLabel: "Raison de l'annulation",
    cancelReasonPlaceholder: "ex. Changement de plans, conflit d'horaire...",
    keepBooking: "Garder la Réservation",
    yesCancelIt: "Oui, Annuler",
    cancelling: "Annulation...",
    cancelSuccess: "Réservation annulée avec succès.",
    modifyBooking: "Modifier la Réservation",
    modifyTitle: "Modifier Votre Réservation",
    saveChanges: "Enregistrer",
    date: "Date",
    endDate: "Date de fin",
    startTime: "Heure de début",
    endTime: "Heure de fin",
    select: "Choisir",
    hotel: "Hôtel / Lieu",
    children: "Enfants",
    ages: "Âges",
    notes: "Notes",
    modifySuccess: "Réservation mise à jour avec succès !",
  },
};

// 24h time slots from 06:00 to 05:30 (business-day ordering, 30-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 48; i++) {
  const h = (6 + Math.floor(i / 2)) % 24;
  const m = (i % 2) * 30;
  const hh = String(h).padStart(2, "0");
  const mm = m === 0 ? "00" : "30";
  TIME_SLOTS.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
}

const RATE = 10;
const TAXI_FEE = 10;

const statusConfig: Record<string, { color: string; bg: string; border: string }> = {
  pending: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  confirmed: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  completed: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
  cancelled: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

function formatClockTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function BookingStatus() {
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cancel state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ startDate: "", endDate: "", startTime: "", endTime: "", hotel: "", numChildren: "1", childrenAges: "", notes: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  const openEditModal = () => {
    if (!booking) return;
    const parseTime = (t: string) => {
      const m = t?.match(/^(\d{1,2})h(\d{2})$/i);
      return m ? `${parseInt(m[1])}:${m[2]}` : "";
    };
    setEditForm({
      startDate: booking.date || "",
      endDate: booking.end_date || "",
      startTime: parseTime(booking.start_time),
      endTime: parseTime(booking.end_time),
      hotel: booking.hotel || "",
      numChildren: String(booking.children_count || 1),
      childrenAges: booking.children_ages || "",
      notes: booking.notes || "",
    });
    setEditSuccess(false);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!booking || !id) return;
    setEditLoading(true);
    const startLabel = TIME_SLOTS.find(ts => ts.value === editForm.startTime)?.label || editForm.startTime;
    const endLabel = TIME_SLOTS.find(ts => ts.value === editForm.endTime)?.label || editForm.endTime;

    // Recalculate price
    const [sh, sm] = (editForm.startTime || "0:0").split(":").map(Number);
    const [eh, em] = (editForm.endTime || "0:0").split(":").map(Number);
    const startH = sh + sm / 60;
    const endH = eh + em / 60;
    const hours = endH > startH ? endH - startH : (24 - startH) + endH;
    const startDate = new Date(editForm.startDate);
    const endDate = editForm.endDate ? new Date(editForm.endDate) : startDate;
    const dayCount = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1);
    const isEvening = eh > 19 || (eh === 19 && em > 0) || sh < 7;
    const taxiFee = isEvening ? TAXI_FEE * dayCount : 0;
    const totalPrice = RATE * hours * dayCount + taxiFee;

    try {
      const res = await fetch(`${API}/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.startDate,
          end_date: editForm.endDate || null,
          start_time: startLabel,
          end_time: endLabel,
          hotel: editForm.hotel,
          children_count: parseInt(editForm.numChildren) || 1,
          children_ages: editForm.childrenAges,
          notes: editForm.notes,
          total_price: totalPrice,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        setEditSuccess(true);
        setShowEditModal(false);
      }
    } catch (err) {
      console.error("Edit failed:", err);
    }
    setEditLoading(false);
  };

  const handleParentCancel = async () => {
    if (!booking || !id) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancellation_reason: cancelReason.trim(),
          cancelled_by: "parent",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        setCancelSuccess(true);
        setShowCancelModal(false);
        setCancelReason("");
      }
    } catch (err) {
      console.error("Cancel failed:", err);
    }
    setCancelLoading(false);
  };

  // Compute 24h fee flag for cancel modal
  const getHasFee = () => {
    if (!booking) return false;
    try {
      const startStr = (booking.start_time || "09:00").replace("h", ":");
      const bookingDateTime = new Date(`${booking.date}T${startStr}:00`);
      return (bookingDateTime.getTime() - Date.now()) / 3600000 < 24;
    } catch {
      return false;
    }
  };

  // Fetch booking on mount (basic existence check — no email data exposed)
  useEffect(() => {
    if (!id) return;
    setLoadingBooking(true);
    fetch(`${API}/api/bookings/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(() => {
        // Booking exists, but we don't store full data until verified
        setLoadingBooking(false);
      })
      .catch(() => {
        setLoadError(true);
        setLoadingBooking(false);
      });
  }, [id]);

  // Verify email and fetch full booking data
  const handleVerify = async () => {
    if (!id) return;
    setVerifying(true);
    setEmailError("");
    try {
      const res = await fetch(`${API}/api/bookings/${id}?email=${encodeURIComponent(email.trim())}`);
      if (res.status === 403) {
        setEmailError(s.emailMismatch);
        setVerifying(false);
        return;
      }
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setBooking(data);
      setLastUpdated(new Date());
      setStep("status");
    } catch {
      setEmailError(s.emailMismatch);
    }
    setVerifying(false);
  };

  // Auto-refresh every 30s once verified
  const refreshBooking = useCallback(async () => {
    if (!id || !email) return;
    try {
      const res = await fetch(`${API}/api/bookings/${id}?email=${encodeURIComponent(email.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        setLastUpdated(new Date());
      }
    } catch { /* silent */ }
  }, [id, email]);

  useEffect(() => {
    if (step !== "status") return;
    const interval = setInterval(refreshBooking, 30000);
    return () => clearInterval(interval);
  }, [step, refreshBooking]);

  // Status display helpers
  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: s.pending,
      confirmed: s.confirmedStatus,
      completed: s.completed,
      cancelled: s.cancelled,
    };
    return map[status] || status;
  };

  const isActive = booking?.clock_in && !booking?.clock_out && booking?.status !== "completed";

  // Timeline steps
  const getTimelineSteps = () => {
    if (!booking) return [];
    const steps = [
      {
        label: s.submitted,
        done: true,
        active: booking.status === "pending",
        detail: new Date(booking.created_at).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { month: "short", day: "numeric" }),
      },
      {
        label: s.confirmed,
        done: ["confirmed", "completed"].includes(booking.status) || !!booking.clock_in,
        active: booking.status === "confirmed" && !booking.clock_in,
        detail: null,
      },
      {
        label: s.shiftStarted,
        done: !!booking.clock_in,
        active: !!booking.clock_in && !booking.clock_out,
        detail: booking.clock_in ? `${s.clockedIn} ${formatClockTime(booking.clock_in)}` : null,
      },
      {
        label: s.shiftCompleted,
        done: booking.status === "completed",
        active: false,
        detail: booking.clock_out ? `${s.clockedOut} ${formatClockTime(booking.clock_out)}` : null,
      },
    ];
    return steps;
  };

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
  if (loadError) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-6 text-center text-white relative">
        <h1 className="text-2xl font-bold font-serif tracking-tight">call a nanny</h1>
        <p className="text-white/80 text-xs mt-1">Professional Childcare · Marrakech</p>
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
            <CalendarDays className="w-7 h-7 text-orange-500" />
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

        {/* ─── Step 2: Live Booking Status ─── */}
        {step === "status" && booking && (
          <div className="space-y-5">
            {/* Status Badge */}
            <div className={`rounded-2xl border ${statusConfig[booking.status]?.border || "border-gray-200"} ${statusConfig[booking.status]?.bg || "bg-gray-50"} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{s.bookingRef} #{booking.id}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${statusConfig[booking.status]?.color || "text-gray-700"}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                    {isActive && (
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                      {s.active} — {s.clockedIn} {formatClockTime(booking.clock_in!)}
                    </p>
                  )}
                </div>
                <button
                  onClick={refreshBooking}
                  className="p-2 rounded-lg hover:bg-white/50 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nanny Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.yourNanny}</p>
              </div>
              <div className="px-5 py-4">
                {booking.nanny_name ? (
                  <div className="flex items-center gap-4">
                    {booking.nanny_image ? (
                      <img
                        src={booking.nanny_image}
                        alt={booking.nanny_name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-orange-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                        <Star className="w-6 h-6 text-orange-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold text-gray-900">{booking.nanny_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Call a Nanny · Marrakech</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-gray-400">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-sm italic">{s.nannyPending}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.bookingDetails}</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="flex items-center gap-3 px-5 py-3">
                  <CalendarDays className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 w-20">{s.dateLabel}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {booking.date}
                    {booking.end_date && booking.end_date !== booking.date ? ` — ${booking.end_date}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <Timer className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 w-20">{s.timeLabel}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {booking.start_time} — {booking.end_time || "TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 w-20">{s.hotelLabel}</span>
                  <span className="text-sm font-medium text-gray-900">{booking.hotel || "N/A"}</span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <Users className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span className="text-xs text-gray-500 w-20">{s.childrenLabel}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {booking.children_count || 1}
                    {booking.children_ages ? ` (${booking.children_ages})` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-5 py-3">
                  <span className="w-4 h-4 flex items-center justify-center text-orange-400 flex-shrink-0 font-bold text-xs">€</span>
                  <span className="text-xs text-gray-500 w-20">{s.totalLabel}</span>
                  <span className="text-sm font-bold text-orange-600">{booking.total_price?.toLocaleString()}€</span>
                </div>
                {booking.notes && (
                  <div className="flex items-start gap-3 px-5 py-3">
                    <Phone className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-500 w-20">{s.notesLabel}</span>
                    <span className="text-sm text-gray-700">{booking.notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            {booking.status !== "cancelled" && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.timeline}</p>
                </div>
                <div className="px-5 py-4">
                  <div className="space-y-0">
                    {getTimelineSteps().map((tl, i, arr) => (
                      <div key={i} className="flex gap-3">
                        {/* Dot + Line */}
                        <div className="flex flex-col items-center">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            tl.done
                              ? "bg-green-500"
                              : tl.active
                              ? "bg-orange-500 animate-pulse"
                              : "bg-gray-200"
                          }`}>
                            {tl.done ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : (
                              <CircleDot className="w-3 h-3 text-white" />
                            )}
                          </div>
                          {i < arr.length - 1 && (
                            <div className={`w-0.5 h-8 ${tl.done ? "bg-green-300" : "bg-gray-200"}`} />
                          )}
                        </div>
                        {/* Label */}
                        <div className="pb-4">
                          <p className={`text-sm font-medium ${
                            tl.done ? "text-gray-900" : tl.active ? "text-orange-600" : "text-gray-400"
                          }`}>
                            {tl.label}
                          </p>
                          {tl.detail && (
                            <p className="text-xs text-gray-400 mt-0.5">{tl.detail}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Edit success message */}
            {editSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-700">{s.modifySuccess}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {(booking.status === "pending" || booking.status === "confirmed") && !cancelSuccess && (
                <button
                  onClick={openEditModal}
                  className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  {s.modifyBooking}
                </button>
              )}
              {(booking.status === "pending" || booking.status === "confirmed") && !cancelSuccess && (
                <Link
                  to={`/extend/${booking.id}`}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  {s.extendBooking}
                </Link>
              )}
              {booking.nanny_name && (
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hi, I'm ${booking.client_name}. I have a booking (#${booking.id}) on ${booking.date}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-green-500 text-white rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  {s.contactNanny}
                </a>
              )}
              <Link
                to={`/rebook/${booking.id}`}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {s.rebookBooking}
              </Link>

              {/* Cancel Booking */}
              {(booking.status === "pending" || booking.status === "confirmed") && !cancelSuccess && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl text-sm font-bold text-center hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {s.cancelBooking}
                </button>
              )}

              {/* Cancel success message */}
              {cancelSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-green-700">{s.cancelSuccess}</p>
                </div>
              )}
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCancelModal(false); setCancelReason(""); }}>
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{s.cancelTitle}</h3>
                        <p className="text-sm text-gray-500">#{booking.id}</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-3">
                      <p className="text-sm text-orange-800">{s.cancelWarning}</p>
                    </div>

                    {/* 24h fee warning */}
                    <div className={`rounded-xl p-3 mb-4 ${getHasFee() ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                      <p className={`text-sm ${getHasFee() ? "text-red-700" : "text-green-700"}`}>
                        {getHasFee() ? s.cancelFeeWarning : s.cancelNoFee}
                      </p>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {s.cancelReasonLabel} <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder={s.cancelReasonPlaceholder}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 p-4 border-t border-gray-100">
                    <button
                      onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {s.keepBooking}
                    </button>
                    <button
                      onClick={handleParentCancel}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {cancelLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {s.cancelling}</>
                      ) : (
                        s.yesCancelIt
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Booking Modal */}
            {showEditModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                        <Pencil className="w-5 h-5 text-violet-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">{s.modifyTitle}</h3>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.date} *</label>
                        <input
                          type="date"
                          required
                          value={editForm.startDate}
                          onChange={(e) => setEditForm(f => ({ ...f, startDate: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.endDate}</label>
                        <input
                          type="date"
                          value={editForm.endDate}
                          min={editForm.startDate}
                          onChange={(e) => setEditForm(f => ({ ...f, endDate: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                        />
                      </div>
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.startTime} *</label>
                        <div className="relative">
                          <select
                            required
                            value={editForm.startTime}
                            onChange={(e) => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50 appearance-none"
                          >
                            <option value="">{s.select}</option>
                            {TIME_SLOTS.map((ts) => (
                              <option key={ts.value} value={ts.value}>{ts.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.endTime}</label>
                        <div className="relative">
                          <select
                            value={editForm.endTime}
                            onChange={(e) => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50 appearance-none"
                          >
                            <option value="">{s.select}</option>
                            {TIME_SLOTS.map((ts) => (
                              <option key={ts.value} value={ts.value}>{ts.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Hotel */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{s.hotel}</label>
                      <input
                        type="text"
                        value={editForm.hotel}
                        onChange={(e) => setEditForm(f => ({ ...f, hotel: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                      />
                    </div>

                    {/* Children */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.children}</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editForm.numChildren}
                          onChange={(e) => setEditForm(f => ({ ...f, numChildren: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">{s.ages}</label>
                        <input
                          type="text"
                          value={editForm.childrenAges}
                          onChange={(e) => setEditForm(f => ({ ...f, childrenAges: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{s.notes}</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/50 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 p-4 border-t border-gray-100">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      {s.keepBooking}
                    </button>
                    <button
                      onClick={handleEditSubmit}
                      disabled={editLoading || !editForm.startDate || !editForm.startTime}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-500 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {editLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {s.saveChanges}</>
                      ) : (
                        s.saveChanges
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Auto-refresh footer */}
            <div className="text-center space-y-1">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {s.liveUpdates}
              </p>
              {lastUpdated && (
                <p className="text-xs text-gray-300">
                  {s.lastUpdated}: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
