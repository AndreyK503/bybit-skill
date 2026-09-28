import { describe, expect, it } from 'vitest';
import type { RawFundingRow, RawKline } from '../api/types-funds.js';
import { ASSET_OVERVIEW, ASSET_OVERVIEW_WITH_EARN, WALLET_BALANCE } from '../fixtures/bybit-v5-account.js';
import {
  DEPOSIT,
  FUNDING_INSIDE,
  FUNDING_P2P_PURCHASE,
  FUNDING_P2P_SALE,
  FUNDING_P2P_SALE_CANCELED,
  FUNDING_SUB_IN,
  FUNDING_SUB_OUT,
  INTERNAL_DEPOSIT,
  KLINE_ETHUSDT_20240116,
  KLINE_MNTUSDT_20250424,
  WITHDRAWALS,
} from '../fixtures/bybit-v5-funds.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { FUNDS_FROM, FUNDS_SOURCES, classifyFundingRow, funds, type FundsDeps } from './funds.js';

/**
 * `funds` (FR-13). Reference values by hand from the fixtures (bybit-v5-funds.ts, bybit-v5-account.ts):
 * - ETH internal deposit 0.1 x close 2587.54 (ETHUSDT 2024-01-16) = 258.754
 * - MNT from subaccount 1996.4 x close 0.7305 (MNTUSDT 2025-04-24) = 1458.3702
 * - deposited 999.0496 + 258.754 + 196.0784 + 606.7962 + 1458.3702 = 3519.0484
 * - withdrawn 41.43008 + 951 + 80 + 300.8834 = 1373.31348 (withdrawal fees not added: live, amount + fee is debited)
 * - net input 3519.0484 - 1373.31348 = 2145.73492
 * - current value 3.31216591 (wallet totalEquity) + 7175590.45 (funding) + 20888.1 (Earn) = 7196481.86216591
 * - result 7196481.86216591 - 2145.73492 = 7194336.12724591
 * - first operation: P2P purchase createTime 1700481498 s (2023-11-20T11:58:18Z); days floor((NOW - it) / day) = 1043
 */
const D = DAY_MS;
const NOW = 1790600000000;
const ms = (s: string) => Number(s) * 1000;

type Row = Record<string, unknown>;
const envelope = (result: unknown) => ({ retCode: 0, retMsg: 'OK', result, retExtInfo: {}, time: NOW });

/** Rows whose time (field, in ms or s) is within inclusive startTime/endTime, under `rows` like the deposit/withdraw docs. */
const rowsRoute = (rows: Row[], field: string, unit: 'ms' | 's') => (url: URL) => {
  const s = Number(url.searchParams.get('startTime'));
  const e = Number(url.searchParams.get('endTime'));
  const t = (r: Row) => Number(r[field]) * (unit === 's' ? 1000 : 1);
  return envelope({ rows: rows.filter((r) => t(r) >= s && t(r) <= e), nextPageCursor: '' });
};

/** Funding journal: createTimeFrom/createTimeTo in seconds, inclusive; rows under `list`. */
const fundingRoute = (rows: Row[]) => (url: URL) => {
  const s = Number(url.searchParams.get('createTimeFrom'));
  const e = Number(url.searchParams.get('createTimeTo'));
  return envelope({ list: rows.filter((r) => Number(r.createTime) >= s && Number(r.createTime) <= e), nextPageCursor: '' });
};

/** Klines of the requested symbol within [start, end], newest first (docs market/kline). */
const klineRoute = (bySymbol: Record<string, RawKline[]>) => (url: URL) => {
  const s = Number(url.searchParams.get('start'));
  const e = Number(url.searchParams.get('end'));
  const symbol = url.searchParams.get('symbol') ?? '';
  const list = (bySymbol[symbol] ?? []).filter((k) => Number(k[0]) >= s && Number(k[0]) <= e).sort((a, b) => Number(b[0]) - Number(a[0]));
  return envelope({ category: 'spot', symbol, list });
};

/** Spot pairs that exist; lastPrice is not used by funds (test data). */
const tickersRoute = (symbols: string[]) => () => envelope({ category: 'spot', list: symbols.map((symbol) => ({ symbol, lastPrice: '1' })) });

