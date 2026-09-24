import { describe, expect, it } from 'vitest';
import { sign, signPayload } from './sign.js';

/**
 * Example values: docs /v5/guide, "Authentication" (GET example).
 * Expected HMAC computed independently:
 *   printf '%s' "1658384314791XXXXXXXXXX5000category=option&symbol=BTC-29JUL22-25000-C" \
 *     | openssl dgst -sha256 -hmac "test-secret-not-real"
 * The docs omit the secret behind their sample signature, so it cannot be used.
 */
const DOC_PAYLOAD = '1658384314791XXXXXXXXXX5000category=option&symbol=BTC-29JUL22-25000-C';
const OPENSSL_SIGN = 'e9d95f93790258d5680772d879abb9df2571ae26d3edb5f36973f9757eef3a16';

describe('sign', () => {
  it('builds the string to sign as in the docs example', () => {
    expect(signPayload('1658384314791', 'XXXXXXXXXX', '5000', 'category=option&symbol=BTC-29JUL22-25000-C')).toBe(
      DOC_PAYLOAD,
    );
  });

  it('matches the openssl HMAC-SHA256 reference in lowercase hex', () => {
    expect(sign(DOC_PAYLOAD, 'test-secret-not-real')).toBe(OPENSSL_SIGN);
  });
});
