import type { Credentials } from '../config/config.js';

export interface ClientOptions {
  credentials?: Credentials;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

/** Bybit V5 REST client. GET only (D-1): no method here can send a body or another verb. */
export class BybitClient {
  readonly baseUrl: string;
  readonly hasCredentials: boolean;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl ?? '';
    this.hasCredentials = options.credentials !== undefined;
  }

  /** Unsigned GET; returns `result` of the envelope. */
  getPublic<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    throw new Error(`not implemented: ${path} ${Object.keys(params).length}`);
  }

  /** Signed GET; returns `result` of the envelope. */
  getPrivate<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    throw new Error(`not implemented: ${path} ${Object.keys(params).length}`);
  }
}
