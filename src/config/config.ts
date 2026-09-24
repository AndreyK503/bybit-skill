import os from 'node:os';
import path from 'node:path';

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
  throw new Error(`not implemented: ${file} ${Object.keys(env).length}`);
}

/** Read BYBIT_API_KEY and BYBIT_API_SECRET; APP_KEY_MISSING if either is absent. */
export function loadCredentials(env: NodeJS.ProcessEnv): Credentials {
  throw new Error(`not implemented: ${Object.keys(env).length}`);
}

/** BYBIT_BASE_URL if set and allowed, else DEFAULT_BASE_URL; APP_CONFIG_INVALID otherwise. */
export function resolveBaseUrl(env: NodeJS.ProcessEnv): string {
  throw new Error(`not implemented: ${Object.keys(env).length}`);
}
