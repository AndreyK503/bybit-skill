import { describe, expect, it } from 'vitest';
import { BybitClient } from '../api/client.js';
import { AppError } from '../api/errors.js';
import { ACCOUNT_INFO, MARKET_TIME, QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { maskKey, renderSessionStatus, requireReadOnlyKey, sessionStatus } from './session-status.js';

/**
 * Fixtures: src/fixtures/bybit-v5-access.ts (docs examples).
 * Test-only override: query-api apiKey replaced by KEY so leaks can be detected (docs value is "XXXXXXXX").
 * Server time: timeNano 1688639403423213947 -> 1688639403423 ms (integer division by 1e6, by hand).
 * unifiedMarginStatus: docs /v5/enum, 1 = classic, 3..6 = unified trading account.
 */
const KEY = 'LEAKKEY123456';
const SECRET = 'LEAKSECRET987654';
const SERVER_MS = 1688639403423;
const BASE = 'https://api.bybit.com';

type Routes = Record<string, () => Response>;

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function withKey(overrides: Partial<typeof QUERY_API.result> = {}) {
  return { ...QUERY_API, result: { ...QUERY_API.result, apiKey: KEY, ...overrides } };
}

const OK_ROUTES: Routes = {
  '/v5/market/time': () => json(MARKET_TIME),
  '/v5/user/query-api': () => json(withKey()),
  '/v5/account/info': () => json(ACCOUNT_INFO),
};

function setup(routes: Partial<Routes> = {}, opts: { now?: number; credentials?: boolean } = {}) {
  const all = { ...OK_ROUTES, ...routes };
  const paths: string[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    const route = all[url.pathname];
    if (!route) throw new Error(`unexpected path ${url.pathname}`);
    return route();
  }) as typeof fetch;
  const now = opts.now ?? SERVER_MS + 500;
  const credentials = opts.credentials === false ? undefined : { apiKey: KEY, apiSecret: SECRET };
  const client = new BybitClient({ credentials, baseUrl: BASE, fetchFn, now: () => now });
  return { client, paths, now: () => now };
}

async function status(routes: Partial<Routes> = {}, opts: { now?: number; credentials?: boolean } = {}) {
  const s = setup(routes, opts);
  return { status: await sessionStatus(s.client, s.now), paths: s.paths };
}

function codes(problems: { code: string }[]): string[] {
  return problems.map((p) => p.code);
}

describe('sessionStatus', () => {
  it('shows key rights from query-api', async () => {
    const { status: s } = await status();
    expect(s.configured).toBe(true);
    expect(s.key).toEqual({
      masked: '****3456',
      note: 'testnet',
      readOnly: 1,
      permissions: QUERY_API.result.permissions,
      ips: ['18.181.170.164', '13.212.45.47', '13.212.45.48'],
      type: 1,
      expiredAt: '1970-01-01T00:00:00Z',
      deadlineDay: -2,
      uta: 1,
      isMaster: true,
    });
  });

  it('shows account mode and UTA flag (status 4 is UTA)', async () => {
    const { status: s } = await status();
    expect(s.account).toEqual({ unifiedMarginStatus: 4, marginMode: 'REGULAR_MARGIN' });
    expect(s.computed.isUnified).toBe(true);
    expect(s.computedNotes.isUnified).not.toBe('');
  });

  it('shows environment and connectivity', async () => {
    const { status: s } = await status();
    expect(s.environment).toEqual({ baseUrl: BASE, network: 'mainnet' });
    expect(s.connectivity).toEqual({ ok: true, serverTimeMs: SERVER_MS, error: null });
  });

  it('keeps computed values apart from raw ones', async () => {
    const { status: s } = await status({}, { now: SERVER_MS + 500 });
    expect(s.computed.clockDriftMs).toBe(500);
    expect(s.computedNotes.clockDriftMs).not.toBe('');
    const raw = JSON.stringify({ ...s, computed: undefined, computedNotes: undefined });
    expect(raw).not.toContain('clockDriftMs');
    expect(raw).not.toContain('isUnified');
  });

  it('exchange time unavailable -> clockDriftMs null with a reason, not 0', async () => {
    const { status: s } = await status({ '/v5/market/time': () => new Response('<html>', { status: 502 }) });
    expect(s.computed.clockDriftMs).toBeNull();
    expect(s.computedNotes.clockDriftMs).toMatch(/недоступ|нет|не удалось/i);
    expect(s.connectivity.ok).toBe(false);
    expect(s.connectivity.error).not.toBeNull();
  });

  it('key not configured -> configured false, action, public connectivity check, no private calls', async () => {
    const { status: s, paths } = await status({}, { credentials: false });
    expect(s.configured).toBe(false);
    expect(s.key).toBeNull();
    expect(s.account).toBeNull();
    expect(codes(s.problems)).toContain('APP_KEY_MISSING');
    expect(s.problems.find((p) => p.code === 'APP_KEY_MISSING')?.message).toContain('BYBIT_API_KEY');
    expect(paths).toEqual(['/v5/market/time']);
    expect(s.connectivity.ok).toBe(true);
  });
});

