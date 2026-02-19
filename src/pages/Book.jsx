import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Baby,
  Hotel,
  FileText,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  MessageCircle,
} from "lucide-react";
import { useData } from "../context/DataContext";

const STEPS = [
  { number: 1, label: "Date & Time" },
  { number: 2, label: "Your Details" },
  { number: 3, label: "Review" },
];

const PLANS = [
  { id: "hourly", name: "Hourly", hours: null, label: "Per Hour" },
  { id: "half-day", name: "Half-Day", hours: 5, label: "5 Hours" },
  { id: "full-day", name: "Full-Day", hours: 10, label: "10 Hours" },
];

function generateTimeSlots() {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h >= 12 ? "PM" : "AM";
    slots.push({ value: `${h}:00`, label: `${hour12}:00 ${ampm}` });
    slots.push({ value: `${h}:30`, label: `${hour12}:30 ${ampm}` });
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function parseTimeValue(val) {
  const [h, m] = val.split(":").map(Number);
  return h + m / 60;
}

function calculateHours(startTime, endTime) {
  const start = parseTimeValue(startTime);
  const end = parseTimeValue(endTime);
  return Math.max(0, end - start);
}

// --- Progress Bar ---
function ProgressBar({ currentStep }) {
  return (
    <div className="w-full mb-8 md:mb-12">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((step, idx) => {
          const isCompleted = currentStep > step.number;
          const isActive = currentStep === step.number;
          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    isCompleted
                      ? "gradient-warm text-white shadow-warm"
                      : isActive
                      ? "gradient-warm text-white shadow-warm scale-110"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <span
                  className={`mt-1.5 text-xs font-medium hidden sm:block ${
                    isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-all duration-300 ${
                    currentStep > step.number ? "gradient-warm" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Step 1: Date & Time ---
function StepDateTime({
  selectedDate,
  onDateSelect,
  selectedPlan,
  onPlanSelect,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  nannyRate,
  onBack,
  onNext,
}) {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date())
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const todayDate = startOfDay(new Date());

  const planData = PLANS.find((p) => p.id === selectedPlan);
  const planPrice = useMemo(() => {
    if (selectedPlan === "hourly") return nannyRate;
    if (selectedPlan === "half-day") return nannyRate * 5;
    if (selectedPlan === "full-day") return nannyRate * 10;
    return 0;
  }, [selectedPlan, nannyRate]);

  // Auto-adjust end time for half-day and full-day
  useEffect(() => {
    if (!startTime) return;
    if (selectedPlan === "half-day") {
      const start = parseTimeValue(startTime);
      const endVal = Math.min(start + 5, 20);
      const endH = Math.floor(endVal);
      const endM = (endVal % 1) * 60;
      onEndTimeChange(`${endH}:${endM === 0 ? "00" : "30"}`);
    } else if (selectedPlan === "full-day") {
      const start = parseTimeValue(startTime);
      const endVal = Math.min(start + 10, 20);
      const endH = Math.floor(endVal);
      const endM = (endVal % 1) * 60;
      onEndTimeChange(`${endH}:${endM === 0 ? "00" : "30"}`);
    }
  }, [selectedPlan, startTime, onEndTimeChange]);

  const isValid = selectedDate && selectedPlan && startTime && endTime;

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Choose Date & Time
      </h2>
      <p className="text-muted-foreground mb-6">
        Pick your preferred date, plan, and time slot.
      </p>

      {/* Calendar */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="font-serif font-bold text-lg text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-xs font-semibold text-muted-foreground py-2"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const isPast = isBefore(day, todayDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
            const isTodayDay = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast || !isCurrentMonth}
                onClick={() => onDateSelect(day)}
                className={`aspect-square flex items-center justify-center text-sm rounded-full transition-all duration-200 ${
                  isSelectedDay
                    ? "gradient-warm text-white font-bold shadow-warm"
                    : isTodayDay
                    ? "ring-2 ring-primary text-foreground font-semibold hover:bg-primary/10"
                    : isPast || !isCurrentMonth
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-muted font-medium"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plan Selector */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
          <Calendar className="w-4 h-4 text-primary" />
          Select Plan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const isActive = selectedPlan === plan.id;
            const price =
              plan.id === "hourly"
                ? nannyRate
                : plan.id === "half-day"
                ? nannyRate * 5
                : nannyRate * 10;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onPlanSelect(plan.id)}
                className={`p-4 rounded-xl text-center transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "gradient-warm text-white shadow-warm"
                    : "bg-card border border-border hover:border-primary/40 hover:shadow-soft"
                }`}
              >
                <div className={`font-bold text-lg ${isActive ? "text-white" : "text-foreground"}`}>
                  {plan.name}
                </div>
                <div className={`text-sm mt-1 ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                  {plan.label}
                </div>
                <div className={`font-bold text-lg mt-2 ${isActive ? "text-white" : "text-primary"}`}>
                  {price} MAD
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Clock className="w-4 h-4 text-primary" />
            Start Time
          </label>
          <select
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Select start time</option>
            {TIME_SLOTS.map((slot) => (
              <option key={`start-${slot.value}`} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Clock className="w-4 h-4 text-primary" />
            End Time
          </label>
          <select
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={selectedPlan === "half-day" || selectedPlan === "full-day"}
            className="w-full rounded-lg border border-border bg-card p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">Select end time</option>
            {TIME_SLOTS.map((slot) => (
              <option key={`end-${slot.value}`} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex ${onBack ? "justify-between" : "justify-end"}`}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Step 3: Your Details ---
function StepDetails({ details, onChange, onBack, onNext }) {
  const handleChange = (field) => (e) => {
    onChange({ ...details, [field]: e.target.value });
  };

  const isValid =
    details.fullName.trim() &&
    details.email.trim() &&
    details.phone.trim() &&
    details.accommodation.trim();

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Your Details
      </h2>
      <p className="text-muted-foreground mb-6">
        Tell us about yourself so we can prepare for your booking.
      </p>

      <div className="space-y-4 max-w-xl">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <User className="w-4 h-4 text-primary" />
            Full Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={details.fullName}
            onChange={handleChange("fullName")}
            placeholder="Your full name"
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Mail className="w-4 h-4 text-primary" />
            Email <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            required
            value={details.email}
            onChange={handleChange("email")}
            placeholder="your@email.com"
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Phone className="w-4 h-4 text-primary" />
            Phone <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            required
            value={details.phone}
            onChange={handleChange("phone")}
            placeholder="+212 600 000 000"
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Hotel / Accommodation */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Hotel className="w-4 h-4 text-primary" />
            Hotel / Accommodation <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={details.accommodation}
            onChange={handleChange("accommodation")}
            placeholder="e.g. Riad Yasmine, Royal Mansour"
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Number of Children */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Baby className="w-4 h-4 text-primary" />
            Number of Children
          </label>
          <select
            value={details.numChildren}
            onChange={handleChange("numChildren")}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Children's Ages */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Baby className="w-4 h-4 text-primary" />
            Children&apos;s Ages
          </label>
          <input
            type="text"
            value={details.childrenAges}
            onChange={handleChange("childrenAges")}
            placeholder="e.g. 3, 5"
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Special Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <FileText className="w-4 h-4 text-primary" />
            Special Notes <span className="text-muted-foreground text-xs">(optional)</span>
          </label>
          <textarea
            value={details.notes}
            onChange={handleChange("notes")}
            placeholder="Any allergies, preferences, or special requests..."
            rows={3}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-semibold hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Step 3: Review & Confirm ---
function StepReview({
  selectedDate,
  startTime,
  endTime,
  selectedPlan,
  details,
  totalPrice,
  hours,
  onEdit,
  onConfirm,
  isSubmitting,
}) {
  const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
  const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;
  const planLabel = PLANS.find((p) => p.id === selectedPlan)?.name || selectedPlan;

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Review & Confirm
      </h2>
      <p className="text-muted-foreground mb-6">
        Please review your booking details before confirming.
      </p>

      <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-soft max-w-2xl">
        {/* Nanny Assignment Info */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Nanny Assignment</h3>
            <p className="text-sm text-muted-foreground">A nanny will be assigned automatically</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Date & Time
            </span>
            <button
              type="button"
              onClick={() => onEdit(1)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">Date:</span>{" "}
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
            <p>
              <span className="text-foreground font-medium">Time:</span>{" "}
              {startLabel} - {endLabel}
            </p>
            <p>
              <span className="text-foreground font-medium">Plan:</span>{" "}
              {planLabel}
            </p>
          </div>
        </div>

        {/* Client Details */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Your Details
            </span>
            <button
              type="button"
              onClick={() => onEdit(2)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">Name:</span>{" "}
              {details.fullName}
            </p>
            <p>
              <span className="text-foreground font-medium">Email:</span>{" "}
              {details.email}
            </p>
            <p>
              <span className="text-foreground font-medium">Phone:</span>{" "}
              {details.phone}
            </p>
            <p>
              <span className="text-foreground font-medium">Accommodation:</span>{" "}
              {details.accommodation}
            </p>
            <p>
              <span className="text-foreground font-medium">Children:</span>{" "}
              {details.numChildren}
              {details.childrenAges && ` (ages: ${details.childrenAges})`}
            </p>
            {details.notes && (
              <p>
                <span className="text-foreground font-medium">Notes:</span>{" "}
                {details.notes}
              </p>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              150 MAD x {hours} hr{hours !== 1 ? "s" : ""}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {totalPrice} MAD
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="gradient-warm text-white font-bold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-warm text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Submitting...</span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirm Booking
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Success State ---
function BookingSuccess({ onBookAnother, onGoHome, bookingData }) {
  const whatsAppConfirm = () => {
    const msg = encodeURIComponent(
      `Hi! I just booked a nanny session with call a nanny.\n\nDate: ${bookingData.date}\nTime: ${bookingData.startTime}${bookingData.endTime ? ` - ${bookingData.endTime}` : ""}\nPlan: ${bookingData.plan}\n\nLooking forward to it!`
    );
    window.open(`https://wa.me/212600000000?text=${msg}`, "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-bounce">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full gradient-warm opacity-30 animate-ping" />
      </div>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
        Booking Submitted!
      </h2>
      <p className="text-muted-foreground text-lg max-w-md mb-4">
        We'll confirm your booking shortly. You'll receive a confirmation
        with all the details.
      </p>

      {/* Parent form CTA */}
      <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 max-w-md mb-8 w-full">
        <p className="text-sm font-semibold text-foreground mb-1.5">
          One more step!
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Please fill out the child information form so your nanny can prepare
          for a great experience.
        </p>
        <Link
          to="/parent-form"
          className="bg-accent text-white font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2 text-sm"
        >
          <FileText className="w-4 h-4" />
          Fill Child Info Form
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={whatsAppConfirm}
          className="flex-1 bg-green-500 text-white font-semibold px-5 py-3 rounded-full hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Confirm via WhatsApp
        </button>
        <button
          type="button"
          onClick={onBookAnother}
          className="flex-1 gradient-warm text-white font-semibold px-5 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Book Another
        </button>
      </div>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-3 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Home
      </button>
    </div>
  );
}

// --- Main Book Component ---
export default function Book() {
  const { addBooking } = useData();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1 state
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState("hourly");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 3 state
  const [details, setDetails] = useState({
    fullName: "",
    email: "",
    phone: "",
    accommodation: "",
    numChildren: "1",
    childrenAges: "",
    notes: "",
  });

  const RATE = 150; // MAD per hour

  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const totalPrice = useMemo(() => {
    return RATE * hours;
  }, [hours]);

  const handleConfirm = () => {
    if (!selectedDate) return;

    setIsSubmitting(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;

    const bookingPayload = {
      date: format(selectedDate, "yyyy-MM-dd"),
      startTime: startLabel,
      endTime: endLabel,
      plan: selectedPlan,
      hours,
      totalPrice,
      clientName: details.fullName,
      clientEmail: details.email,
      clientPhone: details.phone,
      accommodation: details.accommodation,
      numChildren: details.numChildren,
      childrenAges: details.childrenAges,
      notes: details.notes,
      status: "pending",
    };

    // Simulate brief delay
    setTimeout(() => {
      addBooking(bookingPayload);
      setLastBookingData(bookingPayload);
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 600);
  };

  const handleBookAnother = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedPlan("hourly");
    setStartTime("");
    setEndTime("");
    setDetails({
      fullName: "",
      email: "",
      phone: "",
      accommodation: "",
      numChildren: "1",
      childrenAges: "",
      notes: "",
    });
    setIsSuccess(false);
  };

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, isSuccess]);

  // Store last booking data for success screen
  const [lastBookingData, setLastBookingData] = useState(null);

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <BookingSuccess
            onBookAnother={handleBookAnother}
            onGoHome={() => navigate("/")}
            bookingData={lastBookingData}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground">
            Book a Nanny
          </h1>
          <p className="text-muted-foreground mt-2">
            Secure, trusted childcare for your stay in Marrakech.
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={step} />

        {/* Steps */}
        {step === 1 && (
          <StepDateTime
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            selectedPlan={selectedPlan}
            onPlanSelect={setSelectedPlan}
            startTime={startTime}
            onStartTimeChange={setStartTime}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            nannyRate={RATE}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepDetails
            details={details}
            onChange={setDetails}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <StepReview
            selectedDate={selectedDate}
            startTime={startTime}
            endTime={endTime}
            selectedPlan={selectedPlan}
            details={details}
            totalPrice={totalPrice}
            hours={hours}
            onEdit={(s) => setStep(s)}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
