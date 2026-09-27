import type { BybitClient } from '../api/client.js';
import type { RawAccountInfo, RawPosition } from '../api/types-account.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';
import { fetchAllPages, type CursorPage } from '../util/cursor.js';
import { requireReadOnlyKey } from './session-status.js';

export type PositionCategory = 'linear' | 'inverse' | 'option';

/** Raw position fields from /v5/position/list (FR-4). Empty strings are kept as the exchange sent them. */
export interface PositionView {
  category: PositionCategory;
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  positionValue: string;
  unrealisedPnl: string;
  leverage: string;
  liqPrice: string;
  positionIM: string;
  positionMM: string;
}

/** Fields the exchange may leave empty; the reason is given in fieldNotes. */
export type EmptiableField = 'leverage' | 'liqPrice' | 'positionIM' | 'positionMM';

export interface PositionsResult {
  marginMode: string;
  positions: PositionView[];
  fieldNotes: Partial<Record<EmptiableField, string>>;
}

/** One query per category; linear needs settleCoin and accepts a single value (live check). */
const QUERIES: { category: PositionCategory; settleCoin?: string }[] = [
  { category: 'option' },
  { category: 'linear', settleCoin: 'USDT' },
  { category: 'linear', settleCoin: 'USDC' },
  { category: 'inverse' },
];

const EMPTIABLE: EmptiableField[] = ['leverage', 'liqPrice', 'positionIM', 'positionMM'];

const PM_NOTE = 'Portfolio Margin: биржа не рассчитывает это значение по отдельной позиции (docs /v5/position/list).';
const EMPTY_NOTE: Record<EmptiableField, string> = {
  leverage: 'Биржа не вернула плечо по позиции.',
  liqPrice: 'Биржа не вернула цену ликвидации: она вне допустимого диапазона цен инструмента (docs /v5/position/list).',
  positionIM: 'Биржа не вернула начальную маржу по позиции.',
  positionMM: 'Биржа не вернула поддерживающую маржу по позиции.',
};

function toView(category: PositionCategory, p: RawPosition): PositionView {
  return {
    category,
    symbol: p.symbol,
    side: p.side,
    size: p.size,
    avgPrice: p.avgPrice,
    markPrice: p.markPrice,
    positionValue: p.positionValue,
    unrealisedPnl: p.unrealisedPnl,
    leverage: p.leverage,
    liqPrice: p.liqPrice,
    positionIM: p.positionIM,
    positionMM: p.positionMM,
  };
}

/** All open positions across option, linear USDT, linear USDC and inverse, every page. No key check. */
export async function fetchAllPositions(client: BybitClient): Promise<PositionView[]> {
  const views: PositionView[] = [];
  for (const q of QUERIES) {
    const base: Record<string, string> = { category: q.category, ...(q.settleCoin ? { settleCoin: q.settleCoin } : {}), limit: '200' };
    const rows = await fetchAllPages((cursor) =>
      client.getPrivate<CursorPage<RawPosition>>('/v5/position/list', cursor ? { ...base, cursor } : base),
    );
    views.push(...rows.map((p) => toView(q.category, p)));
  }
  return views;
}

function fieldNotes(marginMode: string, views: PositionView[]): Partial<Record<EmptiableField, string>> {
  const notes: Partial<Record<EmptiableField, string>> = {};
  for (const f of EMPTIABLE) {
    if (views.some((v) => v[f] === '')) notes[f] = marginMode === 'PORTFOLIO_MARGIN' ? PM_NOTE : EMPTY_NOTE[f];
  }
  return notes;
}

/** `positions` command: read-only key check, margin mode, all positions. */
export async function positions(client: BybitClient): Promise<PositionsResult> {
  await requireReadOnlyKey(client);
  const { marginMode } = await client.getPrivate<RawAccountInfo>('/v5/account/info');
  const views = await fetchAllPositions(client);
  return { marginMode, positions: views, fieldNotes: fieldNotes(marginMode, views) };
}

/** Human-readable table; empty exchange values shown as a dash with the reason below. */
export function renderPositions(result: PositionsResult): string {
  if (result.positions.length === 0) return `Открытых позиций нет. Режим маржи: ${result.marginMode}.`;
  const rows = result.positions.map((p) => [
    p.symbol,
    p.category,
    p.side,
    p.size,
    p.avgPrice,
    p.markPrice,
    p.unrealisedPnl,
    orDash(p.leverage),
    orDash(p.liqPrice),
    orDash(p.positionIM),
    orDash(p.positionMM),
  ]);
  const table = renderTable(['Инструмент', 'Тип', 'Сторона', 'Размер', 'Вход', 'Маркировка', 'Нереализ.', 'Плечо', 'Ликвидация', 'IM', 'MM'], rows);
  const notes = Object.entries(result.fieldNotes).map(([f, note]) => `— ${f}: ${note}`);
  return [`Режим маржи: ${result.marginMode}`, '', table, ...(notes.length ? ['', ...notes] : [])].join('\n');
}
