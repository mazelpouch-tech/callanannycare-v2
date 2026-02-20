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
} from "lucide-react";
import { useData } from "../context/DataContext";
import type { BookingPlan } from "@/types";

// ---- Interfaces ----

interface ProgressBarProps {
  currentStep: number;
}

interface StepDateTimeProps {
  selectedDates: Date[];
  onDateToggle: (date: Date) => void;
  onDateRemove: (date: Date) => void;
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
  childrenAges: string;
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
  childDob: string;
  childAge: string;
  childGender: string;
  foodAllergies: string;
  medicineAllergies: string;
  environmentAllergies: string;
  noAllergies: boolean;
  allergyReaction: string;
  specialNeeds: string;
  behaviorNotes: string;
  dietaryRestrictions: string;
  favoriteActivities: string;
  napSchedule: string;
  agreeTerms: boolean;
}

interface StepChildInfoProps {
  childInfo: ChildInfo;
  onChange: (info: ChildInfo) => void;
  onBack: () => void;
  onNext: () => void;
}

interface StepReviewProps {
  selectedDates: Date[];
  startTime: string;
  endTime: string;
  details: BookingDetails;
  childInfo: ChildInfo;
  totalPrice: number;
  hours: number;
  dateCount: number;
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
  childName: string;
}

interface BookingSuccessProps {
  onBookAnother: () => void;
  onGoHome: () => void;
  bookingData: LastBookingData | null;
}

// ---- Constants ----

