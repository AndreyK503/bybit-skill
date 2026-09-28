import type { BybitClient } from '../api/client.js';
import type { Category } from '../api/types-market.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { badArgument, getForSymbol, resolveCategory } from '../catalog/resolve.js';
import { renderTable } from '../format/table.js';
import { parseOptionSymbol } from '../options/symbol.js';
import { DAY_MS, splitWindows, type Period } from '../util/window.js';

export type CandleInterval = 'D' | 'W' | 'M';
export const CANDLE_INTERVALS: CandleInterval[] = ['D', 'W', 'M'];
export const HISTORY_DEFAULT_DAYS = 365;
/** docs market/kline: limit [1, 1000]. */
const KLINE_LIMIT = 1000;
/** Longest candle of the interval, days: sizes the request windows and the boundary check. */
const CANDLE_DAYS: Record<CandleInterval, number> = { D: 1, W: 7, M: 31 };

/** One raw kline, startTime in ms (docs market/kline). */
export interface Candle {
  start: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  turnover: string;
}

export interface HistoryResult {
  symbol: string;
  category: Category;
  interval: CandleInterval;
  period: Period;
  candles: Candle[];
  /** Where the exchange data actually starts when it is later than requested (criterion 16). */
  boundary: string | null;
  /** The newest candle is still open: its close is the last price. */
  lastCandleOpen: boolean;
}

export interface HistoryOptions {
  symbol: string;
  category?: Category;
  interval: CandleInterval;
  period: Period;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** `history <symbol>` (FR-10, criterion 15): candles oldest first, in windows of 1000. Spot first when the symbol is in several categories. */
export async function history(client: BybitClient, options: HistoryOptions, deps: CatalogDeps): Promise<HistoryResult> {
  const symbol = options.symbol.toUpperCase();
  if (options.category === 'option' || (!options.category && parseOptionSymbol(symbol))) {
    throw badArgument(`Свечей по опционам Bybit не даёт (kline: только spot, linear, inverse). Для ${symbol} есть quote и opt chain.`);
  }
  const category = await resolveCategory(client, deps, symbol, options.category);
  const { interval } = options;
  const period = { from: options.period.from - (options.period.from % DAY_MS), to: options.period.to };
  const byStart = new Map<number, Candle>();
  for (const w of splitWindows(period, KLINE_LIMIT * CANDLE_DAYS[interval])) {
    const params = { category, symbol, interval, start: String(w.from), end: String(w.to), limit: String(KLINE_LIMIT) };
    const r = await getForSymbol<{ list: string[][] }>(client, '/v5/market/kline', params, options.category);
    for (const k of r.list) {
      const start = Number(k[0]);
      if (start >= period.from && start <= period.to) byStart.set(start, { start, open: k[1]!, high: k[2]!, low: k[3]!, close: k[4]!, volume: k[5]!, turnover: k[6]! });
    }
  }
  const candles = [...byStart.values()].sort((a, b) => a.start - b.start);
  const last = candles.at(-1);
  return { symbol, category, interval, period, candles, boundary: boundary(symbol, period, interval, candles), lastCandleOpen: last !== undefined && candleEnd(last.start, interval) > deps.now };
}

function boundary(symbol: string, period: Period, interval: CandleInterval, candles: Candle[]): string | null {
  const first = candles[0];
  if (!first) return `За период ${isoDay(period.from)} — ${isoDay(period.to)} у биржи нет свечей ${symbol}.`;
  if (first.start - period.from < CANDLE_DAYS[interval] * DAY_MS) return null;
  return `Биржа отдаёт свечи ${symbol} с ${isoDay(first.start)}, раньше данных нет; запрошено с ${isoDay(period.from)}.`;
}

/** Exclusive end of a candle: next day, next week, first day of the next month (UTC). */
function candleEnd(start: number, interval: CandleInterval): number {
  if (interval === 'M') {
    const d = new Date(start);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  }
  return start + CANDLE_DAYS[interval] * DAY_MS;
}

const INTERVAL_TEXT: Record<CandleInterval, string> = { D: 'дневные', W: 'недельные', M: 'месячные' };

/** Candle table, oldest first; boundary and an open last candle are said in words. */
export function renderHistory(r: HistoryResult): string {
  const rows = r.candles.map((c) => [isoDay(c.start), c.open, c.high, c.low, c.close, c.volume]);
  return [
    `${r.symbol} (${r.category}), свечи ${INTERVAL_TEXT[r.interval]}, ${isoDay(r.period.from)} — ${isoDay(r.period.to)} (UTC)`,
    ...(r.boundary ? [r.boundary] : []),
    ...(rows.length ? [renderTable(['Начало UTC', 'Открытие', 'Макс', 'Мин', 'Закрытие', 'Объём'], rows)] : []),
    ...(r.lastCandleOpen ? ['Последняя свеча ещё не закрыта: её закрытие — последняя цена.'] : []),
  ].join('\n');
}
