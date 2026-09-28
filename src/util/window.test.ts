import { describe, expect, it } from 'vitest';
import { TRANSACTION_LOG, listPage } from '../fixtures/bybit-v5-history.js';
import { routedClient } from '../fixtures/route-fetch.js';
import { DAY_MS, clampToDepth, createThrottle, fetchWindowed, splitWindows, type WindowedSource } from './window.js';

/**
 * Windowed collection (D-5, NFR-7, criteria 11, 16).
 * Live 2026-09-27: startTime and endTime are both inclusive, so windows must not overlap;
 * a window starting deeper than ~730 days is refused with 10001.
 */
const D = DAY_MS;
const NOW = 1000 * D;
const SOURCE: WindowedSource = {
  label: 'журнал операций',
  path: '/v5/account/transaction-log',
  params: { accountType: 'UNIFIED', limit: '50' },
  windowDays: 7,
  depthDays: 729,
  depthText: '2 лет',
};

/** Inclusive time filter like the exchange: rows with startTime <= t <= endTime. */
function timeRoute(times: number[]) {
  return (url: URL) => {
    const s = Number(url.searchParams.get('startTime'));
    const e = Number(url.searchParams.get('endTime'));
    const list = times.filter((t) => t >= s && t <= e).map((t) => ({ ...TRANSACTION_LOG[1], transactionTime: String(t) }));
    return listPage(list);
  };
}

describe('splitWindows', () => {
  it('splits into non-overlapping inclusive windows of at most 7 days covering the period', () => {
    // 20 days = 7 + 7 + 6; each next window starts 1 ms after the previous end.
    expect(splitWindows({ from: 0, to: 20 * D - 1 }, 7)).toEqual([
      { from: 0, to: 7 * D - 1 },
      { from: 7 * D, to: 14 * D - 1 },
      { from: 14 * D, to: 20 * D - 1 },
    ]);
  });

  it('a period shorter than one window is one window', () => {
    expect(splitWindows({ from: 5, to: 10 }, 7)).toEqual([{ from: 5, to: 10 }]);
  });
});

describe('clampToDepth', () => {
  it('period within depth: unchanged, no boundary', () => {
    const r = clampToDepth({ from: NOW - 30 * D, to: NOW }, SOURCE, NOW);
    expect(r.period).toEqual({ from: NOW - 30 * D, to: NOW });
    expect(r.coverage).toEqual({ source: 'журнал операций', requestedFrom: NOW - 30 * D, from: NOW - 30 * D, to: NOW, boundary: null });
  });

  it('period deeper than depth: cut at now - 729 days and the boundary is named', () => {
    const r = clampToDepth({ from: NOW - 800 * D, to: NOW }, SOURCE, NOW);
    expect(r.period).toEqual({ from: NOW - 729 * D, to: NOW });
    expect(r.coverage.from).toBe(NOW - 729 * D);
    expect(r.coverage.requestedFrom).toBe(NOW - 800 * D);
    // NOW - 729 days = day 271 since epoch = 1970-09-29; NOW - 800 days = day 200 = 1970-07-20.
    expect(r.coverage.boundary).toContain('2 лет');
    expect(r.coverage.boundary).toContain('1970-09-29');
    expect(r.coverage.boundary).toContain('1970-07-20');
  });

  it('period entirely deeper than depth: nothing to request', () => {
    const r = clampToDepth({ from: NOW - 900 * D, to: NOW - 800 * D }, SOURCE, NOW);
    expect(r.period).toBeNull();
    expect(r.coverage.boundary).not.toBeNull();
  });
});

