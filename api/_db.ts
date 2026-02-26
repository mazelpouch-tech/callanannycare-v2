import { neon } from '@neondatabase/serverless';

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is required');
  return neon(url);
}

// ─── Scheduling Utilities ─────────────────────────────────────────

/** Parse "HHhMM" time format to minutes since midnight. Returns null for unparseable. */
export function parseTimeToMinutes(time: string): number | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2})h(\d{2})$/i);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

/** Check if two time ranges overlap, handling overnight shifts (e.g. 20h00-02h00) */
export function timesOverlap(
  start1: string, end1: string,
  start2: string, end2: string
): boolean {
  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;

  const overnight1 = e1 <= s1;
  const overnight2 = e2 <= s2;

  if (!overnight1 && !overnight2) {
    return s1 < e2 && s2 < e1;
  }
  if (overnight1 && overnight2) {
    return true;
  }
  // One range crosses midnight: overlap if either segment intersects
  return s1 < e2 || s2 < e1;
}

/** Generate all date strings (YYYY-MM-DD) in a range. If endDate is null/same, returns [startDate]. */
export function getDateRange(startDate: string, endDate: string | null): string[] {
  if (!endDate || endDate === startDate) return [startDate];
  const dates: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates.length > 0 ? dates : [startDate];
}
