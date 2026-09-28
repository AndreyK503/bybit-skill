import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { OPTION_TICKER, tickersPage } from '../fixtures/bybit-v5-options.js';
import { LINEAR_INSTRUMENT, LINEAR_TICKER, SPOT_INSTRUMENT, SPOT_TICKER, instrumentsRoute, tickerPage } from '../fixtures/bybit-v5-market.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { quote } from './quote.js';

/** `quote` (FR-10). Docs tickers and instruments (fixtures/bybit-v5-market.ts); BTCUSDT is on spot and linear. */
let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: 1790600000000, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-quote-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ROUTES = {
  '/v5/market/instruments-info': instrumentsRoute({ spot: [SPOT_INSTRUMENT], linear: [LINEAR_INSTRUMENT], inverse: [] }),
  '/v5/market/tickers': (url: URL) =>
    url.searchParams.get('category') === 'option' ? tickersPage([OPTION_TICKER]) : tickerPage(url.searchParams.get('category')!, [url.searchParams.get('category') === 'spot' ? SPOT_TICKER : LINEAR_TICKER]),
};
const tickerParams = (urls: URL[]) => urls.filter((u) => u.pathname === '/v5/market/tickers').map((u) => Object.fromEntries(u.searchParams));

describe('quote', () => {
  it('symbol on spot and linear (any case): raw ticker of each category, no key', async () => {
    const { client, urls } = publicClient(ROUTES);
    const r = await quote(client, { symbol: 'btcusdt' }, deps());
    expect(r).toEqual({
      symbol: 'BTCUSDT',
      quotes: [
        { category: 'spot', ticker: SPOT_TICKER },
        { category: 'linear', ticker: LINEAR_TICKER },
      ],
    });
    expect(tickerParams(urls)).toEqual([
      { category: 'spot', symbol: 'BTCUSDT' },
      { category: 'linear', symbol: 'BTCUSDT' },
    ]);
  });

  it('explicit category: only that one, the catalog is not loaded', async () => {
    const { client, urls } = publicClient(ROUTES);
    const r = await quote(client, { symbol: 'BTCUSDT', category: 'linear' }, deps());
    expect(r.quotes).toEqual([{ category: 'linear', ticker: LINEAR_TICKER }]);
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/market/tickers']);
  });

  it('option symbol: category option without the catalog; IV and greeks come raw', async () => {
    const { client, urls } = publicClient(ROUTES);
    const r = await quote(client, { symbol: OPTION_TICKER.symbol }, deps());
    expect(r.quotes).toEqual([{ category: 'option', ticker: OPTION_TICKER }]);
    expect(tickerParams(urls)).toEqual([{ category: 'option', symbol: OPTION_TICKER.symbol }]);
    expect(urls.some((u) => u.pathname === '/v5/market/instruments-info')).toBe(false);
  });

  it('unknown symbol: APP_INSTRUMENT_NOT_FOUND pointing to search, no ticker request', async () => {
    const { client, urls } = publicClient(ROUTES);
    const err = (await quote(client, { symbol: 'NOPEUSDT' }, deps()).catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_INSTRUMENT_NOT_FOUND');
    expect(err.userMessage).toContain('NOPEUSDT');
    expect(err.userMessage).toContain('search');
    expect(tickerParams(urls)).toEqual([]);
  });
});
