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

function fmtClock(ts: string | null | undefined): string {
  if (!ts) return '—';
  return format(new Date(ts), 'dd/MM/yyyy HH:mm');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface PayrollDateRange {
  fromDate: string; // YYYY-MM-DD, inclusive
  toDate: string;   // YYYY-MM-DD, inclusive
}

export function exportPayrollExcel(
  nannies: Nanny[],
  bookings: Booking[],
  range?: PayrollDateRange,
): void {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const from = range?.fromDate ?? '';
  const to = range?.toDate ?? todayStr;

  // Filter by date range + exclude cancelled/deleted
  const relevant = bookings.filter(
    (b) =>
      b.status !== 'cancelled' &&
      !b.deletedAt &&
      b.date <= to &&
      (!from || b.date >= from),
  );

  // Nanny lookup by id
  const nannyMap = new Map<number, Nanny>(nannies.map((n) => [n.id, n]));

  // ── DETAIL ROWS ────────────────────────────────────────────────────
  const detailRows = [...relevant]
    .sort((a, b) => {
      const na = (a.nannyName || 'Unassigned').toLowerCase();
      const nb = (b.nannyName || 'Unassigned').toLowerCase();
      if (na !== nb) return na.localeCompare(nb);
      return a.date.localeCompare(b.date);
    })
    .map((b) => {
      const actualHours =
        b.clockIn && b.clockOut ? calcActualHoursWorked(b.clockIn, b.clockOut) : 0;
      const estimatedHours = calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);

      const actualPay = calcNannyPayBreakdown(b);
      const estimatedPay = estimateNannyPayBreakdown(b.startTime, b.endTime, b.date, b.endDate);
      const pay = actualPay.total > 0 ? actualPay : estimatedPay;
      const hoursUsed = actualPay.total > 0 ? fmt2(actualHours) : fmt2(estimatedHours);

      return {
        'Booking #': b.id,
        Date: b.date,
        Nanny: b.nannyName || 'Unassigned',
        'Parent Name': b.clientName,
        Hotel: b.hotel || '—',
        Children: b.childrenCount || 1,
        'Start Time': b.startTime,
        'End Time': b.endTime,
        'Clock In': fmtClock(b.clockIn),
        'Clock Out': fmtClock(b.clockOut),
        'Hours Worked': hoursUsed,
        'Actual Hours': b.clockIn && b.clockOut ? fmt2(actualHours) : '—',
        'Estimated Hours': fmt2(estimatedHours),
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

  // ── SUMMARY ROWS (per nanny) ────────────────────────────────────────
  type NannyStat = {
    name: string;
    rate: number;
    totalBookings: number;
    completedBookings: number;
    actualHours: number;
    estimatedHours: number;
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
        actualHours: 0,
        estimatedHours: 0,
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

    if (b.clockIn && b.clockOut) {
      s.actualHours += calcActualHoursWorked(b.clockIn, b.clockOut);
    }
    s.estimatedHours += calcBookedHours(b.startTime, b.endTime, b.date, b.endDate);

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
      'Actual Hours Worked': fmt2(s.actualHours),
      'Estimated Total Hours': fmt2(s.estimatedHours),
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
      'Actual Hours Worked': fmt2(summaryRows.reduce((n, r) => n + r['Actual Hours Worked'], 0)),
      'Estimated Total Hours': fmt2(summaryRows.reduce((n, r) => n + r['Estimated Total Hours'], 0)),
      'Base Pay (DH)': summaryRows.reduce((n, r) => n + r['Base Pay (DH)'], 0),
      'Taxi Fees (DH)': summaryRows.reduce((n, r) => n + r['Taxi Fees (DH)'], 0),
      'TOTAL OWED (DH)': summaryRows.reduce((n, r) => n + r['TOTAL OWED (DH)'], 0),
      'Client Revenue (€)': fmt2(summaryRows.reduce((n, r) => n + r['Client Revenue (€)'], 0)),
      'First Booking': '',
      'Last Booking': '',
    });
  }

  // ── BUILD WORKBOOK ─────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 22 },
    { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 20 },
    { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Payroll Summary');

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  wsDetail['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 22 },
    { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 20 }, { wch: 20 },
    { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Booking Details');

  const rangeLabel = from ? `${from}-to-${to}` : `all-until-${to}`;
  XLSX.writeFile(wb, `nanny-payroll-${rangeLabel}.xlsx`);
}