describe('sessionStatus problems', () => {
  it('healthy key and account -> no problems', async () => {
    expect((await status()).status.problems).toEqual([]);
  });

  it('readOnly 0 -> APP_KEY_NOT_READONLY', async () => {
    const { status: s } = await status({ '/v5/user/query-api': () => json(withKey({ readOnly: 0 })) });
    expect(codes(s.problems)).toContain('APP_KEY_NOT_READONLY');
  });

  it('classic account (status 1) -> APP_ACCOUNT_NOT_UTA', async () => {
    const classic = { ...ACCOUNT_INFO, result: { ...ACCOUNT_INFO.result, unifiedMarginStatus: 1 } };
    const { status: s } = await status({ '/v5/account/info': () => json(classic) });
    expect(s.computed.isUnified).toBe(false);
    expect(codes(s.problems)).toContain('APP_ACCOUNT_NOT_UTA');
  });

  it('drift over 1 s -> APP_CLOCK_SKEW naming the seconds', async () => {
    const { status: s } = await status({}, { now: SERVER_MS + 2000 });
    const p = s.problems.find((x) => x.code === 'APP_CLOCK_SKEW');
    expect(p?.message).toContain('2.0 с');
  });

  it('drift within 1 s -> no clock problem', async () => {
    expect(codes((await status({}, { now: SERVER_MS - 900 })).status.problems)).not.toContain('APP_CLOCK_SKEW');
  });

  it('rejected key does not throw: becomes a problem, key and account empty', async () => {
    const { status: s } = await status({
      '/v5/user/query-api': () => json(errorEnvelope(10003)),
      '/v5/account/info': () => json(errorEnvelope(10003)),
    });
    expect(codes(s.problems)).toContain('APP_KEY_REJECTED');
    expect(s.key).toBeNull();
    expect(s.account).toBeNull();
    expect(s.computed.isUnified).toBeNull();
    expect(s.computedNotes.isUnified).not.toBe('');
  });
});

describe('sessionStatus output never leaks the key or secret (D-10)', () => {
  it('JSON and text contain only the masked key', async () => {
    const { status: s } = await status();
    const text = renderSessionStatus(s);
    for (const out of [JSON.stringify(s), text]) {
      expect(out).not.toContain(KEY);
      expect(out).not.toContain(SECRET);
    }
    expect(text).toContain('****3456');
  });

  it('text marks computed values', async () => {
    const { status: s } = await status();
    expect(renderSessionStatus(s)).toContain('[расчёт]');
  });
});

describe('maskKey', () => {
  it('keeps only the last 4 characters', () => {
    expect(maskKey('LEAKKEY123456')).toBe('****3456');
  });
});

describe('requireReadOnlyKey (decision R1)', () => {
  it('passes for a read-only key', async () => {
    await expect(requireReadOnlyKey(setup().client)).resolves.toBeUndefined();
  });

  it('refuses a key with write rights', async () => {
    const { client } = setup({ '/v5/user/query-api': () => json(withKey({ readOnly: 0 })) });
    const err = await requireReadOnlyKey(client).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
  });
});