const FUNDING_BOUNDARY = [FUNDING_P2P_PURCHASE, FUNDING_P2P_SALE, FUNDING_P2P_SALE_CANCELED, FUNDING_SUB_IN, FUNDING_SUB_OUT];

interface Setup {
  deposits?: Row[];
  internal?: Row[];
  withdrawals?: Row[];
  funding?: Row[];
  pairs?: string[];
  klines?: Record<string, RawKline[]>;
  overview?: unknown;
}

const run = (s: Setup = {}, deps: FundsDeps = { now: NOW }) => {
  const { client, urls } = routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/asset/deposit/query-record': rowsRoute(s.deposits ?? [DEPOSIT], 'successAt', 'ms'),
    '/v5/asset/deposit/query-internal-record': rowsRoute(s.internal ?? [INTERNAL_DEPOSIT], 'createdTime', 's'),
    '/v5/asset/withdraw/query-record': rowsRoute(s.withdrawals ?? WITHDRAWALS, 'createTime', 'ms'),
    '/v5/asset/fundinghistory': fundingRoute(s.funding ?? [...FUNDING_BOUNDARY, ...FUNDING_INSIDE]),
    '/v5/market/tickers': tickersRoute(s.pairs ?? ['ETHUSDT', 'MNTUSDT', 'BTCUSDT']),
    '/v5/market/kline': klineRoute(s.klines ?? { ETHUSDT: [KLINE_ETHUSDT_20240116], MNTUSDT: [KLINE_MNTUSDT_20250424] }),
    '/v5/account/wallet-balance': () => WALLET_BALANCE,
    '/v5/asset/asset-overview': () => s.overview ?? ASSET_OVERVIEW_WITH_EARN,
  });
  return funds(client, deps).then((r) => ({ r, urls }));
};

const at = (urls: URL[], path: string) => urls.filter((u) => u.pathname === path);
const span = (u: URL, from: string, to: string) => Number(u.searchParams.get(to)) - Number(u.searchParams.get(from));

