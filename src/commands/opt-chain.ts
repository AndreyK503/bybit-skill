import type { BybitClient } from '../api/client.js';
import type { RawOptionInstrument, RawOptionTicker } from '../api/types-options.js';
import { renderTable } from '../format/table.js';
import { MONTHLY_RULE, fetchOptionInstruments, isMonthly, utcDate } from '../options/instruments.js';
import { parseOptionSymbol } from '../options/symbol.js';

export type OptionType = 'Call' | 'Put';

/** One chain row: raw ticker and instrument fields; strike parsed from the symbol in computed. */
export interface ChainRow {
  symbol: string;
  optionsType: string;
  deliveryTime: string;
  bid1Price: string;
  bid1Size: string;
  ask1Price: string;
  ask1Size: string;
  markPrice: string;
  bid1Iv: string;
  ask1Iv: string;
  markIv: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
  volume24h: string;
  openInterest: string;
  underlyingPrice: string;
  computed: { strike: number };
}

export interface ChainOptions {
  coin: string;
  expiry?: string;
  type?: OptionType;
  minStrike?: number;
  maxStrike?: number;
  now?: number;
}

export interface OptChainResult {
  baseCoin: string;
  /** Chosen expiry: UTC date and raw deliveryTime; null when nothing matches. */
  expiry: { date: string; deliveryTime: string } | null;
  availableExpiries: string[];
  rows: ChainRow[];
  computedNotes: { strike: string };
  notes: string[];
}

const STRIKE_NOTE = 'Страйк разобран из символа по формату Bybit (enum symbol): отдельного поля у биржи нет.';

function toRow(t: RawOptionTicker, inst: RawOptionInstrument, strike: number): ChainRow {
  return {
    symbol: t.symbol,
    optionsType: inst.optionsType,
    deliveryTime: inst.deliveryTime,
    bid1Price: t.bid1Price,
    bid1Size: t.bid1Size,
    ask1Price: t.ask1Price,
    ask1Size: t.ask1Size,
    markPrice: t.markPrice,
    bid1Iv: t.bid1Iv,
    ask1Iv: t.ask1Iv,
    markIv: t.markIv,
    delta: t.delta,
    gamma: t.gamma,
    vega: t.vega,
    theta: t.theta,
    volume24h: t.volume24h,
    openInterest: t.openInterest,
    underlyingPrice: t.underlyingPrice,
    computed: { strike },
  };
}

/** Join tickers with instrument cards; tickers without a card or a parsable symbol are named in notes. */
function joinRows(tickers: RawOptionTicker[], instruments: RawOptionInstrument[], notes: string[]): ChainRow[] {
  const cards = new Map(instruments.map((i) => [i.symbol, i]));
  const rows: ChainRow[] = [];
  const noCard: string[] = [];
  const unparsed: string[] = [];
  for (const t of tickers) {
    const card = cards.get(t.symbol);
    const contract = parseOptionSymbol(t.symbol);
    if (!card) noCard.push(t.symbol);
    else if (!contract) unparsed.push(t.symbol);
    else rows.push(toRow(t, card, contract.strike));
  }
  if (noCard.length) notes.push(`Нет в instruments-info, исключены (время экспирации неизвестно): ${noCard.join(', ')}.`);
  if (unparsed.length) notes.push(`Символ не разобран, исключены (страйк неизвестен): ${unparsed.join(', ')}.`);
  return rows;
}

const MONTHLY_NOTE = `По умолчанию — ближайшая месячная экспирация. ${MONTHLY_RULE}`;

const earliest = (rows: ChainRow[]) => rows.filter((r) => r.deliveryTime === rows.reduce((m, x) => (Number(x.deliveryTime) < Number(m.deliveryTime) ? x : m)).deliveryTime);

/** Rows of the requested date, else of the nearest monthly expiry after now, else of the nearest one. */
function pickExpiry(rows: ChainRow[], expiry: string | undefined, now: number, notes: string[]): ChainRow[] {
  if (expiry) return rows.filter((r) => utcDate(r.deliveryTime) === expiry);
  const future = rows.filter((r) => Number(r.deliveryTime) > now);
  if (future.length === 0) return [];
  const monthly = future.filter((r) => isMonthly(r.deliveryTime));
  if (monthly.length > 0) {
    notes.push(MONTHLY_NOTE);
    return earliest(monthly);
  }
  notes.push('Впереди нет месячной экспирации: взята ближайшая.');
  return earliest(future);
}

function applyFilters(rows: ChainRow[], o: ChainOptions): ChainRow[] {
  return rows
    .filter((r) => !o.type || r.optionsType === o.type)
    .filter((r) => o.minStrike === undefined || r.computed.strike >= o.minStrike)
    .filter((r) => o.maxStrike === undefined || r.computed.strike <= o.maxStrike)
    .sort((a, b) => a.computed.strike - b.computed.strike || (a.optionsType === 'Call' ? -1 : 1));
}

/** `opt chain <coin>` (FR-6, criterion 9). Public data: no key needed. */
export async function optChain(client: BybitClient, options: ChainOptions): Promise<OptChainResult> {
  const baseCoin = options.coin.toUpperCase();
  const now = options.now ?? Date.now();
  const { list: tickers } = await client.getPublic<{ list: RawOptionTicker[] }>('/v5/market/tickers', { category: 'option', baseCoin });
  const instruments = await fetchOptionInstruments(client, baseCoin);
  const notes: string[] = [];
  const all = joinRows(tickers, instruments, notes);
  const available = [...new Set(instruments.filter((i) => Number(i.deliveryTime) > now).map((i) => utcDate(i.deliveryTime)))].sort();
  const chosen = pickExpiry(all, options.expiry, now, notes);
  const first = chosen[0];
  if (all.length === 0) notes.push(`По ${baseCoin} биржа не вернула опционов.`);
  else if (!first) notes.push(`На ${options.expiry ?? 'будущие даты'} экспирации по ${baseCoin} нет. Доступные даты: ${available.join(', ') || 'нет'}.`);
  return {
    baseCoin,
    expiry: first ? { date: utcDate(first.deliveryTime), deliveryTime: first.deliveryTime } : null,
    availableExpiries: available,
    rows: applyFilters(chosen, options),
    computedNotes: { strike: STRIKE_NOTE },
    notes,
  };
}

/** Human-readable chain: one row per contract; strike marked as computed. */
export function renderOptChain(r: OptChainResult): string {
  const head = r.expiry
    ? `${r.baseCoin}, экспирация ${r.expiry.date} ${new Date(Number(r.expiry.deliveryTime)).toISOString().slice(11, 16)} UTC, контрактов: ${r.rows.length}`
    : `${r.baseCoin}: доска пуста.`;
  const rows = r.rows.map((x) => [String(x.computed.strike), x.optionsType, x.bid1Price, x.ask1Price, x.markPrice, x.bid1Iv, x.ask1Iv, x.markIv,
    x.delta, x.gamma, x.vega, x.theta, x.volume24h, x.openInterest]);
  const lines = [head];
  if (rows.length) lines.push(renderTable(['Страйк*', 'Тип', 'Bid', 'Ask', 'Mark', 'IV bid', 'IV ask', 'IV mark', 'Delta', 'Gamma', 'Vega', 'Theta', 'Объём 24ч', 'OI'], rows));
  lines.push(`Доступные даты экспирации: ${r.availableExpiries.join(', ') || 'нет'}`, '', `* [расчёт] ${r.computedNotes.strike}`, ...r.notes.map((n) => `- ${n}`));
  return lines.join('\n');
}
