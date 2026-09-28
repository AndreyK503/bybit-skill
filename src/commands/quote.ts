import type { BybitClient } from '../api/client.js';
import type { Category } from '../api/types-market.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { getForSymbol, instrumentNotFound, resolveCategories } from '../catalog/resolve.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';

export interface QuoteResult {
  symbol: string;
  quotes: { category: Category; ticker: Record<string, string> }[];
}

/** `quote <symbol>` (FR-10): raw ticker in every category where the symbol trades. Public data. */
export async function quote(client: BybitClient, options: { symbol: string; category?: Category }, deps: CatalogDeps): Promise<QuoteResult> {
  const symbol = options.symbol.toUpperCase();
  const quotes = [];
  for (const category of await resolveCategories(client, deps, symbol, options.category)) {
    const r = await getForSymbol<{ list: Record<string, string>[] }>(client, '/v5/market/tickers', { category, symbol }, options.category);
    for (const ticker of r.list) quotes.push({ category, ticker });
  }
  if (quotes.length === 0) throw instrumentNotFound(symbol, options.category);
  return { symbol, quotes };
}

const CONTRACT: [string, string][] = [['lastPrice', 'Последняя'], ['markPrice', 'Маркировка'], ['indexPrice', 'Индекс'], ['bid1Price', 'Покупка'], ['ask1Price', 'Продажа'], ['price24hPcnt', 'Изм. 24ч (доля)'], ['highPrice24h', 'Макс 24ч'], ['lowPrice24h', 'Мин 24ч'], ['volume24h', 'Объём 24ч'], ['turnover24h', 'Оборот 24ч'], ['openInterest', 'Открытый интерес'], ['fundingRate', 'Фандинг'], ['nextFundingTime', 'Следующий фандинг']];

const FIELDS: Record<Category, [string, string][]> = {
  spot: [['lastPrice', 'Последняя'], ['bid1Price', 'Покупка'], ['ask1Price', 'Продажа'], ['price24hPcnt', 'Изм. 24ч (доля)'], ['highPrice24h', 'Макс 24ч'], ['lowPrice24h', 'Мин 24ч'], ['volume24h', 'Объём 24ч'], ['turnover24h', 'Оборот 24ч']],
  linear: CONTRACT,
  inverse: CONTRACT,
  option: [['lastPrice', 'Последняя'], ['markPrice', 'Маркировка'], ['bid1Price', 'Покупка'], ['ask1Price', 'Продажа'], ['markIv', 'IV маркировки (доля)'], ['bid1Iv', 'IV покупки'], ['ask1Iv', 'IV продажи'], ['underlyingPrice', 'Базовый актив'], ['delta', 'Дельта'], ['gamma', 'Гамма'], ['vega', 'Вега'], ['theta', 'Тета'], ['volume24h', 'Объём 24ч'], ['openInterest', 'Открытый интерес']],
};

const TITLE: Record<Category, string> = { spot: 'спот', linear: 'бессрочный / фьючерс USDT, USDC', inverse: 'инверсный', option: 'опцион' };

function value(field: string, raw: string | undefined): string {
  if (raw === undefined) return '—';
  if (field === 'nextFundingTime' && raw !== '' && raw !== '0') return `${new Date(Number(raw)).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  return orDash(raw);
}

/** Key fields per category; everything else is in --json. */
export function renderQuote(r: QuoteResult): string {
  return r.quotes
    .map((q) => [`${r.symbol} — ${TITLE[q.category]}:`, renderTable(['Поле', 'Значение'], FIELDS[q.category].map(([f, label]) => [label, value(f, q.ticker[f])]))].join('\n'))
    .join('\n\n');
}
