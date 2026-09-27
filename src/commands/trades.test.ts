import { describe, expect, it } from 'vitest';
import { EXECUTION_FUNDING, EXECUTION_LINEAR, EXECUTION_OPTION, timeRoute } from '../fixtures/bybit-v5-history.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { trades } from './trades.js';

/**
 * `trades` (FR-7, criteria 11, 12). NOW = 1790600000000 (2026-09-28 ~12:53 UTC).
 * Live 2026-09-27: category=option without baseCoin returns every base coin; funding rows
 * come from execution/list too (execType Funding).
 */
const D = DAY_MS;
const NOW = 1790600000000;
const LINEAR = { ...EXECUTION_LINEAR, execTime: String(NOW - 2 * D) };
const ROWS = { linear: [LINEAR, EXECUTION_FUNDING], option: [EXECUTION_OPTION], spot: [], inverse: [] };
const PERIOD = { from: NOW - 10 * D, to: NOW };

const run = (opts: Partial<Parameters<typeof trades>[1]> = {}, period = PERIOD) => {
  const { client, urls } = routedClient({ '/v5/user/query-api': READ_ONLY_KEY, '/v5/execution/list': timeRoute(ROWS, 'execTime') });
  return trades(client, { period, ...opts }, { now: NOW }).then((r) => ({ r, urls: urls.filter((u) => u.pathname === '/v5/execution/list') }));
};

describe('trades', () => {
  it('queries spot, linear, inverse and option, without baseCoin, in windows with startTime and endTime', async () => {
    const { urls } = await run();
    const cats = new Set(urls.map((u) => u.searchParams.get('category')));
    expect([...cats].sort()).toEqual(['inverse', 'linear', 'option', 'spot']);
    for (const u of urls) {
      expect(u.searchParams.has('baseCoin')).toBe(false);
      expect(Number(u.searchParams.get('endTime')) - Number(u.searchParams.get('startTime'))).toBeLessThanOrEqual(7 * D);
    }
    // 10 days = 2 windows per category.
    expect(urls).toHaveLength(8);
  });

  it('keeps raw execution fields as the exchange sent them', async () => {
    const { r } = await run();
    expect(r.trades.find((t) => t.category === 'linear')).toEqual({
      category: 'linear',
      symbol: 'ETHPERP',
      side: 'Buy',
      execPrice: '1190.15',
      execQty: '0.1',
      execValue: '119.015',
      execFee: '0.071409',
      feeCurrency: '',
      isMaker: false,
      execType: 'Trade',
      execTime: String(NOW - 2 * D),
      tradeIv: '',
      markIv: '',
      underlyingPrice: '',
      indexPrice: '',
    });
  });

  it('option trade shows trade IV, mark IV, underlying and index price', async () => {
    const { r } = await run();
    const o = r.trades.find((t) => t.category === 'option');
    expect([o?.tradeIv, o?.markIv, o?.underlyingPrice, o?.indexPrice]).toEqual(['0.733253', '0.7869', '0.6982', '0.69439467']);
  });

  it('funding rows are not trades', async () => {
    const { r } = await run();
    expect(r.trades.map((t) => t.execType)).not.toContain('Funding');
    expect(r.trades).toHaveLength(2);
  });

  it('sorted by execTime, newest first', async () => {
    const { r } = await run();
    // option 1790467250961 is newer than linear NOW - 2 days = 1790427200000.
    expect(r.trades.map((t) => t.category)).toEqual(['option', 'linear']);
  });

  it('fee totals per fee currency are computed; an empty feeCurrency is named, not guessed', async () => {
    const { r } = await run();
    expect(r.computed.feesByCurrency).toEqual({ USDT: 0.20831841, 'не указана': 0.071409 });
    expect(r.computedNotes.feesByCurrency).not.toBe('');
  });

  it('--category limits the requests; --symbol is passed to the exchange', async () => {
    const { urls } = await run({ category: 'option', symbol: 'MNT-30OCT26-0.56-P-USDT' });
    expect(new Set(urls.map((u) => u.searchParams.get('category')))).toEqual(new Set(['option']));
    for (const u of urls) expect(u.searchParams.get('symbol')).toBe('MNT-30OCT26-0.56-P-USDT');
  });

  it('coverage per category; a period deeper than 2 years names the boundary', async () => {
    const { r } = await run({}, { from: NOW - 800 * D, to: NOW });
    expect(r.coverage).toHaveLength(4);
    for (const c of r.coverage) expect(c.boundary).toContain('2 лет');
  });
});
