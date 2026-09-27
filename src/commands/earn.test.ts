import { describe, expect, it } from 'vitest';
import { ACCOUNT_INFO } from '../fixtures/bybit-v5-access.js';
import {
  ASSET_OVERVIEW,
  ASSET_OVERVIEW_WITH_EARN,
  FUND_BALANCE,
  OPTION_ASSET_INFO,
  SPOT_TICKERS,
  WALLET_BALANCE,
  positionPage,
} from '../fixtures/bybit-v5-account.js';
import { READ_ONLY_KEY, routedClient, type Route } from '../fixtures/route-fetch.js';
import { balance, renderBalance } from './balance.js';
import { portfolio, renderPortfolio } from './portfolio.js';

/**
 * Earn in scope since 2026-09-27 (spec A-2, FR-3, criterion 5). Source: asset-overview Earn entry (docs example).
 * Expected total, by hand (bc): 3.31216591 (UTA) + 7175590.45 (Funding) + 20888.1 (Earn) = 7196481.86216591.
 * FUND_BALANCE docs item is zero, so the funding wallet is empty in these tests.
 */
function setup(overview: unknown) {
  const routes: Record<string, Route> = {
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/account/info': () => ACCOUNT_INFO,
    '/v5/account/wallet-balance': () => WALLET_BALANCE,
    '/v5/account/option-asset-info': () => OPTION_ASSET_INFO,
    '/v5/asset/transfer/query-account-coins-balance': () => FUND_BALANCE,
    '/v5/asset/asset-overview': () => overview,
    '/v5/market/tickers': () => SPOT_TICKERS,
    '/v5/position/list': (url) => positionPage(url.searchParams.get('category') ?? '', [], ''),
  };
  return routedClient(routes).client;
}

describe('Earn in balance', () => {
  it('raw Earn total and coins with their product category', async () => {
    const r = await balance(setup(ASSET_OVERVIEW_WITH_EARN));
    expect(r.earn).toEqual({
      totalEquity: '20888.1',
      coins: [
        { coin: 'BTC', equity: '0.3', category: 'Easy Earn' },
        { coin: 'MNT', equity: '100', category: 'Easy Earn' },
        { coin: 'USDT', equity: '200', category: 'Easy Earn' },
      ],
    });
  });

  it('total includes Earn', async () => {
    const r = await balance(setup(ASSET_OVERVIEW_WITH_EARN));
    expect(r.computed.totalUsd).toBeCloseTo(7196481.86216591, 6);
    expect(r.computedNotes.totalUsd).toMatch(/Earn/);
  });

  it('no Earn entry -> Earn empty, total without it, note says so', async () => {
    const r = await balance(setup(ASSET_OVERVIEW));
    expect(r.earn).toEqual({ totalEquity: null, coins: [] });
    expect(r.computed.totalUsd).toBeCloseTo(7175593.76216591, 6);
    expect(r.computedNotes.totalUsd).toMatch(/Earn/);
  });

  it('text has an Earn section', async () => {
    const text = renderBalance(await balance(setup(ASSET_OVERVIEW_WITH_EARN)));
    expect(text).toMatch(/Earn: 20888\.1 USD/);
    expect(text).toContain('Easy Earn');
  });
});

describe('Earn in portfolio', () => {
  it('raw Earn total and computed total value including it', async () => {
    const r = await portfolio(setup(ASSET_OVERVIEW_WITH_EARN));
    expect(r.earnTotalEquity).toBe('20888.1');
    expect(r.computed.totalValueUsd).toBeCloseTo(7196481.86216591, 6);
    expect(renderPortfolio(r)).toMatch(/Earn: 20888\.1 USD/);
  });
});
