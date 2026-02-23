import type { Booking, BookingStatus } from '../types';

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

/** Calculate booked hours from start/end time strings, with optional day count */
export function calcBookedHours(startTime: string, endTime: string, startDate?: string, endDate?: string | null): number {
  const s = parseTimeToHours(startTime);
  const e = parseTimeToHours(endTime);
  if (s === null || e === null || e <= s) return 0;
  const hoursPerDay = e - s;
  let days = 1;
  if (startDate && endDate) {
    const d1 = new Date(startDate).getTime();
    const d2 = new Date(endDate).getTime();
    if (d2 > d1) days = Math.round((d2 - d1) / 86400000) + 1;
  }
  return hoursPerDay * days;
}

/** Check if a shift overlaps with 7PM-7AM (evening/night window) */
function isEveningShift(startHour: number, endHour: number): boolean {
  return startHour >= 19 || startHour < 7 || endHour > 19 || endHour <= 7;
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
  const basePay = Math.round(hours * HOURLY_RATE);
  const inHour = new Date(clockIn).getHours();
  const outHour = new Date(clockOut).getHours();
  const taxiFee = isEveningShift(inHour, outHour) ? 100 : 0;
  return { basePay, taxiFee, total: basePay + taxiFee };
}

export function calcNannyPay(booking: Booking): number {
  return calcNannyPayBreakdown(booking).total;
}

export function calcNannyPayBreakdown(booking: Booking): PayBreakdown {
  if (booking.status === 'cancelled') return { basePay: 0, taxiFee: 0, total: 0 };

  // Only count pay from actual clock in/out data (real worked hours)
  if (booking.clockIn && booking.clockOut) {
    return calcShiftPayBreakdown(booking.clockIn, booking.clockOut);
  }

  // No clock data = no pay yet (shift hasn't been worked)
  return { basePay: 0, taxiFee: 0, total: 0 };
}

/**
 * Estimate nanny pay from booked time strings (before clock data exists).
 * Uses the booking's startTime/endTime to estimate hours and detect evening shifts.
 */
export function estimateNannyPayBreakdown(
  startTime: string,
  endTime: string,
  startDate?: string,
  endDate?: string | null
): PayBreakdown {
  const hours = calcBookedHours(startTime, endTime, startDate, endDate);
  if (hours <= 0) return { basePay: 0, taxiFee: 0, total: 0 };
  const basePay = Math.round(hours * HOURLY_RATE);
  const startH = parseTimeToHours(startTime);
  const endH = parseTimeToHours(endTime);
  const taxiFee = startH !== null && endH !== null && isEveningShift(startH, endH) ? 100 : 0;
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
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/** Shared time slots from 06:00 to 05:30 in 30-min steps (business-day ordering) */
export const TIME_SLOTS: { value: string; label: string }[] = (() => {
  const slots: { value: string; label: string }[] = [];
  for (let i = 0; i < 48; i++) {
    const h = (6 + Math.floor(i / 2)) % 24;
    const m = (i % 2) * 30;
    const hh = String(h).padStart(2, '0');
    const mm = m === 0 ? '00' : '30';
    slots.push({ value: `${h}:${mm}`, label: `${hh}h${mm}` });
  }
  return slots;
})();
