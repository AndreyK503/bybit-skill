/**
 * Application error with a stable code and a user-facing message in Russian.
 * Taken from the t-invest reference. details and cause never carry the key or secret (D-10).
 */
export class AppError extends Error {
  readonly code: string;
  readonly userMessage: string;
  readonly details?: unknown;

  constructor(params: { code: string; userMessage: string; details?: unknown; cause?: unknown }) {
    super(`${params.code}: ${params.userMessage}`, { cause: params.cause });
    this.name = 'AppError';
    this.code = params.code;
    this.userMessage = params.userMessage;
    this.details = params.details;
  }
}
