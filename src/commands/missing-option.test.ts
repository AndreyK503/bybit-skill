import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { MISSING_OPTION, MISSING_OPTION_INSTRUMENT, MISSING_OPTION_ORDERBOOK, MISSING_OPTION_TICKERS } from '../fixtures/bybit-v5-market.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { instrument } from './instrument.js';
import { orderbook } from './orderbook.js';
import { quote } from './quote.js';

/**
 * A non-existent option symbol is not checked against a catalog (options are not cached), so it reaches the
 * exchange. Found in the live run 2026-09-28: empty tickers list, orderbook result `[]`, instruments-info 110023.
 * Every command must say "not found" (NFR-6), not print nothing or crash.
 */
const deps: CatalogDeps = { cacheDir: '/nonexistent', now: 1790600000000, warn: () => {} };
const ROUTES = {
  '/v5/market/tickers': () => MISSING_OPTION_TICKERS,
  '/v5/market/orderbook': () => MISSING_OPTION_ORDERBOOK,
  '/v5/market/instruments-info': () => MISSING_OPTION_INSTRUMENT,
};

describe('non-existent option symbol', () => {
  it.each([
    ['quote', () => quote(publicClient(ROUTES).client, { symbol: MISSING_OPTION }, deps)],
    ['orderbook', () => orderbook(publicClient(ROUTES).client, { symbol: MISSING_OPTION }, deps)],
    ['instrument', () => instrument(publicClient(ROUTES).client, { symbol: MISSING_OPTION }, deps)],
  ] as const)('%s: APP_INSTRUMENT_NOT_FOUND naming the symbol', async (_name, run) => {
    const err = (await run().catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_INSTRUMENT_NOT_FOUND');
    expect(err.userMessage).toContain(MISSING_OPTION);
  });
});
