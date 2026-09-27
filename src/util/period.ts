import { AppError } from '../api/errors.js';
import { DAY_MS, type Period } from './window.js';

/** Period flags: `--days N` or `--from`/`--to` dates (YYYY-MM-DD, UTC). */
export interface PeriodArgs {
  days?: number;
  from?: string;
  to?: string;
}

const badPeriod = (userMessage: string) => new AppError({ code: 'APP_BAD_PERIOD', userMessage });
const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`);

/**
 * Resolve CLI period flags against an explicit `now` (reference: computeOperationsRange).
 * `--to` covers its whole UTC day and is capped at now; no flags means the last defaultDays.
 */
export function resolvePeriod(args: PeriodArgs, defaultDays: number, now: number): Period {
  if (args.days !== undefined && (args.from || args.to)) throw badPeriod('Период задаётся либо --days, либо датами --from/--to, не вместе.');
  if (args.days !== undefined) return { from: now - args.days * DAY_MS, to: now };
  const to = args.to ? Math.min(dayStart(args.to) + DAY_MS - 1, now) : now;
  const from = args.from ? dayStart(args.from) : to - defaultDays * DAY_MS;
  if (from > to) throw badPeriod(`Начало периода (${args.from}) позже его конца.`);
  return { from, to };
}
