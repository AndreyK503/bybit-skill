import type { BybitClient } from '../api/client.js';
import type { RawKline } from '../api/types-funds.js';
import { DAY_MS, splitWindows, type Period } from '../util/window.js';
import { USD_STABLECOINS, type UsdEstimate } from './usd.js';

/** Spot klines per request: docs market/kline, limit [1, 1000]. */
export const KLINE_WINDOW_DAYS = 1000;

/** Spot pairs that exist now and daily closes by pair and UTC day start. */
export interface DailyPrices {
  pairs: Set<string>;
  closes: Map<string, Map<number, string>>;
  /** Request time: the candle of its UTC day is not closed yet. */
  now?: number;
}

const utcDay = (ms: number) => ms - (ms % DAY_MS);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Daily spot closes of a pair by UTC day start, in windows of at most 1000 candles. */
export async function fetchDailyCloses(client: BybitClient, pair: string, period: Period, throttle?: () => Promise<void>): Promise<Map<number, string>> {
  const closes = new Map<number, string>();
  for (const w of splitWindows({ from: utcDay(period.from), to: period.to }, KLINE_WINDOW_DAYS)) {
    await throttle?.();
    const params = { category: 'spot', symbol: pair, interval: 'D', start: String(w.from), end: String(w.to), limit: String(KLINE_WINDOW_DAYS) };
    const r = await client.getPublic<{ list: RawKline[] }>('/v5/market/kline', params);
    for (const k of r.list) closes.set(Number(k[0]), k[4]!);
  }
  return closes;
}

/** USD value of an amount on the UTC day of `time`: stablecoin 1:1, else close of the COINUSDT daily candle (D-8). */
export function valueOnDate(coin: string, amount: string, time: number, prices: DailyPrices): UsdEstimate {
  if (USD_STABLECOINS.includes(coin)) return { usd: Number(amount), note: 'Стейблкоин, принят равным 1 USD: точная оценка.' };
  const pair = `${coin}USDT`;
  if (!prices.pairs.has(pair)) return { usd: null, note: `На споте Bybit нет пары ${pair}: оценка в долларах невозможна.` };
  const day = isoDay(time);
  const close = prices.closes.get(pair)?.get(utcDay(time));
  if (close === undefined) return { usd: null, note: `Нет дневной свечи ${pair} за ${day}: оценка в долларах невозможна.` };
  const usd = Number(amount) * Number(close);
  if (prices.now !== undefined && utcDay(prices.now) === utcDay(time)) {
    return { usd, note: `Количество × последняя цена ${pair} = ${close}: дневная свеча за ${day} (UTC) ещё не закрыта, спот Bybit.` };
  }
  return { usd, note: `Количество × цена закрытия дневной свечи ${pair} за ${day} (UTC) = ${close}, спот Bybit.` };
}
