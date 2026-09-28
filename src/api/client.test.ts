import { describe, expect, it } from 'vitest';
import { ACCOUNT_INFO, MARKET_TIME, QUERY_API, errorEnvelope } from '../fixtures/bybit-v5-access.js';
import { BybitClient } from './client.js';
import { AppError } from './errors.js';
import { sign, signPayload } from './sign.js';

/**
 * Fixtures: src/fixtures/bybit-v5-access.ts (docs examples). Network is mocked through fetchFn.
 * Sign reference (openssl, see sign.test.ts) for the docs GET example.
 */
const OPENSSL_SIGN = 'e9d95f93790258d5680772d879abb9df2571ae26d3edb5f36973f9757eef3a16';
const DOC_CREDS = { apiKey: 'XXXXXXXXXX', apiSecret: 'test-secret-not-real' };
const LEAK_CREDS = { apiKey: 'LEAKKEY123456', apiSecret: 'LEAKSECRET987654' };
const BASE = 'https://api.bybit.com';

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

function mockFetch(handler: (url: URL) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return handler(new URL(String(input)));
  }) as typeof fetch;
  return { fn, calls };
}

function client(fetchFn: typeof fetch, now = 1658384314791) {
  return new BybitClient({ credentials: DOC_CREDS, baseUrl: BASE, fetchFn, now: () => now });
}

async function rejection(p: Promise<unknown>): Promise<AppError> {
  try {
    await p;
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error('expected AppError');
}

function header(call: Call | undefined, name: string): string | null {
  return new Headers(call?.init?.headers).get(name);
}

describe('BybitClient signed GET', () => {
  it('sends the signature headers', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(ACCOUNT_INFO));
    await client(fn).getPrivate('/v5/market/tickers', { category: 'option', symbol: 'BTC-29JUL22-25000-C' });
    expect(calls[0]?.url).toBe(`${BASE}/v5/market/tickers?category=option&symbol=BTC-29JUL22-25000-C`);
    expect(header(calls[0], 'X-BAPI-API-KEY')).toBe('XXXXXXXXXX');
    expect(header(calls[0], 'X-BAPI-TIMESTAMP')).toBe('1658384314791');
    expect(header(calls[0], 'X-BAPI-RECV-WINDOW')).toBe('5000');
    expect(header(calls[0], 'X-BAPI-SIGN')).toBe(OPENSSL_SIGN);
  });

  it('signs exactly the query string that is sent', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(ACCOUNT_INFO));
    await client(fn).getPrivate('/v5/account/transaction-log', { coin: 'USDT', note: 'a b&c=d/é' });
    const sent = new URL(calls[0]?.url ?? '').search.slice(1);
    expect(header(calls[0], 'X-BAPI-SIGN')).toBe(
      sign(signPayload('1658384314791', DOC_CREDS.apiKey, '5000', sent), DOC_CREDS.apiSecret),
    );
  });

  it('without credentials fails with APP_KEY_MISSING and sends nothing', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(QUERY_API));
    const err = await rejection(new BybitClient({ baseUrl: BASE, fetchFn: fn }).getPrivate('/v5/user/query-api'));
    expect(err.code).toBe('APP_KEY_MISSING');
    expect(calls).toHaveLength(0);
  });
});

describe('BybitClient public GET', () => {
  it('sends no signature headers', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(MARKET_TIME));
    await client(fn).getPublic('/v5/market/time');
    expect(calls[0]?.url).toBe(`${BASE}/v5/market/time`);
    for (const h of ['X-BAPI-API-KEY', 'X-BAPI-SIGN', 'X-BAPI-TIMESTAMP', 'X-BAPI-RECV-WINDOW']) {
      expect(header(calls[0], h)).toBeNull();
    }
  });
});

describe('BybitClient uses GET only (D-1)', () => {
  it('public and private requests have no method other than GET and no body', async () => {
    const { fn, calls } = mockFetch(() => jsonResponse(ACCOUNT_INFO));
    const c = client(fn);
    await c.getPublic('/v5/market/time', { a: '1' });
    await c.getPrivate('/v5/account/info', { a: '1' });
    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.init?.method ?? 'GET').toBe('GET');
      expect(call.init?.body).toBeUndefined();
    }
  });
});

