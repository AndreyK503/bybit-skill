import { AppError } from './errors.js';

/** Context of a failed request: endpoint path and rate-limit reset time if the exchange sent it. */
export interface ErrorContext {
  path: string;
  resetTimestamp?: number;
}

/** Translate a non-zero Bybit retCode into an AppError with cause and action (plan section 8). */
export function mapRetCode(retCode: number, retMsg: string, ctx: ErrorContext): AppError {
  throw new Error(`not implemented: ${retCode} ${retMsg} ${ctx.path}`);
}

/** Translate a non-2xx HTTP status into an AppError (docs /v5/error, HTTP Code). */
export function mapHttpStatus(status: number, ctx: ErrorContext): AppError {
  throw new Error(`not implemented: ${status} ${ctx.path}`);
}
