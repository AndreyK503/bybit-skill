import path from 'node:path';
import type { BybitClient } from '../api/client.js';
import type { MarketCategory, RawInstrument } from '../api/types-market.js';
import { fetchAllPages, type CursorPage } from '../util/cursor.js';
import { readVersionedCache, writeVersionedCache } from './file-cache.js';

/** One spot, linear or inverse instrument of the cached catalog (D-7). */
export interface CatalogEntry {
  symbol: string;
  category: MarketCategory;
  baseCoin: string;
  quoteCoin: string;
  /** Empty for spot. */
  contractType: string;
  status: string;
}

export interface Catalog {
  entries: CatalogEntry[];
  savedAt: number;
  fromCache: boolean;
}

export interface CatalogDeps {
  cacheDir: string;
  now: number;
  warn: (line: string) => void;
}

/** Spot and perpetual catalog lives a day (D-7). Options are not cached (decision 2026-09-28). */
export const CATALOG_TTL_MS = 86_400_000;
const SCHEMA_VERSION = 1;

interface CacheBody {
  savedAt: number;
  entries: CatalogEntry[];
}

export function catalogPath(cacheDir: string): string {
  return path.join(cacheDir, 'instruments.json');
}

/** Fresh cache, else spot + linear + inverse from instruments-info, saved to the cache. */
export async function loadCatalog(client: BybitClient, deps: CatalogDeps, refresh = false): Promise<Catalog> {
  const file = catalogPath(deps.cacheDir);
  const cached = refresh ? null : readVersionedCache<CacheBody>(file, SCHEMA_VERSION, deps.warn);
  if (cached && deps.now - cached.savedAt < CATALOG_TTL_MS) return { ...cached, fromCache: true };
  const entries = [...(await fetchCategory(client, 'spot')), ...(await fetchCategory(client, 'linear')), ...(await fetchCategory(client, 'inverse'))];
  writeVersionedCache(file, SCHEMA_VERSION, { savedAt: deps.now, entries } satisfies CacheBody);
  return { entries, savedAt: deps.now, fromCache: false };
}

/** Entries with this symbol (any case); a miss in the cache reloads the catalog once. */
export async function findSymbol(client: BybitClient, deps: CatalogDeps, symbol: string): Promise<CatalogEntry[]> {
  const wanted = symbol.toUpperCase();
  const pick = (c: Catalog) => c.entries.filter((e) => e.symbol === wanted);
  const catalog = await loadCatalog(client, deps);
  const found = pick(catalog);
  if (found.length > 0 || !catalog.fromCache) return found;
  return pick(await loadCatalog(client, deps, true));
}

/** Spot has no pagination (docs: limit and cursor are invalid); linear and inverse go by cursor. */
async function fetchCategory(client: BybitClient, category: MarketCategory): Promise<CatalogEntry[]> {
  const path = '/v5/market/instruments-info';
  const raw =
    category === 'spot'
      ? (await client.getPublic<{ list: RawInstrument[] }>(path, { category })).list
      : await fetchAllPages((cursor) => {
          const base = { category, limit: '1000' };
          return client.getPublic<CursorPage<RawInstrument>>(path, cursor ? { ...base, cursor } : base);
        });
  return raw.map((i) => ({ symbol: i.symbol, category, baseCoin: i.baseCoin, quoteCoin: i.quoteCoin, contractType: i.contractType ?? '', status: i.status }));
}
