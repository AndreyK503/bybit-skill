import { createHmac } from 'node:crypto';

/** Request signing (D-2). GET only, so there is no body variant. */

/** String to sign for a GET request: timestamp + apiKey + recvWindow + queryString. */
export function signPayload(timestamp: string, apiKey: string, recvWindow: string, query: string): string {
  return timestamp + apiKey + recvWindow + query;
}

/** HMAC-SHA256 of the payload, lowercase hex. */
export function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
