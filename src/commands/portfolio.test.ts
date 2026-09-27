import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { ASSET_OVERVIEW, OPTION_ASSET_INFO, POSITION, WALLET_ACCOUNT, WALLET_BALANCE, WALLET_COIN, positionPage } from '../fixtures/bybit-v5-account.js';
import { READ_ONLY_KEY, routedClient, type Route } from '../fixtures/route-fetch.js';
import { portfolio, renderPortfolio } from './portfolio.js';

/**
 * Fixtures: docs examples (src/fixtures/bybit-v5-account.ts). Test variants:
 * - wallet: docs account with totalPerpUPL "100"; coins USDT (usdValue 3000, cumRealisedPnl 12.5),
 *   BTC (usdValue 1000), XYZ (held, not collateral, usdValue 0);
 * - options: docs option-asset-info (BTC totalUPL -47.6318, totalRPL -0.2790);
 * - positions: 1 linear USDT, 2 option, none elsewhere.
 * Expected, by hand (bc): 100 + (-47.6318) = 52.3682; shares 3000/4000 = 0.75, 1000/4000 = 0.25.
 */
const coin = (over: Partial<typeof WALLET_COIN>) => ({ ...WALLET_COIN, ...over });
const COINS = [
  coin({ coin: 'USDT', equity: '3000', usdValue: '3000', unrealisedPnl: '100', cumRealisedPnl: '12.5' }),
  coin({ coin: 'BTC', equity: '0.05', usdValue: '1000' }),
  coin({ coin: 'XYZ', equity: '0.5', usdValue: '0', marginCollateral: false }),
];
const wallet = (account: Partial<typeof WALLET_ACCOUNT>) => ({
  ...WALLET_BALANCE,
  result: { list: [{ ...WALLET_ACCOUNT, totalPerpUPL: '100', coin: COINS, ...account }] },
});
const NO_OPTIONS = { ...OPTION_ASSET_INFO, result: { result: [] } };

const positionsRoute: Route = (url) => {
  const cat = url.searchParams.get('category');
  const settle = url.searchParams.get('settleCoin');
  if (cat === 'linear' && settle === 'USDT') return positionPage('linear', [{ ...POSITION, symbol: 'BTCUSDT' }], '');
  if (cat === 'option') return positionPage('option', [{ ...POSITION, symbol: 'O1' }, { ...POSITION, symbol: 'O2' }], '');
  return positionPage(cat ?? '', [], '');
};

function setup(over: Record<string, Route> = {}) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/account/info': () => ACCOUNT_INFO,
    '/v5/account/wallet-balance': () => wallet({}),
    '/v5/account/option-asset-info': () => OPTION_ASSET_INFO,
    '/v5/position/list': positionsRoute,
    '/v5/asset/asset-overview': () => ASSET_OVERVIEW,
    ...over,
  });
}

describe('portfolio: account totals', () => {
  it('raw totals, margin rates and margin mode', async () => {
    const r = await portfolio(setup().client);
    expect(r.account).toEqual({
      marginMode: 'REGULAR_MARGIN',
      totalEquity: '3.31216591',
      totalWalletBalance: '3.00326056',
      totalMarginBalance: '3.00326056',
      totalAvailableBalance: '3.00326056',
      totalInitialMargin: '0',
      totalMaintenanceMargin: '0',
      accountIMRate: '0',
      accountMMRate: '0',
      totalPerpUPL: '100',
    });
  });
});

describe('portfolio: unrealised result', () => {
  it('perps raw, options raw by coin, their sum computed', async () => {
    const r = await portfolio(setup().client);
    expect(r.options).toEqual([
      { coin: 'BTC', totalUPL: '-47.6318', totalRPL: '-0.2790', totalDelta: '0.0118', assetIM: '0.0000', assetMM: '0.0000' },
    ]);
    expect(r.computed.unrealisedPnlTotal).toBeCloseTo(52.3682, 8);
    expect(r.computedNotes.unrealisedPnlTotal).toMatch(/totalPerpUPL/);
    expect(r.computedNotes.unrealisedPnlTotal).toMatch(/option-asset-info/);
  });

  it('no options -> total equals perps, note says there are no options', async () => {
    const r = await portfolio(setup({ '/v5/account/option-asset-info': () => NO_OPTIONS }).client);
    expect(r.options).toEqual([]);
    expect(r.computed.unrealisedPnlTotal).toBe(100);
    expect(r.computedNotes.unrealisedPnlTotal).toMatch(/опцион\p{L}* нет/iu);
  });

  it('empty totalPerpUPL -> total empty with a reason, not a partial sum', async () => {
    const r = await portfolio(setup({ '/v5/account/wallet-balance': () => wallet({ totalPerpUPL: '' }) }).client);
    expect(r.computed.unrealisedPnlTotal).toBeNull();
    expect(r.computedNotes.unrealisedPnlTotal).toMatch(/totalPerpUPL/);
  });
});

