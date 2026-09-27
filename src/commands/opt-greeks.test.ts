import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { QUERY_API } from '../fixtures/bybit-v5-access.js';
import { OPTION_ASSET_INFO } from '../fixtures/bybit-v5-account.js';
import { COIN_GREEKS } from '../fixtures/bybit-v5-options.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { optGreeks } from './opt-greeks.js';

/**
 * Fixtures: COIN_GREEKS (docs, BTC) and OPTION_ASSET_INFO (docs, BTC, totalDelta 0.0118).
 * Variants add a coin present in only one source, as noted at each use.
 * Decision 2026-09-27: delta is options-only (option-asset-info), not coin-greeks totalDelta,
 * which on the live account included spot and perpetuals.
 */
const ETH_GREEKS = { baseCoin: 'ETH', totalDelta: '2.96009045', totalGamma: '-0.00609921', totalVega: '-47.60677717', totalTheta: '17.58228395' };
const SOL_ASSET = { ...OPTION_ASSET_INFO.result.result[0]!, coin: 'SOL', totalDelta: '-8.4933' };

function setup(greeks: unknown = COIN_GREEKS, assets: unknown = OPTION_ASSET_INFO) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/asset/coin-greeks': () => greeks,
    '/v5/account/option-asset-info': () => assets,
  });
}

describe('opt greeks', () => {
  it('per coin: delta from option-asset-info, gamma, vega, theta from coin-greeks, all raw', async () => {
    const { client } = setup();
    const r = await optGreeks(client);
    expect(r.coins).toEqual([{ baseCoin: 'BTC', delta: '0.0118', gamma: '-0.00000009', vega: '-0.00039689', theta: '0.01243824' }]);
  });

  it('coin in only one source: missing greeks empty with a reason naming the coin', async () => {
    const greeks = { ...COIN_GREEKS, result: { list: [...COIN_GREEKS.result.list, ETH_GREEKS] } };
    const assets = { ...OPTION_ASSET_INFO, result: { result: [...OPTION_ASSET_INFO.result.result, SOL_ASSET] } };
    const { client } = setup(greeks, assets);
    const r = await optGreeks(client);
    expect(r.coins).toContainEqual({ baseCoin: 'ETH', delta: '', gamma: '-0.00609921', vega: '-47.60677717', theta: '17.58228395' });
    expect(r.coins).toContainEqual({ baseCoin: 'SOL', delta: '-8.4933', gamma: '', vega: '', theta: '' });
    expect(r.notes.some((n) => n.includes('ETH') && n.includes('option-asset-info'))).toBe(true);
    expect(r.notes.some((n) => n.includes('SOL') && n.includes('coin-greeks'))).toBe(true);
  });

  it('notes name the source of each greek and that delta excludes spot and perpetuals', async () => {
    const { client } = setup();
    const text = (await optGreeks(client)).notes.join('\n');
    expect(text).toContain('option-asset-info');
    expect(text).toContain('coin-greeks');
    expect(text).toContain('без спота и бессрочных');
  });

  it('coin filter: baseCoin passed to coin-greeks, option-asset-info filtered locally', async () => {
    const assets = { ...OPTION_ASSET_INFO, result: { result: [...OPTION_ASSET_INFO.result.result, SOL_ASSET] } };
    const { client, urls } = setup(COIN_GREEKS, assets);
    const r = await optGreeks(client, { coin: 'btc' });
    expect(r.coins.map((c) => c.baseCoin)).toEqual(['BTC']);
    const q = urls.find((u) => u.pathname === '/v5/asset/coin-greeks');
    expect(q?.searchParams.get('baseCoin')).toBe('BTC');
  });

  it('checks the key is read-only first', async () => {
    const { client } = routedClient({ '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }) });
    const err = await optGreeks(client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
  });
});
