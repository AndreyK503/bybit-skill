import type { BybitClient } from '../api/client.js';
import { fetchAllPages, type CursorPage } from './cursor.js';

export const DAY_MS = 86_400_000;
/** Depth with a one-day margin: the exchange refuses a startTime 730 / 180 days back or deeper (live 2026-09-27). */
export const DEPTH_2Y_DAYS = 729;
export const DEPTH_6M_DAYS = 179;
/** At most 20 requests per second: below every documented per-UID limit (25/s and 50/s). */
export const MIN_REQUEST_INTERVAL_MS = 50;

/** Inclusive period in ms. */
export interface Period {
  from: number;
  to: number;
}

/** What a source actually covered; boundary names the exchange depth limit when it cut the period. */
export interface Coverage {
  source: string;
  requestedFrom: number;
  from: number;
  to: number;
  boundary: string | null;
}

export interface WindowedSource {
  label: string;
  path: string;
  params: Record<string, string>;
  windowDays: number;
  depthDays: number;
  depthText: string;
}

export interface WindowDeps {
  now: number;
  throttle?: () => Promise<void>;
  onProgress?: (label: string, done: number, total: number) => void;
}

const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Split an inclusive period into non-overlapping inclusive windows of at most windowDays. */
export function splitWindows(period: Period, windowDays: number): Period[] {
  const size = windowDays * DAY_MS;
  const windows: Period[] = [];
  for (let from = period.from; from <= period.to; from += size) windows.push({ from, to: Math.min(from + size - 1, period.to) });
  return windows;
}

/** Cut the period at the exchange depth; the boundary text says where and why. */
export function clampToDepth(period: Period, source: WindowedSource, now: number): { period: Period | null; coverage: Coverage } {
  const minFrom = now - source.depthDays * DAY_MS;
  const from = Math.max(period.from, minFrom);
  const boundary =
    period.from < minFrom
      ? `Биржа отдаёт ${source.label} не глубже ${source.depthText}: данные с ${isoDate(minFrom)}, запрошено с ${isoDate(period.from)}.`
      : null;
  const coverage = { source: source.label, requestedFrom: period.from, from, to: period.to, boundary };
  return { period: from <= period.to ? { from, to: period.to } : null, coverage };
}

/** Wait so that consecutive calls are at least intervalMs apart. */
export function createThrottle(intervalMs: number, clock: () => number, sleep: (ms: number) => Promise<void>): () => Promise<void> {
  let last: number | null = null;
  return async () => {
    const wait = last === null ? 0 : last + intervalMs - clock();
    if (wait > 0) await sleep(wait);
    last = clock();
  };
}

/** Collect a signed history source over a period: windows, cursor inside each, depth boundary (D-5). */
export async function fetchWindowed<T>(client: BybitClient, source: WindowedSource, period: Period, deps: WindowDeps): Promise<{ rows: T[]; coverage: Coverage }> {
  const clamped = clampToDepth(period, source, deps.now);
  if (!clamped.period) return { rows: [], coverage: clamped.coverage };
  const windows = splitWindows(clamped.period, source.windowDays);
  const rows: T[] = [];
  for (const [i, w] of windows.entries()) {
    const base = { ...source.params, startTime: String(w.from), endTime: String(w.to) };
    const page = await fetchAllPages(async (cursor) => {
      await deps.throttle?.();
      const r = await client.getPrivate<{ list?: T[]; rows?: T[]; nextPageCursor: string }>(source.path, cursor ? { ...base, cursor } : base);
      return { list: r.list ?? r.rows ?? [], nextPageCursor: r.nextPageCursor } satisfies CursorPage<T>;
    });
    rows.push(...page);
    deps.onProgress?.(source.label, i + 1, windows.length);
  }
  return { rows, coverage: clamped.coverage };
}
