import { describe, expect, it } from 'vitest';
import { TLOG_OPTION_DELIVERY, TLOG_OPTION_TRADE, TRANSACTION_LOG } from '../fixtures/bybit-v5-history.js';
import { optionPositionsFromJournal } from './journal.js';

/**
 * Option positions from the transaction log ("path 2", plan E4). Verified live 2026-09-27:
 * 120 positions over 179 days equal get-closed-positions totalPnl to the cent (13080.0029).
 * Position before a record = size - signed qty (Buy +, Sell -). NOW = 2026-09-27 12:00 UTC.
 */
const NOW = Date.UTC(2026, 8, 27, 12);
const t = (ms: number) => String(ms);
const rec = (over: Partial<typeof TLOG_OPTION_TRADE>) => ({ ...TLOG_OPTION_TRADE, ...over });

// A: sold 1000 (live record, change 11.39168159), bought back 1000 (change -5.1): 11.39168159 - 5.1 = 6.29168159.
const A_OPEN = rec({ transactionTime: t(NOW - 5_000_000) });
const A_CLOSE = rec({ side: 'Buy', size: '0', cashFlow: '-5', fee: '0.1', change: '-5.1', transactionTime: t(NOW - 1_000_000) });
// B: only the delivery (live record): Buy 30 leaving size 0 -> short 30 before the journal starts.
const B = { ...TLOG_OPTION_DELIVERY };
// C: short 0.1 BTC call expiring 2026-11-27: still open.
const C = rec({ symbol: 'BTC-27NOV26-104000-C-USDT', qty: '0.1', size: '-0.1', change: '50', transactionTime: t(NOW - 2_000_000) });
// D: sold 1 ETH call expiring 2026-09-25, no later record: expired out of the money at 08:00 UTC, result = 20.5.
const D = rec({ symbol: 'ETH-25SEP26-5000-C-USDT', qty: '1', size: '-1', change: '20.5', transactionTime: t(NOW - 9 * 86_400_000) });
// E: expires today, position still on: not treated as expired yet.
const E = rec({ symbol: 'XRP-27SEP26-3-P-USDT', qty: '10', size: '-10', change: '1', transactionTime: t(NOW - 3_000_000) });
// F: two positions one after another on one symbol: 3 - 1 = 2 and 4 - 2 = 2.
const F = [
  rec({ symbol: 'SOL-30OCT26-100-P-USDT', side: 'Sell', qty: '1', size: '-1', change: '3', transactionTime: t(NOW - 8_000_000) }),
  rec({ symbol: 'SOL-30OCT26-100-P-USDT', side: 'Buy', qty: '1', size: '0', change: '-1', transactionTime: t(NOW - 7_000_000) }),
  rec({ symbol: 'SOL-30OCT26-100-P-USDT', side: 'Sell', qty: '2', size: '-2', change: '4', transactionTime: t(NOW - 6_000_000) }),
  rec({ symbol: 'SOL-30OCT26-100-P-USDT', side: 'Buy', qty: '2', size: '0', change: '-2', transactionTime: t(NOW - 4_000_000) }),
];
// G: live records of BTC-18SEP26-68000-P-USDT (2026-08-30, 2026-09-03). The two buys share one millisecond and come
// in the wrong order; 0.1 - 0.01 gives -0.09999999999999999 in floating point. Exchange totalPnl: 11.505 = 19.53 - 7.2225 - 0.8025.
const G_TIME = t(Date.UTC(2026, 8, 3, 15, 41));
const G = [
  rec({ symbol: 'BTC-18SEP26-68000-P-USDT', side: 'Sell', qty: '0.1', size: '-0.1', change: '19.53', transactionTime: t(Date.UTC(2026, 7, 30, 14, 40)) }),
  rec({ symbol: 'BTC-18SEP26-68000-P-USDT', side: 'Buy', qty: '0.09', size: '0', change: '-7.2225', transactionTime: G_TIME }),
  rec({ symbol: 'BTC-18SEP26-68000-P-USDT', side: 'Buy', qty: '0.01', size: '-0.09', change: '-0.8025', transactionTime: G_TIME }),
];

