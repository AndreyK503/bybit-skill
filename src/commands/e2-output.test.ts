import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { ASSET_OVERVIEW, FUND_BALANCE, OPTION_ASSET_INFO, POSITION, SPOT_TICKERS, WALLET_BALANCE, positionPage } from '../fixtures/bybit-v5-account.js';
import { READ_ONLY_KEY, TEST_CREDS, routedClient } from '../fixtures/route-fetch.js';
import { formatOutput } from '../cli/runtime.js';
import { balance, renderBalance } from './balance.js';
import { portfolio, renderPortfolio } from './portfolio.js';
import { positions, renderPositions } from './positions.js';

/** Review fixes for E2: key never in output (D-10), both formats (NFR-5), refused path named (criterion 3). Docs fixtures. */
const ROUTES = {
  '/v5/user/query-api': READ_ONLY_KEY,
  '/v5/account/info': () => ACCOUNT_INFO,
  '/v5/account/wallet-balance': () => WALLET_BALANCE,
  '/v5/account/option-asset-info': () => OPTION_ASSET_INFO,
  '/v5/asset/transfer/query-account-coins-balance': () => FUND_BALANCE,
  '/v5/asset/asset-overview': () => ASSET_OVERVIEW,
  '/v5/market/tickers': () => SPOT_TICKERS,
  '/v5/position/list': (url: URL) => positionPage(url.searchParams.get('category') ?? '', [POSITION], ''),
};

const COMMANDS = [
  ['portfolio', () => portfolio(routedClient(ROUTES).client).then((r) => [formatOutput(r, true, renderPortfolio), formatOutput(r, false, renderPortfolio)])],
  ['balance', () => balance(routedClient(ROUTES).client).then((r) => [formatOutput(r, true, renderBalance), formatOutput(r, false, renderBalance)])],
  ['positions', () => positions(routedClient(ROUTES).client).then((r) => [formatOutput(r, true, renderPositions), formatOutput(r, false, renderPositions)])],
] as const;

describe('E2 output', () => {
  it.each(COMMANDS)('%s: JSON parses, text differs, neither contains key or secret', async (_name, run) => {
    const [json = '', text = ''] = await run();
    expect(() => JSON.parse(json)).not.toThrow();
    expect(text).not.toBe(json);
    for (const out of [json, text]) {
      expect(out).not.toContain(TEST_CREDS.apiKey);
      expect(out).not.toContain(TEST_CREDS.apiSecret);
    }
  });

  it('positions: refused page names the endpoint', async () => {
    const { client } = routedClient({ ...ROUTES, '/v5/position/list': () => errorEnvelope(10005) });
    const err = await positions(client).catch((e: unknown) => e);
    expect((err as AppError).userMessage).toContain('/v5/position/list');
  });
});
