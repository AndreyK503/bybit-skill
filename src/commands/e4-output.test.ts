import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { CLOSED_OPTIONS, CLOSED_PNL, DELIVERY, EXECUTION_OPTION, TLOG_OPTION_TRADE, TRANSACTION_LOG, timeRoute } from '../fixtures/bybit-v5-history.js';
import { READ_ONLY_KEY, TEST_CREDS, routedClient } from '../fixtures/route-fetch.js';
import { formatOutput } from '../cli/runtime.js';
import { DAY_MS } from '../util/window.js';
import { deliveries, renderDeliveries } from './deliveries.js';
import { operations, renderOperations } from './operations.js';
import { pnl, renderPnl } from './pnl.js';
import { renderTrades, trades } from './trades.js';

/**
 * E4 output: key never in output or errors (D-10), both formats (NFR-5), computed values marked
 * (criterion 22), refused endpoint named (criterion 3), read-only key required (NFR-1).
 */
const D = DAY_MS;
const NOW = 1790600000000;
const PERIOD = { period: { from: NOW - 10 * D, to: NOW } };
const TLOG = [...TRANSACTION_LOG.map((r) => ({ ...r, transactionTime: String(NOW - D) })), TLOG_OPTION_TRADE];

const ROUTES = {
  '/v5/user/query-api': READ_ONLY_KEY,
  '/v5/execution/list': timeRoute({ option: [EXECUTION_OPTION] }, 'execTime'),
  '/v5/account/transaction-log': timeRoute({ '': TLOG }, 'transactionTime'),
  '/v5/position/closed-pnl': timeRoute({ linear: [{ ...CLOSED_PNL, updatedTime: String(NOW - D) }] }, 'updatedTime'),
  '/v5/position/get-closed-positions': timeRoute({ option: CLOSED_OPTIONS.map((o) => ({ ...o, closeTime: NOW - D })) }, 'closeTime'),
  '/v5/asset/delivery-record': timeRoute({ option: [{ ...DELIVERY, deliveryTime: NOW - D }] }, 'deliveryTime'),
};

const deps = { now: NOW };
const both = <T>(r: T, render: (v: T) => string) => [formatOutput(r, true, render), formatOutput(r, false, render)];
const client = (routes: Record<string, (u: URL) => unknown> = ROUTES) => routedClient(routes).client;

const COMMANDS = [
  ['trades', async () => both(await trades(client(), PERIOD, deps), renderTrades)],
  ['operations', async () => both(await operations(client(), PERIOD, deps), renderOperations)],
  ['pnl', async () => both(await pnl(client(), PERIOD, deps), renderPnl)],
  ['deliveries', async () => both(await deliveries(client(), PERIOD, deps), renderDeliveries)],
] as const;

describe('E4 output', () => {
  it.each(COMMANDS)('%s: JSON parses, text differs, neither contains key or secret', async (_name, run) => {
    const [json = '', text = ''] = await run();
    expect(() => JSON.parse(json)).not.toThrow();
    expect(text).not.toBe(json);
    for (const out of [json, text]) {
      expect(out).not.toContain(TEST_CREDS.apiKey);
      expect(out).not.toContain(TEST_CREDS.apiSecret);
    }
  });

  it.each(['trades', 'operations', 'pnl'] as const)('%s: computed values marked in text', async (name) => {
    const [, text = ''] = await COMMANDS.find(([n]) => n === name)![1]();
    expect(text).toContain('[расчёт]');
  });

  it.each([
    ['/v5/execution/list', (c: ReturnType<typeof client>) => trades(c, PERIOD, deps)],
    ['/v5/account/transaction-log', (c: ReturnType<typeof client>) => operations(c, PERIOD, deps)],
    ['/v5/position/closed-pnl', (c: ReturnType<typeof client>) => pnl(c, PERIOD, deps)],
    ['/v5/asset/delivery-record', (c: ReturnType<typeof client>) => deliveries(c, PERIOD, deps)],
  ] as const)('refused %s: message names the endpoint, no key in the error', async (path, run) => {
    const err = (await run(client({ ...ROUTES, [path]: () => errorEnvelope(10005) })).catch((e: unknown) => e)) as AppError;
    expect(err.userMessage).toContain(path);
    expect(JSON.stringify({ m: err.message, d: err.details })).not.toContain(TEST_CREDS.apiKey);
  });

  it.each(COMMANDS.map(([n]) => n))('%s: a key with write permissions is refused', async (name) => {
    const writeKey = { ...ROUTES, '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }) };
    const runs = { trades: () => trades(client(writeKey), PERIOD, deps), operations: () => operations(client(writeKey), PERIOD, deps), pnl: () => pnl(client(writeKey), PERIOD, deps), deliveries: () => deliveries(client(writeKey), PERIOD, deps) };
    const err = (await runs[name]().catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_KEY_NOT_READONLY');
  });
});