describe('review fixes: clock drift accuracy (NFR-3) and wording (NFR-6)', () => {
  it('drift is measured from the request midpoint; note names the ± half round-trip error', async () => {
    // Local clock read before (SERVER+100) and after (SERVER+500) the time request:
    // midpoint SERVER+300 -> drift 300; round trip 400 -> error ±200 ms.
    const { client } = setup();
    const reads = [SERVER_MS + 100, SERVER_MS + 500];
    const s = await sessionStatus(client, () => reads.shift() ?? SERVER_MS + 500);
    expect(s.computed.clockDriftMs).toBe(300);
    expect(s.computedNotes.clockDriftMs).toContain('±200');
  });

  it('local clock ahead by 2 s -> says the exchange rejects signed requests', async () => {
    const p = (await status({}, { now: SERVER_MS + 2000 })).status.problems.find((x) => x.code === 'APP_CLOCK_SKEW');
    expect(p?.message).toMatch(/спешат/);
    expect(p?.message).toMatch(/отверга/);
  });

  it('local clock behind by 2 s -> within the 5 s window, not rejected yet', async () => {
    const p = (await status({}, { now: SERVER_MS - 2000 })).status.problems.find((x) => x.code === 'APP_CLOCK_SKEW');
    expect(p?.message).toContain('-2.0 с');
    expect(p?.message).toMatch(/отстают/);
    expect(p?.message).not.toMatch(/отвергает/);
  });

  it('local clock behind by 6 s -> exchange rejects signed requests', async () => {
    const p = (await status({}, { now: SERVER_MS - 6000 })).status.problems.find((x) => x.code === 'APP_CLOCK_SKEW');
    expect(p?.message).toMatch(/отстают/);
    expect(p?.message).toMatch(/отвергает/);
  });
});

describe('review fixes: problems carry an action (claim 24)', () => {
  it('APP_KEY_NOT_READONLY tells to create a read-only key', async () => {
    const { status: s } = await status({ '/v5/user/query-api': () => json(withKey({ readOnly: 0 })) });
    expect(s.problems.find((p) => p.code === 'APP_KEY_NOT_READONLY')?.message).toMatch(/создайте.*Read-Only/);
  });

  it('APP_ACCOUNT_NOT_UTA tells to switch the account to UTA', async () => {
    const classic = { ...ACCOUNT_INFO, result: { ...ACCOUNT_INFO.result, unifiedMarginStatus: 1 } };
    const { status: s } = await status({ '/v5/account/info': () => json(classic) });
    expect(s.problems.find((p) => p.code === 'APP_ACCOUNT_NOT_UTA')?.message).toMatch(/переведите/);
  });
});

describe('decision A: clock problem only when the drift exceeds 1 s beyond the error', () => {
  // Live case: drift -1.6 s measured with a 3564 ms round trip (error ±1782 ms) proves nothing.
  it('drift -1600 with ±1782 error -> no APP_CLOCK_SKEW, drift still reported', async () => {
    const { client } = setup();
    const reads = [SERVER_MS - 3382, SERVER_MS + 182];
    const s = await sessionStatus(client, () => reads.shift() ?? SERVER_MS);
    expect(s.computed.clockDriftMs).toBe(-1600);
    expect(codes(s.problems)).not.toContain('APP_CLOCK_SKEW');
  });

  it('drift +2500 with ±1000 error -> APP_CLOCK_SKEW (at least 1.5 s ahead)', async () => {
    const { client } = setup();
    const reads = [SERVER_MS + 1500, SERVER_MS + 3500];
    const s = await sessionStatus(client, () => reads.shift() ?? SERVER_MS);
    expect(s.computed.clockDriftMs).toBe(2500);
    expect(codes(s.problems)).toContain('APP_CLOCK_SKEW');
  });
});

describe('untrusted certificate is not swallowed: the CLI must see it to relaunch with --use-system-ca', () => {
  const certFailure = (): Response => {
    throw new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'SELF_SIGNED_CERT_IN_CHAIN' }) });
  };

  it('certificate failure on the time request -> sessionStatus rejects with APP_TLS_UNTRUSTED', async () => {
    const err = await status({ '/v5/market/time': certFailure }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('APP_TLS_UNTRUSTED');
  });

  it('other connection failures still become a problem, not a throw', async () => {
    const refused = (): Response => {
      throw new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) });
    };
    const { status: s } = await status({ '/v5/market/time': refused, '/v5/user/query-api': refused, '/v5/account/info': refused });
    expect(s.connectivity.ok).toBe(false);
    expect(codes(s.problems)).toContain('APP_UNAVAILABLE');
  });
});
