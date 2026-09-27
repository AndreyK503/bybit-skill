import { describe, expect, it } from 'vitest';
import { DELIVERY, timeRoute } from '../fixtures/bybit-v5-history.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { deliveries } from './deliveries.js';

/** `deliveries` (FR-9). Docs example moved into the period; window 30 days (docs asset/delivery). */
const D = DAY_MS;
const NOW = 1790600000000;
const BTC = { ...DELIVERY, deliveryTime: NOW - 10 * D };
const ETH = { ...DELIVERY, symbol: 'ETH-25SEP26-3000-C-USDT', deliveryTime: NOW - 3 * D };
const ROWS = { option: [BTC, ETH], linear: [], inverse: [] };

const run = (coin?: string) => {
  const { client, urls } = routedClient({ '/v5/user/query-api': READ_ONLY_KEY, '/v5/asset/delivery-record': timeRoute(ROWS, 'deliveryTime') });
  return deliveries(client, { period: { from: NOW - 60 * D, to: NOW }, coin }, { now: NOW }).then((r) => ({
    r,
    urls: urls.filter((u) => u.pathname === '/v5/asset/delivery-record'),
  }));
};

describe('deliveries', () => {
  it('option, linear and inverse in windows of at most 30 days', async () => {
    const { urls } = await run();
    expect(new Set(urls.map((u) => u.searchParams.get('category')))).toEqual(new Set(['option', 'linear', 'inverse']));
    // NOW - 60 days .. NOW inclusive is 60 days + 1 ms: 3 windows of at most 30 days per category.
    expect(urls).toHaveLength(9);
    for (const u of urls) expect(Number(u.searchParams.get('endTime')) - Number(u.searchParams.get('startTime'))).toBeLessThanOrEqual(30 * D);
  });

  it('raw fields, newest first; entryPrice missing in the response stays empty', async () => {
    const { r } = await run();
    expect(r.deliveries.map((d) => d.symbol)).toEqual(['ETH-25SEP26-3000-C-USDT', 'BTC-29DEC22-16000-P']);
    expect(r.deliveries[1]).toEqual({
      category: 'option',
      symbol: 'BTC-29DEC22-16000-P',
      side: 'Buy',
      position: '0.01',
      entryPrice: '',
      strike: '16000',
      deliveryPrice: '16541.86369547',
      fee: '0.00000000',
      deliveryRpl: '3.5',
      deliveryTime: NOW - 10 * D,
    });
  });

  it('--coin keeps that base coin only', async () => {
    const { r } = await run('eth');
    expect(r.deliveries.map((d) => d.symbol)).toEqual(['ETH-25SEP26-3000-C-USDT']);
  });
});
