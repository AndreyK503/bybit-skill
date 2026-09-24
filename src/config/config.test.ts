import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { DEFAULT_BASE_URL, ENV_PATH, loadCredentials, loadEnvFile, resolveBaseUrl } from './config.js';

function catchError(fn: () => unknown): AppError {
  try {
    fn();
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error('expected AppError');
}

describe('loadCredentials', () => {
  it('returns key and secret from env', () => {
    expect(loadCredentials({ BYBIT_API_KEY: 'k1', BYBIT_API_SECRET: 's1' })).toEqual({ apiKey: 'k1', apiSecret: 's1' });
  });

  it.each([
    ['no key', { BYBIT_API_SECRET: 's1' }],
    ['no secret', { BYBIT_API_KEY: 'k1' }],
    ['empty', {}],
  ])('APP_KEY_MISSING with the .env path and what to do (%s)', (_name, env) => {
    const err = catchError(() => loadCredentials(env));
    expect(err.code).toBe('APP_KEY_MISSING');
    expect(err.userMessage).toContain(ENV_PATH);
    expect(err.userMessage).toContain('BYBIT_API_KEY');
    expect(err.userMessage).toContain('BYBIT_API_SECRET');
  });

  it('does not leak the present half of the credentials', () => {
    const err = catchError(() => loadCredentials({ BYBIT_API_KEY: 'LEAKCHECKKEY' }));
    expect(JSON.stringify({ m: err.message, d: err.details })).not.toContain('LEAKCHECKKEY');
  });
});

describe('env file', () => {
  it('reads .env only from ~/.config/bybit/.env', () => {
    expect(ENV_PATH).toBe(path.join(os.homedir(), '.config', 'bybit', '.env'));
  });

  it('fills missing variables and keeps those already set', () => {
    const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'bybit-env-')), '.env');
    writeFileSync(file, 'BYBIT_API_KEY=from-file\nBYBIT_API_SECRET=secret-from-file\n');
    const env: NodeJS.ProcessEnv = { BYBIT_API_KEY: 'from-env' };
    loadEnvFile(file, env);
    expect(env.BYBIT_API_KEY).toBe('from-env');
    expect(env.BYBIT_API_SECRET).toBe('secret-from-file');
  });
});

describe('resolveBaseUrl', () => {
  it('defaults to mainnet api.bybit.com', () => {
    expect(resolveBaseUrl({})).toBe(DEFAULT_BASE_URL);
    expect(DEFAULT_BASE_URL).toBe('https://api.bybit.com');
  });

  it('accepts a documented regional host', () => {
    expect(resolveBaseUrl({ BYBIT_BASE_URL: 'https://api.bybit.kz' })).toBe('https://api.bybit.kz');
  });

  it.each(['https://api-testnet.bybit.com', 'https://api-demo.bybit.com', 'https://evil.example.com'])(
    'rejects %s with APP_CONFIG_INVALID',
    (url) => {
      expect(catchError(() => resolveBaseUrl({ BYBIT_BASE_URL: url })).code).toBe('APP_CONFIG_INVALID');
    },
  );
});

describe('review fixes: malformed credentials (D-10, NFR-6)', () => {
  it.each([
    ['newline in key', { BYBIT_API_KEY: 'LEAKKEY\nabc', BYBIT_API_SECRET: 's1' }],
    ['space in secret', { BYBIT_API_KEY: 'k1', BYBIT_API_SECRET: 'LEAK SECRET' }],
    ['quote in key', { BYBIT_API_KEY: '"LEAKKEY"', BYBIT_API_SECRET: 's1' }],
  ])('%s -> APP_KEY_MALFORMED without the value', (_name, env) => {
    const err = catchError(() => loadCredentials(env));
    expect(err.code).toBe('APP_KEY_MALFORMED');
    expect(err.userMessage).toContain(ENV_PATH);
    expect(JSON.stringify({ m: err.message, d: err.details })).not.toContain('LEAK');
  });
});
