import { describe, expect, it } from 'vitest';
import type { AppError } from '../api/errors.js';
import { formatOutput } from '../cli/runtime.js';
import { QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { ASSET_OVERVIEW_WITH_EARN, WALLET_BALANCE } from '../fixtures/bybit-v5-account.js';
import { DEPOSIT, FUNDING_P2P_PURCHASE, INTERNAL_DEPOSIT, KLINE_ETHUSDT_20240116, WITHDRAWALS } from '../fixtures/bybit-v5-funds.js';
import { READ_ONLY_KEY, TEST_CREDS, routedClient } from '../fixtures/route-fetch.js';
import { funds, renderFunds } from './funds.js';

/**
 * E5 output: key never in output or errors (D-10), both formats (NFR-5), computed values separated
 * and marked (D-9, criteria 19, 22), refused endpoint named (criterion 3), read-only key (NFR-1).
 */
const NOW = 1790600000000;
const ok = (result: unknown) => ({ retCode: 0, retMsg: 'OK', result, retExtInfo: {}, time: NOW });
const once = <T>(v: T) => {
  let sent = false;
  return () => (sent ? [] : ((sent = true), [v]));
};

const routes = () => {
  const dep = once(DEPOSIT);
  const internal = once(INTERNAL_DEPOSIT);
  const wd = once(WITHDRAWALS[0]!);
  const p2p = once(FUNDING_P2P_PURCHASE);
  return {
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/asset/deposit/query-record': () => ok({ rows: dep(), nextPageCursor: '' }),
    '/v5/asset/deposit/query-internal-record': () => ok({ rows: internal(), nextPageCursor: '' }),
    '/v5/asset/withdraw/query-record': () => ok({ rows: wd(), nextPageCursor: '' }),
    '/v5/asset/fundinghistory': () => ok({ list: p2p(), nextPageCursor: '' }),
    '/v5/market/tickers': () => ok({ category: 'spot', list: [{ symbol: 'ETHUSDT', lastPrice: '1' }] }),
    '/v5/market/kline': () => ok({ category: 'spot', symbol: 'ETHUSDT', list: [KLINE_ETHUSDT_20240116] }),
    '/v5/account/wallet-balance': () => WALLET_BALANCE,
    '/v5/asset/asset-overview': () => ASSET_OVERVIEW_WITH_EARN,
  } as Record<string, (u: URL) => unknown>;
};

const deps = { now: NOW };

describe('E5 output', () => {
  it('JSON parses, text differs, neither contains key or secret', async () => {
    const r = await funds(routedClient(routes()).client, deps);
    const json = formatOutput(r, true, renderFunds);
    const text = formatOutput(r, false, renderFunds);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(text).not.toBe(json);
    for (const out of [json, text]) {
      expect(out).not.toContain(TEST_CREDS.apiKey);
      expect(out).not.toContain(TEST_CREDS.apiSecret);
    }
  });

  it('every computed field has a note; USD values are only under computed', async () => {
    const r = await funds(routedClient(routes()).client, deps);
    for (const key of ['currentValueUsd', 'resultUsd'] as const) expect(r.computedNotes[key].length).toBeGreaterThan(0);
    expect(r.computedNotes.totals.length).toBeGreaterThan(0);
    expect(Object.keys(r.computedNotes.flowsUsd).sort()).toEqual(Object.keys(r.computed.flowsUsd).sort());
    for (const f of r.flows) expect(Object.keys(f)).not.toContain('usd');
  });

  it('text marks computed values and states the method and the scope', async () => {
    const text = renderFunds(await funds(routedClient(routes()).client, deps));
    expect(text).toContain('[расчёт]');
    expect(text).toContain('2023-11-20');
    expect(text).toMatch(/P2P/);
    expect(text).toMatch(/свеч/);
  });

  it('refused withdraw-record: message names the endpoint, no key in the error', async () => {
    const r = { ...routes(), '/v5/asset/withdraw/query-record': () => errorEnvelope(10005) };
    const err = (await funds(routedClient(r).client, deps).catch((e: unknown) => e)) as AppError;
    expect(err.userMessage).toContain('/v5/asset/withdraw/query-record');
    expect(JSON.stringify({ m: err.message, d: err.details })).not.toContain(TEST_CREDS.apiKey);
  });

  it('a key with write permissions is refused', async () => {
    const r = { ...routes(), '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }) };
    const err = (await funds(routedClient(r).client, deps).catch((e: unknown) => e)) as AppError;
    expect(err.code).toBe('APP_KEY_NOT_READONLY');
  });
});
