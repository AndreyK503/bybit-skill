import type { BybitClient } from '../api/client.js';
import type { MarketCategory, RawOptionBaseCoin } from '../api/types-market.js';
import { loadCatalog, type CatalogDeps, type CatalogEntry } from '../catalog/catalog.js';
import { renderTable } from '../format/table.js';

export interface SearchMatch {
  symbol: string;
  category: MarketCategory;
  type: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
}

export interface SearchResult {
  query: string;
  matches: SearchMatch[];
  /** Option base coins matching the query, one row per coin (decision 2026-09-28). */
  options: RawOptionBaseCoin[];
  catalogSavedAt: number;
}

const CATEGORY_ORDER: MarketCategory[] = ['spot', 'linear', 'inverse'];
const TYPES: Record<string, string> = {
  LinearPerpetual: 'бессрочный',
  LinearFutures: 'фьючерс',
  InversePerpetual: 'бессрочный инверсный',
  InverseFutures: 'фьючерс инверсный',
};
/** Rows shown in text; the full list is in --json. */
const TEXT_LIMIT = 50;

/** 0 exact symbol, 1 exact base coin, 2 substring of symbol or base coin, null no match. */
function rank(e: CatalogEntry, q: string): number | null {
  if (e.symbol === q) return 0;
  if (e.baseCoin === q) return 1;
  return e.symbol.includes(q) || e.baseCoin.includes(q) ? 2 : null;
}

/** `search <query>` (FR-11): ticker substring over spot, perpetuals, futures; options by base coin. */
export async function search(client: BybitClient, query: string, deps: CatalogDeps): Promise<SearchResult> {
  const q = query.trim().toUpperCase();
  const catalog = await loadCatalog(client, deps);
  const ranked = catalog.entries.flatMap((e) => {
    const r = rank(e, q);
    return r === null ? [] : [{ e, r }];
  });
  ranked.sort((a, b) => a.r - b.r || CATEGORY_ORDER.indexOf(a.e.category) - CATEGORY_ORDER.indexOf(b.e.category) || (a.e.symbol < b.e.symbol ? -1 : a.e.symbol > b.e.symbol ? 1 : 0));
  const matches = ranked.map(({ e }) => ({ symbol: e.symbol, category: e.category, type: TYPES[e.contractType] ?? 'спот', baseCoin: e.baseCoin, quoteCoin: e.quoteCoin, status: e.status }));
  const coins = await client.getPublic<{ list: RawOptionBaseCoin[] }>('/v5/market/option-base-coins');
  return { query: q, matches, options: coins.list.filter((c) => c.baseCoin.includes(q)), catalogSavedAt: catalog.savedAt };
}

export function renderSearch(r: SearchResult): string {
  if (r.matches.length === 0 && r.options.length === 0) return `Ничего не найдено по «${r.query}». Уточните тикер: BTC, BTCUSDT, SOL. Названий монет у Bybit нет, только тикеры.`;
  const rows = r.matches.slice(0, TEXT_LIMIT).map((m) => [m.symbol, m.type, m.category, m.baseCoin, m.quoteCoin, m.status]);
  const more = r.matches.length - rows.length;
  return [
    ...(rows.length ? [renderTable(['Тикер', 'Тип', 'Раздел', 'Монета', 'Котируется в', 'Статус'], rows)] : []),
    ...(more > 0 ? [`И ещё ${more}, полный список — в --json.`] : []),
    ...r.options.map((o) => `${o.baseCoin} — опционы${o.hasSymbol ? '' : ' (сейчас без торгуемых контрактов)'}: даты — opt expiries ${o.baseCoin}, доска — opt chain ${o.baseCoin}.`),
    `Справочник от ${new Date(r.catalogSavedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC.`,
  ].join('\n');
}
