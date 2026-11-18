// Calendar-day helpers that stay in the device's own time zone.
//
// `Date.toISOString().slice(0, 10)` gives the UTC day, which is the wrong calendar day for part
// of every day anywhere outside UTC (before 6am in Dhaka, every evening in New York) — and
// `new Date('2026-11-20')` parses as UTC midnight, which is the previous evening west of UTC.
// Anything that means "a day on the user's calendar" (a loan's due date, "today") goes through
// these two instead.

/** Local calendar day as "YYYY-MM-DD". */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local midnight of a "YYYY-MM-DD" key — the inverse of toDateKey. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
