import type { BybitClient } from '../api/client.js';
import type { Category } from '../api/types-market.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { getForSymbol, instrumentNotFound, resolveCategories } from '../catalog/resolve.js';
import { renderTable } from '../format/table.js';

export interface InstrumentResult {
  symbol: string;
  cards: { category: Category; info: Record<string, unknown> }[];
}

/** `instrument <symbol>` (FR-10): fresh instruments-info card in every category of the symbol (NFR-2). */
export async function instrument(client: BybitClient, options: { symbol: string; category?: Category }, deps: CatalogDeps): Promise<InstrumentResult> {
  const symbol = options.symbol.toUpperCase();
  const cards = [];
  for (const category of await resolveCategories(client, deps, symbol, options.category)) {
    const r = await getForSymbol<{ list: Record<string, unknown>[] }>(client, '/v5/market/instruments-info', { category, symbol }, options.category);
    for (const info of r.list) cards.push({ category, info });
  }
  if (cards.length === 0) throw instrumentNotFound(symbol, options.category);
  return { symbol, cards };
}

/** Nested filters flattened to `priceFilter.tickSize`; ms timestamps of launch and delivery as UTC dates. */
function flatten(info: Record<string, unknown>, prefix = ''): string[][] {
  return Object.entries(info).flatMap(([key, v]) => {
    const name = prefix + key;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) return flatten(v as Record<string, unknown>, `${name}.`);
    if ((key === 'launchTime' || key === 'deliveryTime') && typeof v === 'string' && v !== '0') return [[name, `${v} (${new Date(Number(v)).toISOString().slice(0, 16).replace('T', ' ')} UTC)`]];
    return [[name, v === null || v === '' ? '—' : String(v)]];
  });
}

export function renderInstrument(r: InstrumentResult): string {
  return r.cards.map((c) => [`${r.symbol} (${c.category}):`, renderTable(['Поле', 'Значение'], flatten(c.info))].join('\n')).join('\n\n');
}
