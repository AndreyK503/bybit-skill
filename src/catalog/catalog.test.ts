import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INVERSE_TICKER, LINEAR_INSTRUMENT, PRELAUNCH_CURSOR, PRELAUNCH_INSTRUMENT, SPOT_INSTRUMENT, instrumentPage } from '../fixtures/bybit-v5-market.js';
import { publicClient, type Route } from '../fixtures/route-fetch.js';
import { CATALOG_TTL_MS, catalogPath, findSymbol, loadCatalog, type CatalogDeps } from './catalog.js';

/**
 * Catalog cache (D-7, NFR-7). Docs examples: spot BTCUSDT (one page, no cursor: spot does not paginate),
 * linear BTCUSDT then BIOUSDT on a second page (docs cursor), inverse BTCUSD built from the docs inverse
 * ticker symbol with the docs linear item fields and contractType InversePerpetual.
 */
const NOW = 1790600000000;
const INVERSE_INSTRUMENT = { ...LINEAR_INSTRUMENT, symbol: INVERSE_TICKER.symbol, contractType: 'InversePerpetual', quoteCoin: 'USD', settleCoin: 'BTC' };

const INSTRUMENTS: Route = (url) => {
  const category = url.searchParams.get('category');
  if (category === 'spot') return instrumentPage('spot', [SPOT_INSTRUMENT]);
  if (category === 'inverse') return instrumentPage('inverse', [INVERSE_INSTRUMENT], '');
  return url.searchParams.get('cursor') === PRELAUNCH_CURSOR
    ? instrumentPage('linear', [PRELAUNCH_INSTRUMENT], '')
    : instrumentPage('linear', [LINEAR_INSTRUMENT], PRELAUNCH_CURSOR);
};

const EXPECTED = [
  { symbol: 'BTCUSDT', category: 'spot', baseCoin: 'BTC', quoteCoin: 'USDT', contractType: '', status: 'Trading' },
  { symbol: 'BTCUSDT', category: 'linear', baseCoin: 'BTC', quoteCoin: 'USDT', contractType: 'LinearPerpetual', status: 'Trading' },
  { symbol: 'BIOUSDT', category: 'linear', baseCoin: 'BIO', quoteCoin: 'USDT', contractType: 'LinearPerpetual', status: 'PreLaunch' },
  { symbol: 'BTCUSD', category: 'inverse', baseCoin: 'BTC', quoteCoin: 'USD', contractType: 'InversePerpetual', status: 'Trading' },
];

let dir: string;
let warnings: string[];
const deps = (now = NOW): CatalogDeps => ({ cacheDir: dir, now, warn: (line) => warnings.push(line) });

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-catalog-'));
  warnings = [];
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

describe('catalog', () => {
  it('spot one request without limit/cursor; linear and inverse by cursor to the end, nothing lost', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    const c = await loadCatalog(client, deps());
    expect(c.entries).toEqual(EXPECTED);
    expect(c.fromCache).toBe(false);
    expect(c.savedAt).toBe(NOW);
    expect(urls.map((u) => Object.fromEntries(u.searchParams))).toEqual([
      { category: 'spot' },
      { category: 'linear', limit: '1000' },
      { category: 'linear', limit: '1000', cursor: PRELAUNCH_CURSOR },
      { category: 'inverse', limit: '1000' },
    ]);
  });

  it('fresh cache is read without requests; after a day it is reloaded', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    await loadCatalog(client, deps());
    expect(fs.existsSync(catalogPath(dir))).toBe(true);

    const cached = await loadCatalog(client, deps(NOW + CATALOG_TTL_MS - 1));
    expect(urls).toHaveLength(4);
    expect(cached).toEqual({ entries: EXPECTED, savedAt: NOW, fromCache: true });

    const reloaded = await loadCatalog(client, deps(NOW + CATALOG_TTL_MS + 1));
    expect(urls).toHaveLength(8);
    expect(reloaded.fromCache).toBe(false);
    expect(reloaded.savedAt).toBe(NOW + CATALOG_TTL_MS + 1);
  });

  it('refresh reloads even a fresh cache', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    await loadCatalog(client, deps());
    await loadCatalog(client, deps(), true);
    expect(urls).toHaveLength(8);
  });

  it('findSymbol: hit from the cache in any case, all categories of the symbol', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    await loadCatalog(client, deps());
    const found = await findSymbol(client, deps(), 'btcusdt');
    expect(found).toEqual(EXPECTED.slice(0, 2));
    expect(urls).toHaveLength(4);
  });

  it('findSymbol: a miss reloads the catalog once, then reports nothing found', async () => {
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    await loadCatalog(client, deps());
    expect(await findSymbol(client, deps(), 'ETHUSDT')).toEqual([]);
    expect(urls).toHaveLength(8);
  });

  it('corrupt cache file: reloaded, warning names the file', async () => {
    fs.writeFileSync(catalogPath(dir), 'not json{');
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    const c = await loadCatalog(client, deps());
    expect(c.fromCache).toBe(false);
    expect(urls).toHaveLength(4);
    expect(warnings.join('\n')).toContain(catalogPath(dir));
  });

  it('cache of another schema version: reloaded', async () => {
    fs.writeFileSync(catalogPath(dir), JSON.stringify({ schemaVersion: 0, body: { savedAt: NOW, entries: [] } }));
    const { client, urls } = publicClient({ '/v5/market/instruments-info': INSTRUMENTS });
    const c = await loadCatalog(client, deps());
    expect(c.entries).toEqual(EXPECTED);
    expect(urls).toHaveLength(4);
  });
});
