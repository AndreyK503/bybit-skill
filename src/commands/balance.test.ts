import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { ASSET_OVERVIEW, FUND_BALANCE, SPOT_TICKERS, WALLET_BALANCE, WALLET_ACCOUNT, WALLET_COIN } from '../fixtures/bybit-v5-account.js';
import { READ_ONLY_KEY, routedClient, type Route } from '../fixtures/route-fetch.js';
import { balance, renderBalance } from './balance.js';

/**
 * Fixtures: docs examples (src/fixtures/bybit-v5-account.ts). Test variants:
 * - wallet: docs BTC coin plus USDT (equity 1000, usdValue 999.8) and XYZ (held 0.5, not collateral, usdValue 0);
 * - funding: docs USDC item (zero, filtered out) plus BTC 0.001, ADA 5 (no ADAUSDT pair), USDT 3.
 * Expected values, by hand:
 * - BTC 0.001 x 20533.13 (docs BTCUSDT lastPrice) = 20.53313; USDT 3 x 1 = 3; ADA -> null.
 * - totalUsd = 3.31216591 (docs UTA totalEquity) + 7175590.45 (docs FundingAccount totalEquity) = 7175593.76216591 (bc).
 */
const USDT = { ...WALLET_COIN, coin: 'USDT', equity: '1000', walletBalance: '1000', usdValue: '999.8' };
const XYZ = { ...WALLET_COIN, coin: 'XYZ', equity: '0.5', walletBalance: '0.5', usdValue: '0', marginCollateral: false };
const WALLET = { ...WALLET_BALANCE, result: { list: [{ ...WALLET_ACCOUNT, coin: [WALLET_COIN, USDT, XYZ] }] } };

const FUND_ITEM = FUND_BALANCE.result.balance[0]!;
const FUND = {
  ...FUND_BALANCE,
  result: {
    ...FUND_BALANCE.result,
    balance: [
      FUND_ITEM,
      { ...FUND_ITEM, coin: 'BTC', walletBalance: '0.001', transferBalance: '0.001' },
      { ...FUND_ITEM, coin: 'ADA', walletBalance: '5', transferBalance: '5' },
      { ...FUND_ITEM, coin: 'USDT', walletBalance: '3', transferBalance: '3' },
    ],
  },
};
const NO_FUNDING_OVERVIEW = {
  ...ASSET_OVERVIEW,
  result: { ...ASSET_OVERVIEW.result, list: ASSET_OVERVIEW.result.list.filter((a) => a.accountType !== 'FundingAccount') },
};
const EMPTY_FUND = { ...FUND_BALANCE, result: { ...FUND_BALANCE.result, balance: [FUND_ITEM] } };

function setup(over: Record<string, Route> = {}) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/account/wallet-balance': () => WALLET,
    '/v5/asset/transfer/query-account-coins-balance': () => FUND,
    '/v5/asset/asset-overview': () => ASSET_OVERVIEW,
    '/v5/market/tickers': () => SPOT_TICKERS,
    ...over,
  });
}

describe('balance: trading account (UTA)', () => {
  it('shows raw coin fields and total equity', async () => {
    const r = await balance(setup().client);
    expect(r.unified.totalEquity).toBe('3.31216591');
    expect(r.unified.coins).toContainEqual({
      coin: 'USDT',
      equity: '1000',
      walletBalance: '1000',
      locked: '0',
      borrowAmount: '0.0',
      usdValue: '999.8',
    });
  });

  it('coin the exchange does not value -> listed in computed.unvaluedCoins; text shows a dash, not 0', async () => {
    const r = await balance(setup().client);
    expect(r.computed.unvaluedCoins).toEqual(['XYZ']);
    expect(r.computedNotes.unvaluedCoins).toMatch(/залог/);
    const row = renderBalance(r).split('\n').find((l) => /^XYZ\b/.test(l.trim())) ?? '';
    expect(row).toContain('—');
  });
});

describe('balance: funding wallet', () => {
  it('shows only non-zero coins with raw walletBalance and transferBalance', async () => {
    const r = await balance(setup().client);
    expect(r.funding.coins).toEqual([
      { coin: 'BTC', walletBalance: '0.001', transferBalance: '0.001' },
      { coin: 'ADA', walletBalance: '5', transferBalance: '5' },
      { coin: 'USDT', walletBalance: '3', transferBalance: '3' },
    ]);
  });

  it('requests FUND for all coins and one spot tickers call', async () => {
    const { client, urls } = setup();
    await balance(client);
    const fund = urls.find((u) => u.pathname === '/v5/asset/transfer/query-account-coins-balance');
    expect(Object.fromEntries(fund?.searchParams ?? [])).toEqual({ accountType: 'FUND' });
    const tickers = urls.filter((u) => u.pathname === '/v5/market/tickers');
    expect(tickers.map((u) => Object.fromEntries(u.searchParams))).toEqual([{ category: 'spot' }]);
  });

  it('USD per coin is computed: pair price, stablecoin 1:1, missing pair empty with reason', async () => {
    const r = await balance(setup().client);
    expect(r.computed.fundingUsd.BTC).toBeCloseTo(20.53313, 10);
    expect(r.computed.fundingUsd.USDT).toBe(3);
    expect(r.computed.fundingUsd.ADA).toBeNull();
    expect(r.computedNotes.fundingUsd.ADA).toContain('ADAUSDT');
  });
});

describe('balance: totals (criterion 5)', () => {
  it('raw totals per account and computed sum without Earn', async () => {
    const r = await balance(setup().client);
    expect(r.funding.totalEquity).toBe('7175590.45');
    expect(r.computed.totalUsd).toBeCloseTo(7175593.76216591, 6);
    expect(r.computedNotes.totalUsd).toMatch(/Earn/);
  });

  it('funding coins present but no FundingAccount in overview -> total empty with reason', async () => {
    const r = await balance(setup({ '/v5/asset/asset-overview': () => NO_FUNDING_OVERVIEW }).client);
    expect(r.funding.totalEquity).toBeNull();
    expect(r.computed.totalUsd).toBeNull();
    expect(r.computedNotes.totalUsd).not.toBe('');
  });

  it('empty funding wallet and no FundingAccount -> total is the trading account alone', async () => {
    const r = await balance(
      setup({
        '/v5/asset/asset-overview': () => NO_FUNDING_OVERVIEW,
        '/v5/asset/transfer/query-account-coins-balance': () => EMPTY_FUND,
      }).client,
    );
    expect(r.funding.coins).toEqual([]);
    expect(r.computed.totalUsd).toBeCloseTo(3.31216591, 8);
  });
});

describe('balance: access and output', () => {
  it('key with write rights -> APP_KEY_NOT_READONLY before any data request', async () => {
    const { client, urls } = routedClient({
      '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }),
    });
    const err = await balance(client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/user/query-api']);
  });

  it('no permission on the funding wallet -> AppError naming the endpoint, not an empty result', async () => {
    const err = await balance(setup({ '/v5/asset/transfer/query-account-coins-balance': () => errorEnvelope(10005) }).client).catch(
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('APP_PERMISSION_DENIED');
    expect((err as AppError).userMessage).toContain('/v5/asset/transfer/query-account-coins-balance');
  });

  it('text marks computed values', async () => {
    expect(renderBalance(await balance(setup().client))).toContain('[расчёт]');
  });
});