describe('BybitClient envelope', () => {
  it('returns result when retMsg is empty (query-api example)', async () => {
    const { fn } = mockFetch(() => jsonResponse(QUERY_API));
    expect(await client(fn).getPrivate('/v5/user/query-api')).toEqual(QUERY_API.result);
  });

  it('returns result when retExtInfo and time are absent (account/info example)', async () => {
    const { fn } = mockFetch(() => jsonResponse(ACCOUNT_INFO));
    expect(await client(fn).getPrivate('/v5/account/info')).toEqual(ACCOUNT_INFO.result);
  });

  it('non-zero retCode on HTTP 200 becomes a mapped AppError with the path', async () => {
    const { fn } = mockFetch(() => jsonResponse(errorEnvelope(10005)));
    const err = await rejection(client(fn).getPrivate('/v5/account/wallet-balance'));
    expect(err.code).toBe('APP_PERMISSION_DENIED');
    expect(err.userMessage).toContain('/v5/account/wallet-balance');
  });

  it('10006 passes X-Bapi-Limit-Reset-Timestamp into the message', async () => {
    const { fn } = mockFetch(() =>
      jsonResponse(errorEnvelope(10006), 200, { 'X-Bapi-Limit-Reset-Timestamp': '1672738134824' }),
    );
    const err = await rejection(client(fn).getPrivate('/v5/account/info'));
    expect(err.code).toBe('APP_RATE_LIMIT');
    expect(err.userMessage).toContain('2023-01-03T09:28:54.824Z');
  });
});

describe('BybitClient clock skew (D-3, criterion 2)', () => {
  it('10002 -> APP_CLOCK_SKEW naming the drift from /v5/market/time', async () => {
    // Local 1688639405423 ms; server timeNano 1688639403423213947 -> 1688639403423 ms; drift +2000 ms.
    const { fn } = mockFetch((url) =>
      url.pathname === '/v5/market/time' ? jsonResponse(MARKET_TIME) : jsonResponse(errorEnvelope(10002)),
    );
    const err = await rejection(client(fn, 1688639405423).getPrivate('/v5/account/info'));
    expect(err.code).toBe('APP_CLOCK_SKEW');
    expect(err.userMessage).toContain('2.0 с');
  });

  it('10002 with exchange time unavailable -> APP_CLOCK_SKEW without an invented number', async () => {
    const { fn } = mockFetch((url) =>
      url.pathname === '/v5/market/time' ? new Response('<html>', { status: 502 }) : jsonResponse(errorEnvelope(10002)),
    );
    const err = await rejection(client(fn, 1688639405423).getPrivate('/v5/account/info'));
    expect(err.code).toBe('APP_CLOCK_SKEW');
    expect(err.userMessage).not.toMatch(/\d+\.\d с/);
  });
});

describe('BybitClient signs by exchange time after 10002 (D-3 revised 2026-09-28)', () => {
  // Local 1688639405423; server 1688639403423 (MARKET_TIME); drift +2000 ms, round trip 0.
  // Corrected timestamp aims 1 s behind the exchange: 1688639405423 - 2000 - 1000 = 1688639402423.
  const LOCAL = 1688639405423;
  const CORRECTED = '1688639402423';

  /** Private endpoint answers 10002 until the timestamp is corrected. */
  function skewedExchange() {
    return mockFetch((url) => {
      if (url.pathname === '/v5/market/time') return jsonResponse(MARKET_TIME);
      return jsonResponse(ACCOUNT_INFO);
    });
  }

  it('10002 once -> measures drift, retries once with the corrected timestamp and succeeds', async () => {
    let privateCalls = 0;
    const { fn, calls } = mockFetch((url) => {
      if (url.pathname === '/v5/market/time') return jsonResponse(MARKET_TIME);
      privateCalls += 1;
      return jsonResponse(privateCalls === 1 ? errorEnvelope(10002) : ACCOUNT_INFO);
    });
    expect(await client(fn, LOCAL).getPrivate('/v5/account/info', { a: '1' })).toEqual(ACCOUNT_INFO.result);
    expect(calls.map((c) => new URL(c.url).pathname)).toEqual(['/v5/account/info', '/v5/market/time', '/v5/account/info']);
    expect(header(calls[2], 'X-BAPI-TIMESTAMP')).toBe(CORRECTED);
    expect(header(calls[2], 'X-BAPI-SIGN')).toBe(sign(signPayload(CORRECTED, DOC_CREDS.apiKey, '5000', 'a=1'), DOC_CREDS.apiSecret));
  });

  it('keeps the correction: the next signed request goes straight with the exchange time', async () => {
    let first = true;
    const { fn, calls } = mockFetch((url) => {
      if (url.pathname === '/v5/market/time') return jsonResponse(MARKET_TIME);
      const reply = first ? errorEnvelope(10002) : ACCOUNT_INFO;
      first = false;
      return jsonResponse(reply);
    });
    const c = client(fn, LOCAL);
    await c.getPrivate('/v5/account/info');
    calls.length = 0;
    await c.getPrivate('/v5/account/info');
    expect(calls).toHaveLength(1);
    expect(header(calls[0], 'X-BAPI-TIMESTAMP')).toBe(CORRECTED);
  });

  it('no 10002 -> local time is used as is, no extra time request', async () => {
    const { fn, calls } = skewedExchange();
    await client(fn, LOCAL).getPrivate('/v5/account/info');
    expect(calls).toHaveLength(1);
    expect(header(calls[0], 'X-BAPI-TIMESTAMP')).toBe(String(LOCAL));
  });
});

