import type { BybitClient } from '../api/client.js';
import type { RawOptionPosition } from '../api/types-options.js';
import { renderTable } from '../format/table.js';
import { numOrDash, orDash } from '../format/values.js';
import { fetchOptionInstruments } from '../options/instruments.js';
import { parseOptionSymbol, type OptionContract } from '../options/symbol.js';
import { fetchAllPages, type CursorPage } from '../util/cursor.js';
import { requireReadOnlyKey } from './session-status.js';

/** One option position: raw exchange fields plus contract and days to expiry in computed (D-9). */
export interface OptPositionView {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  unrealisedPnl: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
  /** From instruments-info; "" when the symbol is not listed there. */
  deliveryTime: string;
  computed: { contract: OptionContract | null; daysToExpiry: number | null };
  computedNotes: { contract: string; daysToExpiry: string };
}

export interface OptPositionsResult {
  positions: OptPositionView[];
}

const DAY_MS = 86_400_000;
const CONTRACT_NOTE = 'Разобрано из символа по формату Bybit (enum symbol): монета-ДДМММГГ-страйк-C/P[-расчётная монета]; без суффикса — USDC.';
const DAYS_NOTE = '(deliveryTime из instruments-info − текущее время) / 86 400 000, дробные сутки, округление до 0.01.';
const GREEKS_NOTE = 'Греки — сырые поля position/list: на всю позицию, с учётом стороны (у проданной позиции знак обратный).';

function fetchOptionPositions(client: BybitClient): Promise<RawOptionPosition[]> {
  const base = { category: 'option', limit: '200' };
  return fetchAllPages((cursor) =>
    client.getPrivate<CursorPage<RawOptionPosition>>('/v5/position/list', cursor ? { ...base, cursor } : base),
  );
}

function toView(p: RawOptionPosition, deliveryTime: string, now: number): OptPositionView {
  const contract = parseOptionSymbol(p.symbol);
  const days = deliveryTime === '' ? null : Math.round(((Number(deliveryTime) - now) / DAY_MS) * 100) / 100;
  return {
    symbol: p.symbol,
    side: p.side,
    size: p.size,
    avgPrice: p.avgPrice,
    markPrice: p.markPrice,
    unrealisedPnl: p.unrealisedPnl,
    delta: p.delta,
    gamma: p.gamma,
    vega: p.vega,
    theta: p.theta,
    deliveryTime,
    computed: { contract, daysToExpiry: days },
    computedNotes: {
      contract: contract ? CONTRACT_NOTE : `Символ ${p.symbol} не соответствует формату опциона Bybit: контракт не разобран.`,
      daysToExpiry: days === null ? `Контракта ${p.symbol} нет в instruments-info: время экспирации неизвестно, дни не посчитаны.` : DAYS_NOTE,
    },
  };
}

/** `opt positions` (FR-5): option positions with contract, days to expiry and position greeks. */
export async function optPositions(client: BybitClient, options: { now?: number } = {}): Promise<OptPositionsResult> {
  await requireReadOnlyKey(client);
  const raw = await fetchOptionPositions(client);
  if (raw.length === 0) return { positions: [] };
  const delivery = new Map((await fetchOptionInstruments(client, 'All')).map((i) => [i.symbol, i.deliveryTime]));
  const now = options.now ?? Date.now();
  return { positions: raw.map((p) => toView(p, delivery.get(p.symbol) ?? '', now)) };
}

/** Human-readable table; contract fields and days are marked as computed. */
export function renderOptPositions(r: OptPositionsResult): string {
  if (r.positions.length === 0) return 'Опционных позиций нет.';
  const rows = r.positions.map((p) => {
    const c = p.computed.contract;
    return [p.symbol, c?.baseCoin ?? '—', c ? String(c.strike) : '—', c?.expiryDate ?? '—', c?.type ?? '—', numOrDash(p.computed.daysToExpiry),
      p.side, p.size, p.avgPrice, p.markPrice, orDash(p.unrealisedPnl), p.delta, p.gamma, p.vega, p.theta];
  });
  const head = ['Инструмент', 'Монета*', 'Страйк*', 'Экспирация*', 'Тип*', 'Дней*', 'Сторона', 'Размер', 'Вход', 'Маркировка', 'Нереализ.', 'Delta', 'Gamma', 'Vega', 'Theta'];
  const notes = [...new Set(r.positions.flatMap((p) => [p.computedNotes.contract, p.computedNotes.daysToExpiry]))];
  return [renderTable(head, rows), '', '* [расчёт] — вычислено скиллом:', ...notes.map((n) => `- ${n}`), '', GREEKS_NOTE].join('\n');
}
