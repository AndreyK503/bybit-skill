import type { BybitClient } from '../api/client.js';
import type { RawOptionInstrument } from '../api/types-options.js';
import { fetchAllPages, type CursorPage } from '../util/cursor.js';

/** All option instruments for a base coin (`All` for every coin), every page (plan section 5). Public. */
export function fetchOptionInstruments(client: BybitClient, baseCoin: string): Promise<RawOptionInstrument[]> {
  const base = { category: 'option', baseCoin, limit: '1000' };
  return fetchAllPages((cursor) =>
    client.getPublic<CursorPage<RawOptionInstrument>>('/v5/market/instruments-info', cursor ? { ...base, cursor } : base),
  );
}

/** UTC date (YYYY-MM-DD) of a raw ms timestamp string. */
export function utcDate(ms: string): string {
  return new Date(Number(ms)).toISOString().slice(0, 10);
}
