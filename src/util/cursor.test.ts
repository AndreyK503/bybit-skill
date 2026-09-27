import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { fetchAllPages, type CursorPage } from './cursor.js';

/**
 * Page shapes follow /v5/position/list: nextPageCursor is "" on the last page (docs example).
 * Live run 2026-09-27: a non-empty cursor came back on the last non-empty page, and the next
 * request returned an empty list with an empty cursor.
 */
function pager(pages: Record<string, CursorPage<number>>) {
  const asked: string[] = [];
  const fetchPage = async (cursor: string) => {
    asked.push(cursor);
    const page = pages[cursor];
    if (!page) throw new Error(`unexpected cursor ${cursor}`);
    return page;
  };
  return { fetchPage, asked };
}

describe('fetchAllPages', () => {
  it('follows nextPageCursor and concatenates pages in order without loss', async () => {
    const { fetchPage, asked } = pager({
      '': { list: [1, 2, 3], nextPageCursor: 'c1' },
      c1: { list: [4, 5], nextPageCursor: '' },
    });
    expect(await fetchAllPages(fetchPage)).toEqual([1, 2, 3, 4, 5]);
    expect(asked).toEqual(['', 'c1']);
  });

  it('non-empty cursor on a short page, then an empty last page: no duplicates', async () => {
    const { fetchPage, asked } = pager({
      '': { list: [1, 2], nextPageCursor: 'c1' },
      c1: { list: [3, 4], nextPageCursor: 'c2' },
      c2: { list: [], nextPageCursor: '' },
    });
    expect(await fetchAllPages(fetchPage)).toEqual([1, 2, 3, 4]);
    expect(asked).toEqual(['', 'c1', 'c2']);
  });

  it('single empty page -> empty list', async () => {
    const { fetchPage } = pager({ '': { list: [], nextPageCursor: '' } });
    expect(await fetchAllPages(fetchPage)).toEqual([]);
  });

  it('a repeated cursor stops with an AppError instead of looping', async () => {
    const { fetchPage, asked } = pager({
      '': { list: [1], nextPageCursor: 'c1' },
      c1: { list: [2], nextPageCursor: 'c1' },
    });
    const err = await fetchAllPages(fetchPage).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('APP_PAGINATION_LOOP');
    expect(asked).toEqual(['', 'c1']);
  });
});
