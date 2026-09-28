import type { BybitClient } from '../api/client.js';
import { AppError } from '../api/errors.js';
import type { Category } from '../api/types-market.js';
import { parseOptionSymbol } from '../options/symbol.js';
import { findSymbol, type CatalogDeps } from './catalog.js';

/** Symbol not traded on Bybit: points to `opt chain` for an option symbol, else to `search`. */
export function instrumentNotFound(symbol: string, category?: Category): AppError {
  const where = category ? ` в разделе ${category}` : '';
  const option = parseOptionSymbol(symbol);
  const hint = option
    ? `Доступные контракты — opt chain ${option.baseCoin} (--expiry ${option.expiryDate}).`
    : `Найдите точный тикер командой search, например: search ${symbol.slice(0, 3)}.`;
  return new AppError({ code: 'APP_INSTRUMENT_NOT_FOUND', userMessage: `Инструмент ${symbol}${where} на Bybit не найден. ${hint}` });
}

/**
 * Categories of a symbol: an option symbol is `option` without the catalog; an explicit category is taken
 * as is; otherwise every catalog category in the order spot, linear, inverse. None: APP_INSTRUMENT_NOT_FOUND.
 */
export async function resolveCategories(client: BybitClient, deps: CatalogDeps, symbol: string, category?: Category): Promise<Category[]> {
  if (category) return [category];
  if (parseOptionSymbol(symbol)) return ['option'];
  const categories = (await findSymbol(client, deps, symbol)).map((e) => e.category);
  if (categories.length === 0) throw instrumentNotFound(symbol);
  return categories;
}

/** A single category: spot first when the symbol is in several (spot is the coin price itself, perps follow it). */
export async function resolveCategory(client: BybitClient, deps: CatalogDeps, symbol: string, category?: Category): Promise<Category> {
  const [first] = await resolveCategories(client, deps, symbol, category);
  return first!;
}

export function badArgument(userMessage: string): AppError {
  return new AppError({ code: 'APP_BAD_ARGUMENT', userMessage });
}

/** 10001: bad ticker (interval, depth, category are checked before the request); 110023: missing option (live 2026-09-28). */
const SYMBOL_REFUSALS = [10001, 110023];

/** Public GET for one symbol; a refusal of the symbol itself becomes APP_INSTRUMENT_NOT_FOUND. */
export async function getForSymbol<T>(client: BybitClient, path: string, params: Record<string, string>, explicit?: Category): Promise<T> {
  try {
    return await client.getPublic<T>(path, params);
  } catch (err) {
    const retCode = err instanceof AppError ? (err.details as { retCode?: number } | undefined)?.retCode : undefined;
    if (retCode !== undefined && SYMBOL_REFUSALS.includes(retCode)) throw instrumentNotFound(params.symbol ?? '', explicit);
    throw err;
  }
}
