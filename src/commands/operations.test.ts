import { describe, expect, it } from 'vitest';
import { TLOG_OPTION_TRADE, TRANSACTION_LOG, timeRoute } from '../fixtures/bybit-v5-history.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { operations, sumFeesFunding, totalsByType } from './operations.js';

/**
 * `operations` (FR-8). Docs transaction-log example (times moved into the period) plus the live
 * option TRADE record. Totals below are hand sums of the fixture strings.
 */
const D = DAY_MS;
const NOW = 1790600000000;
const [SETTLE, TRADE1, TRADE2] = TRANSACTION_LOG.map((r, i) => ({ ...r, transactionTime: String(NOW - (i + 1) * D) }));
const ROWS = [SETTLE!, TRADE1!, TRADE2!, TLOG_OPTION_TRADE];

describe('totalsByType', () => {
  it('sums per (type, currency); empty strings are skipped, not NaN', () => {
    const totals = totalsByType(ROWS);
    expect(totals.map((t) => [t.type, t.currency, t.count])).toEqual([
      ['SETTLEMENT', 'USDT', 1],
      ['TRADE', 'USDT', 3],
    ]);
    const [settle, trade] = totals;
    // SETTLEMENT: funding -0.003676, change -0.003676, fee 0, cashFlow 0.
    expect(settle?.funding).toBeCloseTo(-0.003676, 10);
    expect(settle?.change).toBeCloseTo(-0.003676, 10);
    expect(settle?.fee).toBe(0);
    // TRADE fee: 0.01908720 + 0.00260280 + 0.20831841 = 0.23000841.
    expect(trade?.fee).toBeCloseTo(0.23000841, 10);
    // TRADE change: -0.0190872 - 0.0026028 + 11.39168159 = 11.36999159.
    expect(trade?.change).toBeCloseTo(11.36999159, 10);
    // TRADE cashFlow: 0 + 0 + 11.6; funding: '' + '' + '0' = 0.
    expect(trade?.cashFlow).toBeCloseTo(11.6, 10);
    expect(trade?.funding).toBe(0);
    for (const t of totals) for (const v of [t.cashFlow, t.fee, t.funding, t.change]) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('sumFeesFunding', () => {
  it('fees and funding per currency', () => {
    const r = sumFeesFunding(ROWS);
    expect(Object.keys(r)).toEqual(['USDT']);
    expect(r.USDT?.fee).toBeCloseTo(0.23000841, 10);
    expect(r.USDT?.funding).toBeCloseTo(-0.003676, 10);
  });
});

describe('operations', () => {
  const run = (opts: { type?: string; currency?: string } = {}) => {
    const { client, urls } = routedClient({ '/v5/user/query-api': READ_ONLY_KEY, '/v5/account/transaction-log': timeRoute({ '': ROWS }, 'transactionTime') });
    return operations(client, { period: { from: NOW - 10 * D, to: NOW }, ...opts }, { now: NOW }).then((r) => ({
      r,
      urls: urls.filter((u) => u.pathname === '/v5/account/transaction-log'),
    }));
  };

  it('unified account log in windows; type and currency filters go to the exchange', async () => {
    const { urls } = await run({ type: 'TRADE', currency: 'USDT' });
    expect(urls).toHaveLength(2);
    for (const u of urls) {
      expect(u.searchParams.get('accountType')).toBe('UNIFIED');
      expect(u.searchParams.get('type')).toBe('TRADE');
      expect(u.searchParams.get('currency')).toBe('USDT');
    }
  });

  it('raw fields kept, newest first, totals and fees/funding computed', async () => {
    const { r } = await run();
    // SETTLEMENT NOW - 1 day, live option TRADE 1790467250961 (NOW - 1.54 days), docs TRADEs NOW - 2 and 3 days.
    expect(r.operations.map((o) => o.type)).toEqual(['SETTLEMENT', 'TRADE', 'TRADE', 'TRADE']);
    expect(r.operations[0]).toEqual({
      transactionTime: String(NOW - D),
      type: 'SETTLEMENT',
      category: 'linear',
      symbol: 'XRPUSDT',
      currency: 'USDT',
      side: 'Buy',
      qty: '100',
      size: '100',
      tradePrice: '0.3676',
      cashFlow: '0',
      fee: '0.00000000',
      funding: '-0.003676',
      change: '-0.003676',
      cashBalance: '5086.55825002',
    });
    expect(r.computed.totals).toEqual(totalsByType(ROWS));
    expect(r.computed.feesFunding).toEqual(sumFeesFunding(ROWS));
  });
});
