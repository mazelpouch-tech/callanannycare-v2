import type { Booking, BookingStatus } from '../types';
import { format } from 'date-fns';

export const HOURLY_RATE = 31.25; // DH/hr

export const statusColors: Record<BookingStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

export function isToday(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return dateStr === todayStr;
}

export function isTomorrow(dateStr: string): boolean {
  if (!dateStr) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  return dateStr === tomorrowStr;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatHoursWorked(clockIn: string, clockOut: string): string {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = ms / 3600000;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

/** Parse time string in various formats ("09h00", "9:00", "14h30", "2:30 PM") to decimal hours */
export function parseTimeToHours(t: string): number | null {
  if (!t) return null;
  // "09h00" / "14h30" format
  const hFormat = t.match(/^(\d{1,2})h(\d{2})$/i);
  if (hFormat) return parseInt(hFormat[1]) + parseInt(hFormat[2]) / 60;
  // "9:00" / "14:30" format
  const colonFormat = t.match(/^(\d{1,2}):(\d{2})/);
  if (colonFormat) {
    let h = parseInt(colonFormat[1]);
    const m = parseInt(colonFormat[2]);
    if (/pm/i.test(t) && h < 12) h += 12;
    if (/am/i.test(t) && h === 12) h = 0;
    return h + m / 60;
  }
  return null;
}

/** Calculate booked hours from start/end time strings, with optional day count.
 *  Handles overnight bookings (e.g. 18h00-01h00 = 7 hours). */
export function calcBookedHours(startTime: string, endTime: string, startDate?: string, endDate?: string | null): number {
  const s = parseTimeToHours(startTime);
  const e = parseTimeToHours(endTime);
  if (s === null || e === null) return 0;
  // If end <= start, the shift crosses midnight (e.g. 18:00 → 01:00 = 7h)
  const hoursPerDay = e > s ? e - s : (24 - s) + e;
  if (hoursPerDay <= 0) return 0;
  let days = 1;
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (d2 > d1) days = Math.round((d2 - d1) / 86400000) + 1;
  }
  return hoursPerDay * days;
}

/** Calculate total booked hours including extra time blocks */
export function calcTotalBookedHours(
  startTime: string,
  endTime: string,
  extraTimes?: Array<{ startTime: string; endTime: string }> | null,
  startDate?: string,
  endDate?: string | null
): number {
  let total = calcBookedHours(startTime, endTime, startDate, endDate);
  if (extraTimes && extraTimes.length > 0) {
    for (const block of extraTimes) {
      total += calcBookedHours(block.startTime, block.endTime, startDate, endDate);
    }
  }
  return total;
}

/** Check if a shift overlaps with 7PM-7AM (evening/night window).
 *  Overnight shifts (end <= start) always cross midnight, so always evening. */
function isEveningShift(startHour: number, endHour: number): boolean {
  return endHour <= startHour || startHour >= 19 || startHour < 7 || endHour > 19 || endHour <= 7;
}

/** Check if two time ranges overlap, handling overnight shifts (e.g. 20h00-02h00) */
export function timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = parseTimeToHours(start1);
  const e1 = parseTimeToHours(end1);
  const s2 = parseTimeToHours(start2);
  const e2 = parseTimeToHours(end2);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  const overnight1 = e1 <= s1;
  const overnight2 = e2 <= s2;
  if (!overnight1 && !overnight2) return s1 < e2 && s2 < e1;
  if (overnight1 && overnight2) return true;
  return s1 < e2 || s2 < e1;
}

/** Pay breakdown: base hourly pay + taxi fee */
export interface PayBreakdown {
  basePay: number;    // hours × HOURLY_RATE
  taxiFee: number;    // 100 DH if evening shift, else 0
  total: number;      // basePay + taxiFee
}

export function calcShiftPay(clockIn: string, clockOut: string): number {
  return calcShiftPayBreakdown(clockIn, clockOut).total;
}

export function calcShiftPayBreakdown(clockIn: string, clockOut: string): PayBreakdown {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = ms / 3600000;
  const basePay = Math.ceil(hours * HOURLY_RATE);
  const inHour = new Date(clockIn).getHours();
  const outHour = new Date(clockOut).getHours();
  const taxiFee = isEveningShift(inHour, outHour) ? 100 : 0;
  return { basePay, taxiFee, total: basePay + taxiFee };
}

export function calcNannyPay(booking: Booking): number {
  return calcNannyPayBreakdown(booking).total;
}

