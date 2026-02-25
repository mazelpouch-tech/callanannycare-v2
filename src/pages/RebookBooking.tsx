import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Mail,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Hotel,
  Baby,
  Calendar,
} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr as frLocale } from "date-fns/locale";

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
  children_count: number;
  children_ages: string;
  notes: string;
}

type Step = "verify" | "rebook" | "success";

// 24h time slots from 06:00 to 05:30 (business-day ordering, 30-min steps)
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let i = 0; i < 48; i++) {
  const h = (6 + Math.floor(i / 2)) % 24;
  const m = (i % 2) * 30;
  const hh = String(h).padStart(2, "0");
  const mm = m === 0 ? "00" : "30";
  TIME_SLOTS.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
}

function parseTimeValue(val: string) {
  const [h, m] = val.split(":").map(Number);
  return h + m / 60;
}

const RATE = 10;
const TAXI_FEE = 10;
const NIGHT_START = 19;
const NIGHT_END = 7;

const T = {
  en: {
    title: "Book Again",
    subtitle: "Rebook quickly with your previous details pre-filled.",
    verifyTitle: "Verify Your Identity",
    verifyDesc: "Enter the email address you used for your previous booking.",
    emailPlaceholder: "your@email.com",
    verify: "Verify",
    verifying: "Verifying...",
    emailMismatch: "Email does not match this booking. Please try again.",
    bookingNotFound: "Booking not found",
    bookingNotFoundDesc: "This booking link may be invalid or expired.",
    loading: "Loading booking...",
    previousNanny: "Your previous nanny",
    yourDetails: "Your Details",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    hotel: "Hotel / Accommodation",
    children: "Number of Children",
    selectDate: "Select Date(s)",
    selectDateDesc: "Pick the date(s) for your new booking.",
    startTime: "Start Time",
    endTime: "End Time",
    selectTime: "Select time...",
    priceSummary: "Price Summary",
    hours: "hours",
    perDay: "per day",
    taxiFee: "Evening taxi fee",
    total: "Total",
    confirmBooking: "Confirm Booking",
    submitting: "Submitting...",
    successTitle: "Booking Confirmed!",
    successDesc: "Your new booking has been created successfully. A nanny will be assigned shortly.",
    backToHome: "Back to Home",
    cancel: "Cancel",
    dayHeaders: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  },
  fr: {
    title: "Réserver à Nouveau",
    subtitle: "Réservez rapidement avec vos informations pré-remplies.",
    verifyTitle: "Vérifiez Votre Identité",
    verifyDesc: "Entrez l'email utilisé pour votre réservation précédente.",
    emailPlaceholder: "votre@email.com",
    verify: "Vérifier",
    verifying: "Vérification...",
    emailMismatch: "L'email ne correspond pas. Veuillez réessayer.",
    bookingNotFound: "Réservation introuvable",
    bookingNotFoundDesc: "Ce lien peut être invalide ou expiré.",
    loading: "Chargement...",
    previousNanny: "Votre nounou précédente",
    yourDetails: "Vos Informations",
    fullName: "Nom Complet",
    email: "Email",
    phone: "Téléphone",
    hotel: "Hôtel / Hébergement",
    children: "Nombre d'Enfants",
    selectDate: "Sélectionner les Date(s)",
    selectDateDesc: "Choisissez la ou les dates pour votre nouvelle réservation.",
    startTime: "Heure de Début",
    endTime: "Heure de Fin",
    selectTime: "Sélectionner l'heure...",
    priceSummary: "Résumé du Prix",
    hours: "heures",
    perDay: "par jour",
    taxiFee: "Frais de taxi le soir",
    total: "Total",
    confirmBooking: "Confirmer la Réservation",
    submitting: "Envoi...",
    successTitle: "Réservation Confirmée !",
    successDesc: "Votre nouvelle réservation a été créée. Une nounou sera assignée sous peu.",
    backToHome: "Retour à l'Accueil",
    cancel: "Annuler",
    dayHeaders: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
  },
};

