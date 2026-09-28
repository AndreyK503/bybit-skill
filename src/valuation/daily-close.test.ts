import { describe, expect, it } from 'vitest';
import { KLINE_ETHUSDT_20240116 } from '../fixtures/bybit-v5-funds.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { fetchDailyCloses, valueOnDate } from './daily-close.js';

/**
 * Daily spot close (D-8). ETHUSDT 2024-01-16 close 2587.54: live public kline (fixture).
 * 0.1 x 2587.54 = 258.754 (by hand). Kline limit 1000 per request: docs market/kline.
 */
const DAY0 = 1705363200000; // 2024-01-16T00:00Z
const prices = { pairs: new Set(['ETHUSDT']), closes: new Map([['ETHUSDT', new Map([[DAY0, '2587.54']])]]) };

describe('valueOnDate', () => {
  it('USDT and USDC 1:1, exact', () => {
    for (const coin of ['USDT', 'USDC']) expect(valueOnDate(coin, '5', DAY0, prices)).toMatchObject({ usd: 5 });
  });

  it('any time within the UTC day uses that day close', () => {
    const e = valueOnDate('ETH', '0.1', DAY0 + 8 * 3600_000, prices);
    expect(e.usd).toBeCloseTo(258.754, 10);
    for (const part of ['ETHUSDT', '2024-01-16', '2587.54']) expect(e.note).toContain(part);
  });

  it('no pair -> null, reason names the pair', () => {
    const e = valueOnDate('ADA', '1', DAY0, prices);
    expect(e.usd).toBeNull();
    expect(e.note).toContain('ADAUSDT');
  });

  it('no candle on the day -> null, reason names the day', () => {
    const e = valueOnDate('ETH', '1', DAY0 + DAY_MS, prices);
    expect(e.usd).toBeNull();
    expect(e.note).toContain('2024-01-17');
  });
});

describe('fetchDailyCloses', () => {
  it('spot daily klines in windows of at most 1000 days, merged by day', async () => {
    const days = Array.from({ length: 1500 }, (_, i) => DAY0 + i * DAY_MS);
    const { client, urls } = publicClient({
      '/v5/market/kline': (url) => {
        const s = Number(url.searchParams.get('start'));
        const e = Number(url.searchParams.get('end'));
        const list = days.filter((d) => d >= s && d <= e).reverse().map((d) => [String(d), '1', '1', '1', String(d / DAY_MS), '1', '1']);
        return { retCode: 0, retMsg: 'OK', result: { category: 'spot', symbol: 'ETHUSDT', list }, retExtInfo: {}, time: 0 };
      },
    });
    const closes = await fetchDailyCloses(client, 'ETHUSDT', { from: days[0]!, to: days.at(-1)! });
    expect(urls).toHaveLength(2);
    for (const u of urls) {
      expect(u.searchParams.get('category')).toBe('spot');
      expect(u.searchParams.get('interval')).toBe('D');
      expect(Number(u.searchParams.get('end')) - Number(u.searchParams.get('start'))).toBeLessThan(1000 * DAY_MS);
    }
    expect(closes.size).toBe(1500);
    expect(closes.get(DAY0)).toBe(String(DAY0 / DAY_MS));
  });

  it('candle start is the UTC day start (docs fixture)', async () => {
    const { client } = publicClient({ '/v5/market/kline': () => ({ retCode: 0, retMsg: 'OK', result: { list: [KLINE_ETHUSDT_20240116] }, retExtInfo: {}, time: 0 }) });
    const closes = await fetchDailyCloses(client, 'ETHUSDT', { from: DAY0, to: DAY0 });
    expect(closes.get(DAY0)).toBe('2587.54');
  });
});

describe('valueOnDate: the current UTC day', () => {
  it('candle not closed yet: its close is the last price (docs market/kline), and the note says so', () => {
    const today = { ...prices, now: DAY0 + 10 * 3600_000 };
    const e = valueOnDate('ETH', '0.1', DAY0 + 8 * 3600_000, today);
    expect(e.usd).toBeCloseTo(258.754, 10);
    expect(e.note).toMatch(/не закрыт/);
    expect(e.note).not.toMatch(/цена закрытия/);
  });

  it('a past day keeps the close wording', () => {
    const e = valueOnDate('ETH', '0.1', DAY0, { ...prices, now: DAY0 + 2 * DAY_MS });
    expect(e.note).toMatch(/цена закрытия/);
  });
});
