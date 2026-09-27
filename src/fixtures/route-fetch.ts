import { BybitClient } from '../api/client.js';
import { QUERY_API } from './bybit-v5-access.js';

/** Test helper: a fetch that answers by URL path and records every requested URL. */
export type Route = (url: URL) => unknown;

export const TEST_CREDS = { apiKey: 'LEAKKEY123456', apiSecret: 'LEAKSECRET987654' };

/** Read-only key answer for /v5/user/query-api (docs example). */
export const READ_ONLY_KEY: Route = () => QUERY_API;

export function routedClient(routes: Record<string, Route>) {
  const urls: URL[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    urls.push(url);
    const route = routes[url.pathname];
    if (!route) throw new Error(`unexpected path ${url.pathname}`);
    return new Response(JSON.stringify(route(url)), { status: 200 });
  }) as typeof fetch;
  const client = new BybitClient({ credentials: TEST_CREDS, baseUrl: 'https://api.bybit.com', fetchFn, now: () => 0 });
  return { client, urls };
}
