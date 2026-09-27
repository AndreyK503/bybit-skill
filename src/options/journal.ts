import type { RawTransaction } from '../api/types-history.js';
import { parseOptionSymbol } from './symbol.js';

/**
 * One option position reconstructed from the transaction log (plan E4, "path 2").
 * A position ends on a record with size 0 or at expiry; its result is the sum of `change`.
 * Verified live 2026-09-27: 120 positions over 179 days equal get-closed-positions totalPnl to the cent.
 */
export interface JournalPosition {
  symbol: string;
  currency: string;
  status: 'closed' | 'openedBefore' | 'open';
  openTime: number;
  closeTime: number | null;
  records: number;
  result: number | null;
  reason: string | null;
}

const DAY_MS = 86_400_000;
/** Crypto options expire at 08:00 UTC (plan E3); the day of an out-of-the-money expiry has no record. */
const EXPIRY_HOUR_UTC = 8;
const REASON = {
  openedBefore: 'Позиция открыта раньше, чем начинается журнал биржи (2 года): её начала в данных нет.',
  open: 'Позиция ещё открыта: результат не зафиксирован.',
};

const round8 = (v: number) => Math.round(v * 1e8) / 1e8;
const sizeAfter = (r: RawTransaction) => round8(Number(r.size));
/** Position before a record: size after it minus the signed quantity (Buy +, Sell -). */
const sizeBefore = (r: RawTransaction) => round8(Number(r.size) - (r.side === 'Buy' ? 1 : -1) * Number(r.qty));

/**
 * Records of one millisecond come in any order. Start from the record continuing the previous size
 * (else the one no other record leads into), then follow the size chain.
 */
function chainOrder(group: RawTransaction[], previousSize: number | null): RawTransaction[] {
  const rest = [...group];
  const out: RawTransaction[] = [];
  let next =
    rest.find((x) => sizeBefore(x) === previousSize) ??
    rest.find((x) => !rest.some((y) => y !== x && sizeAfter(y) === sizeBefore(x))) ??
    rest[0];
  while (next) {
    out.push(next);
    rest.splice(rest.indexOf(next), 1);
    const size = sizeAfter(next);
    next = rest.find((y) => sizeBefore(y) === size) ?? rest[0];
  }
  return out;
}

/** Records of one symbol in true order: by time, then by the size chain inside one millisecond. */
function ordered(rows: RawTransaction[]): RawTransaction[] {
  const byTime = new Map<string, RawTransaction[]>();
  for (const r of rows) byTime.set(r.transactionTime, [...(byTime.get(r.transactionTime) ?? []), r]);
  const out: RawTransaction[] = [];
  for (const t of [...byTime.keys()].sort((a, b) => Number(a) - Number(b))) {
    const last = out.at(-1);
    out.push(...chainOrder(byTime.get(t)!, last ? sizeAfter(last) : null));
  }
  return out;
}

/** Expiry moment if the whole expiry day is over, else null. */
function expiredAt(symbol: string, now: number): number | null {
  const c = parseOptionSymbol(symbol);
  if (!c) return null;
  const day = Date.parse(`${c.expiryDate}T00:00:00Z`);
  return day + DAY_MS <= now ? day + EXPIRY_HOUR_UTC * 3_600_000 : null;
}

function toPosition(symbol: string, records: RawTransaction[], closeTime: number | null): JournalPosition {
  const status = sizeBefore(records[0]!) !== 0 ? 'openedBefore' : closeTime === null ? 'open' : 'closed';
  return {
    symbol,
    currency: records[0]!.currency,
    status,
    openTime: Number(records[0]!.transactionTime),
    closeTime,
    records: records.length,
    result: status === 'closed' ? records.reduce((sum, r) => sum + Number(r.change), 0) : null,
    reason: status === 'closed' ? null : REASON[status],
  };
}

/** Option positions from transaction-log rows (non-option rows are ignored), by symbol then open time. */
export function optionPositionsFromJournal(rows: RawTransaction[], now: number): JournalPosition[] {
  const bySymbol = new Map<string, RawTransaction[]>();
  for (const r of rows.filter((x) => x.category === 'option')) bySymbol.set(r.symbol, [...(bySymbol.get(r.symbol) ?? []), r]);
  const positions: JournalPosition[] = [];
  for (const [symbol, list] of [...bySymbol.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let current: RawTransaction[] = [];
    for (const r of ordered(list)) {
      current.push(r);
      if (sizeAfter(r) === 0) {
        positions.push(toPosition(symbol, current, Number(r.transactionTime)));
        current = [];
      }
    }
    if (current.length) positions.push(toPosition(symbol, current, expiredAt(symbol, now)));
  }
  return positions;
}
