import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { OPTION_ASSET_INFO } from '../fixtures/bybit-v5-account.js';
import { COIN_GREEKS, OPTION_INSTRUMENT, OPTION_POSITION, OPTION_TICKER, PORTFOLIO_MARGIN, instrumentsPage, optionPositionPage, tickersPage } from '../fixtures/bybit-v5-options.js';
import { READ_ONLY_KEY, TEST_CREDS, routedClient } from '../fixtures/route-fetch.js';
import { formatOutput } from '../cli/runtime.js';
import { optChain, renderOptChain } from './opt-chain.js';
import { optExpiries, renderOptExpiries } from './opt-expiries.js';
import { optGreeks, renderOptGreeks } from './opt-greeks.js';
import { optMargin, renderOptMargin } from './opt-margin.js';
import { optPositions, renderOptPositions } from './opt-positions.js';

/**
 * E3 output: key never in output (D-10), both formats (NFR-5), refused path named (criterion 3),
 * computed values marked (criterion 22). Docs fixtures; the position instrument is the docs
 * instrument renamed to the position symbol. NOW is before its deliveryTime 1793347200000.
 */
const NOW = 1793217600000;
const PM_ACCOUNT = { ...ACCOUNT_INFO, result: { ...ACCOUNT_INFO.result, marginMode: 'PORTFOLIO_MARGIN' } };
const POS_INSTRUMENT = { ...OPTION_INSTRUMENT, symbol: OPTION_POSITION.symbol, baseCoin: 'MNT', deliveryTime: '1793347200000' };
const CHAIN_INSTRUMENT = { ...OPTION_INSTRUMENT, symbol: 'BTC-30OCT26-60000-P-USDT', deliveryTime: '1793347200000' };

const ROUTES = {
  '/v5/user/query-api': READ_ONLY_KEY,
  '/v5/account/info': () => PM_ACCOUNT,
  '/v5/position/list': () => optionPositionPage([OPTION_POSITION], ''),
  '/v5/market/instruments-info': () => instrumentsPage([POS_INSTRUMENT, CHAIN_INSTRUMENT], ''),
  '/v5/market/tickers': () => tickersPage([{ ...OPTION_TICKER, symbol: CHAIN_INSTRUMENT.symbol }]),
  '/v5/asset/coin-greeks': () => COIN_GREEKS,
  '/v5/account/option-asset-info': () => OPTION_ASSET_INFO,
  '/v5/asset/portfolio-margin': () => PORTFOLIO_MARGIN,
};

const both = <T>(r: T, render: (v: T) => string) => [formatOutput(r, true, render), formatOutput(r, false, render)];
const client = () => routedClient(ROUTES).client;

const COMMANDS = [
  ['opt positions', async () => both(await optPositions(client(), { now: NOW }), renderOptPositions)],
  ['opt greeks', async () => both(await optGreeks(client()), renderOptGreeks)],
  ['opt margin', async () => both(await optMargin(client()), renderOptMargin)],
  ['opt chain', async () => both(await optChain(client(), { coin: 'BTC', now: NOW }), renderOptChain)],
  ['opt expiries', async () => both(await optExpiries(client(), { coin: 'BTC' }), renderOptExpiries)],
] as const;

describe('E3 output', () => {
  it.each(COMMANDS)('%s: JSON parses, text differs, neither contains key or secret', async (_name, run) => {
    const [json = '', text = ''] = await run();
    expect(() => JSON.parse(json)).not.toThrow();
    expect(text).not.toBe(json);
    for (const out of [json, text]) {
      expect(out).not.toContain(TEST_CREDS.apiKey);
      expect(out).not.toContain(TEST_CREDS.apiSecret);
    }
  });

  it.each(['opt positions', 'opt margin', 'opt chain'] as const)('%s: computed values marked in text', async (name) => {
    const [, text = ''] = await COMMANDS.find(([n]) => n === name)![1]();
    expect(text).toContain('[расчёт]');
  });

  it.each([
    ['/v5/position/list', () => optPositions(routedClient({ ...ROUTES, '/v5/position/list': () => errorEnvelope(10005) }).client, { now: NOW })],
    ['/v5/asset/coin-greeks', () => optGreeks(routedClient({ ...ROUTES, '/v5/asset/coin-greeks': () => errorEnvelope(10005) }).client)],
    ['/v5/asset/portfolio-margin', () => optMargin(routedClient({ ...ROUTES, '/v5/asset/portfolio-margin': () => errorEnvelope(10005) }).client)],
  ] as const)('refused %s: message names the endpoint', async (path, run) => {
    const err = await run().catch((e: unknown) => e);
    expect((err as AppError).userMessage).toContain(path);
  });
});
