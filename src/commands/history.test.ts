import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { KLINE_LIST, LINEAR_INSTRUMENT, SPOT_INSTRUMENT, instrumentsRoute, klinePage } from '../fixtures/bybit-v5-market.js';
import { OPTION_TICKER } from '../fixtures/bybit-v5-options.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { history } from './history.js';

/**
 * `history` (FR-10, FR-12, criteria 15, 16). Candle values: the first docs kline row; start times daily.
 * Constants computed by hand (`Date.UTC`, `date -u -r`):
 * - FROM 2023-09-28 00:00 UTC = 1695859200000; TO 2026-09-28 23:59:59.999 UTC = 1790639999999: 1097 days;
 * - window 1: FROM .. FROM + 1000 days - 1 ms; window 2 starts 2026-06-24 00:00 UTC = 1782259200000;
 * - 2024-01-03 00:00 UTC = 1704240000000 (first candle of a later listing).
 */
const D = 86_400_000;
const FROM = 1695859200000;
const TO = 1790639999999;
const W2 = 1782259200000;
const JAN3 = 1704240000000;
const [, open, high, low, close, volume, turnover] = KLINE_LIST[0]!;
const row = (start: number) => [String(start), open!, high!, low!, close!, volume!, turnover!];
const candle = (start: number) => ({ start, open, high, low, close, volume, turnover });
const days = (first: number, last: number) => Array.from({ length: (last - first) / D + 1 }, (_, i) => first + i * D);

let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: TO, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-history-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

/** Daily candles from `first`; each window answer also repeats the candle a day before its start (border overlap), newest first. */
function klineRoute(first: number) {
  return (url: URL) => {
    const start = Number(url.searchParams.get('start'));
    const end = Number(url.searchParams.get('end'));
    const list = days(first, TO - D + 1).filter((t) => t >= start - D && t <= end);
    return klinePage(url.searchParams.get('category')!, url.searchParams.get('symbol')!, list.reverse().map(row));
  };
}

/** By default the exchange has one candle before the period: it must not appear in the result. */
const routes = (first = FROM - D) => ({
  '/v5/market/instruments-info': instrumentsRoute({ spot: [SPOT_INSTRUMENT], linear: [LINEAR_INSTRUMENT, { ...LINEAR_INSTRUMENT, symbol: 'SOLUSDT' }], inverse: [] }),
  '/v5/market/kline': klineRoute(first),
});
const klineParams = (urls: URL[]) => urls.filter((u) => u.pathname === '/v5/market/kline').map((u) => Object.fromEntries(u.searchParams));
const run = (symbol: string, interval: 'D' | 'W' | 'M' = 'D', first = FROM - D) => {
  const { client, urls } = publicClient(routes(first));
  return history(client, { symbol, interval, period: { from: FROM, to: TO } }, deps()).then((r) => ({ r, urls }));
};

describe('history', () => {
  it('3 years of daily candles in two windows of 1000, each with start and end', async () => {
    const { urls } = await run('BTCUSDT');
    expect(klineParams(urls)).toEqual([
      { category: 'spot', symbol: 'BTCUSDT', interval: 'D', start: String(FROM), end: String(W2 - 1), limit: '1000' },
      { category: 'spot', symbol: 'BTCUSDT', interval: 'D', start: String(W2), end: String(TO), limit: '1000' },
    ]);
  });

  it('all 1097 candles oldest first, the window border candle once, the one before the period dropped', async () => {
    const { r } = await run('BTCUSDT');
    expect(r.candles).toHaveLength(1097);
    expect(r.candles).toEqual(days(FROM, TO - D + 1).map(candle));
    expect(r.boundary).toBeNull();
  });

  it('symbol on spot and linear: spot; only on linear: linear', async () => {
    expect((await run('BTCUSDT')).r.category).toBe('spot');
    const { r, urls } = await run('solusdt');
    expect(r.symbol).toBe('SOLUSDT');
    expect(r.category).toBe('linear');
    expect(klineParams(urls)[0]?.category).toBe('linear');
  });

  it('data starts later than requested: the actual boundary is named', async () => {
    const { r } = await run('BTCUSDT', 'D', JAN3);
    expect(r.candles[0]?.start).toBe(JAN3);
    expect(r.boundary).toContain('2024-01-03');
    expect(r.boundary).toContain('2023-09-28');
  });

  it('no candles in the period: empty list, reason given', async () => {
    const { r } = await run('BTCUSDT', 'D', TO + 1);
    expect(r.candles).toEqual([]);
    expect(r.boundary).toMatch(/нет/);
  });

  it('weekly and monthly: one request for 3 years', async () => {
    for (const interval of ['W', 'M'] as const) {
      const { urls } = await run('BTCUSDT', interval);
      expect(klineParams(urls)).toEqual([{ category: 'spot', symbol: 'BTCUSDT', interval, start: String(FROM), end: String(TO), limit: '1000' }]);
    }
  });

  it('option symbol: refused with the reason, nothing requested', async () => {
    const { client, urls } = publicClient(routes());
    const err = (await history(client, { symbol: OPTION_TICKER.symbol, interval: 'D', period: { from: FROM, to: TO } }, deps()).catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_BAD_ARGUMENT');
    expect(err.userMessage).toMatch(/опцион/i);
    expect(urls).toEqual([]);
  });
});
