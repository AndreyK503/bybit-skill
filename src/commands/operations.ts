import type { BybitClient } from '../api/client.js';
import type { RawTransaction } from '../api/types-history.js';
import { renderPeriod, sumStrings, utcTime } from '../format/history.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';
import { DEPTH_2Y_DAYS, fetchWindowed, type Coverage, type Period, type WindowDeps } from '../util/window.js';
import { requireReadOnlyKey } from './session-status.js';

export const OPERATIONS_DEFAULT_DAYS = 30;

/** Raw transaction-log fields (FR-8). */
export interface OperationView {
  transactionTime: string;
  type: string;
  category: string;
  symbol: string;
  currency: string;
  side: string;
  qty: string;
  size: string;
  tradePrice: string;
  cashFlow: string;
  fee: string;
  funding: string;
  change: string;
  cashBalance: string;
}

/** Sums over one (type, currency) group; empty strings are not counted. */
export interface OperationTotal {
  type: string;
  currency: string;
  count: number;
  cashFlow: number;
  fee: number;
  funding: number;
  change: number;
}

export type FeesFunding = Record<string, { fee: number; funding: number }>;

export interface OperationsResult {
  period: Period;
  coverage: Coverage[];
  operations: OperationView[];
  computed: { totals: OperationTotal[]; feesFunding: FeesFunding };
  computedNotes: { totals: string; feesFunding: string };
}

export interface OperationsOptions {
  period: Period;
  type?: string;
  currency?: string;
}

/** The unified account transaction log as a windowed source (docs: 7-day span, 2 years). */
export const JOURNAL_SOURCE = {
  label: 'журнал операций',
  path: '/v5/account/transaction-log',
  params: { accountType: 'UNIFIED', limit: '50' },
  windowDays: 7,
  depthDays: DEPTH_2Y_DAYS,
  depthText: '2 лет',
};

const NOTES = {
  totals: 'Суммы сырых полей по типу операции и валюте за период. change = cashFlow + funding − fee (документация Bybit).',
  feesFunding: 'Сумма fee (плюс — расход, минус — возврат) и funding (плюс — получено, минус — уплачено) по валюте за период.',
};

function groupBy(rows: RawTransaction[], key: (r: RawTransaction) => string): Map<string, RawTransaction[]> {
  const groups = new Map<string, RawTransaction[]>();
  for (const r of rows) groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  return groups;
}

/** Fees and funding per currency; shared by `operations` and `pnl` (criterion 14). */
export function sumFeesFunding(rows: RawTransaction[]): FeesFunding {
  const out: FeesFunding = {};
  for (const [currency, list] of groupBy(rows, (r) => r.currency)) {
    out[currency] = { fee: sumStrings(list.map((r) => r.fee)), funding: sumStrings(list.map((r) => r.funding)) };
  }
  return out;
}

/** Totals by (type, currency), sorted by type then currency. */
export function totalsByType(rows: RawTransaction[]): OperationTotal[] {
  return [...groupBy(rows, (r) => `${r.type}|${r.currency}`).values()]
    .map((list) => ({
      type: list[0]!.type,
      currency: list[0]!.currency,
      count: list.length,
      cashFlow: sumStrings(list.map((r) => r.cashFlow)),
      fee: sumStrings(list.map((r) => r.fee)),
      funding: sumStrings(list.map((r) => r.funding)),
      change: sumStrings(list.map((r) => r.change)),
    }))
    .sort((a, b) => a.type.localeCompare(b.type) || a.currency.localeCompare(b.currency));
}

function toView(r: RawTransaction): OperationView {
  return {
    transactionTime: r.transactionTime,
    type: r.type,
    category: r.category,
    symbol: r.symbol,
    currency: r.currency,
    side: r.side,
    qty: r.qty,
    size: r.size,
    tradePrice: r.tradePrice,
    cashFlow: r.cashFlow,
    fee: r.fee,
    funding: r.funding,
    change: r.change,
    cashBalance: r.cashBalance,
  };
}

/** `operations` (FR-8): unified account transaction log over a period with totals by type. */
export async function operations(client: BybitClient, options: OperationsOptions, deps: WindowDeps): Promise<OperationsResult> {
  await requireReadOnlyKey(client);
  const filters = { ...(options.type ? { type: options.type } : {}), ...(options.currency ? { currency: options.currency } : {}) };
  const source = { ...JOURNAL_SOURCE, params: { ...JOURNAL_SOURCE.params, ...filters } };
  const { rows, coverage } = await fetchWindowed<RawTransaction>(client, source, options.period, deps);
  const sorted = [...rows].sort((a, b) => Number(b.transactionTime) - Number(a.transactionTime));
  return {
    period: options.period,
    coverage: [coverage],
    operations: sorted.map(toView),
    computed: { totals: totalsByType(rows), feesFunding: sumFeesFunding(rows) },
    computedNotes: NOTES,
  };
}

const n8 = (v: number) => v.toFixed(8);

/** Human-readable journal and totals by type. */
export function renderOperations(r: OperationsResult): string {
  const rows = r.operations.map((o) => [utcTime(o.transactionTime), o.type, orDash(o.symbol), o.currency, orDash(o.cashFlow), orDash(o.fee), orDash(o.funding), o.change]);
  const totals = r.computed.totals.map((t) => [t.type, t.currency, String(t.count), n8(t.cashFlow), n8(t.fee), n8(t.funding), n8(t.change)]);
  return [
    renderPeriod(r.period, r.coverage),
    '',
    r.operations.length ? renderTable(['Время UTC', 'Тип', 'Инструмент', 'Валюта', 'cashFlow', 'Комиссия', 'Фандинг', 'Изменение'], rows) : 'Операций за период нет.',
    '',
    'Итоги по типам [расчёт]:',
    totals.length ? renderTable(['Тип', 'Валюта', 'Записей', 'cashFlow', 'Комиссия', 'Фандинг', 'Изменение'], totals) : 'нет',
    '',
    `* [расчёт] ${r.computedNotes.totals}`,
  ].join('\n');
}
