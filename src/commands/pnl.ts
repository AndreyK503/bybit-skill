import type { BybitClient } from '../api/client.js';
import type { RawClosedOption, RawClosedPnl, RawTransaction } from '../api/types-history.js';
import { renderPeriod, utcTime } from '../format/history.js';
import { renderTable } from '../format/table.js';
import { numOrDash } from '../format/values.js';
import { optionPositionsFromJournal, type JournalPosition } from '../options/journal.js';
import { parseOptionSymbol } from '../options/symbol.js';
import { DAY_MS, DEPTH_2Y_DAYS, DEPTH_6M_DAYS, clampToDepth, fetchWindowed, type Coverage, type Period, type WindowDeps } from '../util/window.js';
import { fetchDeliveries, renderDeliveryTable, type DeliveryView } from './deliveries.js';
import { JOURNAL_SOURCE, sumFeesFunding } from './operations.js';
import { requireReadOnlyKey } from './session-status.js';

/** Default: the whole depth the exchange serves (user decision 2026-09-27). */
export const PNL_DEFAULT_DAYS = DEPTH_2Y_DAYS;

export interface ClosedPerpView {
  category: 'linear' | 'inverse';
  symbol: string;
  side: string;
  closedSize: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  closedPnl: string;
  updatedTime: string;
}

export interface ClosedOptionView {
  symbol: string;
  side: string;
  qty: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  deliveryPrice: string;
  totalOpenFee: string;
  totalCloseFee: string;
  deliveryFee: string;
  totalPnl: string;
  openTime: number;
  closeTime: number;
}

/** Per settlement currency. */
export interface PnlCurrency {
  currency: string;
  closedPerps: number;
  funding: number;
  fees: number;
  closedOptions: number;
  total: number;
}

export interface PnlResult {
  period: Period;
  coverage: Coverage[];
  closedPerps: ClosedPerpView[];
  closedOptions: ClosedOptionView[];
  deliveries: DeliveryView[];
  /** Journal positions closed in the period; empty when the exchange list covers the period. */
  optionPositions: JournalPosition[];
  computed: { optionsSource: 'exchange' | 'journal'; currencies: PnlCurrency[]; excluded: string | null };
  computedNotes: Record<'closedPerps' | 'funding' | 'fees' | 'closedOptions' | 'total', string>;
}

const UNKNOWN_CURRENCY = 'не определена';

const NOTES: PnlResult['computedNotes'] = {
  closedPerps: `Сумма closedPnl закрытых бессрочных и фьючерсов (уже за вычетом комиссий открытия и закрытия). Валюта — по записи этого инструмента в журнале; нет записи — «${UNKNOWN_CURRENCY}».`,
  funding:
    'Сумма funding из журнала за период — справочно: фандинг закрытых позиций уже входит в closedPnl (сверено вживую 2026-09-27), ' +
    'фандинг по ещё открытым позициям в реализованный результат не входит. Плюс — получено, минус — уплачено.',
  fees: 'Сумма комиссий из журнала за период — справочно: они уже учтены в closedPnl и в результате опционов, в итог повторно не входят.',
  closedOptions:
    'Результат закрытых опционов по дате закрытия, за вычетом всех комиссий, включая экспирацию. В пределах 6 месяцев — сумма totalPnl биржи. ' +
    'Глубже — из журнала: по каждой позиции сумма change (премии, расчёт экспирации, комиссии); сверено с totalPnl биржи до цента (2026-09-27). ' +
    'Не видны позиции, открытые до начала журнала и истёкшие вне денег: такая экспирация записей не оставляет.',
  total:
    'closedPerps + closedOptions по валюте. Комиссии и фандинг уже внутри них. Результат экспираций уже входит в closedOptions. ' +
    'Спот не входит: биржа не считает результат спотовых сделок (закрытых позиций по споту нет). ' +
    'Полный результат за всё время, включая спот, — команда funds.',
};

