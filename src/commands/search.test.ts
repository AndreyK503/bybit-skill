import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogDeps } from '../catalog/catalog.js';
import { LINEAR_INSTRUMENT, OPTION_BASE_COINS, SPOT_INSTRUMENT, instrumentsRoute } from '../fixtures/bybit-v5-market.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { renderSearch, search } from './search.js';

/**
 * `search` (FR-11). Docs spot and linear items with changed symbol, coins and contractType (enum contractType:
 * LinearPerpetual, LinearFutures, InversePerpetual, InverseFutures); option base coins: docs example (BTC, SPCX).
 */
const NOW = 1790600000000;
const spot = (symbol: string, baseCoin: string, quoteCoin: string) => ({ ...SPOT_INSTRUMENT, symbol, baseCoin, quoteCoin });
const contract = (symbol: string, contractType: string, quoteCoin: string) => ({ ...LINEAR_INSTRUMENT, symbol, contractType, quoteCoin });

const CATALOG = {
  spot: [spot('BTCUSDT', 'BTC', 'USDT'), spot('ETHBTC', 'ETH', 'BTC'), spot('SOLUSDT', 'SOL', 'USDT')],
  linear: [contract('BTCUSDT', 'LinearPerpetual', 'USDT'), contract('BTC-26DEC25', 'LinearFutures', 'USDC')],
  inverse: [contract('BTCUSD', 'InversePerpetual', 'USD'), contract('BTCUSDZ25', 'InverseFutures', 'USD')],
};

let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: NOW, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-search-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ROUTES = { '/v5/market/instruments-info': instrumentsRoute(CATALOG), '/v5/market/option-base-coins': () => OPTION_BASE_COINS };
const run = (query: string) => {
  const { client, urls } = publicClient(ROUTES);
  return search(client, query, deps()).then((r) => ({ r, urls }));
};
const brief = (r: Awaited<ReturnType<typeof search>>) => r.matches.map((m) => [m.symbol, m.category, m.type]);

describe('search', () => {
  it('any case; exact base coin before substring; spot, linear, inverse; every row typed', async () => {
    const { r } = await run('btc');
    expect(r.query).toBe('BTC');
    expect(brief(r)).toEqual([
      ['BTCUSDT', 'spot', 'спот'],
      ['BTC-26DEC25', 'linear', 'фьючерс'],
      ['BTCUSDT', 'linear', 'бессрочный'],
      ['BTCUSD', 'inverse', 'бессрочный инверсный'],
      ['BTCUSDZ25', 'inverse', 'фьючерс инверсный'],
      ['ETHBTC', 'spot', 'спот'],
    ]);
    expect(r.matches[0]).toEqual({ symbol: 'BTCUSDT', category: 'spot', type: 'спот', baseCoin: 'BTC', quoteCoin: 'USDT', status: 'Trading' });
    expect(r.catalogSavedAt).toBe(NOW);
  });

  it('exact symbol first', async () => {
    const { r } = await run('BTCUSD');
    expect(brief(r)).toEqual([
      ['BTCUSD', 'inverse', 'бессрочный инверсный'],
      ['BTCUSDT', 'spot', 'спот'],
      ['BTCUSDT', 'linear', 'бессрочный'],
      ['BTCUSDZ25', 'inverse', 'фьючерс инверсный'],
    ]);
  });

  it('options: one row per matching base coin from option-base-coins, no contracts listed', async () => {
    const { r, urls } = await run('spc');
    expect(r.matches).toEqual([]);
    expect(r.options).toEqual([OPTION_BASE_COINS.result.list[1]]);
    expect(urls.filter((u) => u.pathname === '/v5/market/option-base-coins').map((u) => u.search)).toEqual(['']);
    expect((await run('btc')).r.options.map((o) => o.baseCoin)).toEqual(['BTC']);
  });

  it('nothing found: empty lists and a plain message', async () => {
    const { r } = await run('zzz');
    expect(r.matches).toEqual([]);
    expect(r.options).toEqual([]);
    expect(renderSearch(r)).toContain('Ничего не найдено');
  });

  it('options row in text points to opt expiries and opt chain', async () => {
    const text = renderSearch((await run('btc')).r);
    expect(text).toContain('opt expiries BTC');
    expect(text).toContain('opt chain BTC');
  });
});
