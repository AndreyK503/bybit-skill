import dotenv from 'dotenv';
import os from 'node:os';
import path from 'node:path';
import { AppError } from '../api/errors.js';

/** Single canonical .env location, outside the repository (D-10). */
export const ENV_PATH = path.join(os.homedir(), '.config', 'bybit', '.env');

export const DEFAULT_BASE_URL = 'https://api.bybit.com';

/** Mainnet hosts from docs /v5/guide; regional hosts are selected via BYBIT_BASE_URL. */
export const ALLOWED_BASE_URLS = [
  'https://api.bybit.com',
  'https://api.bytick.com',
  'https://api.bybit.tr',
  'https://api.bybit.kz',
  'https://api.bybitgeorgia.ge',
  'https://api.bybit.ae',
  'https://api.bybit.eu',
  'https://api.bybit.id',
];

export const RECV_WINDOW_MS = 5000;
export const REQUEST_TIMEOUT_MS = 30_000;
export const CLOCK_SKEW_WARN_MS = 1000;

export interface Credentials {
  apiKey: string;
  apiSecret: string;
}

/** Load ENV_PATH-style file into env without overriding variables already set. */
export function loadEnvFile(file: string, env: NodeJS.ProcessEnv): void {
  dotenv.config({ path: file, processEnv: env as Record<string, string>, quiet: true });
}

/** Read BYBIT_API_KEY and BYBIT_API_SECRET; APP_KEY_MISSING if either is absent. */
export function loadCredentials(env: NodeJS.ProcessEnv): Credentials {
  const credentials = readCredentials(env);
  if (!credentials) throw keyMissingError();
  return credentials;
}

/** Credentials if both variables are set, else undefined (session status reports the gap itself). */
export function readCredentials(env: NodeJS.ProcessEnv): Credentials | undefined {
  const apiKey = env.BYBIT_API_KEY;
  const apiSecret = env.BYBIT_API_SECRET;
  if (!apiKey || !apiSecret) return undefined;
  if (!PRINTABLE.test(apiKey) || !PRINTABLE.test(apiSecret)) throw keyMalformedError();
  return { apiKey, apiSecret };
}

/** Visible ASCII without quotes: a header-safe key or secret. */
const PRINTABLE = /^[\x21\x23-\x26\x28-\x7E]+$/;

/** The value itself is never included: it may be the secret (D-10). */
function keyMalformedError(): AppError {
  return new AppError({
    code: 'APP_KEY_MALFORMED',
    userMessage:
      `BYBIT_API_KEY или BYBIT_API_SECRET содержит пробел, кавычку, перевод строки или другой недопустимый символ. ` +
      `Проверьте строки в ${ENV_PATH}: значение без кавычек и пробелов, как оно скопировано с Bybit.`,
  });
}

/** Error for an unconfigured key: where to put it and how to create it. */
export function keyMissingError(): AppError {
  return new AppError({
    code: 'APP_KEY_MISSING',
    userMessage:
      `Ключ API не настроен. Создайте на Bybit ключ только на чтение (Read-Only) и запишите в ${ENV_PATH} ` +
      'строки BYBIT_API_KEY=<ключ> и BYBIT_API_SECRET=<секрет>.',
  });
}

/** BYBIT_BASE_URL if set and allowed, else DEFAULT_BASE_URL; APP_CONFIG_INVALID otherwise. */
export function resolveBaseUrl(env: NodeJS.ProcessEnv): string {
  const url = env.BYBIT_BASE_URL;
  if (!url) return DEFAULT_BASE_URL;
  if (ALLOWED_BASE_URLS.includes(url)) return url;
  throw new AppError({
    code: 'APP_CONFIG_INVALID',
    userMessage: `BYBIT_BASE_URL=${url} не поддерживается. Допустимые адреса основной сети: ${ALLOWED_BASE_URLS.join(', ')}.`,
  });
}
