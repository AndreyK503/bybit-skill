import { RECV_WINDOW_MS, REQUEST_TIMEOUT_MS, keyMissingError, type Credentials } from '../config/config.js';
import { clockSkewError, mapHttpStatus, mapRetCode } from './error-map.js';
import { AppError } from './errors.js';
import { sign, signPayload } from './sign.js';

export interface ClientOptions {
  credentials?: Credentials;
  baseUrl: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

interface Envelope {
  retCode: number;
  retMsg: string;
  result: unknown;
}

interface ServerTime {
  timeSecond: string;
  timeNano: string;
}

/** Bybit V5 REST client. GET only (D-1): no method here can send a body or another verb. */
export class BybitClient {
  readonly baseUrl: string;
  readonly hasCredentials: boolean;
  private readonly credentials?: Credentials;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  /** Added to local time when signing; set once after a 10002. */
  private clockCorrectionMs = 0;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl;
    this.credentials = options.credentials;
    this.hasCredentials = options.credentials !== undefined;
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  }

  /** Unsigned GET; returns `result` of the envelope. */
  getPublic<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    return this.request<T>(path, new URLSearchParams(params).toString(), {});
  }

  /**
   * Signed GET; returns `result` of the envelope.
   * On 10002 (clock drift) measures the drift, then signs by exchange time for the rest of the
   * process and retries once (D-3 revised 2026-09-28); still rejected or no exchange time: APP_CLOCK_SKEW.
   */
  async getPrivate<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.credentials) throw keyMissingError();
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request<T>(path, query, this.signedHeaders(query));
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'APP_CLOCK_SKEW')) throw err;
      const drift = await this.driftOrNull();
      if (drift === null || this.clockCorrectionMs !== 0) throw clockSkewError(drift);
      this.clockCorrectionMs = -drift - CLOCK_CORRECTION_MARGIN_MS;
      try {
        return await this.request<T>(path, query, this.signedHeaders(query));
      } catch (retryErr) {
        if (retryErr instanceof AppError && retryErr.code === 'APP_CLOCK_SKEW') throw clockSkewError(drift);
        throw retryErr;
      }
    }
  }

  private signedHeaders(query: string): Record<string, string> {
    const { apiKey, apiSecret } = this.credentials!;
    const timestamp = String(Math.round(this.now() + this.clockCorrectionMs));
    const recvWindow = String(RECV_WINDOW_MS);
    return {
      'X-BAPI-API-KEY': apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': recvWindow,
      'X-BAPI-SIGN': sign(signPayload(timestamp, apiKey, recvWindow, query), apiSecret),
    };
  }

  /** Exchange time in ms from /v5/market/time (timeNano / 1e6). */
  async getServerTimeMs(): Promise<number> {
    const t = await this.getPublic<ServerTime>('/v5/market/time');
    return Number(BigInt(t.timeNano) / 1_000_000n);
  }

  /**
   * Local minus exchange time, measured from the request midpoint.
   * Error is at most half the round trip (rttMs / 2).
   */
  private async measureDrift(): Promise<{ driftMs: number; rttMs: number }> {
    const before = this.now();
    const server = await this.getServerTimeMs();
    const after = this.now();
    return { driftMs: (before + after) / 2 - server, rttMs: after - before };
  }

  private async driftOrNull(): Promise<number | null> {
    try {
      return (await this.measureDrift()).driftMs;
    } catch {
      return null;
    }
  }

  private async request<T>(path: string, query: string, headers: Record<string, string>): Promise<T> {
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    let response: Response;
    try {
      response = await this.fetchFn(url, { headers, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (cause) {
      if (isUntrustedCertificate(cause)) throw tlsUntrustedError(path);
      const reason = cause instanceof DOMException && cause.name === 'TimeoutError' ? 'timeout' : 'network';
      throw new AppError({
        code: 'APP_UNAVAILABLE',
        userMessage: `Биржа недоступна (${reason === 'timeout' ? 'нет ответа за отведённое время' : 'нет соединения'}). Повторите запрос позже.`,
        // The fetch error itself is not kept: its message may echo a header value, i.e. the key (D-10).
        details: { path, reason, error: cause instanceof Error ? cause.name : typeof cause },
      });
    }
    const reset = response.headers.get('X-Bapi-Limit-Reset-Timestamp');
    const ctx = { path, resetTimestamp: reset === null ? undefined : Number(reset) };
    if (!response.ok) throw mapHttpStatus(response.status, ctx);
    const envelope = await parseEnvelope(response, path);
    if (envelope.retCode === 10002) throw clockSkewError(null);
    if (envelope.retCode !== 0) throw mapRetCode(envelope.retCode, envelope.retMsg, ctx);
    return envelope.result as T;
  }
}

/**
 * Bybit accepts timestamps in [server - recvWindow, server + 1000): after a correction the
 * timestamp aims 1 s behind the exchange, so the drift measurement error (half the round trip)
 * does not push it ahead.
 */
const CLOCK_CORRECTION_MARGIN_MS = 1000;

/** OpenSSL codes of a chain Node's bundled CAs do not trust: typical of TLS interception by a proxy. */
const UNTRUSTED_CERT_CODES = new Set([
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'UNABLE_TO_GET_ISSUER_CERT',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_UNTRUSTED',
]);

/** Node fetch fails with TypeError('fetch failed') and the TLS error with `code` in `cause`. */
function isUntrustedCertificate(err: unknown): boolean {
  const code = err instanceof Error && err.cause instanceof Error ? (err.cause as Error & { code?: unknown }).code : undefined;
  return typeof code === 'string' && UNTRUSTED_CERT_CODES.has(code);
}

function tlsUntrustedError(path: string): AppError {
  return new AppError({
    code: 'APP_TLS_UNTRUSTED',
    userMessage:
      'Node не доверяет сертификату, которым представился сервер биржи: сеть подменяет сертификаты (корпоративный прокси или антивирус). ' +
      'CLI сам повторяет запуск с системным хранилищем сертификатов (node --use-system-ca, Node 22.15+). ' +
      'Если ошибка осталась: обновите Node или задайте NODE_EXTRA_CA_CERTS=<путь к корневому сертификату прокси>.',
    details: { path },
  });
}

async function parseEnvelope(response: Response, path: string): Promise<Envelope> {
  try {
    return (await response.json()) as Envelope;
  } catch (cause) {
    throw new AppError({
      code: 'APP_UNAVAILABLE',
      userMessage: 'Биржа вернула ответ в неожиданном формате (не JSON). Повторите запрос позже.',
      details: { path, status: response.status },
      cause,
    });
  }
}
