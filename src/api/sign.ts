/** Request signing (D-2). GET only, so there is no body variant. */

/** String to sign for a GET request: timestamp + apiKey + recvWindow + queryString. */
export function signPayload(timestamp: string, apiKey: string, recvWindow: string, query: string): string {
  throw new Error(`not implemented: ${timestamp}${apiKey}${recvWindow}${query}`);
}

/** HMAC-SHA256 of the payload, lowercase hex. */
export function sign(payload: string, secret: string): string {
  throw new Error(`not implemented: ${payload.length}${secret.length}`);
}