export function calcNannyPayBreakdown(booking: Booking): PayBreakdown {
  // Only pay when booking is completed (after guardianship of child)
  if (booking.status !== 'completed') return { basePay: 0, taxiFee: 0, total: 0 };

  // Use booked hours (startTime/endTime) — not clock data
  if (booking.startTime && booking.endTime) {
    return estimateNannyPayBreakdown(booking.startTime, booking.endTime, booking.date, booking.endDate, booking.extraTimes);
  }

  return { basePay: 0, taxiFee: 0, total: 0 };
}

/** Calculate booked hours for a completed booking (no clock data needed) */
export function calcBookedHoursForBooking(booking: Booking): number {
  if (booking.status !== 'completed') return 0;
  if (!booking.startTime || !booking.endTime) return 0;
  return calcTotalBookedHours(booking.startTime, booking.endTime, booking.extraTimes, booking.date, booking.endDate);
}

/**
 * Estimate nanny pay from booked time strings (before clock data exists).
 * Uses the booking's startTime/endTime to estimate hours and detect evening shifts.
 * Includes extra time blocks if provided.
 */
export function estimateNannyPayBreakdown(
  startTime: string,
  endTime: string,
  startDate?: string,
  endDate?: string | null,
  extraTimes?: Array<{ startTime: string; endTime: string }> | null
): PayBreakdown {
  const hours = calcTotalBookedHours(startTime, endTime, extraTimes, startDate, endDate);
  if (hours <= 0) return { basePay: 0, taxiFee: 0, total: 0 };
  const basePay = Math.ceil(hours * HOURLY_RATE);
  // Check if any block is evening
  let hasEvening = false;
  const startH = parseTimeToHours(startTime);
  const endH = parseTimeToHours(endTime);
  if (startH !== null && endH !== null && isEveningShift(startH, endH)) hasEvening = true;
  if (!hasEvening && extraTimes) {
    for (const block of extraTimes) {
      const s = parseTimeToHours(block.startTime);
      const e = parseTimeToHours(block.endTime);
      if (s !== null && e !== null && isEveningShift(s, e)) { hasEvening = true; break; }
    }
  }
  const taxiFee = hasEvening ? 100 : 0;
  return { basePay, taxiFee, total: basePay + taxiFee };
}

/** Calculate hours actually worked from clock in/out timestamps */
export function calcActualHoursWorked(clockIn: string, clockOut: string): number {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  return Math.max(0, ms / 3600000);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return format(d, 'EEEE do MMMM');
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Get the Saturday-to-Saturday pay period boundaries.
 * Period runs from Sunday 00:00:00 to the next Sunday 00:00:00
 * (i.e. Saturday 23:59:59 is the last moment of the period).
 * @param refDate - reference date (defaults to today)
 * @returns { start: Date, end: Date } — start is inclusive, end is exclusive
 */
export function getSaturdayPeriod(refDate?: Date): { start: Date; end: Date } {
  const d = refDate ? new Date(refDate) : new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, …, 6=Sat
  const daysSinceSun = day; // Sun=0, Mon=1, …, Sat=6
  const start = new Date(d);
  start.setDate(d.getDate() - daysSinceSun);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** @deprecated Use getSaturdayPeriod instead */
export const getFridayPeriod = getSaturdayPeriod;

/**
 * Format a Saturday-cutoff period label.
 * Given internal boundaries (Sunday 00:00 → next Sunday 00:00),
 * displays as "Sat, Mar 7 23:59 — Sat, Mar 14 23:59".
 */
export function formatPeriodLabel(start: Date, end: Date): string {
  const satStart = new Date(start);
  satStart.setDate(satStart.getDate() - 1); // Sunday → preceding Saturday
  const satEnd = new Date(end);
  satEnd.setDate(satEnd.getDate() - 1); // next Sunday → next Saturday
  return `${format(satStart, "EEE, MMM d")} 23:59 — ${format(satEnd, "EEE, MMM d")} 23:59`;
}

/** Format a date as YYYY-MM-DD (local timezone) */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Check if a booking date string falls within a [start, end) range */
export function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  return d >= start && d < end;
}

/** Shared time slots from 06:00 to 05:45 in 15-min steps (business-day ordering) */
export const TIME_SLOTS: { value: string; label: string }[] = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let i = 0; i < 96; i++) {
    const h = (6 + Math.floor(i / 4)) % 24;
    const m = (i % 4) * 15;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    slots.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
  }
  return slots;
})();