describe('funds: collection', () => {
  it('deposits, internal deposits and withdrawals in windows of at most 29 days from 2023-11-20 to now', async () => {
    const { urls } = await run();
    for (const path of ['/v5/asset/deposit/query-record', '/v5/asset/deposit/query-internal-record', '/v5/asset/withdraw/query-record']) {
      const list = at(urls, path);
      expect(list.length).toBeGreaterThan(0);
      expect(Number(list[0]!.searchParams.get('startTime'))).toBe(FUNDS_FROM);
      expect(Number(list.at(-1)!.searchParams.get('endTime'))).toBe(NOW);
      for (const u of list) expect(span(u, 'startTime', 'endTime')).toBeLessThan(29 * D);
    }
    for (const u of at(urls, '/v5/asset/withdraw/query-record')) expect(u.searchParams.get('withdrawType')).toBe('2');
  });

  it('funding journal in windows of at most 7 days, time in seconds, from 2023-11-20', async () => {
    const { urls } = await run();
    const list = at(urls, '/v5/asset/fundinghistory');
    expect(Number(list[0]!.searchParams.get('createTimeFrom'))).toBe(FUNDS_FROM / 1000);
    expect(Number(list.at(-1)!.searchParams.get('createTimeTo'))).toBe(Math.floor(NOW / 1000));
    for (const u of list) {
      expect(u.searchParams.get('startTime')).toBeNull();
      expect(span(u, 'createTimeFrom', 'createTimeTo')).toBeLessThanOrEqual(7 * 86400);
    }
  });

  it('never requests internal transfer lists (criterion 17: not in deposit/withdraw records, live 2026-09-28)', async () => {
    const { urls } = await run();
    expect(urls.some((u) => u.pathname.includes('transfer'))).toBe(false);
  });

  it('a record returned in two windows is counted once', async () => {
    const { client } = routedClient({
      '/v5/user/query-api': READ_ONLY_KEY,
      '/v5/asset/deposit/query-record': () => envelope({ rows: [DEPOSIT], nextPageCursor: '' }),
      '/v5/asset/deposit/query-internal-record': () => envelope({ rows: [], nextPageCursor: '' }),
      '/v5/asset/withdraw/query-record': () => envelope({ rows: [], nextPageCursor: '' }),
      '/v5/asset/fundinghistory': () => envelope({ list: [FUNDING_P2P_PURCHASE], nextPageCursor: '' }),
      '/v5/market/tickers': tickersRoute([]),
      '/v5/market/kline': klineRoute({}),
      '/v5/account/wallet-balance': () => WALLET_BALANCE,
      '/v5/asset/asset-overview': () => ASSET_OVERVIEW_WITH_EARN,
    });
    const r = await funds(client, { now: NOW });
    expect(r.flows.filter((f) => f.source === 'deposit')).toHaveLength(1);
    expect(r.flows.filter((f) => f.source === 'funding')).toHaveLength(1);
    expect(r.computed.depositedUsd).toBeCloseTo(999.0496 + 196.0784, 8);
  });

  it('each source paced by its documented limit (docs rate-limit: deposit 100/min, withdraw 300/min, fundinghistory 30/s)', async () => {
    expect(FUNDS_SOURCES.deposit.intervalMs).toBeGreaterThanOrEqual(600);
    expect(FUNDS_SOURCES.withdrawal.intervalMs).toBeGreaterThanOrEqual(200);
    expect(FUNDS_SOURCES.funding.intervalMs).toBeGreaterThanOrEqual(34);
    const asked: number[] = [];
    await run({}, { now: NOW, throttleFor: (ms) => (asked.push(ms), async () => undefined) });
    expect(asked).toEqual(expect.arrayContaining([FUNDS_SOURCES.deposit.intervalMs, FUNDS_SOURCES.withdrawal.intervalMs, FUNDS_SOURCES.funding.intervalMs]));
  });

  it('requires a read-only key', async () => {
    const { urls } = await run();
    expect(urls[0]!.pathname).toBe('/v5/user/query-api');
  });
});

describe('funds: flows', () => {
  it('reads each source time in its unit: successAt ms, createdTime s, createTime ms, funding createTime s', async () => {
    const { r } = await run();
    const byId = new Map(r.flows.map((f) => [f.id, f]));
    expect(byId.get('deposit:160237231')?.time).toBe(1742728163000);
    expect(byId.get('internalDeposit:1103')?.time).toBe(1705393280000);
    expect(byId.get('withdrawal:131629076')?.time).toBe(1742738305000);
    expect(byId.get(`funding:${FUNDING_SUB_IN.currcCursor}`)?.time).toBe(ms(FUNDING_SUB_IN.createTime));
  });

  it('raw fields of a withdrawal: amount received and fee kept apart', async () => {
    const { r } = await run();
    expect(r.flows.find((f) => f.id === 'withdrawal:131629076')).toMatchObject({ source: 'withdrawal', direction: 'out', coin: 'USDC', amount: '41.43008', fee: '5', status: 'success', counted: true });
  });

  it('boundary funding rows become flows with their direction; inside rows do not', async () => {
    const { r } = await run();
    const funding = r.flows.filter((f) => f.source === 'funding');
    expect(funding.map((f) => [f.kind, f.direction, f.coin, f.amount]).sort()).toEqual(
      [
        ['Canceled P2P Sale', 'in', 'USDT', '606.7962'],
        ['Main-Subaccount Transfer', 'in', 'MNT', '1996.4000'],
        ['Main-Subaccount Transfer', 'out', 'USDT', '300.8834'],
        ['P2P Purchase', 'in', 'USDT', '196.0784'],
        ['P2P Sale', 'out', 'USDT', '80.0000'],
      ].sort(),
    );
  });

  it('non-final statuses are listed, not counted', async () => {
    const pendingDeposit = { ...DEPOSIT, id: '1', status: 2 };
    const pendingWithdrawal = { ...WITHDRAWALS[0]!, withdrawId: '2', status: 'Pending' };
    const failedInternal = { ...INTERNAL_DEPOSIT, id: '3', status: 3 };
    const { r } = await run({ deposits: [DEPOSIT, pendingDeposit], withdrawals: [...WITHDRAWALS, pendingWithdrawal], internal: [INTERNAL_DEPOSIT, failedInternal] });
    const counted = (id: string) => r.flows.find((f) => f.id === id)?.counted;
    expect([counted('deposit:1'), counted('withdrawal:2'), counted('internalDeposit:3')]).toEqual([false, false, false]);
    expect([counted('deposit:160237231'), counted('withdrawal:131629076'), counted('internalDeposit:1103')]).toEqual([true, true, true]);
    expect(r.computed.depositedUsd).toBeCloseTo(3519.0484, 8);
    expect(r.computed.withdrawnUsd).toBeCloseTo(1373.31348, 8);
  });
});

