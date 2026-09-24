import type { BybitClient } from '../api/client.js';
import { AppError } from '../api/errors.js';

export interface Problem {
  code: string;
  message: string;
}

export interface KeyView {
  masked: string;
  note: string;
  readOnly: number;
  permissions: Record<string, string[]>;
  ips: string[];
  type: number;
  expiredAt: string;
  deadlineDay: number;
  uta: number;
  isMaster: boolean;
}

export interface SessionStatus {
  configured: boolean;
  environment: { baseUrl: string; network: 'mainnet' };
  connectivity: { ok: boolean; serverTimeMs: number | null; error: string | null };
  key: KeyView | null;
  account: { unifiedMarginStatus: number; marginMode: string } | null;
  computed: { clockDriftMs: number | null; isUnified: boolean | null };
  computedNotes: { clockDriftMs: string; isUnified: string };
  problems: Problem[];
}

/** Mask an API key down to its last 4 characters (D-10). */
export function maskKey(apiKey: string): string {
  throw new Error(`not implemented: ${apiKey.length}`);
}

/** Collect access state (FR-1). Never throws on exchange errors: they become problems. */
export async function sessionStatus(client: BybitClient, now: () => number): Promise<SessionStatus> {
  throw new Error(`not implemented: ${client.baseUrl} ${now()}`);
}

/** Fail with APP_KEY_NOT_READONLY unless the key is read-only (decision R1). Used by data commands. */
export async function requireReadOnlyKey(client: BybitClient): Promise<void> {
  throw new AppError({ code: 'NOT_IMPLEMENTED', userMessage: client.baseUrl });
}

/** Human-readable rendering; computed values are marked. */
export function renderSessionStatus(status: SessionStatus): string {
  throw new Error(`not implemented: ${status.configured}`);
}
