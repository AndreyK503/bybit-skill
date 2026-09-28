import type { BybitClient } from '../api/client.js';
import { formatDrift } from '../api/error-map.js';
import { AppError } from '../api/errors.js';
import { CLOCK_SKEW_WARN_MS, RECV_WINDOW_MS, keyMissingError } from '../config/config.js';

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

/** Subset of /v5/user/query-api result used here; apiKey is only ever masked. */
interface ApiKeyInfo extends Omit<KeyView, 'masked'> {
  apiKey: string;
}

interface AccountInfo {
  unifiedMarginStatus: number;
  marginMode: string;
}

/** unifiedMarginStatus values of a unified trading account (docs /v5/enum). */
const UTA_STATUSES = [3, 4, 5, 6];

/** Mask an API key down to its last 4 characters (D-10). */
export function maskKey(apiKey: string): string {
  return `****${apiKey.slice(-4)}`;
}

function notReadOnlyError(): AppError {
  return new AppError({
    code: 'APP_KEY_NOT_READONLY',
    userMessage:
      'Ключ API имеет права на изменение счёта. Скилл работает только с ключом только на чтение: ' +
      'создайте на Bybit ключ Read-Only и замените им текущий.',
  });
}

/** Fail with APP_KEY_NOT_READONLY unless the key is read-only (decision R1). Used by data commands. */
export async function requireReadOnlyKey(client: BybitClient): Promise<void> {
  const info = await client.getPrivate<ApiKeyInfo>('/v5/user/query-api');
  if (info.readOnly !== 1) throw notReadOnlyError();
}

/** Run fn; an AppError becomes a problem and the value is null. */
async function capture<T>(fn: () => Promise<T>, problems: Problem[]): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    // Untrusted certificate is rethrown: the CLI relaunches with the system certificate store.
    if (!(err instanceof AppError) || err.code === 'APP_TLS_UNTRUSTED') throw err;
    if (!problems.some((p) => p.code === err.code)) problems.push({ code: err.code, message: err.userMessage });
    return null;
  }
}

function toKeyView(info: ApiKeyInfo): KeyView {
  return {
    masked: maskKey(info.apiKey),
    note: info.note,
    readOnly: info.readOnly,
    permissions: info.permissions,
    ips: info.ips,
    type: info.type,
    expiredAt: info.expiredAt,
    deadlineDay: info.deadlineDay,
    uta: info.uta,
    isMaster: info.isMaster,
  };
}

function driftNote(driftMs: number | null, rttMs: number, error: string | null): string {
  if (driftMs === null) return `Время биржи недоступно, расхождение не вычислено: ${error ?? 'нет ответа'}`;
  return (
    'Локальное время в середине запроса минус время биржи (/v5/market/time, timeNano), мс. ' +
    `Положительное — локальные часы спешат. Погрешность ±${rttMs / 2} мс (половина времени ответа ${rttMs} мс).`
  );
}

/**
 * Bybit accepts timestamps in [server - recvWindow, server + 1000): the window is asymmetric.
 * The client signs by exchange time after a rejection (D-3 revised), so the drift is a warning.
 */
function clockSkewMessage(driftMs: number): string {
  const drift = `Локальное время расходится с биржей на ${formatDrift(driftMs)}`;
  const corrected = 'Скилл подписывает запросы по времени биржи, работа не нарушена; при возможности синхронизируйте часы (NTP).';
  if (driftMs > 0) return `${drift}: часы спешат, биржа отвергает подписанные запросы при опережении больше 1 с. ${corrected}`;
  if (-driftMs >= RECV_WINDOW_MS) {
    return `${drift}: часы отстают больше окна ${RECV_WINDOW_MS / 1000} с, биржа отвергает подписанные запросы. ${corrected}`;
  }
  return `${drift}: часы отстают; пока это в пределах окна ${RECV_WINDOW_MS / 1000} с и запросы проходят. Синхронизируйте часы (NTP).`;
}

function unifiedNote(isUnified: boolean | null): string {
  if (isUnified === null) return 'Режим счёта не получен, признак UTA не вычислен.';
  return 'По unifiedMarginStatus из /v5/account/info: 3–6 — единый торговый счёт (UTA), 1 — классический (docs /v5/enum).';
}