const perpSource = (category: 'linear' | 'inverse') => ({ label: `закрытые позиции ${category}`, path: '/v5/position/closed-pnl', params: { category, limit: '100' }, windowDays: 7, depthDays: DEPTH_2Y_DAYS, depthText: '2 лет' });
const OPTION_SOURCE = { label: 'закрытые опционы', path: '/v5/position/get-closed-positions', params: { category: 'option', limit: '100' }, windowDays: 7, depthDays: DEPTH_6M_DAYS, depthText: '6 месяцев' };

const inPeriod = (t: number, p: Period) => t >= p.from && t <= p.to;

function add(map: Map<string, number>, key: string, value: number) {
  map.set(key, (map.get(key) ?? 0) + value);
}

/** Closed options per currency: from the exchange list, or from the journal positions closed in the period. */
function optionsByCurrency(exchange: ClosedOptionView[] | null, positions: JournalPosition[]): Map<string, number> {
  const out = new Map<string, number>();
  if (exchange) for (const o of exchange) add(out, parseOptionSymbol(o.symbol)?.settleCoin ?? UNKNOWN_CURRENCY, Number(o.totalPnl));
  else for (const p of positions) if (p.result !== null) add(out, p.currency, p.result);
  return out;
}

function currencies(perps: ClosedPerpView[], options: Map<string, number>, journal: RawTransaction[]): PnlCurrency[] {
  // Spot and linear share symbols (BTCUSDT): the currency comes from rows of the same category.
  const currencyOf = new Map(journal.map((r) => [`${r.category}|${r.symbol}`, r.currency]));
  const perp = new Map<string, number>();
  for (const p of perps) add(perp, currencyOf.get(`${p.category}|${p.symbol}`) ?? UNKNOWN_CURRENCY, Number(p.closedPnl));
  const feesFunding = sumFeesFunding(journal);
  const keys = new Set([...perp.keys(), ...options.keys(), ...Object.keys(feesFunding)]);
  return [...keys].sort().map((currency) => {
    const closedPerps = perp.get(currency) ?? 0;
    const funding = feesFunding[currency]?.funding ?? 0;
    const closedOptions = options.get(currency) ?? 0;
    return { currency, closedPerps, funding, fees: feesFunding[currency]?.fee ?? 0, closedOptions, total: closedPerps + closedOptions };
  });
}

/**
 * `pnl` (FR-9, criteria 13, 14, 16): realized result over a period.
 * Deeper than 6 months the journal is read from the depth start, so positions opened before the period are complete.
 */
export async function pnl(client: BybitClient, options: { period: Period }, deps: WindowDeps): Promise<PnlResult> {
  await requireReadOnlyKey(client);
  const { period } = options;
  const coverage: Coverage[] = [];
  const closedPerps: ClosedPerpView[] = [];
  for (const category of ['linear', 'inverse'] as const) {
    const r = await fetchWindowed<RawClosedPnl>(client, perpSource(category), period, deps);
    closedPerps.push(...r.rows.map((p) => ({ category, symbol: p.symbol, side: p.side, closedSize: p.closedSize, avgEntryPrice: p.avgEntryPrice, avgExitPrice: p.avgExitPrice, closedPnl: p.closedPnl, updatedTime: p.updatedTime })));
    coverage.push(r.coverage);
  }
  const fromExchange = period.from >= deps.now - DEPTH_6M_DAYS * DAY_MS;
  const opt = fromExchange ? await fetchWindowed<RawClosedOption>(client, OPTION_SOURCE, period, deps) : null;
  if (opt) coverage.push(opt.coverage);
  const delivered = await fetchDeliveries(client, period, deps);
  coverage.push(...delivered.coverage);
  const journalPeriod = fromExchange ? period : { from: deps.now - DEPTH_2Y_DAYS * DAY_MS, to: period.to };
  const journal = await fetchWindowed<RawTransaction>(client, JOURNAL_SOURCE, journalPeriod, deps);
  // Reported against the requested period, not the depth-long read used for positions.
  coverage.push(clampToDepth(period, JOURNAL_SOURCE, deps.now).coverage);
  const inside = journal.rows.filter((r) => inPeriod(Number(r.transactionTime), period));

  const closedOptions = (opt?.rows ?? []).map((o) => ({ ...o })).sort((a, b) => b.closeTime - a.closeTime);
  const positions = fromExchange ? [] : optionPositionsFromJournal(journal.rows, deps.now).filter((p) => p.closeTime !== null && inPeriod(p.closeTime, period));
  const excludedCount = positions.filter((p) => p.status === 'openedBefore').length;
  return {
    period,
    coverage,
    closedPerps: closedPerps.sort((a, b) => Number(b.updatedTime) - Number(a.updatedTime)),
    closedOptions,
    deliveries: delivered.deliveries,
    optionPositions: positions,
    computed: {
      optionsSource: fromExchange ? 'exchange' : 'journal',
      currencies: currencies(closedPerps, optionsByCurrency(fromExchange ? closedOptions : null, positions), inside),
      excluded: excludedCount ? `${excludedCount} опционных позиций закрыты в периоде, но открыты раньше начала журнала биржи: их результат в итог не входит.` : null,
    },
    computedNotes: NOTES,
  };
}