describe('fetchWindowed', () => {
  it('each request carries source params, startTime and endTime, windows at most 7 days', async () => {
    const { client, urls } = routedClient({ [SOURCE.path]: () => listPage([]) });
    await fetchWindowed(client, SOURCE, { from: NOW - 20 * D, to: NOW }, { now: NOW });
    expect(urls).toHaveLength(3);
    for (const u of urls) {
      expect(u.searchParams.get('accountType')).toBe('UNIFIED');
      const span = Number(u.searchParams.get('endTime')) - Number(u.searchParams.get('startTime'));
      expect(span).toBeLessThanOrEqual(7 * D);
    }
  });

  it('follows the cursor inside each window', async () => {
    const { client, urls } = routedClient({
      [SOURCE.path]: (u) => (u.searchParams.get('cursor') ? listPage([TRANSACTION_LOG[2]]) : listPage([TRANSACTION_LOG[1]], 'c1')),
    });
    const r = await fetchWindowed(client, SOURCE, { from: NOW - 10 * D, to: NOW }, { now: NOW });
    // 2 windows x 2 pages.
    expect(urls.map((u) => u.searchParams.get('cursor'))).toEqual([null, 'c1', null, 'c1']);
    expect(r.rows).toHaveLength(4);
  });

  it('records on window edges are collected once each', async () => {
    const edges = [NOW - 14 * D, NOW - 7 * D - 1, NOW - 7 * D, NOW];
    const { client } = routedClient({ [SOURCE.path]: timeRoute(edges) });
    const r = await fetchWindowed<{ transactionTime: string }>(client, SOURCE, { from: NOW - 14 * D, to: NOW }, { now: NOW });
    expect(r.rows.map((x) => Number(x.transactionTime)).sort((a, b) => a - b)).toEqual(edges);
  });

  it('distinct records sharing one id are all kept (docs example)', async () => {
    const { client } = routedClient({ [SOURCE.path]: () => listPage(TRANSACTION_LOG) });
    const r = await fetchWindowed(client, SOURCE, { from: NOW - D, to: NOW }, { now: NOW });
    expect(r.rows).toHaveLength(3);
  });

  it('does not request deeper than the depth and returns the boundary', async () => {
    const { client, urls } = routedClient({ [SOURCE.path]: () => listPage([]) });
    const r = await fetchWindowed(client, SOURCE, { from: NOW - 800 * D, to: NOW }, { now: NOW });
    expect(Math.min(...urls.map((u) => Number(u.searchParams.get('startTime'))))).toBe(NOW - 729 * D);
    expect(r.coverage.boundary).not.toBeNull();
  });

  it('period entirely deeper than depth: no requests, empty rows', async () => {
    const { client, urls } = routedClient({ [SOURCE.path]: () => listPage([]) });
    const r = await fetchWindowed(client, SOURCE, { from: NOW - 900 * D, to: NOW - 800 * D }, { now: NOW });
    expect(urls).toHaveLength(0);
    expect(r.rows).toEqual([]);
  });

  it('reports progress after every window', async () => {
    const { client } = routedClient({ [SOURCE.path]: () => listPage([]) });
    const calls: [string, number, number][] = [];
    await fetchWindowed(client, SOURCE, { from: NOW - 20 * D, to: NOW }, { now: NOW, onProgress: (l, d, t) => calls.push([l, d, t]) });
    expect(calls).toEqual([
      ['журнал операций', 1, 3],
      ['журнал операций', 2, 3],
      ['журнал операций', 3, 3],
    ]);
  });

  it('waits on the throttle before every request', async () => {
    const { client, urls } = routedClient({
      [SOURCE.path]: (u) => (u.searchParams.get('cursor') ? listPage([]) : listPage([], 'c1')),
    });
    let waits = 0;
    await fetchWindowed(client, SOURCE, { from: NOW - 10 * D, to: NOW }, { now: NOW, throttle: async () => void waits++ });
    expect(waits).toBe(urls.length);
  });

  it('timeParams replaces startTime/endTime (fundinghistory: createTimeFrom/To in seconds)', async () => {
    const { client, urls } = routedClient({ [SOURCE.path]: () => listPage([]) });
    const source = { ...SOURCE, timeParams: (w: { from: number; to: number }) => ({ createTimeFrom: String(Math.floor(w.from / 1000)), createTimeTo: String(Math.floor(w.to / 1000)) }) };
    await fetchWindowed(client, source, { from: NOW - 3 * D, to: NOW }, { now: NOW });
    expect(urls).toHaveLength(1);
    expect(urls[0]!.searchParams.get('startTime')).toBeNull();
    expect(urls[0]!.searchParams.get('createTimeFrom')).toBe(String((NOW - 3 * D) / 1000));
    expect(urls[0]!.searchParams.get('createTimeTo')).toBe(String(NOW / 1000));
    expect(urls[0]!.searchParams.get('accountType')).toBe('UNIFIED');
  });
});

describe('createThrottle', () => {
  it('spaces calls at least intervalMs apart (at most 20 per second at 50 ms)', async () => {
    let t = 0;
    const throttle = createThrottle(50, () => t, async (ms) => void (t += ms));
    const at: number[] = [];
    for (let i = 0; i < 3; i++) {
      await throttle();
      at.push(t);
    }
    expect(at).toEqual([0, 50, 100]);
  });

  it('no wait when the interval already passed', async () => {
    let t = 0;
    let slept = 0;
    const throttle = createThrottle(50, () => t, async (ms) => void (slept += ms));
    await throttle();
    t = 500;
    await throttle();
    expect(slept).toBe(0);
  });
});

describe('fetchWindowed: refusal in the middle of a collection', () => {
  it('rate limit on the third window: the error is thrown, no partial rows are returned', async () => {
    const { errorEnvelope } = await import('../fixtures/bybit-v5-access.js');
    let n = 0;
    const { client } = routedClient({ [SOURCE.path]: () => (++n === 3 ? errorEnvelope(10006) : listPage([TRANSACTION_LOG[1]])) });
    const err = await fetchWindowed(client, SOURCE, { from: NOW - 20 * D, to: NOW }, { now: NOW }).catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('APP_RATE_LIMIT');
  });
});
