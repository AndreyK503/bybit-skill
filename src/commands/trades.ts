import type { BybitClient } from '../api/client.js';
import type { RawExecution } from '../api/types-history.js';
import { renderPeriod, utcTime } from '../format/history.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';
import { DEPTH_2Y_DAYS, fetchWindowed, type Coverage, type Period, type WindowDeps } from '../util/window.js';
import { requireReadOnlyKey } from './session-status.js';

export const TRADES_DEFAULT_DAYS = 30;
export type TradeCategory = 'spot' | 'linear' | 'inverse' | 'option';
export const TRADE_CATEGORIES: TradeCategory[] = ['spot', 'linear', 'inverse', 'option'];

/** Raw execution fields (FR-7); option fields are empty strings for other categories. */
export interface TradeView {
  category: TradeCategory;
  symbol: string;
  side: string;
  execPrice: string;
  execQty: string;
  execValue: string;
  execFee: string;
  feeCurrency: string;
  isMaker: boolean;
  execType: string;
  execTime: string;
  tradeIv: string;
  markIv: string;
  underlyingPrice: string;
  indexPrice: string;
}

export interface TradesResult {
  period: Period;
  coverage: Coverage[];
  trades: TradeView[];
  computed: { feesByCurrency: Record<string, number> };
  computedNotes: { feesByCurrency: string };
}

export interface TradesOptions {
  period: Period;
  category?: TradeCategory;
  symbol?: string;
}

const UNKNOWN_CURRENCY = 'не указана';
const FEES_NOTE =
  'Сумма execFee по валюте комиссии за период; строки фандинга не входят. Отрицательная комиссия — возврат (ребейт). ' +
  `«${UNKNOWN_CURRENCY}» — биржа не заполнила feeCurrency.`;

function toView(category: TradeCategory, e: RawExecution): TradeView {
  return {
    category,
    symbol: e.symbol,
    side: e.side,
    execPrice: e.execPrice,
    execQty: e.execQty,
    execValue: e.execValue,
    execFee: e.execFee,
    feeCurrency: e.feeCurrency ?? '',
    isMaker: e.isMaker,
    execType: e.execType,
    execTime: e.execTime,
    tradeIv: e.tradeIv,
    markIv: e.markIv,
    underlyingPrice: e.underlyingPrice,
    indexPrice: e.indexPrice,
  };
}

/**
 * `trades` (FR-7, criteria 11, 12): executions over a period, funding rows excluded.
 * Options are requested without baseCoin: live 2026-09-27 it returns every base coin.
 */
export async function trades(client: BybitClient, options: TradesOptions, deps: WindowDeps): Promise<TradesResult> {
  await requireReadOnlyKey(client);
  const views: TradeView[] = [];
  const coverage: Coverage[] = [];
  for (const category of options.category ? [options.category] : TRADE_CATEGORIES) {
    const params = { category, limit: '100', ...(options.symbol ? { symbol: options.symbol } : {}) };
    const source = { label: `сделки ${category}`, path: '/v5/execution/list', params, windowDays: 7, depthDays: DEPTH_2Y_DAYS, depthText: '2 лет' };
    const r = await fetchWindowed<RawExecution>(client, source, options.period, deps);
    views.push(...r.rows.filter((e) => e.execType !== 'Funding').map((e) => toView(category, e)));
    coverage.push(r.coverage);
  }
  views.sort((a, b) => Number(b.execTime) - Number(a.execTime));
  const feesByCurrency: Record<string, number> = {};
  for (const t of views) {
    const key = t.feeCurrency || UNKNOWN_CURRENCY;
    feesByCurrency[key] = (feesByCurrency[key] ?? 0) + Number(t.execFee);
  }
  return { period: options.period, coverage, trades: views, computed: { feesByCurrency }, computedNotes: { feesByCurrency: FEES_NOTE } };
}

/** Human-readable trades: time, instrument, side, price, qty, fee, role; IV and underlying for options. */
export function renderTrades(r: TradesResult): string {
  const rows = r.trades.map((t) => [
    utcTime(t.execTime),
    t.symbol,
    t.side,
    t.execPrice,
    t.execQty,
    `${t.execFee} ${t.feeCurrency}`.trim(),
    t.isMaker ? 'мейкер' : 'тейкер',
    orDash(t.tradeIv),
    orDash(t.markIv),
    orDash(t.underlyingPrice),
  ]);
  const fees = Object.entries(r.computed.feesByCurrency).map(([c, v]) => `${v.toFixed(8)} ${c}`);
  return [
    renderPeriod(r.period, r.coverage),
    '',
    r.trades.length ? renderTable(['Время UTC', 'Инструмент', 'Сторона', 'Цена', 'Объём', 'Комиссия', 'Роль', 'IV сделки', 'IV маркир.', 'Базовый'], rows) : 'Сделок за период нет.',
    '',
    `Комиссии [расчёт]: ${fees.length ? fees.join(', ') : 'нет'}`,
    `* [расчёт] ${r.computedNotes.feesByCurrency}`,
  ].join('\n');
}
