import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, QUERY_API } from '../fixtures/bybit-v5-access.js';
import { PM_ASSET, PM_WALLET, portfolioMarginPage } from '../fixtures/bybit-v5-options.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { optMargin } from './opt-margin.js';

/**
 * Fixture: PORTFOLIO_MARGIN docs example (BTC). Reference values read from it:
 * at maxLossPriceMove -0.1: ALL -1004.74710000, OPTION -39.65273684, PERPETUAL -972.14482880.
 * The option position has three pnls per scale; OPTION total equals the third (-39.65273684) when
 * maxLossIvShock is -0.2, and on the live account (shock +0.24) the first: order IV up, flat, down.
 * Share: 1062.3492095114727 / 1069.93399838 = 0.9929109749 (bc, scale 10).
 */
const PM_ACCOUNT = { ...ACCOUNT_INFO, result: { ...ACCOUNT_INFO.result, marginMode: 'PORTFOLIO_MARGIN' } };
const OPTION_SYMBOL = 'BTC-25SEP26-80000-C-USDT';

function withOptionTotal(scale: string, value: string) {
  const ranges = PM_ASSET.totalPnlRanges.OPTION.pnlRanges.map((r) => (r.priceScale === scale ? { ...r, pnls: [value] } : r));
  return { ...PM_ASSET.totalPnlRanges, OPTION: { pnlRanges: ranges } };
}

function setup(assets: unknown[] = [PM_ASSET], wallet: unknown = PM_WALLET, account: unknown = PM_ACCOUNT) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/account/info': () => account,
    '/v5/asset/portfolio-margin': () => portfolioMarginPage(assets, wallet),
  });
}

describe('opt margin', () => {
  it('account totals are raw', async () => {
    const { client } = setup();
    const r = await optMargin(client);
    expect(r.marginMode).toBe('PORTFOLIO_MARGIN');
    expect(r.account).toEqual({
      equity: '52197.86892104',
      marginBalance: '52145.70917115',
      accountIM: '1304.50829757',
      accountMM: '1069.93399838',
      accountIMRate: '0.0249',
      accountMMRate: '0.0204',
    });
  });

  it('per coin: raw margin, worst scenario and contingency', async () => {
    const { client } = setup();
    const [c] = (await optMargin(client)).coins;
    expect(c).toMatchObject({
      baseCoin: 'BTC',
      assetIM: '1274.8190514137673',
      assetMM: '1062.3492095114727',
      maxLossPriceMove: '-0.1',
      maxLossIvShock: '-0.2',
      contingencyComponents: '57.69544638',
      worstLoss: { all: '-1004.74710000', option: '-39.65273684', perpetual: '-972.14482880' },
      options: [{ symbol: OPTION_SYMBOL, position: '0.02' }],
    });
  });

  it('per option: loss in the worst scenario, IV shock down takes the third value', async () => {
    const { client } = setup();
    const [c] = (await optMargin(client)).coins;
    expect(c?.computed.optionLoss).toEqual({ [OPTION_SYMBOL]: -39.65273684 });
    expect(c?.computedNotes.optionLoss).toContain('maxLossIvShock');
  });

  it('per option: IV shock up takes the first value', async () => {
    const up = { ...PM_ASSET, maxLossIvShock: '0.24', totalPnlRanges: withOptionTotal('-0.1', '-24.06747339') };
    const { client } = setup([up]);
    const [c] = (await optMargin(client)).coins;
    expect(c?.computed.optionLoss).toEqual({ [OPTION_SYMBOL]: -24.06747339 });
  });

  it('per option: sum not matching the OPTION total gives empty values with a reason', async () => {
    const off = { ...PM_ASSET, totalPnlRanges: withOptionTotal('-0.1', '-30.00000000') };
    const { client } = setup([off]);
    const [c] = (await optMargin(client)).coins;
    expect(c?.computed.optionLoss).toEqual({ [OPTION_SYMBOL]: null });
    expect(c?.computedNotes.optionLoss).toContain('OPTION');
  });

  it('share of account MM in computed', async () => {
    const { client } = setup();
    const [c] = (await optMargin(client)).coins;
    expect(c?.computed.shareOfAccountMM).toBeCloseTo(0.9929109749, 8);
    expect(c?.computedNotes.shareOfAccountMM).toContain('accountMM');
  });

  it('account MM zero: share empty with a reason', async () => {
    const { client } = setup([PM_ASSET], { ...PM_WALLET, accountMM: '0' });
    const [c] = (await optMargin(client)).coins;
    expect(c?.computed.shareOfAccountMM).toBeNull();
    expect(c?.computedNotes.shareOfAccountMM).toContain('accountMM');
  });

  it('priceScale compared as a number: maxLossPriceMove "0" matches row "0.0"', async () => {
    const flat = { ...PM_ASSET, maxLossPriceMove: '0' };
    const { client } = setup([flat]);
    const [c] = (await optMargin(client)).coins;
    expect(c?.worstLoss).toEqual({ all: '-11.36910000', option: '-11.36906857', perpetual: '0.00000000' });
    expect(c?.computed.optionLoss).toEqual({ [OPTION_SYMBOL]: -11.36906857 });
  });

  it('no row for maxLossPriceMove: losses empty with a reason, no nearest row picked', async () => {
    const odd = { ...PM_ASSET, maxLossPriceMove: '-0.15' };
    const { client } = setup([odd]);
    const [c] = (await optMargin(client)).coins;
    expect(c?.worstLoss).toEqual({ all: '', option: '', perpetual: '' });
    expect(c?.notes.join('\n')).toContain('-0.15');
    expect(c?.computed.optionLoss).toEqual({ [OPTION_SYMBOL]: null });
  });

  it('not Portfolio Margin: no breakdown request, message points to positions', async () => {
    const { client, urls } = setup([PM_ASSET], PM_WALLET, ACCOUNT_INFO);
    const r = await optMargin(client);
    expect(r.marginMode).toBe('REGULAR_MARGIN');
    expect(r.account).toBeNull();
    expect(r.coins).toEqual([]);
    expect(r.notes.join('\n')).toContain('positions');
    expect(urls.map((u) => u.pathname)).not.toContain('/v5/asset/portfolio-margin');
  });

  it('checks the key is read-only first', async () => {
    const { client, urls } = routedClient({ '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }) });
    const err = await optMargin(client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/user/query-api']);
  });

  it('coin with perpetuals only: no option losses, plain reasons for missing totals', async () => {
    const perpOnly = { ALL: PM_ASSET.totalPnlRanges.ALL, PERPETUAL: PM_ASSET.totalPnlRanges.PERPETUAL };
    const asset = { ...PM_ASSET, totalPnlRanges: perpOnly, optionExpiryDatePnlRanges: [] };
    const { client } = setup([asset]);
    const [c] = (await optMargin(client)).coins;
    expect(c?.worstLoss).toEqual({ all: '-1004.74710000', option: '', perpetual: '-972.14482880' });
    expect(c?.options).toEqual([]);
    expect(c?.computed.optionLoss).toEqual({});
    expect(c?.computedNotes.optionLoss).toContain('Опционных позиций по монете нет');
    expect(c?.notes.join('\n')).toContain('OPTION');
  });
});