/** Human-readable result: lists, journal positions and totals per currency, computed values marked. */
export function renderPnl(r: PnlResult): string {
  const perps = r.closedPerps.map((p) => [utcTime(p.updatedTime), p.symbol, p.side, p.closedSize, p.avgEntryPrice, p.avgExitPrice, p.closedPnl]);
  const opts = r.closedOptions.map((o) => [utcTime(o.closeTime), o.symbol, o.side, o.qty, o.avgEntryPrice, o.deliveryPrice || '—', o.totalPnl]);
  const positions = r.optionPositions.map((p) => [p.closeTime === null ? '—' : utcTime(p.closeTime), p.symbol, p.currency, numOrDash(p.result, 8), p.reason ?? '']);
  const shown = r.computed.currencies.filter((c) => c.total !== 0);
  const hidden = r.computed.currencies.length - shown.length;
  const totals = shown.map((c) => [c.currency, numOrDash(c.closedPerps, 8), numOrDash(c.closedOptions, 8), numOrDash(c.total, 8), numOrDash(c.funding, 8), numOrDash(c.fees, 8)]);
  const optionsBlock =
    r.computed.optionsSource === 'exchange'
      ? ['Закрытые опционы (биржа):', opts.length ? renderTable(['Закрыт UTC', 'Контракт', 'Сторона', 'Объём', 'Вход', 'Цена расчёта', 'Результат'], opts) : 'нет']
      : ['Закрытые опционы по журналу [расчёт]:', positions.length ? renderTable(['Закрыта UTC', 'Контракт', 'Валюта', 'Результат', 'Почему без результата'], positions) : 'нет'];
  return [
    renderPeriod(r.period, r.coverage),
    '',
    'Закрытые бессрочные и фьючерсы:',
    perps.length ? renderTable(['Закрыта UTC', 'Инструмент', 'Сторона', 'Объём', 'Вход', 'Выход', 'Результат'], perps) : 'нет',
    '',
    ...optionsBlock,
    '',
    'Экспирации в деньгах:',
    renderDeliveryTable(r.deliveries),
    '',
    'Итог по валюте [расчёт]:',
    totals.length ? renderTable(['Валюта', 'Бессрочные', 'Опционы', 'Итог', 'Фандинг (справочно)', 'Комиссии (справочно)'], totals) : 'нет',
    ...(r.computed.excluded ? [`Не вошло: ${r.computed.excluded}`] : []),
    ...(hidden ? [`Валют с нулевым итогом (только комиссии): ${hidden}, полный список — в --json.`] : []),
    '',
    `* [расчёт] Итог: ${r.computedNotes.total}`,
    `* [расчёт] Опционы: ${r.computedNotes.closedOptions}`,
    `* [расчёт] Комиссии: ${r.computedNotes.fees}`,
  ].join('\n');
}
