/**
 * Hebrew date display per PRODUCT_SPEC §7: "היום · 09:14", "אתמול", "14 ביולי",
 * "1 באוגוסט", month "יולי 2025". All "day in Israel" semantics use local
 * dates directly (ISO yyyy-MM-dd strings in the domain).
 */

export type MonthKey = `${number}-${string}`; // "2026-07"
export type ISODate = string; // "2026-07-16"

const hebMonth = new Intl.DateTimeFormat('he-IL', { month: 'long' });
const hebMonthYear = new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' });
const hebTime = new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthKeyOf(iso: ISODate): MonthKey {
  return iso.slice(0, 7) as MonthKey;
}

export function currentMonthKey(today: Date = new Date()): MonthKey {
  return monthKeyOf(toISODate(today));
}

export function monthKeyToDate(month: MonthKey): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const d = monthKeyToDate(month);
  d.setMonth(d.getMonth() + delta);
  return monthKeyOf(toISODate(d));
}

export function isValidMonthKey(value: string | undefined | null): value is MonthKey {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function daysInMonth(month: MonthKey): number {
  const d = monthKeyToDate(month);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** "יולי 2025" */
export function formatMonth(month: MonthKey): string {
  return hebMonthYear.format(monthKeyToDate(month));
}

/** "14 ביולי" — day inside a month; ב prefix per design copy */
export function formatDayMonth(iso: ISODate): string {
  const date = parseISODate(iso);
  return `${date.getDate()} ב${hebMonth.format(date)}`;
}

/** "היום · 09:14" / "אתמול" / "14 ביולי" */
export function formatRelativeDay(
  iso: ISODate,
  options: { time?: string; today?: Date } = {},
): string {
  const { time, today = new Date() } = options;
  const todayISO = toISODate(today);
  const yesterdayISO = toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1));
  if (iso === todayISO) return time ? `היום · ${time}` : 'היום';
  if (iso === yesterdayISO) return 'אתמול';
  return formatDayMonth(iso);
}

/** "09:14" from a Date. */
export function formatTime(date: Date): string {
  return hebTime.format(date);
}

/** Day-group heading in transaction lists: "היום", "אתמול", "14 ביולי" */
export function formatDayHeading(iso: ISODate, today: Date = new Date()): string {
  return formatRelativeDay(iso, { today });
}
