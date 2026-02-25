import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { fr } from "date-fns/locale";
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
  X,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useLanguage } from "../context/LanguageContext";
import PhoneInput from "../components/PhoneInput";
import type { BookingPlan } from "@/types";

// ---- Interfaces ----

interface ProgressBarProps {
  currentStep: number;
}

interface StepDateTimeProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  startTime: string;
  onStartTimeChange: (time: string) => void;
  endTime: string;
  onEndTimeChange: (time: string) => void;
  onBack?: () => void;
  onNext: () => void;
}

interface BookingDetails {
  fullName: string;
  email: string;
  phone: string;
  accommodation: string;
  numChildren: string;
  notes: string;
}

interface StepDetailsProps {
  details: BookingDetails;
  onChange: (details: BookingDetails) => void;
  onBack: () => void;
  onNext: () => void;
}

interface ChildInfo {
  childFirstName: string;
  childLastName: string;
  childAge: string;
  childGender: string;
  allergies: string;
  noAllergies: boolean;
  specialInstructions: string;
}

interface StepChildInfoProps {
  childrenInfo: ChildInfo[];
  onChange: (info: ChildInfo[]) => void;
  agreeTerms: boolean;
  onAgreeTermsChange: (val: boolean) => void;
  wantUpdates: boolean;
  onWantUpdatesChange: (val: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

interface StepReviewProps {
  selectedDates: Date[];
  startTime: string;
  endTime: string;
  details: BookingDetails;
  childrenInfo: ChildInfo[];
  totalPrice: number;
  hours: number;
  dateCount: number;
  taxiFeeTotal: number;
  isEveningBooking: boolean;
  onEdit: (step: number) => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

interface LastBookingData extends BookingDetails {
  dates: string[];
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  childNames: string;
}

interface BookingSuccessProps {
  onBookAnother: () => void;
  onGoHome: () => void;
  bookingData: LastBookingData | null;
}

// ---- Constants ----

const EMPTY_CHILD: ChildInfo = {
  childFirstName: "",
  childLastName: "",
  childAge: "",
  childGender: "",
  allergies: "",
  noAllergies: false,
  specialInstructions: "",
};

const RATE = 10; // EUR per hour
const TAXI_FEE = 10; // EUR flat fee for bookings in the 7 PM – 7 AM night window

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

function calculateHours(startTime: string, endTime: string) {
  const start = parseTimeValue(startTime);
  const end = parseTimeValue(endTime);
  // Handle overnight bookings (e.g. 18:00 → 01:00 = 7h)
  if (end <= start) return (24 - start) + end;
  return end - start;
}

// --- Progress Bar ---
function ProgressBar({ currentStep }: ProgressBarProps) {
  const { t } = useLanguage();

  const STEPS = [
    { number: 1, label: t("book.stepDateTime") },
    { number: 2, label: t("book.stepDetails") },
    { number: 3, label: t("book.stepChildInfo") },
    { number: 4, label: t("book.stepReview") },
  ];

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
  selectedDates,
  onDatesChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  onBack,
  onNext,
}: StepDateTimeProps) {
  const { t, locale } = useLanguage();
  const dateFnsLocale = locale === "fr" ? fr : undefined;

  const [currentMonth, setCurrentMonth] = useState(
    selectedDates.length > 0 ? startOfMonth(selectedDates[0]) : startOfMonth(new Date())
  );
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const todayDate = startOfDay(new Date());

  const isValid = selectedDates.length > 0 && startTime && endTime;

  const dayHeaders = locale === "fr"
    ? ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Set of selected date keys for fast lookup
  const selectedSet = useMemo(
    () => new Set(selectedDates.map((d) => d.toISOString())),
    [selectedDates]
  );

  // Preview range when hovering after first click (desktop only)
  const previewSet = useMemo(() => {
    if (!rangeStart || !hoveredDate) return new Set<string>();
    const start = rangeStart <= hoveredDate ? rangeStart : hoveredDate;
    const end = rangeStart <= hoveredDate ? hoveredDate : rangeStart;
    return new Set(eachDayOfInterval({ start, end }).map((d) => d.toISOString()));
  }, [rangeStart, hoveredDate]);

  const handleDateClick = (day: Date) => {
    if (!rangeStart) {
      // First click — set range start
      setRangeStart(day);
      onDatesChange([day]);
    } else {
      // Second click — complete the range
      const start = rangeStart <= day ? rangeStart : day;
      const end = rangeStart <= day ? day : rangeStart;
      const range = eachDayOfInterval({ start, end });
      onDatesChange(range);
      setRangeStart(null);
      setHoveredDate(null);
    }
  };

  const clearDates = () => {
    onDatesChange([]);
    setRangeStart(null);
    setHoveredDate(null);
  };

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        {t("book.chooseDateTitle")}
      </h2>
      <p className="text-muted-foreground mb-6">
        {rangeStart
          ? (locale === "fr" ? "Appuyez sur la date de fin pour sélectionner la période" : "Now tap the end date to select the range")
          : t("book.chooseDateSubtitle")}
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
            {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale })}
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
          {dayHeaders.map((d) => (
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
            const dayKey = day.toISOString();
            const isPast = isBefore(day, todayDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selectedSet.has(dayKey);
            const isPreview = !isSelected && previewSet.has(dayKey);
            const isTodayDay = isToday(day);
            const isRangeStartDay = rangeStart ? isSameDay(day, rangeStart) : false;

            return (
              <button
                key={dayKey}
                type="button"
                disabled={isPast || !isCurrentMonth}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => rangeStart && setHoveredDate(day)}
                onMouseLeave={() => setHoveredDate(null)}
                className={`aspect-square flex items-center justify-center text-sm rounded-full transition-all duration-200 ${
                  isSelected
                    ? "gradient-warm text-white font-bold shadow-warm"
                    : isPreview
                    ? "bg-primary/15 text-primary font-semibold"
                    : isTodayDay
                    ? "ring-2 ring-primary text-foreground font-semibold hover:bg-primary/10"
                    : isPast || !isCurrentMonth
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-muted font-medium"
                } ${isRangeStartDay ? "ring-2 ring-primary ring-offset-2" : ""}`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Range Chip */}
      {selectedDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {format(selectedDates[0], "EEE, MMM d", { locale: dateFnsLocale })}
            {selectedDates.length === 1 && rangeStart && (
              <span className="text-primary/60">→ ...</span>
            )}
            {selectedDates.length > 1 && (
              <>
                <span className="text-primary/60">→</span>
                {format(selectedDates[selectedDates.length - 1], "EEE, MMM d", { locale: dateFnsLocale })}
                <span className="text-primary/60 text-xs">
                  ({selectedDates.length} {locale === "fr" ? "jours" : "days"})
                </span>
              </>
            )}
            <button
              type="button"
              onClick={clearDates}
              className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Time Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <Clock className="w-4 h-4 text-primary" />
            {t("book.startTime")}
          </label>
          <select
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">{t("book.selectStartTime")}</option>
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
            {t("book.endTime")}
          </label>
          <select
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-card p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">{t("book.selectEndTime")}</option>
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
            {t("common.back")}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {t("common.next")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Step 2: Your Details ---
function StepDetails({ details, onChange, onBack, onNext }: StepDetailsProps) {
  const { t } = useLanguage();

  const handleChange = (field: keyof BookingDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
        {t("book.yourDetailsTitle")}
      </h2>
      <p className="text-muted-foreground mb-6">
        {t("book.yourDetailsSubtitle")}
      </p>

      <div className="space-y-4 max-w-xl">
        {/* Full Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <User className="w-4 h-4 text-primary" />
            {t("book.fullName")} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={details.fullName}
            onChange={handleChange("fullName")}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Email */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Mail className="w-4 h-4 text-primary" />
            {t("book.email")} <span className="text-destructive">*</span>
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
            {t("book.phone")} <span className="text-destructive">*</span>
          </label>
          <PhoneInput
            value={details.phone}
            onChange={(val) => onChange({ ...details, phone: val })}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Hotel / Accommodation */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Hotel className="w-4 h-4 text-primary" />
            {t("book.hotelAccommodation")} <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            required
            value={details.accommodation}
            onChange={handleChange("accommodation")}
            placeholder={t("book.hotelPlaceholder")}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Number of Children — max 2, siblings only */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <Baby className="w-4 h-4 text-primary" />
            {t("book.numChildren")}
          </label>
          <select
            value={details.numChildren}
            onChange={handleChange("numChildren")}
            className="w-full rounded-lg border border-border p-3 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
          <div className="mt-2.5 flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              {t("book.siblingsNotice")}
            </p>
          </div>
        </div>

        {/* Special Notes */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
            <FileText className="w-4 h-4 text-primary" />
            {t("book.specialNotes")} <span className="text-muted-foreground text-xs">({t("book.optional")})</span>
          </label>
          <textarea
            value={details.notes}
            onChange={handleChange("notes")}
            placeholder={t("book.specialNotesPlaceholder")}
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
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {t("common.next")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Step 3: Child Info (multi-child support) ---
function StepChildInfo({ childrenInfo, onChange, agreeTerms, onAgreeTermsChange, wantUpdates, onWantUpdatesChange, onBack, onNext }: StepChildInfoProps) {
  const { t } = useLanguage();
  const [activeChild, setActiveChild] = useState(0);
  const isPlural = childrenInfo.length > 1;

  // Clamp activeChild if childrenInfo shrinks
  useEffect(() => {
    if (activeChild >= childrenInfo.length) {
      setActiveChild(Math.max(0, childrenInfo.length - 1));
    }
  }, [childrenInfo.length, activeChild]);

  const updateChild = (index: number, field: keyof ChildInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const val = target.type === "checkbox" ? target.checked : target.value;
    const updated = [...childrenInfo];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  const isValid = childrenInfo.every((c) => c.childFirstName.trim() && c.childAge.trim()) && agreeTerms;

  const renderChildForm = (child: ChildInfo, index: number) => (
    <div className="space-y-6 max-w-xl">
      {/* Child Basic Info */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <Baby className="w-4 h-4 text-primary" />
          {isPlural ? `${t("book.childDetails")} ${index + 1}` : t("book.childDetails")}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
                {t("book.firstName")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={child.childFirstName}
                onChange={updateChild(index, "childFirstName")}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t("book.lastName")}
              </label>
              <input
                type="text"
                value={child.childLastName}
                onChange={updateChild(index, "childLastName")}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t("book.age")} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={child.childAge}
                onChange={updateChild(index, "childAge")}
                placeholder={t("book.agePlaceholder")}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t("book.gender")}
              </label>
              <select
                value={child.childGender}
                onChange={updateChild(index, "childGender")}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">--</option>
                <option value="boy">{t("book.boy")}</option>
                <option value="girl">{t("book.girl")}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Allergies — single field */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <AlertTriangle className="w-4 h-4 text-primary" />
          {t("book.allergiesTitle")}
        </h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
            <input
              type="checkbox"
              checked={child.noAllergies}
              onChange={updateChild(index, "noAllergies")}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm font-medium text-foreground">{t("book.noKnownAllergies")}</span>
          </label>

          {!child.noAllergies && (
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                {t("book.allergiesQuestion")}
              </label>
              <textarea
                value={child.allergies}
                onChange={updateChild(index, "allergies")}
                placeholder={t("book.allergiesPlaceholder")}
                rows={3}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Special Instructions */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <FileText className="w-4 h-4 text-primary" />
          {t("book.specialInstructionsTitle")}
        </h3>
        <div>
          <label className="text-sm font-semibold text-foreground mb-1.5 block">
            {t("book.specialInstructionsQuestion")}
          </label>
          <textarea
            value={child.specialInstructions}
            onChange={updateChild(index, "specialInstructions")}
            placeholder={t("book.specialInstructionsPlaceholder")}
            rows={4}
            className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        {t("book.childInfoTitle")}
      </h2>
      <p className="text-muted-foreground mb-6">
        {isPlural ? t("book.childInfoSubtitlePlural") : t("book.childInfoSubtitle")}
      </p>

      {/* Child Tabs (only when more than 1 child) */}
      {isPlural && (
        <div className="flex gap-2 mb-6">
          {childrenInfo.map((child, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveChild(i)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                activeChild === i
                  ? "gradient-warm text-white shadow-warm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t("book.childDetails")} {i + 1}
              {child.childFirstName ? `: ${child.childFirstName}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Render active child's form */}
      {renderChildForm(childrenInfo[activeChild], activeChild)}

      {/* Consent & Authorization — shared across all children */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft max-w-xl mt-6">
        <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <Shield className="w-4 h-4 text-primary" />
          {t("book.consentTitle")}
        </h3>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed mb-4">
          {isPlural ? t("book.consentTextPlural") : t("book.consentText")}
        </div>
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => onAgreeTermsChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
            />
            <span className="text-sm text-foreground">
              {t("book.agreeTerms")} <span className="text-destructive">*</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wantUpdates}
              onChange={(e) => onWantUpdatesChange(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
            />
            <span className="text-sm text-foreground">
              {isPlural ? t("book.wantUpdatesPlural") : t("book.wantUpdates")}
            </span>
          </label>
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
          {t("common.back")}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="gradient-warm text-white font-semibold px-6 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {t("common.next")}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// --- Step 4: Review & Confirm ---
function StepReview({
  selectedDates,
  startTime,
  endTime,
  details,
  childrenInfo,
  totalPrice,
  hours,
  dateCount,
  taxiFeeTotal,
  isEveningBooking,
  onEdit,
  onConfirm,
  isSubmitting,
}: StepReviewProps) {
  const { t, locale } = useLanguage();
  const dateFnsLocale = locale === "fr" ? fr : undefined;
  const isPlural = childrenInfo.length > 1;

  const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
  const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        {t("book.reviewTitle")}
      </h2>
      <p className="text-muted-foreground mb-6">
        {t("book.reviewSubtitle")}
      </p>

      <div className="bg-card rounded-xl border border-border p-5 sm:p-6 shadow-soft max-w-2xl">
        {/* Nanny Assignment Info */}
        <div className="flex items-center gap-3 mb-5 pb-5 border-b border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t("book.nannyAssignment")}</h3>
            <p className="text-sm text-muted-foreground">{t("book.nannyAutoAssign")}</p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {t("book.dateTime")}
            </span>
            <button
              type="button"
              onClick={() => onEdit(1)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {t("common.edit")}
            </button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>
              <span className="text-foreground font-medium">{t("book.dates")}:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                {selectedDates.map((d) => (
                  <li key={d.toISOString()}>{format(d, "EEEE, MMMM d, yyyy", { locale: dateFnsLocale })}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2">
              <span className="text-foreground font-medium">{t("book.time")}:</span>{" "}
              {startLabel} - {endLabel}
            </p>
            <p className="mt-1">
              <span className="text-foreground font-medium">{t("shared.hours")}:</span>{" "}
              {hours * dateCount}h ({hours}h &times; {dateCount} {t("book.dateUnit")})
            </p>
          </div>
        </div>

        {/* Client Details */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              {t("book.yourDetails")}
            </span>
            <button
              type="button"
              onClick={() => onEdit(2)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {t("common.edit")}
            </button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">{t("book.name")}:</span>{" "}
              {details.fullName}
            </p>
            <p>
              <span className="text-foreground font-medium">{t("book.email")}:</span>{" "}
              {details.email}
            </p>
            <p>
              <span className="text-foreground font-medium">{t("book.phone")}:</span>{" "}
              {details.phone}
            </p>
            <p>
              <span className="text-foreground font-medium">{t("book.accommodation")}:</span>{" "}
              {details.accommodation}
            </p>
            <p>
              <span className="text-foreground font-medium">{t("book.children")}:</span>{" "}
              {details.numChildren}
            </p>
            {details.notes && (
              <p>
                <span className="text-foreground font-medium">{t("book.notes")}:</span>{" "}
                {details.notes}
              </p>
            )}
          </div>
        </div>

        {/* Children Info */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Baby className="w-4 h-4 text-primary" />
              {isPlural ? t("book.childrenInfo") : t("book.childInfo")}
            </span>
            <button
              type="button"
              onClick={() => onEdit(3)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              {t("common.edit")}
            </button>
          </div>
          <div className="space-y-4">
            {childrenInfo.map((child, i) => {
              const allergiesSummary = child.noAllergies
                ? "None"
                : child.allergies || "Not specified";

              return (
                <div key={i} className={isPlural ? "pl-3 border-l-2 border-primary/20" : ""}>
                  {isPlural && (
                    <p className="text-xs font-bold text-primary uppercase tracking-wide mb-1">
                      {t("book.childDetails")} {i + 1}
                    </p>
                  )}
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="text-foreground font-medium">{t("book.name")}:</span>{" "}
                      {child.childFirstName} {child.childLastName}
                    </p>
                    {child.childAge && (
                      <p>
                        <span className="text-foreground font-medium">{t("book.age")}:</span>{" "}
                        {child.childAge}
                      </p>
                    )}
                    {child.childGender && (
                      <p>
                        <span className="text-foreground font-medium">{t("book.gender")}:</span>{" "}
                        {child.childGender === "boy" ? t("book.boy") : t("book.girl")}
                      </p>
                    )}
                    <p>
                      <span className="text-foreground font-medium">{t("book.allergies")}:</span>{" "}
                      {allergiesSummary}
                    </p>
                    {child.specialInstructions && (
                      <p>
                        <span className="text-foreground font-medium">{t("book.specialInstructions")}:</span>{" "}
                        {child.specialInstructions}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {RATE}€ &times; {hours} {t("book.hrs")} &times; {dateCount} {t("book.dateUnit")}
              {" = "}{RATE * hours * dateCount}€
            </p>
            {isEveningBooking && (
              <p className="text-sm text-amber-600 font-medium mt-1">
                🚕 {t("book.taxiFee")}: +{taxiFeeTotal}€ ({t("book.taxiFeeNote")})
              </p>
            )}
            <p className="text-2xl font-bold text-foreground mt-1">
              {totalPrice}€
            </p>
          </div>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="gradient-warm text-white font-bold px-8 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-warm text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">{t("common.submitting")}</span>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t("book.confirmBooking")}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Success State ---
function BookingSuccess({ onBookAnother, onGoHome, bookingData }: BookingSuccessProps) {
  const { t } = useLanguage();

  const buildWhatsAppUrl = () => {
    const datesText = bookingData?.dates?.map((d) => d).join(", ") ?? "";
    const msg = encodeURIComponent(
      `Hi! I just booked a nanny session with Call a Nanny.\n\nDates: ${datesText}\nTime: ${bookingData?.startTime ?? ""}${bookingData?.endTime ? ` - ${bookingData.endTime}` : ""}\nChild${bookingData?.childNames?.includes(",") ? "ren" : ""}: ${bookingData?.childNames ?? ""}\n\nLooking forward to it!`
    );
    return `https://wa.me/212656643375?text=${msg}`;
  };

  // Auto-open WhatsApp with booking confirmation
  useEffect(() => {
    const timer = setTimeout(() => {
      window.open(buildWhatsAppUrl(), "_blank");
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-bounce">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <div className="absolute inset-0 w-20 h-20 rounded-full gradient-warm opacity-30 animate-ping" />
      </div>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-3">
        {t("book.successTitle")}
      </h2>
      <p className="text-muted-foreground text-lg max-w-md mb-2">
        {t("book.successMessage")}
      </p>
      <p className="text-muted-foreground text-sm max-w-md mb-8">
        📧 {t("email.confirmationSent")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={() => window.open(buildWhatsAppUrl(), "_blank")}
          className="flex-1 bg-green-500 text-white font-semibold px-5 py-3 rounded-full hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {t("book.sendWhatsApp")}
        </button>
        <button
          type="button"
          onClick={onBookAnother}
          className="flex-1 gradient-warm text-white font-semibold px-5 py-3 rounded-full hover:opacity-90 transition-opacity shadow-warm flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          {t("book.bookAnother")}
        </button>
      </div>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-3 px-6 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        {t("book.backToHome")}
      </button>
    </div>
  );
}

const PARENT_STORAGE_KEY = "callanannycare_parent";

function loadSavedParent(): BookingDetails {
  try {
    const raw = localStorage.getItem(PARENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fullName: parsed.fullName || "",
        email: parsed.email || "",
        phone: parsed.phone || "",
        accommodation: parsed.accommodation || "",
        numChildren: parsed.numChildren || "1",
        notes: "",
      };
    }
  } catch { /* ignore */ }
  return { fullName: "", email: "", phone: "", accommodation: "", numChildren: "1", notes: "" };
}

function saveParentDetails(details: BookingDetails) {
  try {
    localStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify({
      fullName: details.fullName,
      email: details.email,
      phone: details.phone,
      accommodation: details.accommodation,
      numChildren: details.numChildren,
    }));
  } catch { /* ignore */ }
}

// --- Main Book Component ---
export default function Book() {
  const { addBooking } = useData();
  const { t, locale } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1 state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 2 state — initialize from localStorage
  const [details, setDetails] = useState<BookingDetails>(loadSavedParent);

  // Step 3 state — array of children
  const [childrenInfo, setChildrenInfo] = useState<ChildInfo[]>([{ ...EMPTY_CHILD }]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [wantUpdates, setWantUpdates] = useState(false);

  // Sync childrenInfo array length with numChildren
  useEffect(() => {
    const count = Math.min(Number(details.numChildren) || 1, 2);
    setChildrenInfo((prev) => {
      if (prev.length === count) return prev;
      if (count > prev.length) {
        return [...prev, ...Array.from({ length: count - prev.length }, () => ({ ...EMPTY_CHILD }))];
      }
      return prev.slice(0, count);
    });
  }, [details.numChildren]);

  const NIGHT_START = 19; // 7 PM
  const NIGHT_END = 7;    // 7 AM

  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const isEveningBooking = useMemo(() => {
    if (!startTime || !endTime) return false;
    const startHour = parseInt(startTime.split(":")[0], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    const endMin = parseInt(endTime.split(":")[1], 10);
    // Taxi fee if session ends after 7 PM or starts before 7 AM
    return (endHour > NIGHT_START || (endHour === NIGHT_START && endMin > 0)) || startHour < NIGHT_END;
  }, [startTime, endTime]);

  const taxiFeeTotal = useMemo(() => {
    return isEveningBooking ? TAXI_FEE * selectedDates.length : 0;
  }, [isEveningBooking, selectedDates.length]);

  const totalPrice = useMemo(() => {
    return RATE * hours * selectedDates.length + taxiFeeTotal;
  }, [hours, selectedDates.length, taxiFeeTotal]);

  const handleDatesChange = (dates: Date[]) => {
    setSelectedDates(dates.sort((a, b) => a.getTime() - b.getTime()));
  };

  const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || "";

  const handleConfirm = async () => {
    if (selectedDates.length === 0) return;

    setIsSubmitting(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;
    // Build child info summary for notes — all children
    const childSummaryParts: string[] = [];
    childrenInfo.forEach((child, idx) => {
      const prefix = childrenInfo.length > 1 ? `[Child ${idx + 1}] ` : "";
      childSummaryParts.push(`${prefix}Child: ${child.childFirstName} ${child.childLastName}`.trim());
      if (child.childAge) childSummaryParts.push(`${prefix}Age: ${child.childAge}`);
      if (child.childGender) childSummaryParts.push(`${prefix}Gender: ${child.childGender}`);
      if (child.noAllergies) {
        childSummaryParts.push(`${prefix}Allergies: None`);
      } else if (child.allergies) {
        childSummaryParts.push(`${prefix}Allergies: ${child.allergies}`);
      }
      if (child.specialInstructions) childSummaryParts.push(`${prefix}Special instructions: ${child.specialInstructions}`);
    });
    childSummaryParts.push(`Photo/video updates: ${wantUpdates ? "Yes" : "No"}`);

    const enrichedNotes = [details.notes, "--- CHILD INFO ---", ...childSummaryParts].filter(Boolean).join("\n");

    // Build child names for booking records
    const allChildNames = childrenInfo
      .map((c) => `${c.childFirstName} ${c.childLastName || ""}`.trim())
      .join(", ");

    try {
      // Create a single booking with date range
      const firstDate = format(selectedDates[0], "yyyy-MM-dd");
      const lastDate = selectedDates.length > 1 ? format(selectedDates[selectedDates.length - 1], "yyyy-MM-dd") : null;

      const bookingPayload = {
        date: firstDate,
        endDate: lastDate,
        startTime: startLabel,
        endTime: endLabel,
        plan: "hourly" as BookingPlan,
        totalPrice,
        clientName: details.fullName,
        clientEmail: details.email,
        clientPhone: details.phone,
        hotel: details.accommodation,
        childrenCount: Number(details.numChildren),
        childrenAges: childrenInfo.map((c) => c.childAge).filter(Boolean).join(", "),
        notes: enrichedNotes,
        nannyId: null,
        nannyName: "",
        nannyImage: "",
        status: "pending" as const,
      };

      await addBooking(bookingPayload, { locale });

      // Send booking info to Web3Forms (email to info@callanannycare.com)
      if (WEB3FORMS_KEY) {
        try {
          const childFields: Record<string, string> = {};
          childrenInfo.forEach((child, idx) => {
            const label = childrenInfo.length > 1 ? ` ${idx + 1}` : "";
            childFields[`Child${label} Name`] = `${child.childFirstName} ${child.childLastName || ""}`.trim();
            childFields[`Child${label} Age`] = child.childAge || "N/A";
            childFields[`Child${label} Gender`] = child.childGender || "N/A";
            childFields[`Child${label} Allergies`] = child.noAllergies ? "None" : (child.allergies || "N/A");
            childFields[`Child${label} Special Instructions`] = child.specialInstructions || "N/A";
          });

          await fetch("https://api.web3forms.com/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              access_key: WEB3FORMS_KEY,
              subject: `New Booking: ${allChildNames} (${details.fullName})`,
              from_name: "Call a Nanny - Booking Form",
              "Parent Name": details.fullName,
              "Parent Phone": details.phone,
              "Parent Email": details.email,
              "Hotel / Address": details.accommodation,
              "Booking Dates": selectedDates.map((d) => format(d, "yyyy-MM-dd")).join(", "),
              "Booking Time": `${startLabel} - ${endLabel}`,
              "Total Price": `${totalPrice}€`,
              "Number of Children": details.numChildren,
              "Photo/Video Updates": wantUpdates ? "Yes" : "No",
              ...childFields,
            }),
          });
        } catch {
          console.warn("Web3Forms submission failed, booking still saved.");
        }
      }

      const lastBooking: LastBookingData = {
        dates: selectedDates.map((d) => format(d, "yyyy-MM-dd")),
        startTime: startLabel,
        endTime: endLabel,
        totalPrice,
        fullName: details.fullName,
        email: details.email,
        phone: details.phone,
        accommodation: details.accommodation,
        numChildren: details.numChildren,
        notes: details.notes,
        status: "pending",
        childNames: allChildNames,
      };

      setLastBookingData(lastBooking);
      saveParentDetails(details);
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (err) {
      console.error("Booking failed:", err);
      setIsSubmitting(false);
    }
  };

  const handleBookAnother = () => {
    setStep(1);
    setSelectedDates([]);
    setStartTime("");
    setEndTime("");
    setDetails(loadSavedParent());
    setChildrenInfo([{ ...EMPTY_CHILD }]);
    setAgreeTerms(false);
    setWantUpdates(false);
    setIsSuccess(false);
  };

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, isSuccess]);

  // Store last booking data for success screen
  const [lastBookingData, setLastBookingData] = useState<LastBookingData | null>(null);

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
            {t("book.title")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("book.subtitle")}
          </p>
        </div>

        {/* Progress Bar */}
        <ProgressBar currentStep={step} />

        {/* Steps */}
        {step === 1 && (
          <StepDateTime
            selectedDates={selectedDates}
            onDatesChange={handleDatesChange}
            startTime={startTime}
            onStartTimeChange={setStartTime}
            endTime={endTime}
            onEndTimeChange={setEndTime}
            onBack={undefined}
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
          <StepChildInfo
            childrenInfo={childrenInfo}
            onChange={setChildrenInfo}
            agreeTerms={agreeTerms}
            onAgreeTermsChange={setAgreeTerms}
            wantUpdates={wantUpdates}
            onWantUpdatesChange={setWantUpdates}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <StepReview
            selectedDates={selectedDates}
            startTime={startTime}
            endTime={endTime}
            details={details}
            childrenInfo={childrenInfo}
            totalPrice={totalPrice}
            hours={hours}
            dateCount={selectedDates.length}
            taxiFeeTotal={taxiFeeTotal}
            isEveningBooking={isEveningBooking}
            onEdit={(s: number) => setStep(s)}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
