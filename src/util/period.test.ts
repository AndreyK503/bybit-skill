import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { resolvePeriod } from './period.js';
import { DAY_MS } from './window.js';

/** Period flags (FR-12). NOW = 2026-09-27 12:00 UTC. */
const D = DAY_MS;
const NOW = Date.UTC(2026, 8, 27, 12);

describe('resolvePeriod', () => {
  it('no flags: the last defaultDays up to now', () => {
    expect(resolvePeriod({}, 30, NOW)).toEqual({ from: NOW - 30 * D, to: NOW });
  });

  it('--days N: the last N days up to now', () => {
    expect(resolvePeriod({ days: 7 }, 30, NOW)).toEqual({ from: NOW - 7 * D, to: NOW });
  });

  it('--from/--to: from 00:00 UTC of from to the end of the to day', () => {
    expect(resolvePeriod({ from: '2026-09-01', to: '2026-09-10' }, 30, NOW)).toEqual({
      from: Date.UTC(2026, 8, 1),
      to: Date.UTC(2026, 8, 11) - 1,
    });
  });

  it('--to beyond now is capped at now; --from alone runs to now', () => {
    expect(resolvePeriod({ from: '2026-09-01', to: '2026-09-30' }, 30, NOW).to).toBe(NOW);
    expect(resolvePeriod({ from: '2026-09-01' }, 30, NOW)).toEqual({ from: Date.UTC(2026, 8, 1), to: NOW });
  });

  it('--to alone: defaultDays back from the end of the to day', () => {
    const to = Date.UTC(2026, 8, 11) - 1;
    expect(resolvePeriod({ to: '2026-09-10' }, 30, NOW)).toEqual({ from: to - 30 * D, to });
  });

  it('--days together with dates, or from after to: APP_BAD_PERIOD', () => {
    for (const args of [{ days: 7, from: '2026-09-01' }, { from: '2026-09-10', to: '2026-09-01' }]) {
      const err = (() => {
        try {
          resolvePeriod(args, 30, NOW);
        } catch (e) {
          return e;
        }
      })();
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('APP_BAD_PERIOD');
    }
  });
});
