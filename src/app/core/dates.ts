/** All dates are local calendar dates stored as 'YYYY-MM-DD'; months as 'YYYY-MM'. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): string {
  return toIsoDate(new Date());
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function monthRange(month: string): { start: string; end: string; days: number } {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${pad(days)}`, days };
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Monday-based week containing the given date. */
export function weekRange(date: string): { start: string; end: string } {
  const d = parseIsoDate(date);
  const offset = (d.getDay() + 6) % 7;
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start: toIsoDate(start), end: toIsoDate(end) };
}

export function monthLabel(month: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: style, year: 'numeric' });
}

export function lastNMonths(endMonth: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(endMonth, i - n + 1));
}
