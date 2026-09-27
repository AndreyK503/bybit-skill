import type { Coverage, Period } from '../util/window.js';

/** UTC time `YYYY-MM-DD HH:MM` from ms (number or exchange string). */
export function utcTime(ms: number | string): string {
  return new Date(Number(ms)).toISOString().slice(0, 16).replace('T', ' ');
}

/** Header line with the period and a line per depth boundary (criterion 16). */
export function renderPeriod(period: Period, coverage: Coverage[]): string {
  const lines = [`Период: ${utcTime(period.from)} — ${utcTime(period.to)} UTC`];
  for (const c of coverage) if (c.boundary) lines.push(`Граница данных: ${c.boundary}`);
  return lines.join('\n');
}

/** Sum of numeric strings; empty strings are skipped (the exchange leaves unused fields empty). */
export function sumStrings(values: string[]): number {
  return values.filter((v) => v !== '').reduce((sum, v) => sum + Number(v), 0);
}
