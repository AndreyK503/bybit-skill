import { AppError } from '../api/errors.js';
import { ENV_PATH, loadEnvFile } from '../config/config.js';

/** Load ~/.config/bybit/.env into process.env; real environment variables win (D-10). */
export function bootstrapEnv(): void {
  loadEnvFile(ENV_PATH, process.env);
}

/** Choose output format (NFR-5): JSON for the agent, text for a human. */
export function formatOutput<T>(value: T, json: boolean, render: (v: T) => string): string {
  return json ? JSON.stringify(value, null, 2) : render(value);
}

/** Single CLI error boundary: message and stable code; details only with BYBIT_DEBUG. */
export function printError(err: unknown): void {
  if (err instanceof AppError) {
    console.error(`Ошибка: ${err.userMessage} [${err.code}]`);
    if (process.env.BYBIT_DEBUG) console.error('Детали:', JSON.stringify(err.details ?? null));
  } else {
    console.error('Ошибка: непредвиденная ошибка выполнения команды. Запустите с BYBIT_DEBUG=1 для деталей. [APP_UNEXPECTED]');
    if (process.env.BYBIT_DEBUG) console.error(err);
  }
  process.exitCode = 1;
}

/** Progress of a long collection (NFR-7): a line per 10% of windows, to stderr in the CLI. */
export function progressReporter(write: (line: string) => void): (label: string, done: number, total: number) => void {
  let current = { label: '', shown: 0 };
  return (label, done, total) => {
    if (label !== current.label) current = { label, shown: 0 };
    const step = Math.floor((done * 10) / total);
    if (step <= current.shown) return;
    current.shown = step;
    write(`Сбор: ${label} — окно ${done} из ${total}`);
  };
}
