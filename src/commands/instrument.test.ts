import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { loadCatalog, type CatalogDeps } from '../catalog/catalog.js';
import { LINEAR_INSTRUMENT, SPOT_INSTRUMENT, instrumentsRoute } from '../fixtures/bybit-v5-market.js';
import { OPTION_INSTRUMENT } from '../fixtures/bybit-v5-options.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { instrument } from './instrument.js';

/** `instrument` (FR-10, NFR-2). Docs instruments; the card is always requested fresh, the cache only picks categories. */
let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: 1790600000000, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-instrument-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const ROUTES = { '/v5/market/instruments-info': instrumentsRoute({ spot: [SPOT_INSTRUMENT], linear: [LINEAR_INSTRUMENT], inverse: [], option: [OPTION_INSTRUMENT] }) };
const symbolRequests = (urls: URL[]) => urls.filter((u) => u.searchParams.has('symbol')).map((u) => Object.fromEntries(u.searchParams));

describe('instrument', () => {
  it('fresh card of every category of the symbol, even with a fresh cache', async () => {
    const { client, urls } = publicClient(ROUTES);
    await loadCatalog(client, deps());
    const r = await instrument(client, { symbol: 'btcusdt' }, deps());
    expect(r).toEqual({
      symbol: 'BTCUSDT',
      cards: [
        { category: 'spot', info: SPOT_INSTRUMENT },
        { category: 'linear', info: LINEAR_INSTRUMENT },
      ],
    });
    expect(symbolRequests(urls)).toEqual([
      { category: 'spot', symbol: 'BTCUSDT' },
      { category: 'linear', symbol: 'BTCUSDT' },
    ]);
  });

  it('option symbol: card from category option', async () => {
    const { client } = publicClient(ROUTES);
    const r = await instrument(client, { symbol: OPTION_INSTRUMENT.symbol }, deps());
    expect(r.cards).toEqual([{ category: 'option', info: OPTION_INSTRUMENT }]);
  });

  it('exchange has no such instrument in the category: APP_INSTRUMENT_NOT_FOUND', async () => {
    const { client } = publicClient(ROUTES);
    const err = (await instrument(client, { symbol: 'ETHUSDT', category: 'spot' }, deps()).catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_INSTRUMENT_NOT_FOUND');
    expect(err.userMessage).toContain('ETHUSDT');
  });
});
