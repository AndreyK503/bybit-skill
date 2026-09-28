import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CatalogDeps } from '../catalog/catalog.js';
import { formatOutput } from '../cli/runtime.js';
import { KLINE_LIST, LINEAR_INSTRUMENT, LINEAR_TICKER, OPTION_BASE_COINS, ORDERBOOK, SPOT_INSTRUMENT, SPOT_TICKER, instrumentsRoute, klinePage, tickerPage } from '../fixtures/bybit-v5-market.js';
import { publicClient } from '../fixtures/route-fetch.js';
import { history, renderHistory } from './history.js';
import { instrument, renderInstrument } from './instrument.js';
import { orderbook, renderOrderbook } from './orderbook.js';
import { quote, renderQuote } from './quote.js';
import { renderSearch, search } from './search.js';

/**
 * E6 output: both formats (NFR-5) for every market command, run without a key (public data: a signed
 * request would fail with APP_KEY_MISSING). Docs fixtures; the docs kline rows are hourly, only their shape matters here.
 */
const ROUTES = {
  '/v5/market/instruments-info': instrumentsRoute({ spot: [SPOT_INSTRUMENT], linear: [LINEAR_INSTRUMENT], inverse: [] }),
  '/v5/market/tickers': (url: URL) => tickerPage(url.searchParams.get('category')!, [url.searchParams.get('category') === 'spot' ? SPOT_TICKER : LINEAR_TICKER]),
  '/v5/market/kline': () => klinePage('spot', 'BTCUSDT', KLINE_LIST),
  '/v5/market/orderbook': () => ORDERBOOK,
  '/v5/market/option-base-coins': () => OPTION_BASE_COINS,
};

let dir: string;
const deps = (): CatalogDeps => ({ cacheDir: dir, now: 1790600000000, warn: () => {} });
beforeEach(() => (dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bybit-e6-'))));
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const both = <T>(r: T, render: (v: T) => string) => [formatOutput(r, true, render), formatOutput(r, false, render)];
const client = () => publicClient(ROUTES).client;
const PERIOD = { from: 1670601600000, to: 1670612399999 };

const COMMANDS = [
  ['quote', async () => both(await quote(client(), { symbol: 'BTCUSDT' }, deps()), renderQuote)],
  ['history', async () => both(await history(client(), { symbol: 'BTCUSDT', interval: 'D', period: PERIOD }, deps()), renderHistory)],
  ['orderbook', async () => both(await orderbook(client(), { symbol: 'BTCUSDT' }, deps()), renderOrderbook)],
  ['instrument', async () => both(await instrument(client(), { symbol: 'BTCUSDT' }, deps()), renderInstrument)],
  ['search', async () => both(await search(client(), 'btc', deps()), renderSearch)],
] as const;

describe('E6 output', () => {
  it.each(COMMANDS)('%s: works without a key, JSON parses, text differs', async (_name, run) => {
    const [json = '', text = ''] = await run();
    expect(() => JSON.parse(json)).not.toThrow();
    expect(text).not.toBe(json);
    expect(text.length).toBeGreaterThan(0);
  });

  it('quote text shows both categories of the symbol', async () => {
    const [, text = ''] = await COMMANDS[0][1]();
    expect(text).toContain('20533.13');
    expect(text).toContain('120635.50');
  });
});
