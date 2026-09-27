/** One page of a cursor-paginated Bybit list. */
export interface CursorPage<T> {
  list: T[];
  nextPageCursor: string;
}

/** Follow nextPageCursor until it is empty and concatenate the pages in order (NFR-7). */
export async function fetchAllPages<T>(fetchPage: (cursor: string) => Promise<CursorPage<T>>): Promise<T[]> {
  throw new Error(`not implemented: ${fetchPage.length}`);
}
