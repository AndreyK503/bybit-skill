import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { LINEAR_INSTRUMENT, ORDERBOOK, SPOT_INSTRUMENT, instrumentsRoute } from '../fixtures/bybit-v5-market.js';
import { OPTION_TICKER } from '../fixtures/bybit-v5-options.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { orderbook } from './orderbook.js';

/** `orderbook` (FR-10). Docs orderbook example; limits from docs market/orderbook (option 1..25). */
let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: 1790600000000, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-orderbook-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ROUTES = {
  '/v5/market/instruments-info': instrumentsRoute({ spot: [SPOT_INSTRUMENT], linear: [LINEAR_INSTRUMENT], inverse: [] }),
  '/v5/market/orderbook': () => ORDERBOOK,
};
const bookParams = (urls: URL[]) => urls.filter((u) => u.pathname === '/v5/market/orderbook').map((u) => Object.fromEntries(u.searchParams));

describe('orderbook', () => {
  it('default depth 25, spot first, bids and asks raw', async () => {
    const { client, urls } = publicClient(ROUTES);
    const r = await orderbook(client, { symbol: 'btcusdt' }, deps());
    expect(r).toEqual({ symbol: 'BTCUSDT', category: 'spot', depth: 25, bids: [['65485.47', '47.081829']], asks: [['65557.7', '16.606555']], ts: 1716863719031 });
    expect(bookParams(urls)).toEqual([{ category: 'spot', symbol: 'BTCUSDT', limit: '25' }]);
  });

  it('explicit category and depth', async () => {
    const { client, urls } = publicClient(ROUTES);
    await orderbook(client, { symbol: 'BTCUSDT', category: 'linear', depth: 200 }, deps());
    expect(bookParams(urls)).toEqual([{ category: 'linear', symbol: 'BTCUSDT', limit: '200' }]);
  });

  it('option: default 25; deeper than 25 refused before any request', async () => {
    const { client, urls } = publicClient(ROUTES);
    await orderbook(client, { symbol: OPTION_TICKER.symbol }, deps());
    expect(bookParams(urls)).toEqual([{ category: 'option', symbol: OPTION_TICKER.symbol, limit: '25' }]);
    const err = (await orderbook(client, { symbol: OPTION_TICKER.symbol, depth: 26 }, deps()).catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_BAD_ARGUMENT');
    expect(err.userMessage).toContain('25');
    expect(bookParams(urls)).toHaveLength(1);
  });
});