describe('portfolio: realised result', () => {
  it('raw cumRealisedPnl per coin and totalRPL per option coin; period result points to pnl', async () => {
    const r = await portfolio(setup().client);
    expect(r.coins.find((c) => c.coin === 'USDT')?.cumRealisedPnl).toBe('12.5');
    expect(r.options[0]?.totalRPL).toBe('-0.2790');
    expect(r.computedNotes.realised).toMatch(/pnl/);
  });
});

describe('portfolio: distribution', () => {
  it('coin shares of the summed usdValue are computed; unvalued coins excluded and listed', async () => {
    const r = await portfolio(setup().client);
    expect(r.computed.coinShares.USDT).toBeCloseTo(0.75, 10);
    expect(r.computed.coinShares.BTC).toBeCloseTo(0.25, 10);
    expect(r.computed.coinShares).not.toHaveProperty('XYZ');
    expect(r.computed.unvaluedCoins).toEqual(['XYZ']);
  });

  it('all usdValue zero -> no shares, reason given', async () => {
    const zero = COINS.map((c) => ({ ...c, usdValue: '0' }));
    const r = await portfolio(setup({ '/v5/account/wallet-balance': () => wallet({ coin: zero }) }).client);
    expect(r.computed.coinShares).toEqual({});
    expect(r.computedNotes.coinShares).not.toBe('');
  });

  it('by instrument type: counts of perpetual, inverse and option positions', async () => {
    const r = await portfolio(setup().client);
    expect(r.positionCounts).toEqual({ linear: 1, inverse: 0, option: 2 });
  });
});

describe('portfolio: access and output', () => {
  it('key with write rights -> APP_KEY_NOT_READONLY before any data request', async () => {
    const { client, urls } = routedClient({
      '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }),
    });
    const err = await portfolio(client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/user/query-api']);
  });

  it('text marks computed values', async () => {
    expect(renderPortfolio(await portfolio(setup().client))).toContain('[расчёт]');
  });
});

describe('review fixes (NFR-3, FR-2, criterion 4)', () => {
  // Negative usdValue: coin in debt, e.g. USDT after paying option premium in Portfolio Margin.
  // Shares by hand (bc): sum 3000 + 1000 - 500 = 3500; USDT 3000/3500, BTC 1000/3500, USDC -500/3500.
  it('coin with negative usdValue stays in the shares, sum covers it', async () => {
    const debt = [...COINS, coin({ coin: 'USDC', equity: '-500', usdValue: '-500' })];
    const r = await portfolio(setup({ '/v5/account/wallet-balance': () => wallet({ coin: debt }) }).client);
    expect(r.computed.coinShares.USDT).toBeCloseTo(3000 / 3500, 10);
    expect(r.computed.coinShares.USDC).toBeCloseTo(-500 / 3500, 10);
    expect(r.computedNotes.coinShares).toMatch(/отрицательн/);
  });

  it('empty option totalUPL -> unrealised total empty with a reason, not counted as 0', async () => {
    const empty = { ...OPTION_ASSET_INFO, result: { result: [{ ...OPTION_ASSET_INFO.result.result[0]!, totalUPL: '' }] } };
    const r = await portfolio(setup({ '/v5/account/option-asset-info': () => empty }).client);
    expect(r.computed.unrealisedPnlTotal).toBeNull();
    expect(r.computedNotes.unrealisedPnlTotal).toMatch(/totalUPL/);
  });

  // 3.31216591 (docs UTA totalEquity) + 7175590.45 (docs FundingAccount totalEquity) = 7175593.76216591 (bc).
  it('total account value includes the funding wallet (raw per account, computed sum)', async () => {
    const r = await portfolio(setup({ '/v5/asset/asset-overview': () => ASSET_OVERVIEW }).client);
    expect(r.fundingTotalEquity).toBe('7175590.45');
    expect(r.computed.totalValueUsd).toBeCloseTo(7175593.76216591, 6);
    expect(r.computedNotes.totalValueUsd).toMatch(/Earn/);
  });

  it('empty totalPerpUPL is shown as a dash in text', async () => {
    const r = await portfolio(setup({ '/v5/account/wallet-balance': () => wallet({ totalPerpUPL: '' }) }).client);
    expect(renderPortfolio(r)).toMatch(/бессрочные —/);
  });

  it('refused sub-request (rate limit on option-asset-info) is an AppError, not a partial summary', async () => {
    const err = await portfolio(setup({ '/v5/account/option-asset-info': () => errorEnvelope(10006) }).client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_RATE_LIMIT');
  });
});
