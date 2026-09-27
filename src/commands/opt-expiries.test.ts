import { describe, expect, it } from 'vitest';
import { OPTION_INSTRUMENT, instrumentsPage } from '../fixtures/bybit-v5-options.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { optExpiries } from './opt-expiries.js';

/**
 * Fixture: OPTION_INSTRUMENT (docs example); variants change symbol, baseCoin, optionsType, deliveryTime.
 * 2026-10-30 08:00 UTC = 1793347200000; 2026-10-01 20:00 UTC = 1790884800000 (stock options expire at 20:00,
 * live 2026-09-27); 2026-11-27 08:00 UTC = 1795766400000.
 */
const T_OCT30 = '1793347200000';
const T_OCT01_20H = '1790884800000';
const T_NOV = '1795766400000';
const inst = (symbol: string, baseCoin: string, optionsType: string, deliveryTime: string) => ({ ...OPTION_INSTRUMENT, symbol, baseCoin, optionsType, deliveryTime });

const BTC = [
  inst('BTC-27NOV26-70000-P-USDT', 'BTC', 'Put', T_NOV),
  inst('BTC-30OCT26-70000-C-USDT', 'BTC', 'Call', T_OCT30),
  inst('BTC-30OCT26-60000-P-USDT', 'BTC', 'Put', T_OCT30),
  inst('BTC-30OCT26-65000-P-USDT', 'BTC', 'Put', T_OCT30),
];
const NVDA = [inst('NVDA-1OCT26-250-C-USDT', 'NVDA', 'Call', T_OCT01_20H)];

describe('opt expiries', () => {
  it('unique expiries ascending with call and put counts, every page, no key', async () => {
    const { client, urls } = publicClient({
      '/v5/market/instruments-info': (url) =>
        url.searchParams.get('cursor') === 'n2' ? instrumentsPage(BTC.slice(2), '') : instrumentsPage(BTC.slice(0, 2), 'n2'),
    });
    const r = await optExpiries(client, { coin: 'btc' });
    expect(r.expiries).toEqual([
      { baseCoin: 'BTC', date: '2026-10-30', deliveryTime: T_OCT30, calls: 1, puts: 2 },
      { baseCoin: 'BTC', date: '2026-11-27', deliveryTime: T_NOV, calls: 0, puts: 1 },
    ]);
    expect(urls.map((u) => Object.fromEntries(u.searchParams))).toEqual([
      { category: 'option', baseCoin: 'BTC', limit: '1000' },
      { category: 'option', baseCoin: 'BTC', limit: '1000', cursor: 'n2' },
    ]);
  });

  it('without a coin: all base coins (baseCoin=All), time taken from deliveryTime', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': () => instrumentsPage([...BTC, ...NVDA], '') });
    const r = await optExpiries(client);
    expect(urls[0]?.searchParams.get('baseCoin')).toBe('All');
    expect(r.expiries).toEqual([
      { baseCoin: 'NVDA', date: '2026-10-01', deliveryTime: T_OCT01_20H, calls: 1, puts: 0 },
      { baseCoin: 'BTC', date: '2026-10-30', deliveryTime: T_OCT30, calls: 1, puts: 2 },
      { baseCoin: 'BTC', date: '2026-11-27', deliveryTime: T_NOV, calls: 0, puts: 1 },
    ]);
  });

  it('no options for the coin: empty list', async () => {
    const { client } = publicClient({ '/v5/market/instruments-info': () => instrumentsPage([], '') });
    expect((await optExpiries(client, { coin: 'DOT' })).expiries).toEqual([]);
  });
});
