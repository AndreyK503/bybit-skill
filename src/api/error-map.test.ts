import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES } from '../fixtures/bybit-v5-access.js';
import { mapHttpStatus, mapRetCode } from './error-map.js';

/** retCode meanings: docs /v5/error (UTA section, HTTP Code table). Plan section 8 for the wording. */
const ctx = { path: '/v5/account/wallet-balance' };

function mapped(retCode: number, extra: Partial<typeof ctx & { resetTimestamp: number }> = {}) {
  return mapRetCode(retCode, ERROR_MESSAGES[retCode] ?? '', { ...ctx, ...extra });
}

describe('mapRetCode', () => {
  it.each([10003, 10004, 33004])('%i -> key rejected, check and recreate', (code) => {
    const err = mapped(code);
    expect(err.code).toBe('APP_KEY_REJECTED');
    expect(err.userMessage).toMatch(/ключ/i);
    expect(err.userMessage).toMatch(/пересоздать|пересоздайте/i);
  });

  it('10010 -> IP mismatch, check key IP binding', () => {
    const err = mapped(10010);
    expect(err.code).toBe('APP_KEY_IP_MISMATCH');
    expect(err.userMessage).toContain('IP');
  });

  it('10005 -> permission denied, names the endpoint', () => {
    const err = mapped(10005);
    expect(err.code).toBe('APP_PERMISSION_DENIED');
    expect(err.userMessage).toContain('/v5/account/wallet-balance');
  });

  it.each([10009, 10024])('%i -> region blocked', (code) => {
    expect(mapped(code).code).toBe('APP_REGION_BLOCKED');
  });

  it('10006 -> rate limit with reset time from X-Bapi-Limit-Reset-Timestamp', () => {
    // 1672738134824: docs /v5/rate-limit header example; ISO computed with node Date.
    const err = mapped(10006, { resetTimestamp: 1672738134824 });
    expect(err.code).toBe('APP_RATE_LIMIT');
    expect(err.userMessage).toContain('2023-01-03T09:28:54.824Z');
  });

  it('10006 without reset header -> rate limit without an invented time', () => {
    const err = mapped(10006);
    expect(err.code).toBe('APP_RATE_LIMIT');
    expect(err.userMessage).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it.each([10000, 10016])('%i -> service unavailable, retry', (code) => {
    const err = mapped(code);
    expect(err.code).toBe('APP_UNAVAILABLE');
    expect(err.userMessage).toMatch(/повтор/i);
  });

  it('unknown code -> APP_BYBIT_ERROR with the exchange code and message', () => {
    const err = mapRetCode(170131, 'Insufficient balance.', ctx);
    expect(err.code).toBe('APP_BYBIT_ERROR');
    expect(err.userMessage).toContain('170131');
    expect(err.userMessage).toContain('Insufficient balance.');
  });
});

describe('mapHttpStatus', () => {
  it('403 -> region blocked, message names both region and IP rate limit', () => {
    const err = mapHttpStatus(403, ctx);
    expect(err.code).toBe('APP_REGION_BLOCKED');
    expect(err.userMessage).toMatch(/регион|географ/i);
    expect(err.userMessage).toMatch(/лимит/i);
  });

  it('401 -> key rejected', () => {
    expect(mapHttpStatus(401, ctx).code).toBe('APP_KEY_REJECTED');
  });

  it('429 -> rate limit', () => {
    expect(mapHttpStatus(429, ctx).code).toBe('APP_RATE_LIMIT');
  });

  it.each([500, 502, 503, 504])('%i -> service unavailable', (status) => {
    expect(mapHttpStatus(status, ctx).code).toBe('APP_UNAVAILABLE');
  });
});
