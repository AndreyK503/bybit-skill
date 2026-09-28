import { AppError } from './errors.js';

/** Context of a failed request: endpoint path and rate-limit reset time if the exchange sent it. */
export interface ErrorContext {
  path: string;
  resetTimestamp?: number;
}

/** Error factories by kind (plan section 8). Codes and messages carry no credentials (D-10). */
const KIND = {
  keyRejected: () =>
    new AppError({
      code: 'APP_KEY_REJECTED',
      userMessage:
        'Биржа не приняла ключ API: он неверный, отозван или истёк, либо секрет не соответствует ключу. ' +
        'Проверьте BYBIT_API_KEY и BYBIT_API_SECRET или пересоздайте ключ только на чтение.',
    }),
  ipMismatch: () =>
    new AppError({
      code: 'APP_KEY_IP_MISMATCH',
      userMessage: 'Ключ API привязан к другим IP-адресам. Добавьте текущий IP в настройках ключа на Bybit или снимите привязку.',
    }),
  permissionDenied: (path: string) =>
    new AppError({
      code: 'APP_PERMISSION_DENIED',
      userMessage:
        `У ключа API нет права на запрос ${path}. Биржа не сообщает, какое право нужно: ` +
        'сверьте права ключа (session status) с разделом данных и добавьте нужное право на чтение.',
    }),
  regionBlocked: () =>
    new AppError({
      code: 'APP_REGION_BLOCKED',
      userMessage: 'Биржа не обслуживает запросы с этого адреса: доступ ограничен для вашего региона (в том числе США и материковый Китай).',
    }),
  rateLimit: (resetTimestamp?: number) =>
    new AppError({
      code: 'APP_RATE_LIMIT',
      userMessage:
        'Лимит запросов к бирже исчерпан. ' +
        (resetTimestamp === undefined
          ? 'Повторите запрос позже.'
          : `Лимит освободится в ${new Date(resetTimestamp).toISOString()}.`),
    }),
  unavailable: (details: unknown) =>
    new AppError({
      code: 'APP_UNAVAILABLE',
      userMessage: 'Временный отказ биржи. Повторите запрос позже.',
      details,
    }),
};

/** Translate a non-zero Bybit retCode into an AppError with cause and action (plan section 8). */
export function mapRetCode(retCode: number, retMsg: string, ctx: ErrorContext): AppError {
  switch (retCode) {
    case 10003:
    case 10004:
    case 33004:
      return KIND.keyRejected();
    case 10010:
      return KIND.ipMismatch();
    case 10005:
      return KIND.permissionDenied(ctx.path);
    case 10009:
    case 10024:
      return KIND.regionBlocked();
    case 10006:
      return KIND.rateLimit(ctx.resetTimestamp);
    case 10000:
    case 10016:
      return KIND.unavailable({ path: ctx.path, retCode });
    default:
      return new AppError({
        code: 'APP_BYBIT_ERROR',
        userMessage: `Биржа отклонила запрос ${ctx.path}: код ${retCode}, «${retMsg}».`,
        details: { path: ctx.path, retCode },
      });
  }
}

/** Translate a non-2xx HTTP status into an AppError (docs /v5/error, HTTP Code). */
export function mapHttpStatus(status: number, ctx: ErrorContext): AppError {
  if (status === 401) return KIND.keyRejected();
  if (status === 429) return KIND.rateLimit(ctx.resetTimestamp);
  if (status === 403) {
    return new AppError({
      code: 'APP_REGION_BLOCKED',
      userMessage:
        'Биржа отказала в доступе (HTTP 403). Возможные причины: запрос из региона, который Bybit не обслуживает ' +
        '(США, материковый Китай), или превышен лимит запросов с этого IP — тогда подождите не меньше 10 минут.',
      details: { path: ctx.path, status },
    });
  }
  if (status >= 500) return KIND.unavailable({ path: ctx.path, status });
  return new AppError({
    code: 'APP_BYBIT_ERROR',
    userMessage: `Биржа отклонила запрос ${ctx.path}: HTTP ${status}.`,
    details: { path: ctx.path, status },
  });
}

/** Drift as signed seconds with one decimal, e.g. "+2.0 с" (local clock ahead of the exchange). */
export function formatDrift(driftMs: number): string {
  return `${driftMs >= 0 ? '+' : '-'}${(Math.abs(driftMs) / 1000).toFixed(1)} с`;
}

/** Clock skew error (D-3); without exchange time the drift is not guessed (NFR-3). */
export function clockSkewError(driftMs: number | null): AppError {
  const measured =
    driftMs === null
      ? 'Время биржи получить не удалось, величину расхождения назвать нельзя.'
      : `Локальное время расходится с биржей на ${formatDrift(driftMs)}.`;
  return new AppError({
    code: 'APP_CLOCK_SKEW',
    userMessage: `Биржа отвергла запрос из-за расхождения системных часов, и подпись по времени биржи не помогла. ${measured} Синхронизируйте часы (NTP).`,
    details: { driftMs },
  });
}