describe('funds: classification of funding rows', () => {
  it.each([
    [FUNDING_P2P_PURCHASE, 'in'],
    [FUNDING_P2P_SALE_CANCELED, 'in'],
    [FUNDING_SUB_IN, 'in'],
    [FUNDING_P2P_SALE, 'out'],
    [FUNDING_SUB_OUT, 'out'],
  ] as const)('%# boundary row %o -> %s', (row, cls) => {
    expect(classifyFundingRow(row)).toBe(cls);
  });

  it.each(FUNDING_INSIDE.map((r) => [r.descriptionEn, r] as const))('inside: %s', (_name, row) => {
    expect(classifyFundingRow(row)).toBe('inside');
  });

  it('unknown type in a known group, and an unknown group -> unclassified', () => {
    // Synthetic: keys not seen on the account.
    const fiatUnknown: RawFundingRow = { ...FUNDING_P2P_PURCHASE, description: 'fundingAccountRecordFiatDeposit', descriptionEn: 'Fiat Deposit' };
    const groupUnknown: RawFundingRow = { ...FUNDING_P2P_PURCHASE, showBusiType: 'fundingAccountRecordNewThing', description: 'fundingAccountRecordNewThing' };
    expect(classifyFundingRow(fiatUnknown)).toBe('unclassified');
    expect(classifyFundingRow(groupUnknown)).toBe('unclassified');
  });
});

describe('funds: valuation (D-8)', () => {
  it('stablecoins 1:1, noted as exact', async () => {
    const { r } = await run();
    expect(r.computed.flowsUsd['deposit:160237231']).toBe(999.0496);
    expect(r.computedNotes.flowsUsd['deposit:160237231']).toMatch(/стейблкоин/i);
  });

  it('other coins: amount x daily spot close of COINUSDT on the UTC day; note names pair, day and price', async () => {
    const { r } = await run();
    expect(r.computed.flowsUsd['internalDeposit:1103']).toBeCloseTo(258.754, 8);
    const note = r.computedNotes.flowsUsd['internalDeposit:1103']!;
    for (const part of ['ETHUSDT', '2024-01-16', '2587.54']) expect(note).toContain(part);
    expect(r.computed.flowsUsd[`funding:${FUNDING_SUB_IN.currcCursor}`]).toBeCloseTo(1458.3702, 8);
  });

  it('one kline pass per coin, spot daily; none for stablecoins', async () => {
    const { urls } = await run();
    const klines = at(urls, '/v5/market/kline');
    expect(klines.map((u) => u.searchParams.get('symbol')).sort()).toEqual(['ETHUSDT', 'MNTUSDT']);
    for (const u of klines) {
      expect(u.searchParams.get('category')).toBe('spot');
      expect(u.searchParams.get('interval')).toBe('D');
      expect(Number(u.searchParams.get('limit'))).toBe(1000);
    }
  });

  it('no COINUSDT pair -> empty with a reason; totals and result empty, the operation named', async () => {
    const { r } = await run({ pairs: ['MNTUSDT'] });
    expect(r.computed.flowsUsd['internalDeposit:1103']).toBeNull();
    expect(r.computedNotes.flowsUsd['internalDeposit:1103']).toContain('ETHUSDT');
    expect(r.computed.depositedUsd).toBeNull();
    expect(r.computed.netInputUsd).toBeNull();
    expect(r.computed.resultUsd).toBeNull();
    expect(r.computed.withdrawnUsd).toBeCloseTo(1373.31348, 8);
    expect(r.computedNotes.totals).toContain('internalDeposit:1103');
  });

  it('pair exists but no candle on that day -> empty with a reason', async () => {
    const { r } = await run({ klines: { ETHUSDT: [], MNTUSDT: [KLINE_MNTUSDT_20250424] } });
    expect(r.computed.flowsUsd['internalDeposit:1103']).toBeNull();
    expect(r.computedNotes.flowsUsd['internalDeposit:1103']).toContain('2024-01-16');
    expect(r.computed.resultUsd).toBeNull();
  });
});

