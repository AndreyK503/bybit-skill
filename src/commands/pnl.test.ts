import { describe, expect, it } from 'vitest';
import { CLOSED_OPTIONS, CLOSED_PNL, DELIVERY, TLOG_OPTION_DELIVERY, TLOG_OPTION_TRADE, TRANSACTION_LOG, timeRoute } from '../fixtures/bybit-v5-history.js';
import { READ_ONLY_KEY, routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS } from '../util/window.js';
import { operations } from './operations.js';
import { pnl } from './pnl.js';

/**
 * `pnl` (FR-9, criteria 13, 14, 16). Docs examples moved into the period, plus:
 * - ETHPERP TRADE row in USDC: gives the settlement currency of the docs closed-pnl symbol;
 * - option position A (live record + a closing buy): closed in the journal, result 6.29168159.
 * closedPnl and totalPnl already include trading fees (docs examples checked by hand, plan E4),
 * and closedPnl also includes funding (live 2026-09-27: residual = journal funding for every fully closed symbol),
 * so the total is closedPerps + closedOptions; fees and funding are shown, not added again.
 */
const D = DAY_MS;
const NOW = 1790600000000;
const at = (days: number) => String(NOW - days * D);

const CLOSED_PERP = { ...CLOSED_PNL, updatedTime: at(3) };
const CLOSED_OPT = CLOSED_OPTIONS.map((o, i) => ({ ...o, openTime: NOW - 6 * D, closeTime: NOW - (4 + i) * D }));
const DELIV = { ...DELIVERY, deliveryTime: NOW - 6 * D };
const [SETTLE, TRADE1, TRADE2] = TRANSACTION_LOG.map((r, i) => ({ ...r, transactionTime: at(i + 1) }));
const ETHPERP = { ...TRANSACTION_LOG[1]!, symbol: 'ETHPERP', currency: 'USDC', fee: '1.0', change: '-1.0', funding: '', transactionTime: at(3) };
const A_OPEN = { ...TLOG_OPTION_TRADE, transactionTime: at(2) };
const A_CLOSE = { ...TLOG_OPTION_TRADE, side: 'Buy', size: '0', cashFlow: '-5', fee: '0.1', change: '-5.1', transactionTime: at(1) };
const JOURNAL = [SETTLE!, TRADE1!, TRADE2!, ETHPERP, A_OPEN, A_CLOSE];

function routes(journal: Record<string, unknown>[] = JOURNAL) {
  return {
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/position/closed-pnl': timeRoute({ linear: [CLOSED_PERP], inverse: [] }, 'updatedTime'),
    '/v5/position/get-closed-positions': timeRoute({ option: CLOSED_OPT }, 'closeTime'),
    '/v5/asset/delivery-record': timeRoute({ option: [DELIV], linear: [], inverse: [] }, 'deliveryTime'),
    '/v5/account/transaction-log': timeRoute({ '': journal }, 'transactionTime'),
  };
}

const run = (days = 179, journal?: Record<string, unknown>[]) => {
  const { client, urls } = routedClient(routes(journal));
  return pnl(client, { period: { from: NOW - days * D, to: NOW } }, { now: NOW }).then((r) => ({ r, urls }));
};