describe('BybitClient untrusted certificate (corporate TLS interception)', () => {
  const certFailure = () => Promise.reject(new TypeError('fetch failed', { cause: Object.assign(new Error('self-signed certificate in certificate chain'), { code: 'SELF_SIGNED_CERT_IN_CHAIN' }) }));

  it.each(['SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'DEPTH_ZERO_SELF_SIGNED_CERT'])(
    '%s -> APP_TLS_UNTRUSTED naming --use-system-ca, one request only',
    async (code) => {
      const failure = () => Promise.reject(new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code }) }));
      const { fn, calls } = mockFetch(failure);
      const err = await rejection(client(fn).getPublic('/v5/market/time'));
      expect(err.code).toBe('APP_TLS_UNTRUSTED');
      expect(err.userMessage).toContain('--use-system-ca');
      expect(calls).toHaveLength(1);
    },
  );

  it('the fixture shape matches Node: cause carries the code', async () => {
    const { fn } = mockFetch(certFailure);
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_TLS_UNTRUSTED');
  });

  it('other network failures stay APP_UNAVAILABLE', async () => {
    const { fn } = mockFetch(() => Promise.reject(new TypeError('fetch failed', { cause: Object.assign(new Error('x'), { code: 'ECONNREFUSED' }) })));
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_UNAVAILABLE');
  });
});

describe('BybitClient transport failures', () => {
  it('HTTP 403 with an HTML body -> APP_REGION_BLOCKED', async () => {
    const { fn } = mockFetch(() => new Response('<html>403 Forbidden</html>', { status: 403 }));
    expect((await rejection(client(fn).getPrivate('/v5/account/info'))).code).toBe('APP_REGION_BLOCKED');
  });

  it('HTTP 502 with an HTML body -> APP_UNAVAILABLE', async () => {
    const { fn } = mockFetch(() => new Response('<html>Bad Gateway</html>', { status: 502 }));
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_UNAVAILABLE');
  });

  it('HTTP 200 with a non-JSON body -> APP_UNAVAILABLE', async () => {
    const { fn } = mockFetch(() => new Response('<html>captive portal</html>', { status: 200 }));
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_UNAVAILABLE');
  });

  it('network failure -> APP_UNAVAILABLE', async () => {
    const { fn } = mockFetch(() => Promise.reject(new TypeError('fetch failed')));
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_UNAVAILABLE');
  });

  it('timeout -> APP_UNAVAILABLE', async () => {
    const { fn } = mockFetch(() => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError')));
    expect((await rejection(client(fn).getPublic('/v5/market/time'))).code).toBe('APP_UNAVAILABLE');
  });
});

describe('BybitClient never leaks key or secret in errors (D-10)', () => {
  const scenarios: [string, (url: URL) => Response | Promise<Response>][] = [
    ['retCode 10003', () => jsonResponse(errorEnvelope(10003))],
    ['retCode 10005', () => jsonResponse(errorEnvelope(10005))],
    ['retCode 10002', (url) => (url.pathname === '/v5/market/time' ? jsonResponse(MARKET_TIME) : jsonResponse(errorEnvelope(10002)))],
    ['retCode 10006', () => jsonResponse(errorEnvelope(10006))],
    ['unknown retCode', () => jsonResponse({ retCode: 170131, retMsg: 'x', result: {} })],
    ['HTTP 403', () => new Response('<html>', { status: 403 })],
    ['HTTP 502', () => new Response('<html>', { status: 502 })],
    ['non-JSON', () => new Response('<html>', { status: 200 })],
    ['network', () => Promise.reject(new TypeError('fetch failed'))],
    ['timeout', () => Promise.reject(new DOMException('timed out', 'TimeoutError'))],
  ];

  it.each(scenarios)('%s', async (_name, handler) => {
    const { fn } = mockFetch(handler);
    const c = new BybitClient({ credentials: LEAK_CREDS, baseUrl: BASE, fetchFn: fn, now: () => 1688639405423 });
    const err = await rejection(c.getPrivate('/v5/account/info', { coin: 'USDT' }));
    const text = [err.message, err.userMessage, JSON.stringify(err.details ?? null), String(err.cause), err.stack].join('\n');
    expect(text).not.toContain(LEAK_CREDS.apiKey);
    expect(text).not.toContain(LEAK_CREDS.apiSecret);
  });
});

describe('review fixes: fetch errors never carry the key (D-10)', () => {
  it('invalid header value error mentioning the key is not kept as cause', async () => {
    // Node fetch message shape for a bad header value, reproduced on Node 24 by the reviewer.
    const { fn } = mockFetch(() => Promise.reject(new TypeError(`Headers.append: "${LEAK_CREDS.apiKey}" is an invalid header value.`)));
    const c = new BybitClient({ credentials: LEAK_CREDS, baseUrl: BASE, fetchFn: fn, now: () => 0 });
    const err = await rejection(c.getPrivate('/v5/account/info'));
    const text = [err.message, JSON.stringify(err.details ?? null), String(err.cause), (err.cause as Error | undefined)?.stack].join('\n');
    expect(text).not.toContain(LEAK_CREDS.apiKey);
  });
});