export default function RebookBooking() {
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

  // Rebook form state (pre-filled from previous booking)
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [hotel, setHotel] = useState("");
  const [numChildren, setNumChildren] = useState("1");

  // New date/time
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  const [submitting, setSubmitting] = useState(false);
  const [newBookingId, setNewBookingId] = useState<number | null>(null);

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

  // Pre-fill form when booking loads and step transitions to rebook
  useEffect(() => {
    if (booking && step === "rebook") {
      setFullName(booking.client_name || "");
      setPhone(booking.client_phone || "");
      setHotel(booking.hotel || "");
      setNumChildren(String(booking.children_count || 1));
    }
  }, [booking, step]);

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const todayDate = startOfDay(new Date());
  const dateFnsLocale = locale === "fr" ? frLocale : undefined;

  const toggleDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) return prev.filter((d) => !isSameDay(d, date));
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  // Price calculation
  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const start = parseTimeValue(startTime);
    const end = parseTimeValue(endTime);
    // Handle overnight bookings (e.g. 18:00 → 01:00 = 7h)
    return end > start ? end - start : (24 - start) + end;
  }, [startTime, endTime]);

  const isEveningBooking = useMemo(() => {
    if (!startTime || !endTime) return false;
    const startHour = parseInt(startTime.split(":")[0], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    const endMin = parseInt(endTime.split(":")[1], 10);
    return (endHour > NIGHT_START || (endHour === NIGHT_START && endMin > 0)) || startHour < NIGHT_END;
  }, [startTime, endTime]);

  const taxiFeeTotal = useMemo(() => {
    return isEveningBooking ? TAXI_FEE * selectedDates.length : 0;
  }, [isEveningBooking, selectedDates.length]);

  const totalPrice = useMemo(() => {
    return RATE * hours * selectedDates.length + taxiFeeTotal;
  }, [hours, selectedDates.length, taxiFeeTotal]);

  const canSubmit =
    fullName.trim() &&
    email.trim() &&
    phone.trim() &&
    hotel.trim() &&
    selectedDates.length > 0 &&
    startTime &&
    endTime &&
    hours > 0;

  const handleVerify = () => {
    if (!booking) return;
    setVerifying(true);
    setEmailError("");
    setTimeout(() => {
      if (email.trim().toLowerCase() === booking.client_email.trim().toLowerCase()) {
        setStep("rebook");
      } else {
        setEmailError(s.emailMismatch);
      }
      setVerifying(false);
    }, 600);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !booking) return;
    setSubmitting(true);

    const firstDate = format(selectedDates[0], "yyyy-MM-dd");
    const lastDate = selectedDates.length > 1 ? format(selectedDates[selectedDates.length - 1], "yyyy-MM-dd") : null;
    const startLabel = TIME_SLOTS.find((sl) => sl.value === startTime)?.label || startTime;
    const endLabel = TIME_SLOTS.find((sl) => sl.value === endTime)?.label || endTime;

    try {
      const res = await fetch(`${API}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: fullName,
          client_email: email,
          client_phone: phone,
          hotel,
          date: firstDate,
          end_date: lastDate,
          start_time: startLabel,
          end_time: endLabel,
          plan: "hourly",
          children_count: Number(numChildren),
          children_ages: booking.children_ages || "",
          notes: booking.notes || "",
          total_price: totalPrice,
          locale,
          status: "pending",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const created = await res.json();
      setNewBookingId(created.id);
      setStep("success");
    } catch {
      // stay on current step
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ───
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

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-4">
            <Calendar className="w-7 h-7 text-orange-500" />
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

        {/* ─── Step 2: Rebook Form ─── */}
        {step === "rebook" && (
          <div className="space-y-5">
            {/* Previous nanny info */}
            {booking.nanny_name && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-5 py-4 flex items-center gap-4">
                {booking.nanny_image ? (
                  <img
                    src={booking.nanny_image}
                    alt={booking.nanny_name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-orange-500" />
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{s.previousNanny}</p>
                  <p className="text-sm font-bold text-gray-900">{booking.nanny_name}</p>
                </div>
              </div>
            )}

            {/* Your Details (pre-filled, editable) */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">{s.yourDetails}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <User className="w-3.5 h-3.5" /> {s.fullName}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Mail className="w-3.5 h-3.5" /> {s.email}
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Phone className="w-3.5 h-3.5" /> {s.phone}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Hotel className="w-3.5 h-3.5" /> {s.hotel}
                  </label>
                  <input
                    type="text"
                    value={hotel}
                    onChange={(e) => setHotel(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Baby className="w-3.5 h-3.5" /> {s.children}
                  </label>
                  <select
                    value={numChildren}
                    onChange={(e) => setNumChildren(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 bg-white"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">{s.selectDate}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{s.selectDateDesc}</p>
              </div>
              <div className="px-5 py-4">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}
                  </h4>
                  <button
                    onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {s.dayHeaders.map((d) => (
                    <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {days.map((day) => {
                    const isPast = isBefore(day, todayDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDates.some((d) => isSameDay(d, day));
                    const isTodayDay = isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        disabled={isPast || !isCurrentMonth}
                        onClick={() => toggleDate(day)}
                        className={`aspect-square flex items-center justify-center text-xs rounded-full transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold shadow-md"
                            : isTodayDay
                            ? "ring-2 ring-orange-400 text-gray-900 font-semibold"
                            : isPast || !isCurrentMonth
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-700 hover:bg-gray-100 font-medium"
                        }`}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                {/* Selected date chips */}
                {selectedDates.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedDates.map((d) => (
                      <span
                        key={d.toISOString()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-medium"
                      >
                        {format(d, "EEE, MMM d", { locale: dateFnsLocale })}
                        <button
                          type="button"
                          onClick={() => setSelectedDates((prev) => prev.filter((x) => !isSameDay(x, d)))}
                          className="hover:bg-orange-100 rounded-full p-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Time Selectors */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5" /> {s.startTime}
                  </label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 bg-white"
                  >
                    <option value="">{s.selectTime}</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`s-${slot.value}`} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Clock className="w-3.5 h-3.5" /> {s.endTime}
                  </label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 bg-white"
                  >
                    <option value="">{s.selectTime}</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={`e-${slot.value}`} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            {hours > 0 && selectedDates.length > 0 && (
              <div className="bg-orange-50 border border-orange-200/60 rounded-2xl px-5 py-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{s.priceSummary}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {RATE}€ × {hours}h × {selectedDates.length} {s.perDay}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {(RATE * hours * selectedDates.length).toLocaleString()}€
                  </span>
                </div>
                {isEveningBooking && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600">{s.taxiFee}</span>
                    <span className="font-semibold text-amber-600">+{taxiFeeTotal}€</span>
                  </div>
                )}
                <div className="border-t border-orange-200/60 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">{s.total}</span>
                  <span className="text-xl font-bold text-gray-900">{totalPrice.toLocaleString()}€</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep("verify");
                  setSelectedDates([]);
                  setStartTime("");
                  setEndTime("");
                }}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {s.cancel}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {s.submitting}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {s.confirmBooking}
                  </>
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

            {/* New booking summary */}
            <div className="bg-gray-50 rounded-xl px-4 py-4 mb-6 text-left space-y-1">
              {newBookingId && (
                <p className="text-xs text-gray-400">Booking #{newBookingId}</p>
              )}
              <p className="text-sm font-medium text-gray-900">{fullName}</p>
              <p className="text-xs text-gray-500">
                {selectedDates.map((d) => format(d, "MMM d", { locale: dateFnsLocale })).join(", ")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-900 font-medium">
                  {TIME_SLOTS.find((sl) => sl.value === startTime)?.label || startTime} -{" "}
                  {TIME_SLOTS.find((sl) => sl.value === endTime)?.label || endTime}
                </span>
                <span className="text-sm font-bold text-orange-600">{totalPrice.toLocaleString()}€</span>
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