describe('funds: totals and result', () => {
  it('deposited, withdrawn, net input, current value, result', async () => {
    const { r } = await run();
    expect(r.computed.depositedUsd).toBeCloseTo(3519.0484, 8);
    expect(r.computed.withdrawnUsd).toBeCloseTo(1373.31348, 8);
    expect(r.computed.netInputUsd).toBeCloseTo(2145.73492, 8);
    expect(r.computed.currentValueUsd).toBeCloseTo(7196481.86216591, 6);
    expect(r.computed.resultUsd).toBeCloseTo(7194336.12724591, 6);
    expect(r.current).toEqual({ unifiedTotalEquity: '3.31216591', fundingTotalEquity: '7175590.45', earnTotalEquity: '20888.1' });
  });

  it('first operation date and duration in days', async () => {
    const { r } = await run();
    expect(r.computed.firstOperationTime).toBe(1700481498000);
    expect(r.computed.days).toBe(1043);
  });

  it('totals by kind: count and USD', async () => {
    const { r } = await run();
    const kind = (k: string, d: 'in' | 'out') => r.computed.byKind.find((x) => x.kind === k && x.direction === d);
    expect(kind('P2P Purchase', 'in')).toMatchObject({ count: 1 });
    expect(kind('P2P Purchase', 'in')?.usd).toBeCloseTo(196.0784, 8);
    expect(kind('Main-Subaccount Transfer', 'out')?.usd).toBeCloseTo(300.8834, 8);
    expect(r.computed.byKind.reduce((s, k) => s + (k.direction === 'in' ? k.count : 0), 0)).toBe(5);
    expect(r.computed.byKind.reduce((s, k) => s + (k.direction === 'out' ? k.count : 0), 0)).toBe(4);
  });

  it('funding total missing from asset-overview -> current value and result empty with a reason', async () => {
    const noFunding = { ...ASSET_OVERVIEW, result: { ...ASSET_OVERVIEW.result, list: ASSET_OVERVIEW.result.list.filter((a) => a.accountType !== 'FundingAccount') } };
    const { r } = await run({ overview: noFunding });
    expect(r.computed.currentValueUsd).toBeNull();
    expect(r.computed.resultUsd).toBeNull();
    expect(r.computed.netInputUsd).toBeCloseTo(2145.73492, 8);
    expect(r.computedNotes.resultUsd.length).toBeGreaterThan(0);
  });

  it('unclassified funding row -> listed; totals and result empty with a reason naming its type', async () => {
    const unknown = { ...FUNDING_P2P_PURCHASE, currcCursor: 'X1', description: 'fundingAccountRecordFiatDeposit', descriptionEn: 'Fiat Deposit' };
    const { r } = await run({ funding: [...FUNDING_BOUNDARY, ...FUNDING_INSIDE, unknown] });
    expect(r.unclassified).toEqual([
      { currency: 'USDT', ioDirection: 'I', txnAmt: '196.0784', time: 1700481498000, showBusiType: 'fundingAccountRecordFiat', description: 'fundingAccountRecordFiatDeposit', descriptionEn: 'Fiat Deposit' },
    ]);
    expect(r.computed.depositedUsd).toBeNull();
    expect(r.computed.withdrawnUsd).toBeNull();
    expect(r.computed.resultUsd).toBeNull();
    expect(r.computedNotes.totals).toContain('Fiat Deposit');
  });

  it('no operations -> zero totals, result empty with a reason', async () => {
    const { r } = await run({ deposits: [], internal: [], withdrawals: [], funding: [] });
    expect(r.flows).toEqual([]);
    expect([r.computed.depositedUsd, r.computed.withdrawnUsd, r.computed.netInputUsd]).toEqual([0, 0, 0]);
    expect(r.computed.resultUsd).toBeNull();
    expect(r.computed.firstOperationTime).toBeNull();
    expect(r.computedNotes.resultUsd).toMatch(/не найден/);
  });

  it('coverage names the start date 2023-11-20 as the requested boundary', async () => {
    const { r } = await run();
    expect(r.period).toEqual({ from: FUNDS_FROM, to: NOW });
    expect(r.computedNotes.scope).toContain('2023-11-20');
  });
});

