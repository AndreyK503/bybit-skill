import { AppError } from '../api/errors.js';

/** One page of a cursor-paginated Bybit list. */
export interface CursorPage<T> {
  list: T[];
  nextPageCursor: string;
}

/**
 * Follow nextPageCursor until it is empty and concatenate the pages in order (NFR-7).
 * A short page can still carry a cursor; the empty cursor is the only end signal.
 */
export async function fetchAllPages<T>(fetchPage: (cursor: string) => Promise<CursorPage<T>>): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  let cursor = '';
  do {
    seen.add(cursor);
    const page = await fetchPage(cursor);
    rows.push(...page.list);
    cursor = page.nextPageCursor;
    if (cursor && seen.has(cursor)) {
      throw new AppError({
        code: 'APP_PAGINATION_LOOP',
        userMessage: 'Биржа вернула уже пройденную страницу. Сбор остановлен, чтобы не задвоить записи. Повторите запрос позже.',
      });
    }
  } while (cursor);
  return rows;
}
