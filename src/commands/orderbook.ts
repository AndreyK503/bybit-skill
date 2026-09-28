import type { BybitClient } from '../api/client.js';
import type { Category, RawOrderbook } from '../api/types-market.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { badArgument, getForSymbol, instrumentNotFound, resolveCategory } from '../catalog/resolve.js';
import { renderTable } from '../format/table.js';

export const ORDERBOOK_DEFAULT_DEPTH = 25;
/** docs market/orderbook: option [1, 25]; spot, linear, inverse [1, 1000]. */
export const ORDERBOOK_MAX_DEPTH = 1000;
export const ORDERBOOK_OPTION_MAX_DEPTH = 25;

export interface OrderbookResult {
  symbol: string;
  category: Category;
  depth: number;
  bids: [string, string][];
  asks: [string, string][];
  ts: number;
}

/** `orderbook <symbol>` (FR-10): raw bids and asks. Spot first when the symbol is in several categories. */
export async function orderbook(client: BybitClient, options: { symbol: string; category?: Category; depth?: number }, deps: CatalogDeps): Promise<OrderbookResult> {
  const symbol = options.symbol.toUpperCase();
  const category = await resolveCategory(client, deps, symbol, options.category);
  const depth = options.depth ?? ORDERBOOK_DEFAULT_DEPTH;
  if (category === 'option' && depth > ORDERBOOK_OPTION_MAX_DEPTH) throw badArgument(`Стакан опциона у Bybit не глубже ${ORDERBOOK_OPTION_MAX_DEPTH} уровней.`);
  const r = await getForSymbol<RawOrderbook | []>(client, '/v5/market/orderbook', { category, symbol, limit: String(depth) }, options.category);
  // A missing symbol comes back as `result: []` (live 2026-09-28).
  if (Array.isArray(r)) throw instrumentNotFound(symbol, category);
  return { symbol, category, depth, bids: r.b, asks: r.a, ts: r.ts };
}

/** Asks above bids, best prices next to each other. */
export function renderOrderbook(r: OrderbookResult): string {
  const asks = [...r.asks].reverse().map(([price, size]) => ['продажа', price, size]);
  const bids = r.bids.map(([price, size]) => ['покупка', price, size]);
  return [
    `${r.symbol} (${r.category}), до ${r.depth} уровней, ${new Date(r.ts).toISOString().slice(0, 19).replace('T', ' ')} UTC`,
    asks.length + bids.length ? renderTable(['Сторона', 'Цена', 'Объём'], [...asks, ...bids]) : 'Стакан пуст: заявок нет.',
  ].join('\n');
}