describe('funds: operations in progress and failed ones', () => {
  it('in progress (money may already be credited or debited) -> result empty, the operations named', async () => {
    const pendingWithdrawal = { ...WITHDRAWALS[0]!, withdrawId: '2', status: 'Pending' };
    const rollbackDeposit = { ...DEPOSIT, id: '7', status: 7 };
    const { r } = await run({ withdrawals: [...WITHDRAWALS, pendingWithdrawal], deposits: [DEPOSIT, rollbackDeposit] });
    expect(r.computed.resultUsd).toBeNull();
    expect(r.computedNotes.resultUsd).toContain('withdrawal:2');
    expect(r.computedNotes.resultUsd).toContain('deposit:7');
    expect(r.computed.depositedUsd).toBeCloseTo(3519.0484, 8);
  });

  it('finally failed (cancelled, rejected, failed, rolled back) -> not counted, result still computed', async () => {
    const failed = [
      { ...WITHDRAWALS[0]!, withdrawId: '11', status: 'CancelByUser' },
      { ...WITHDRAWALS[0]!, withdrawId: '12', status: 'Reject' },
      { ...WITHDRAWALS[0]!, withdrawId: '13', status: 'Fail' },
    ];
    const deposits = [DEPOSIT, { ...DEPOSIT, id: '14', status: 4 }, { ...DEPOSIT, id: '15', status: 70011 }];
    const internal = [INTERNAL_DEPOSIT, { ...INTERNAL_DEPOSIT, id: '16', status: 3 }];
    const { r } = await run({ withdrawals: [...WITHDRAWALS, ...failed], deposits, internal });
    expect(r.computed.resultUsd).toBeCloseTo(7194336.12724591, 6);
  });

  it('an operation not counted does not widen the kline range (time 0 of a pending deposit)', async () => {
    // The exchange returns the pending row in a window although its successAt is "0" (assumed worst case).
    const pendingEth = { ...DEPOSIT, id: '21', coin: 'ETH', status: 2, successAt: '0' };
    const { client, urls } = routedClient({
      '/v5/user/query-api': READ_ONLY_KEY,
      '/v5/asset/deposit/query-record': () => envelope({ rows: [pendingEth], nextPageCursor: '' }),
      '/v5/asset/deposit/query-internal-record': rowsRoute([INTERNAL_DEPOSIT], 'createdTime', 's'),
      '/v5/asset/withdraw/query-record': rowsRoute([], 'createTime', 'ms'),
      '/v5/asset/fundinghistory': fundingRoute([]),
      '/v5/market/tickers': tickersRoute(['ETHUSDT']),
      '/v5/market/kline': klineRoute({ ETHUSDT: [KLINE_ETHUSDT_20240116] }),
      '/v5/account/wallet-balance': () => WALLET_BALANCE,
      '/v5/asset/asset-overview': () => ASSET_OVERVIEW_WITH_EARN,
    });
    const r = await funds(client, { now: NOW });
    const klines = at(urls, '/v5/market/kline');
    expect(klines).toHaveLength(1);
    expect(Number(klines[0]!.searchParams.get('start'))).toBe(1705363200000);
    expect(r.computed.flowsUsd['internalDeposit:1103']).toBeCloseTo(258.754, 8);
  });
});