/** Collect access state (FR-1). Never throws on exchange errors: they become problems. */
export async function sessionStatus(client: BybitClient, now: () => number): Promise<SessionStatus> {
  const problems: Problem[] = [];
  let serverTimeMs: number | null = null;
  let connError: string | null = null;
  let driftMs: number | null = null;
  let rttMs = 0;
  try {
    const before = now();
    serverTimeMs = await client.getServerTimeMs();
    const after = now();
    driftMs = (before + after) / 2 - serverTimeMs;
    rttMs = after - before;
  } catch (err) {
    // Untrusted certificate is rethrown: the CLI relaunches with the system certificate store.
    if (!(err instanceof AppError) || err.code === 'APP_TLS_UNTRUSTED') throw err;
    connError = err.userMessage;
  }
  // Only a drift that exceeds the threshold beyond the measurement error is reported (NFR-3).
  if (driftMs !== null && Math.abs(driftMs) - rttMs / 2 > CLOCK_SKEW_WARN_MS) {
    problems.push({ code: 'APP_CLOCK_SKEW', message: clockSkewMessage(driftMs) });
  }

  let key: KeyView | null = null;
  let account: AccountInfo | null = null;
  if (!client.hasCredentials) {
    const err = keyMissingError();
    problems.push({ code: err.code, message: err.userMessage });
  } else {
    const info = await capture(() => client.getPrivate<ApiKeyInfo>('/v5/user/query-api'), problems);
    key = info && toKeyView(info);
    const acc = await capture(() => client.getPrivate<AccountInfo>('/v5/account/info'), problems);
    account = acc && { unifiedMarginStatus: acc.unifiedMarginStatus, marginMode: acc.marginMode };
  }

  const isUnified = account ? UTA_STATUSES.includes(account.unifiedMarginStatus) : null;
  if (key && key.readOnly !== 1) {
    const err = notReadOnlyError();
    problems.push({ code: err.code, message: err.userMessage });
  }
  if (isUnified === false) {
    problems.push({
      code: 'APP_ACCOUNT_NOT_UTA',
      message: 'Счёт не единый торговый (UTA). Опционы и данные скилла доступны только на UTA: переведите счёт в UTA на Bybit.',
    });
  }

  return {
    configured: client.hasCredentials,
    environment: { baseUrl: client.baseUrl, network: 'mainnet' },
    connectivity: { ok: serverTimeMs !== null, serverTimeMs, error: connError },
    key,
    account,
    computed: { clockDriftMs: driftMs, isUnified },
    computedNotes: { clockDriftMs: driftNote(driftMs, rttMs, connError), isUnified: unifiedNote(isUnified) },
    problems,
  };
}

function permissionsLine(permissions: Record<string, string[]>): string {
  const granted = Object.entries(permissions).filter(([, list]) => list.length > 0);
  return granted.length === 0 ? 'нет' : granted.map(([group, list]) => `${group}: ${list.join(', ')}`).join('; ');
}

/** Human-readable rendering; computed values are marked. */
export function renderSessionStatus(s: SessionStatus): string {
  const lines: string[] = [];
  if (s.key) {
    lines.push(`Ключ:        ${s.key.masked} «${s.key.note}», только чтение: ${s.key.readOnly === 1 ? 'да' : 'НЕТ'}`);
    lines.push(`Права:       ${permissionsLine(s.key.permissions)}`);
    lines.push(`IP:          ${s.key.ips.length === 0 ? 'без привязки' : s.key.ips.join(', ')}`);
    lines.push(`Срок:        expiredAt ${s.key.expiredAt}, deadlineDay ${s.key.deadlineDay}`);
  } else {
    lines.push(`Ключ:        ${s.configured ? 'настроен, данные о ключе не получены' : 'не настроен'}`);
  }
  lines.push(`Окружение:   ${s.environment.network}, ${s.environment.baseUrl}`);
  lines.push(
    `Связь:       ${s.connectivity.ok ? `есть, время биржи ${new Date(s.connectivity.serverTimeMs ?? 0).toISOString()}` : `нет — ${s.connectivity.error}`}`,
  );
  if (s.account) lines.push(`Счёт:        unifiedMarginStatus ${s.account.unifiedMarginStatus}, ${s.account.marginMode}`);
  const uta = s.computed.isUnified === null ? '—' : s.computed.isUnified ? 'да' : 'нет';
  const drift = s.computed.clockDriftMs === null ? '—' : formatDrift(s.computed.clockDriftMs);
  lines.push(`UTA:         ${uta} [расчёт]`);
  lines.push(`Часы:        ${drift} [расчёт]`);
  lines.push('', s.problems.length === 0 ? 'Проблем нет.' : 'Проблемы:');
  for (const p of s.problems) lines.push(`- ${p.message} [${p.code}]`);
  lines.push('', '[расчёт] — вычислено скиллом:', `- UTA: ${s.computedNotes.isUnified}`, `- Часы: ${s.computedNotes.clockDriftMs}`);
  return lines.join('\n');
}