const STEPS = [
  { number: 1, label: "Date & Time" },
  { number: 2, label: "Your Details" },
  { number: 3, label: "Child Info" },
  { number: 4, label: "Review" },
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

function parseTimeValue(val: string) {
  const [h, m] = val.split(":").map(Number);
  return h + m / 60;
}

function calculateHours(startTime: string, endTime: string) {
  const start = parseTimeValue(startTime);
  const end = parseTimeValue(endTime);
  return Math.max(0, end - start);
}

// --- Progress Bar ---
function ProgressBar({ currentStep }: ProgressBarProps) {
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
  onDateToggle,
  onDateRemove,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  onBack,
  onNext,
}: StepDateTimeProps) {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDates.length > 0 ? startOfMonth(selectedDates[0]) : startOfMonth(new Date())
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();

  const todayDate = startOfDay(new Date());

  const isValid = selectedDates.length > 0 && startTime && endTime;

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Choose Date & Time
      </h2>
      <p className="text-muted-foreground mb-6">
        Pick your preferred dates and time slot.
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
            const isSelectedDay = selectedDates.some((d) => isSameDay(day, d));
            const isTodayDay = isToday(day);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isPast || !isCurrentMonth}
                onClick={() => onDateToggle(day)}
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

      {/* Selected Date Chips */}
      {selectedDates.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {selectedDates.map((d) => (
            <span
              key={d.toISOString()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              {format(d, "EEE, MMM d")}
              <button
                type="button"
                onClick={() => onDateRemove(d)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

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
            className="w-full rounded-lg border border-border bg-card p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
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

// --- Step 2: Your Details ---
function StepDetails({ details, onChange, onBack, onNext }: StepDetailsProps) {
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

// --- Step 3: Child Info ---
function StepChildInfo({ childInfo, onChange, onBack, onNext }: StepChildInfoProps) {
  const handleChange = (field: keyof ChildInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const val = target.type === "checkbox" ? target.checked : target.value;
    onChange({ ...childInfo, [field]: val });
  };

  const isValid = childInfo.childFirstName.trim() && childInfo.agreeTerms;

  return (
    <div>
      <h2 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Child Information
      </h2>
      <p className="text-muted-foreground mb-6">
        Tell us about your child so our nanny can provide the best care.
      </p>

      <div className="space-y-6 max-w-xl">
        {/* Child Basic Info */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <Baby className="w-4 h-4 text-primary" />
            Child Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1.5">
                  First Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={childInfo.childFirstName}
                  onChange={handleChange("childFirstName")}
                  placeholder="Child's first name"
                  className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Last Name
                </label>
                <input
                  type="text"
                  value={childInfo.childLastName}
                  onChange={handleChange("childLastName")}
                  placeholder="Child's last name"
                  className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={childInfo.childDob}
                  onChange={handleChange("childDob")}
                  className="w-full rounded-lg border border-border p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Age
                </label>
                <input
                  type="text"
                  value={childInfo.childAge}
                  onChange={handleChange("childAge")}
                  placeholder="e.g. 3 years"
                  className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Gender
                </label>
                <select
                  value={childInfo.childGender}
                  onChange={handleChange("childGender")}
                  className="w-full rounded-lg border border-border p-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">--</option>
                  <option value="boy">Boy</option>
                  <option value="girl">Girl</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Allergies
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={childInfo.noAllergies}
                onChange={handleChange("noAllergies")}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-foreground">No known allergies</span>
            </label>

            {!childInfo.noAllergies && (
              <>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Food Allergies
                  </label>
                  <input
                    type="text"
                    value={childInfo.foodAllergies}
                    onChange={handleChange("foodAllergies")}
                    placeholder="e.g. peanuts, milk, gluten, seafood..."
                    className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Medicine Allergies
                  </label>
                  <input
                    type="text"
                    value={childInfo.medicineAllergies}
                    onChange={handleChange("medicineAllergies")}
                    placeholder="e.g. penicillin, ibuprofen..."
                    className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Environmental Allergies
                  </label>
                  <input
                    type="text"
                    value={childInfo.environmentAllergies}
                    onChange={handleChange("environmentAllergies")}
                    placeholder="e.g. pollen, dust mites, animals..."
                    className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-foreground mb-1.5 block">
                    Known Allergic Reactions & Treatment
                  </label>
                  <textarea
                    value={childInfo.allergyReaction}
                    onChange={handleChange("allergyReaction")}
                    placeholder="Describe reactions and treatment to administer..."
                    rows={3}
                    className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Special Needs & Behavior */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <FileText className="w-4 h-4 text-primary" />
            Special Needs & Behavior
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Special Needs or Disabilities
              </label>
              <textarea
                value={childInfo.specialNeeds}
                onChange={handleChange("specialNeeds")}
                placeholder="Describe any special requirements..."
                rows={3}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Behavior Notes
              </label>
              <textarea
                value={childInfo.behaviorNotes}
                onChange={handleChange("behaviorNotes")}
                placeholder="e.g. fears, routines, sleep habits, comfort methods..."
                rows={3}
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Dietary Restrictions
              </label>
              <input
                type="text"
                value={childInfo.dietaryRestrictions}
                onChange={handleChange("dietaryRestrictions")}
                placeholder="e.g. vegetarian, halal, sugar-free..."
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Favorite Activities
              </label>
              <input
                type="text"
                value={childInfo.favoriteActivities}
                onChange={handleChange("favoriteActivities")}
                placeholder="e.g. drawing, reading, building blocks..."
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Nap / Sleep Schedule
              </label>
              <input
                type="text"
                value={childInfo.napSchedule}
                onChange={handleChange("napSchedule")}
                placeholder="e.g. nap 1-3 PM, bedtime at 8 PM..."
                className="w-full rounded-lg border border-border p-3 bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Consent */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-soft">
          <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4">
            <Shield className="w-4 h-4 text-primary" />
            Consent & Authorization
          </h3>
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground leading-relaxed mb-4">
            I authorize Call a Nanny to care for my child according to the information provided above. I certify that all information is accurate and complete.
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={childInfo.agreeTerms}
              onChange={handleChange("agreeTerms")}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary mt-0.5"
            />
            <span className="text-sm text-foreground">
              I agree to the general terms of service <span className="text-destructive">*</span>
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

// --- Step 4: Review & Confirm ---
function StepReview({
  selectedDates,
  startTime,
  endTime,
  details,
  childInfo,
  totalPrice,
  hours,
  dateCount,
  onEdit,
  onConfirm,
  isSubmitting,
}: StepReviewProps) {
  const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
  const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;

  const allergiesSummary = childInfo.noAllergies
    ? "None"
    : [childInfo.foodAllergies, childInfo.medicineAllergies, childInfo.environmentAllergies]
        .filter(Boolean)
        .join(", ") || "Not specified";

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
            <div>
              <span className="text-foreground font-medium">Dates:</span>
              <ul className="ml-4 mt-1 space-y-0.5">
                {selectedDates.map((d) => (
                  <li key={d.toISOString()}>{format(d, "EEEE, MMMM d, yyyy")}</li>
                ))}
              </ul>
            </div>
            <p className="mt-2">
              <span className="text-foreground font-medium">Time:</span>{" "}
              {startLabel} - {endLabel}
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

        {/* Child Info */}
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Baby className="w-4 h-4 text-primary" />
              Child Info
            </span>
            <button
              type="button"
              onClick={() => onEdit(3)}
              className="text-sm text-primary font-semibold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">Child:</span>{" "}
              {childInfo.childFirstName} {childInfo.childLastName}
            </p>
            {(childInfo.childAge || childInfo.childDob) && (
              <p>
                <span className="text-foreground font-medium">Age / DOB:</span>{" "}
                {childInfo.childAge}{childInfo.childAge && childInfo.childDob ? " / " : ""}{childInfo.childDob}
              </p>
            )}
            {childInfo.childGender && (
              <p>
                <span className="text-foreground font-medium">Gender:</span>{" "}
                {childInfo.childGender === "boy" ? "Boy" : "Girl"}
              </p>
            )}
            <p>
              <span className="text-foreground font-medium">Allergies:</span>{" "}
              {allergiesSummary}
            </p>
            {childInfo.specialNeeds && (
              <p>
                <span className="text-foreground font-medium">Special Needs:</span>{" "}
                {childInfo.specialNeeds}
              </p>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              150 MAD &times; {hours} hr{hours !== 1 ? "s" : ""} &times; {dateCount} date{dateCount !== 1 ? "s" : ""}
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
function BookingSuccess({ onBookAnother, onGoHome, bookingData }: BookingSuccessProps) {
  const buildWhatsAppUrl = () => {
    const datesText = bookingData?.dates?.map((d) => d).join(", ") ?? "";
    const msg = encodeURIComponent(
      `Hi! I just booked a nanny session with Call a Nanny.\n\nDates: ${datesText}\nTime: ${bookingData?.startTime ?? ""}${bookingData?.endTime ? ` - ${bookingData.endTime}` : ""}\nChild: ${bookingData?.childName ?? ""}\n\nLooking forward to it!`
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
        Booking Submitted!
      </h2>
      <p className="text-muted-foreground text-lg max-w-md mb-8">
        We&apos;ll confirm your booking shortly. A WhatsApp message has been
        opened with your booking details.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={() => window.open(buildWhatsAppUrl(), "_blank")}
          className="flex-1 bg-green-500 text-white font-semibold px-5 py-3 rounded-full hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Send via WhatsApp
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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Step 2 state
  const [details, setDetails] = useState<BookingDetails>({
    fullName: "",
    email: "",
    phone: "",
    accommodation: "",
    numChildren: "1",
    childrenAges: "",
    notes: "",
  });

  // Step 3 state
  const [childInfo, setChildInfo] = useState<ChildInfo>({
    childFirstName: "",
    childLastName: "",
    childDob: "",
    childAge: "",
    childGender: "",
    foodAllergies: "",
    medicineAllergies: "",
    environmentAllergies: "",
    noAllergies: false,
    allergyReaction: "",
    specialNeeds: "",
    behaviorNotes: "",
    dietaryRestrictions: "",
    favoriteActivities: "",
    napSchedule: "",
    agreeTerms: false,
  });

  const RATE = 150; // MAD per hour

  const hours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const totalPrice = useMemo(() => {
    return RATE * hours * selectedDates.length;
  }, [hours, selectedDates.length]);

  const toggleDate = (date: Date) => {
    setSelectedDates((prev) => {
      const exists = prev.some((d) => isSameDay(d, date));
      if (exists) {
        return prev.filter((d) => !isSameDay(d, date));
      }
      return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
    });
  };

  const removeDate = (date: Date) => {
    setSelectedDates((prev) => prev.filter((d) => !isSameDay(d, date)));
  };

  const WEB3FORMS_KEY = "YOUR_ACCESS_KEY_HERE";

  const handleConfirm = async () => {
    if (selectedDates.length === 0) return;

    setIsSubmitting(true);

    const startLabel = TIME_SLOTS.find((s) => s.value === startTime)?.label || startTime;
    const endLabel = TIME_SLOTS.find((s) => s.value === endTime)?.label || endTime;
    const perDatePrice = RATE * hours;

    // Build child info summary for notes
    const childSummaryParts: string[] = [];
    childSummaryParts.push(`Child: ${childInfo.childFirstName} ${childInfo.childLastName}`.trim());
    if (childInfo.childAge) childSummaryParts.push(`Age: ${childInfo.childAge}`);
    if (childInfo.childDob) childSummaryParts.push(`DOB: ${childInfo.childDob}`);
    if (childInfo.childGender) childSummaryParts.push(`Gender: ${childInfo.childGender}`);
    if (childInfo.noAllergies) {
      childSummaryParts.push("Allergies: None");
    } else {
      if (childInfo.foodAllergies) childSummaryParts.push(`Food allergies: ${childInfo.foodAllergies}`);
      if (childInfo.medicineAllergies) childSummaryParts.push(`Medicine allergies: ${childInfo.medicineAllergies}`);
      if (childInfo.environmentAllergies) childSummaryParts.push(`Environment allergies: ${childInfo.environmentAllergies}`);
      if (childInfo.allergyReaction) childSummaryParts.push(`Allergy reactions: ${childInfo.allergyReaction}`);
    }
    if (childInfo.specialNeeds) childSummaryParts.push(`Special needs: ${childInfo.specialNeeds}`);
    if (childInfo.behaviorNotes) childSummaryParts.push(`Behavior: ${childInfo.behaviorNotes}`);
    if (childInfo.dietaryRestrictions) childSummaryParts.push(`Diet: ${childInfo.dietaryRestrictions}`);
    if (childInfo.favoriteActivities) childSummaryParts.push(`Activities: ${childInfo.favoriteActivities}`);
    if (childInfo.napSchedule) childSummaryParts.push(`Nap/sleep: ${childInfo.napSchedule}`);

    const enrichedNotes = [details.notes, "--- CHILD INFO ---", ...childSummaryParts].filter(Boolean).join("\n");

    try {
      // Loop through each selected date and create a booking
      for (const date of selectedDates) {
        const bookingPayload = {
          date: format(date, "yyyy-MM-dd"),
          startTime: startLabel,
          endTime: endLabel,
          plan: "hourly" as BookingPlan,
          totalPrice: perDatePrice,
          clientName: details.fullName,
          clientEmail: details.email,
          clientPhone: details.phone,
          hotel: details.accommodation,
          childrenCount: Number(details.numChildren),
          childrenAges: details.childrenAges,
          notes: enrichedNotes,
          nannyId: null,
          nannyName: "",
          nannyImage: "",
          status: "pending" as const,
        };

        await addBooking(bookingPayload);
      }

      // Send child info to Web3Forms once after all bookings
      try {
        await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `Booking Child Info: ${childInfo.childFirstName} ${childInfo.childLastName || ""} (${details.fullName})`,
            from_name: "Call a Nanny - Booking Form",
            "Parent Name": details.fullName,
            "Parent Phone": details.phone,
            "Parent Email": details.email,
            "Hotel / Address": details.accommodation,
            "Booking Dates": selectedDates.map((d) => format(d, "yyyy-MM-dd")).join(", "),
            "Booking Time": `${startLabel} - ${endLabel}`,
            "Total Price": `${totalPrice} MAD`,
            "Child Name": `${childInfo.childFirstName} ${childInfo.childLastName || ""}`.trim(),
            "Child DOB": childInfo.childDob || "N/A",
            "Child Age": childInfo.childAge || "N/A",
            "Child Gender": childInfo.childGender || "N/A",
            "Food Allergies": childInfo.noAllergies ? "None" : (childInfo.foodAllergies || "N/A"),
            "Medicine Allergies": childInfo.noAllergies ? "None" : (childInfo.medicineAllergies || "N/A"),
            "Environment Allergies": childInfo.noAllergies ? "None" : (childInfo.environmentAllergies || "N/A"),
            "Allergy Reactions": childInfo.noAllergies ? "None" : (childInfo.allergyReaction || "N/A"),
            "Special Needs": childInfo.specialNeeds || "None",
            "Behavior Notes": childInfo.behaviorNotes || "N/A",
            "Dietary Restrictions": childInfo.dietaryRestrictions || "None",
            "Favorite Activities": childInfo.favoriteActivities || "N/A",
            "Nap Schedule": childInfo.napSchedule || "N/A",
          }),
        });
      } catch {
        // Web3Forms send is best-effort; don't block booking success
        console.warn("Web3Forms submission failed, booking still saved.");
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
        childrenAges: details.childrenAges,
        notes: details.notes,
        status: "pending",
        childName: `${childInfo.childFirstName} ${childInfo.childLastName || ""}`.trim(),
      };

      setLastBookingData(lastBooking);
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
    setDetails({
      fullName: "",
      email: "",
      phone: "",
      accommodation: "",
      numChildren: "1",
      childrenAges: "",
      notes: "",
    });
    setChildInfo({
      childFirstName: "",
      childLastName: "",
      childDob: "",
      childAge: "",
      childGender: "",
      foodAllergies: "",
      medicineAllergies: "",
      environmentAllergies: "",
      noAllergies: false,
      allergyReaction: "",
      specialNeeds: "",
      behaviorNotes: "",
      dietaryRestrictions: "",
      favoriteActivities: "",
      napSchedule: "",
      agreeTerms: false,
    });
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
            selectedDates={selectedDates}
            onDateToggle={toggleDate}
            onDateRemove={removeDate}
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
            childInfo={childInfo}
            onChange={setChildInfo}
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
            childInfo={childInfo}
            totalPrice={totalPrice}
            hours={hours}
            dateCount={selectedDates.length}
            onEdit={(s: number) => setStep(s)}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
