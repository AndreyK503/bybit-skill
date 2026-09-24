import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Read-only guard: decision D-1, acceptance criterion 20.
 * Scans production sources in src/ and the built bundle for any way to change account state.
 */

const ROOT = join(import.meta.dirname, '..');
const BUNDLE = join(ROOT, 'skills/bybit/scripts/bybit.cjs');

const POST_ENDPOINTS = readFileSync(join(import.meta.dirname, 'fixtures/bybit-v5-post-endpoints.txt'), 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('/v5/'));

const RULES: { name: string; pattern: RegExp }[] = [
  { name: 'non-GET method', pattern: /\bmethod\s*:\s*['"`]?(POST|PUT|DELETE|PATCH)\b/i },
  { name: 'non-GET method literal', pattern: /['"`](POST|PUT|DELETE|PATCH)['"`]/ },
  { name: 'request body', pattern: /\bbody\s*:/ },
  { name: 'low-level HTTP module', pattern: /(require\(\s*|from\s+)['"](node:)?(http|https|http2|net|tls|undici)['"]/ },
  { name: 'XMLHttpRequest', pattern: /\bXMLHttpRequest\b/ },
  { name: 'order endpoint', pattern: /\/order\// },
  { name: 'position setter', pattern: /\/position\/(set-|switch-|trading-stop|add-margin|move-positions|confirm-pending-mmr)/ },
  { name: 'asset transfer (non-query)', pattern: /\/asset\/transfer\/(?!query-)/ },
  { name: 'withdraw create/cancel', pattern: /\/asset\/withdraw\/(create|cancel)/ },
  { name: 'account setter', pattern: /\/account\/(set-|upgrade-to-uta|borrow|repay|quick-repayment|no-convert-repay|mmp-)/ },
  { name: 'API key management', pattern: /\/user\/(create-|update-|delete-|del-|frozen-)/ },
];

/** Return names of violated rules; POST endpoints from Bybit docs are matched without the /v5 prefix. */
function findViolations(text: string): string[] {
  const found = RULES.filter((r) => r.pattern.test(text)).map((r) => r.name);
  const paths = POST_ENDPOINTS.filter((p) => text.includes(p.slice('/v5'.length)));
  return [...found, ...paths];
}

function productionSources(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => join(dir, f));
}

describe('read-only guard', () => {
  it('detector catches every forbidden construct', () => {
    const samples = [
      "fetch(url, { method: 'POST' })",
      'request("PUT", url)',
      'fetch(url, { body: payload })',
      "import https from 'node:https'",
      'new XMLHttpRequest()',
      "get('/v5/order/realtime')",
      "'/v5/position/set-leverage'",
      "'/v5/asset/transfer/universal-transfer'",
      "'/v5/asset/withdraw/create'",
      "'/v5/account/set-margin-mode'",
      "'/v5/user/update-api'",
      "BASE + '/earn/place-order'",
    ];
    for (const s of samples) expect(findViolations(s), s).not.toEqual([]);
  });

  it('detector allows the read endpoints from plan section 5', () => {
    const planPaths = [
      '/v5/user/query-api', '/v5/account/info', '/v5/market/time', '/v5/account/wallet-balance',
      '/v5/asset/transfer/query-account-coins-balance', '/v5/position/list', '/v5/asset/coin-greeks',
      '/v5/market/tickers', '/v5/market/instruments-info', '/v5/market/delivery-price',
      '/v5/market/historical-volatility', '/v5/execution/list', '/v5/account/transaction-log',
      '/v5/position/closed-pnl', '/v5/position/get-closed-positions', '/v5/asset/delivery-record',
      '/v5/asset/deposit/query-record', '/v5/asset/deposit/query-internal-record',
      '/v5/asset/withdraw/query-record', '/v5/asset/transfer/query-inter-transfer-list',
      '/v5/market/kline', '/v5/market/orderbook', '/v5/market/recent-trade',
    ];
    for (const p of planPaths) expect(findViolations(`get('${p}')`), p).toEqual([]);
  });

  it('src/ production code has no mutating calls', () => {
    const files = productionSources(join(ROOT, 'src'));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(findViolations(readFileSync(f, 'utf8')), f).toEqual([]);
  });

  it('built bundle has no mutating calls', () => {
    execFileSync('npm', ['run', 'build', '--silent'], { cwd: ROOT, stdio: 'pipe' });
    expect(findViolations(readFileSync(BUNDLE, 'utf8'))).toEqual([]);
  });
});
