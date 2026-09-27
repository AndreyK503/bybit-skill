import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { POSITION, positionPage } from '../fixtures/bybit-v5-account.js';
import { READ_ONLY_KEY, routedClient, type Route } from '../fixtures/route-fetch.js';
import { positions, renderPositions } from './positions.js';

/**
 * Fixtures: POSITION is the docs example item (inverse BTCUSD). Test variants change symbol,
 * category-specific fields or empty the Portfolio Margin fields, as noted at each use.
 * Portfolio Margin: docs say leverage, liqPrice, positionIM, positionMM return "" in that mode;
 * confirmed on the live account 2026-09-27.
 */
const EMPTY = (category: string): Route => () => positionPage(category, [], '');
const PM_ACCOUNT = { ...ACCOUNT_INFO, result: { ...ACCOUNT_INFO.result, marginMode: 'PORTFOLIO_MARGIN' } };
const PM_POSITION = { ...POSITION, symbol: 'ETHUSDT', leverage: '', liqPrice: '', positionIM: '', positionMM: '' };

function positionRoute(byCategory: Record<string, Route>): Route {
  return (url) => {
    const key = url.searchParams.get('category') === 'linear' ? `linear:${url.searchParams.get('settleCoin')}` : url.searchParams.get('category');
    const route = byCategory[key ?? ''];
    if (!route) throw new Error(`unexpected position query ${url.search}`);
    return route(url);
  };
}

const ALL_EMPTY = { option: EMPTY('option'), 'linear:USDT': EMPTY('linear'), 'linear:USDC': EMPTY('linear'), inverse: EMPTY('inverse') };

function setup(byCategory: Record<string, Route> = ALL_EMPTY, account: unknown = ACCOUNT_INFO) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/account/info': () => account,
    '/v5/position/list': positionRoute({ ...ALL_EMPTY, ...byCategory }),
  });
}

describe('positions', () => {
  it('queries option, linear USDT, linear USDC and inverse with limit 200', async () => {
    const { client, urls } = setup();
    await positions(client);
    const queries = urls
      .filter((u) => u.pathname === '/v5/position/list')
      .map((u) => Object.fromEntries(u.searchParams));
    expect(queries).toEqual(
      expect.arrayContaining([
        { category: 'option', limit: '200' },
        { category: 'linear', settleCoin: 'USDT', limit: '200' },
        { category: 'linear', settleCoin: 'USDC', limit: '200' },
        { category: 'inverse', limit: '200' },
      ]),
    );
    expect(queries).toHaveLength(4);
  });

  it('shows the raw fields of each position with its category', async () => {
    const { client } = setup({ inverse: () => positionPage('inverse', [POSITION], '') });
    const r = await positions(client);
    expect(r.positions).toEqual([
      {
        category: 'inverse',
        symbol: 'BTCUSD',
        side: 'Sell',
        size: '300',
        avgPrice: '27464.50441675',
        markPrice: '28224.50',
        positionValue: '0.01092319',
        unrealisedPnl: '-0.00029413',
        leverage: '10',
        liqPrice: '',
        positionIM: '0.00010923',
        positionMM: '0.0000015',
      },
    ]);
    expect(r.marginMode).toBe('REGULAR_MARGIN');
  });

  it('collects every page (20 + 6 option positions, as on the live account)', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ ...POSITION, symbol: `OPT-${i}` }));
    const page2 = Array.from({ length: 6 }, (_, i) => ({ ...POSITION, symbol: `OPT-${20 + i}` }));
    const { client } = setup({
      option: (url) =>
        url.searchParams.get('cursor') === 'next'
          ? positionPage('option', page2, '')
          : positionPage('option', page1, 'next'),
    });
    const r = await positions(client);
    expect(r.positions.map((p) => p.symbol)).toEqual([...page1, ...page2].map((p) => p.symbol));
  });

  it('Portfolio Margin: empty leverage, liqPrice and margin stay empty with a reason, not 0', async () => {
    const { client } = setup({ 'linear:USDT': () => positionPage('linear', [PM_POSITION], '') }, PM_ACCOUNT);
    const r = await positions(client);
    expect(r.positions[0]).toMatchObject({ leverage: '', liqPrice: '', positionIM: '', positionMM: '' });
    for (const f of ['leverage', 'liqPrice', 'positionIM', 'positionMM'] as const) {
      expect(r.fieldNotes[f]).toMatch(/Portfolio Margin/);
    }
    const text = renderPositions(r);
    const row = text.split('\n').find((l) => l.includes('ETHUSDT')) ?? '';
    expect(row).toContain('—');
    expect(text).toMatch(/Portfolio Margin/);
  });

  it('no positions -> empty list, no error', async () => {
    const { client } = setup();
    const r = await positions(client);
    expect(r.positions).toEqual([]);
    expect(r.fieldNotes).toEqual({});
  });

  it('key with write rights -> APP_KEY_NOT_READONLY before any data request', async () => {
    const { client, urls } = routedClient({
      '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }),
    });
    const err = await positions(client).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/user/query-api']);
  });

  it('a refused page is an error, not an empty result', async () => {
    const { client } = setup({ option: () => errorEnvelope(10005) });
    const err = await positions(client).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('APP_PERMISSION_DENIED');
  });
});
