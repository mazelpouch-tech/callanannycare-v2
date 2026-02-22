import type { Booking, BookingStatus } from '../types';

export const HOURLY_RATE = 31.25; // MAD/hr

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
function parseTimeToHours(t: string): number | null {
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

export function calcShiftPay(clockIn: string, clockOut: string): number {
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const hours = ms / 3600000;
  let pay = Math.round(hours * HOURLY_RATE);
  const inHour = new Date(clockIn).getHours();
  const outHour = new Date(clockOut).getHours();
  if (isEveningShift(inHour, outHour)) pay += 100;
  return pay;
}

export function calcNannyPay(booking: Booking): number {
  if (booking.status === 'cancelled') return 0;

  if (booking.clockIn && booking.clockOut) {
    return calcShiftPay(booking.clockIn, booking.clockOut);
  }

  // Use booked hours from start/end time
  const hours = calcBookedHours(booking.startTime, booking.endTime, booking.date, booking.endDate);
  let pay = Math.round(hours * HOURLY_RATE);

  // Check taxi fee from booked time
  const startH = parseTimeToHours(booking.startTime || '');
  const endH = parseTimeToHours(booking.endTime || '');
  if (startH !== null && endH !== null && isEveningShift(startH, endH)) {
    pay += 100;
  }
  return pay;
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
