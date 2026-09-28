import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { NOPE_LINEAR_INSTRUMENT, NOPE_LINEAR_KLINE, NOPE_LINEAR_ORDERBOOK, NOPE_SPOT_TICKERS } from '../fixtures/bybit-v5-market.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { history } from './history.js';
import { instrument } from './instrument.js';
import { orderbook } from './orderbook.js';
import { quote } from './quote.js';

/**
 * With --category the catalog is skipped, so an unknown ticker reaches the exchange. Live 2026-09-28: 10001 with
 * endpoint-specific text. Interval, depth and category are validated before the request, so here 10001 means the
 * ticker: every command says "not found" with the search hint (found in review, NFR-6).
 */
const deps: CatalogDeps = { cacheDir: '/nonexistent', now: 1790600000000, warn: () => {} };
const client = () =>
  publicClient({
    '/v5/market/tickers': () => NOPE_SPOT_TICKERS,
    '/v5/market/orderbook': () => NOPE_LINEAR_ORDERBOOK,
    '/v5/market/kline': () => NOPE_LINEAR_KLINE,
    '/v5/market/instruments-info': () => NOPE_LINEAR_INSTRUMENT,
  }).client;

describe('unknown ticker with an explicit category', () => {
  it.each([
    ['quote', () => quote(client(), { symbol: 'NOPEUSDT', category: 'spot' }, deps)],
    ['orderbook', () => orderbook(client(), { symbol: 'NOPEUSDT', category: 'linear' }, deps)],
    ['history', () => history(client(), { symbol: 'NOPEUSDT', category: 'linear', interval: 'D', period: { from: 1790000000000, to: 1790600000000 } }, deps)],
    ['instrument', () => instrument(client(), { symbol: 'NOPEUSDT', category: 'linear' }, deps)],
  ] as const)('%s: APP_INSTRUMENT_NOT_FOUND with the search hint', async (_name, run) => {
    const err = (await run().catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_INSTRUMENT_NOT_FOUND');
    expect(err.userMessage).toContain('NOPEUSDT');
    expect(err.userMessage).toContain('search');
  });
});