describe('optionPositionsFromJournal', () => {
  const rows = [A_CLOSE, B, C, TRANSACTION_LOG[0]!, D, A_OPEN, E, ...F, ...G];
  const positions = () => optionPositionsFromJournal(rows, NOW);
  const of = (symbol: string) => positions().filter((p) => p.symbol === symbol);

  it('positions by symbol then open time; non-option rows ignored', () => {
    expect(positions().map((p) => p.symbol)).toEqual([
      'BTC-18SEP26-68000-P-USDT',
      'BTC-27NOV26-104000-C-USDT',
      'ETH-25SEP26-5000-C-USDT',
      'MNT-30OCT26-0.56-P-USDT',
      'SOL-25SEP26-110-C-USDT',
      'SOL-30OCT26-100-P-USDT',
      'SOL-30OCT26-100-P-USDT',
      'XRP-27SEP26-3-P-USDT',
    ]);
  });

  it('opened and closed: result is the sum of change, closeTime is the record with size 0', () => {
    const [a] = of('MNT-30OCT26-0.56-P-USDT');
    expect(a).toMatchObject({ status: 'closed', currency: 'USDT', records: 2, openTime: NOW - 5_000_000, closeTime: NOW - 1_000_000, reason: null });
    expect(a?.result).toBeCloseTo(6.29168159, 8);
  });

  it('same-millisecond records follow the size chain; result equals the exchange totalPnl 11.505', () => {
    const g = of('BTC-18SEP26-68000-P-USDT');
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ status: 'closed', records: 3, closeTime: Number(G_TIME) });
    expect(g[0]?.result).toBeCloseTo(11.505, 8);
  });

  it('a second position on the same symbol is a separate position', () => {
    const f = of('SOL-30OCT26-100-P-USDT');
    expect(f.map((p) => [p.status, p.records])).toEqual([
      ['closed', 2],
      ['closed', 2],
    ]);
    expect(f[0]?.result).toBeCloseTo(2, 8);
    expect(f[1]?.result).toBeCloseTo(2, 8);
  });

  it('expired with no closing record: closed at the expiry day 08:00 UTC, result = premium net of fee', () => {
    const [d] = of('ETH-25SEP26-5000-C-USDT');
    expect(d).toMatchObject({ status: 'closed', closeTime: Date.UTC(2026, 8, 25, 8) });
    expect(d?.result).toBeCloseTo(20.5, 8);
  });

  it('no start in the journal: openedBefore, closeTime known, no result, reason given', () => {
    const [b] = of('SOL-25SEP26-110-C-USDT');
    expect(b).toMatchObject({ status: 'openedBefore', closeTime: Number(TLOG_OPTION_DELIVERY.transactionTime), result: null });
    expect(b?.reason).toContain('журнал');
  });

  it('still open (expiry ahead, or expiry today): open, no close time, no result', () => {
    for (const s of ['BTC-27NOV26-104000-C-USDT', 'XRP-27SEP26-3-P-USDT']) {
      const [c] = of(s);
      expect(c).toMatchObject({ status: 'open', closeTime: null, result: null });
      expect(c?.reason).toContain('открыта');
    }
  });
});

describe('optionPositionsFromJournal: close and reopen in one millisecond', () => {
  it('the chain continues from the previous size, giving two closed positions of +2', () => {
    // Buy 1 (-1), then in one ms Sell 1 (+3, 1 -> 0) and Buy 1 (-1, 0 -> 1) arriving reversed, then Sell 1 (+3, 1 -> 0).
    const s = 'SOL-30OCT26-120-C-USDT';
    const rows = [
      rec({ symbol: s, side: 'Buy', qty: '1', size: '1', change: '-1', transactionTime: t(NOW - 9_000) }),
      rec({ symbol: s, side: 'Buy', qty: '1', size: '1', change: '-1', transactionTime: t(NOW - 8_000) }),
      rec({ symbol: s, side: 'Sell', qty: '1', size: '0', change: '3', transactionTime: t(NOW - 8_000) }),
      rec({ symbol: s, side: 'Sell', qty: '1', size: '0', change: '3', transactionTime: t(NOW - 7_000) }),
    ];
    const p = optionPositionsFromJournal(rows, NOW);
    expect(p.map((x) => [x.status, x.records, x.closeTime])).toEqual([
      ['closed', 2, NOW - 8_000],
      ['closed', 2, NOW - 7_000],
    ]);
    expect(p[0]?.result).toBeCloseTo(2, 8);
    expect(p[1]?.result).toBeCloseTo(2, 8);
  });
});
