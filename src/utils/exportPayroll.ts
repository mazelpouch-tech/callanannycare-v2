import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Booking, Nanny } from '../types';
import {
  calcNannyPayBreakdown,
  estimateNannyPayBreakdown,
  calcActualHoursWorked,
  calcBookedHours,
  HOURLY_RATE,
} from './shiftHelpers';

function fmt2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmtHours(n: number): number | string {
  return n > 0 ? fmt2(n) : '—';
}

function fmtClock(ts: string | null | undefined): string {
  if (!ts) return '—';
  return format(new Date(ts), 'dd/MM/yyyy HH:mm');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Best-available hours for a single booking.
 *  Uses actual clock hours when clocked in/out, otherwise uses scheduled shift hours. */
function bestHours(b: Booking): number {
  if (b.clockIn && b.clockOut) return calcActualHoursWorked(b.clockIn, b.clockOut);
  return calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);
}

export interface PayrollOptions {
  fromDate?: string;          // YYYY-MM-DD inclusive; empty = all time
  toDate?: string;            // YYYY-MM-DD inclusive; empty = today
  nannyIds?: number[];        // empty / undefined = all nannies
  statusFilter?: 'all' | 'completed' | 'confirmed'; // default 'all'
}

export function exportPayrollExcel(
  nannies: Nanny[],
  bookings: Booking[],
  options?: PayrollOptions,
): void {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const from = options?.fromDate ?? '';
  const to = options?.toDate ?? todayStr;
  const statusFilter = options?.statusFilter ?? 'all';
  const nannyIds = options?.nannyIds ?? [];

  const relevant = bookings.filter((b) => {
    if (b.status === 'cancelled' || b.deletedAt) return false;
    if (b.date > to) return false;
    if (from && b.date < from) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (nannyIds.length > 0 && (!b.nannyId || !nannyIds.includes(b.nannyId))) return false;
    return true;
  });

  const nannyMap = new Map<number, Nanny>(nannies.map((n) => [n.id, n]));

  // ── DETAIL ROWS ─────────────────────────────────────────────────────
  const detailRows = [...relevant]
    .sort((a, b) => {
      const na = (a.nannyName || 'Unassigned').toLowerCase();
      const nb = (b.nannyName || 'Unassigned').toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      return a.date.localeCompare(b.date);
    })
    .map((b) => {
      const clocked = !!(b.clockIn && b.clockOut);
      const clockHours = clocked ? calcActualHoursWorked(b.clockIn!, b.clockOut!) : 0;
      const scheduledHours = calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);
      const hoursWorked = clocked ? clockHours : scheduledHours;

      const actualPay = calcNannyPayBreakdown(b);
      const estimatedPay = estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate);
      const pay = actualPay.total > 0 ? actualPay : estimatedPay;

      return {
        'Booking #': b.id,
        Date: b.date,
        Nanny: b.nannyName || 'Unassigned',
        'Parent Name': b.clientName,
        Hotel: b.hotel || '—',
        Children: b.childrenCount || 1,
        'Start Time': b.startTime || '—',
        'End Time': b.endTime || '—',
        'Scheduled Hours': fmtHours(scheduledHours),
        'Clock In': fmtClock(b.clockIn),
        'Clock Out': fmtClock(b.clockOut),
        'Clock Hours': clocked ? fmt2(clockHours) : '—',
        'Hours Worked': fmtHours(hoursWorked),
        Status: capitalize(b.status),
        'Client Price (€)': b.totalPrice || 0,
        'Base Pay (DH)': pay.basePay,
        'Taxi Fee (DH)': pay.taxiFee,
        'Total Nanny Pay (DH)': pay.total,
        'Payment Collected': b.collectedAt ? 'Yes' : 'No',
        'Payment Method': b.paymentMethod || '—',
        Notes: b.notes || '',
      };
    });

  // ── SUMMARY ROWS (per nanny) ─────────────────────────────────────────
  type NannyStat = {
    name: string;
    rate: number;
    totalBookings: number;
    completedBookings: number;
    clockHours: number;       // sum of actual clock-in/out hours
    scheduledHours: number;   // sum of booked shift hours (start→end time)
    totalHours: number;       // best-available: clock if available, else scheduled
    basePay: number;
    taxiFees: number;
    totalPay: number;
    clientRevenue: number;
    firstBooking: string;
    lastBooking: string;
  };

  const nannyStats = new Map<string, NannyStat>();

  for (const b of relevant) {
    const key = b.nannyName || 'Unassigned';
    const nanny = b.nannyId ? nannyMap.get(b.nannyId) : null;

    if (!nannyStats.has(key)) {
      nannyStats.set(key, {
        name: key,
        rate: nanny?.rate ?? HOURLY_RATE,
        totalBookings: 0,
        completedBookings: 0,
        clockHours: 0,
        scheduledHours: 0,
        totalHours: 0,
        basePay: 0,
        taxiFees: 0,
        totalPay: 0,
        clientRevenue: 0,
        firstBooking: b.date,
        lastBooking: b.date,
      });
    }

    const s = nannyStats.get(key)!;
    s.totalBookings++;
    if (b.status === 'completed') s.completedBookings++;

    const clocked = !!(b.clockIn && b.clockOut);
    if (clocked) s.clockHours += calcActualHoursWorked(b.clockIn!, b.clockOut!);
    s.scheduledHours += calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);
    s.totalHours += bestHours(b);

    const actualPay = calcNannyPayBreakdown(b);
    const estimatedPay = estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate);
    const pay = actualPay.total > 0 ? actualPay : estimatedPay;

    s.basePay += pay.basePay;
    s.taxiFees += pay.taxiFee;
    s.totalPay += pay.total;
    s.clientRevenue += b.totalPrice || 0;

    if (b.date < s.firstBooking) s.firstBooking = b.date;
    if (b.date > s.lastBooking) s.lastBooking = b.date;
  }

  const summaryRows = Array.from(nannyStats.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      'Nanny Name': s.name,
      'Rate (DH/hr)': HOURLY_RATE,
      'Total Bookings': s.totalBookings,
      'Completed Bookings': s.completedBookings,
      'Total Hours': fmt2(s.totalHours),
      'Clock Hours': fmt2(s.clockHours),
      'Scheduled Hours': fmt2(s.scheduledHours),
      'Base Pay (DH)': s.basePay,
      'Taxi Fees (DH)': s.taxiFees,
      'TOTAL OWED (DH)': s.totalPay,
      'Client Revenue (€)': fmt2(s.clientRevenue),
      'First Booking': s.firstBooking,
      'Last Booking': s.lastBooking,
    }));

  if (summaryRows.length > 0) {
    summaryRows.push({
      'Nanny Name': '── TOTAL ──',
      'Rate (DH/hr)': null as unknown as number,
      'Total Bookings': summaryRows.reduce((n, r) => n + r['Total Bookings'], 0),
      'Completed Bookings': summaryRows.reduce((n, r) => n + r['Completed Bookings'], 0),
      'Total Hours': fmt2(summaryRows.reduce((n, r) => n + r['Total Hours'], 0)),
      'Clock Hours': fmt2(summaryRows.reduce((n, r) => n + r['Clock Hours'], 0)),
      'Scheduled Hours': fmt2(summaryRows.reduce((n, r) => n + r['Scheduled Hours'], 0)),
      'Base Pay (DH)': summaryRows.reduce((n, r) => n + r['Base Pay (DH)'], 0),
      'Taxi Fees (DH)': summaryRows.reduce((n, r) => n + r['Taxi Fees (DH)'], 0),
      'TOTAL OWED (DH)': summaryRows.reduce((n, r) => n + r['TOTAL OWED (DH)'], 0),
      'Client Revenue (€)': fmt2(summaryRows.reduce((n, r) => n + r['Client Revenue (€)'], 0)),
      'First Booking': '',
      'Last Booking': '',
    });
  }

  // ── BUILD WORKBOOK ──────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
    { wch: 20 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Payroll Summary');

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 16 }, { wch: 20 },
    { wch: 20 }, { wch: 13 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Booking Details');

  const rangeLabel = from ? `${from}-to-${to}` : `all-until-${to}`;
  XLSX.writeFile(wb, `nanny-payroll-${rangeLabel}.xlsx`);
}