describe('pnl', () => {
  it('requests closed perps (linear, inverse), closed options, deliveries and the journal', async () => {
    const { urls } = await run();
    const seen = (path: string) => new Set(urls.filter((u) => u.pathname === path).map((u) => u.searchParams.get('category')));
    expect(seen('/v5/position/closed-pnl')).toEqual(new Set(['linear', 'inverse']));
    expect(seen('/v5/position/get-closed-positions')).toEqual(new Set(['option']));
    expect(seen('/v5/asset/delivery-record')).toEqual(new Set(['option', 'linear', 'inverse']));
    expect(urls.some((u) => u.pathname === '/v5/account/transaction-log' && u.searchParams.get('accountType') === 'UNIFIED')).toBe(true);
  });

  it('lists closed perps, closed options and deliveries with raw fields', async () => {
    const { r } = await run();
    expect(r.closedPerps).toEqual([
      { category: 'linear', symbol: 'ETHPERP', side: 'Sell', closedSize: '3', avgEntryPrice: '1194.97516667', avgExitPrice: '1180.59833333', closedPnl: '-47.4065323', updatedTime: at(3) },
    ]);
    expect(r.closedOptions.map((o) => [o.symbol, o.totalPnl, o.deliveryPrice])).toEqual([
      ['BTC-12JUN25-104019-C-USDT', '0.90760719', '107281.77405031'],
      ['BTC-12JUN25-104000-C-USDT', '-7.60858218', '107625.40470159'],
    ]);
    expect(r.deliveries.map((d) => [d.symbol, d.deliveryPrice, d.deliveryRpl])).toEqual([['BTC-29DEC22-16000-P', '16541.86369547', '3.5']]);
  });

  it('within 6 months: options from the exchange list, no journal positions', async () => {
    const { r } = await run();
    expect(r.computed.optionsSource).toBe('exchange');
    expect(r.optionPositions).toEqual([]);
  });

  it('totals per currency without double counting', async () => {
    const { r } = await run();
    const [usdc, usdt] = r.computed.currencies;
    expect(usdc?.currency).toBe('USDC');
    expect(usdc?.closedPerps).toBeCloseTo(-47.4065323, 8);
    expect(usdc?.funding).toBe(0);
    expect(usdc?.fees).toBeCloseTo(1.0, 8);
    expect(usdc?.closedOptions).toBe(0);
    expect(usdc?.total).toBeCloseTo(-47.4065323, 8);

    expect(usdt?.currency).toBe('USDT');
    expect(usdt?.closedPerps).toBe(0);
    expect(usdt?.funding).toBeCloseTo(-0.003676, 10);
    // 0.0190872 + 0.0026028 + 0.20831841 + 0.1
    expect(usdt?.fees).toBeCloseTo(0.33000841, 10);
    // 0.90760719 - 7.60858218
    expect(usdt?.closedOptions).toBeCloseTo(-6.70097499, 8);
    // closedPerps + closedOptions; funding is inside closedPnl (live check 2026-09-27), not added again
    expect(usdt?.total).toBeCloseTo(-6.70097499, 8);
    expect(r.computed.excluded).toBeNull();
  });

  it('fees and funding match operations over the same period (criterion 14)', async () => {
    for (const days of [179, 300]) {
      const { r } = await run(days);
      const { client } = routedClient(routes());
      const ops = await operations(client, { period: { from: NOW - days * D, to: NOW } }, { now: NOW });
      for (const c of r.computed.currencies) {
        expect(c.fees).toBeCloseTo(ops.computed.feesFunding[c.currency]?.fee ?? NaN, 10);
        expect(c.funding).toBeCloseTo(ops.computed.feesFunding[c.currency]?.funding ?? NaN, 10);
      }
    }
  });

  it('deeper than 6 months: options from journal positions read from the 2-year start, by close date', async () => {
    const { r, urls } = await run(300);
    expect(urls.some((u) => u.pathname === '/v5/position/get-closed-positions')).toBe(false);
    const journal = urls.filter((u) => u.pathname === '/v5/account/transaction-log');
    expect(Math.min(...journal.map((u) => Number(u.searchParams.get('startTime'))))).toBe(NOW - 729 * D);
    expect(r.computed.optionsSource).toBe('journal');
    expect(r.optionPositions.map((p) => [p.symbol, p.status])).toEqual([['MNT-30OCT26-0.56-P-USDT', 'closed']]);
    const usdt = r.computed.currencies.find((c) => c.currency === 'USDT');
    // position A: 11.39168159 - 5.1
    expect(usdt?.closedOptions).toBeCloseTo(6.29168159, 8);
    // closedPerps 0 + options; funding not added
    expect(usdt?.total).toBeCloseTo(6.29168159, 8);
    expect(r.computed.currencies.find((c) => c.currency === 'USDC')?.total).toBeCloseTo(-47.4065323, 8);
  });

  it('a position closed in the period without its start in the journal is listed and excluded, with a reason', async () => {
    const { r } = await run(300, [...JOURNAL, TLOG_OPTION_DELIVERY]);
    expect(r.optionPositions.find((p) => p.symbol === 'SOL-25SEP26-110-C-USDT')?.status).toBe('openedBefore');
    expect(r.computed.excluded).toContain('1 ');
    expect(r.computed.currencies.find((c) => c.currency === 'USDT')?.closedOptions).toBeCloseTo(6.29168159, 8);
  });

  it('deeper than 2 years: the journal boundary is named (criterion 16)', async () => {
    const { r } = await run(800);
    expect(r.coverage.find((c) => c.source === 'журнал операций')?.boundary).toContain('2 лет');
  });

  it('closed perp symbol absent from the journal: currency named as unknown, not guessed', async () => {
    const { r } = await run(179, [SETTLE!]);
    const unknown = r.computed.currencies.find((c) => c.currency === 'не определена');
    expect(unknown?.closedPerps).toBeCloseTo(-47.4065323, 8);
  });
});

describe('pnl review fixes', () => {
  it('spot row with the same symbol does not change the currency of a closed perp (category match)', async () => {
    const spot = { ...ETHPERP, category: 'spot', currency: 'ETH', transactionTime: at(2) };
    const { r } = await run(179, [...JOURNAL, spot]);
    expect(r.computed.currencies.find((c) => c.currency === 'USDC')?.closedPerps).toBeCloseTo(-47.4065323, 8);
    expect(r.computed.currencies.find((c) => c.currency === 'ETH')?.closedPerps ?? 0).toBe(0);
  });
});

describe('pnl and spot (decision 2026-09-28)', () => {
  it('total note says spot is not included and points to funds for the all-time result', async () => {
    const { r } = await run();
    expect(r.computedNotes.total).toContain('Спот не входит');
    expect(r.computedNotes.total).toContain('funds');
  });
});
