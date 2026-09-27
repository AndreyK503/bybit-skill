export const DASH = '—';

/** A raw exchange string, or a dash when the exchange left it empty. */
export function orDash(value: string): string {
  return value === '' ? DASH : value;
}

/** A computed number, or a dash when it could not be computed. */
export function numOrDash(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? DASH : value.toFixed(digits);
}
