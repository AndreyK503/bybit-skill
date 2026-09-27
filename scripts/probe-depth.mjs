#!/usr/bin/env node
/* global process, console, fetch, URLSearchParams, setTimeout, AbortSignal */
/**
 * Live probe of history depth for stage E4 (plan section 10). GET only, read-only key.
 *
 * Walks each history source backwards from now in windows of the size the docs allow and
 * reports, per source: which age ranges return data, which are empty, which are refused
 * (retCode and retMsg), the oldest window with data, and base coins seen for options.
 * Also checks whether endTime is inclusive on /v5/execution/list.
 *
 * Prints no amounts, no key, no secret: only counts, dates, symbols' base coins and retCodes.
 *
 * Run: node scripts/probe-depth.mjs [--days 1100] [--only exec-option,tlog]
 * Key: BYBIT_API_KEY / BYBIT_API_SECRET from the environment or ~/.config/bybit/.env.
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DAY = 86_400_000;
const BASE = process.env.BYBIT_BASE_URL || 'https://api.bybit.com';
const PAUSE_MS = 125; // ≤ 8 requests per second, far below every documented limit
const STOP_AFTER_ERRORS = 3; // consecutive refusals: deeper windows are skipped

function loadEnv() {
  try {
    for (const line of readFileSync(join(homedir(), '.config', 'bybit', '.env'), 'utf8').split('\n')) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    // no file: rely on the environment
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : fallback;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, params) {
  const query = new URLSearchParams(params).toString();
  const ts = String(Date.now());
  const recv = '10000';
  const key = process.env.BYBIT_API_KEY;
  const sign = createHmac('sha256', process.env.BYBIT_API_SECRET).update(ts + key + recv + query).digest('hex');
  await sleep(PAUSE_MS);
  try {
    const res = await fetch(`${BASE}${path}?${query}`, {
      headers: { 'X-BAPI-API-KEY': key, 'X-BAPI-TIMESTAMP': ts, 'X-BAPI-RECV-WINDOW': recv, 'X-BAPI-SIGN': sign },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { retCode: `HTTP ${res.status}`, retMsg: '' };
    return await res.json();
  } catch (e) {
    return { retCode: 'NETWORK', retMsg: e instanceof Error ? e.name : 'error' };
  }
}

/** Time of a record in ms, by the field the docs name for each source. */
const timeOf = (row) => Number(row.execTime ?? row.transactionTime ?? row.updatedTime ?? row.closeTime ?? row.deliveryTime ?? row.successAt ?? row.createTime ?? NaN);

const SOURCES = [
  { id: 'exec-spot', path: '/v5/execution/list', params: { category: 'spot', limit: '100' }, window: 7 },
  { id: 'exec-linear', path: '/v5/execution/list', params: { category: 'linear', limit: '100' }, window: 7 },
  { id: 'exec-inverse', path: '/v5/execution/list', params: { category: 'inverse', limit: '100' }, window: 7 },
  { id: 'exec-option', path: '/v5/execution/list', params: { category: 'option', limit: '100' }, window: 7 },
  { id: 'exec-option-usdt', path: '/v5/execution/list', params: { category: 'option', settleCoin: 'USDT', limit: '100' }, window: 7 },
  { id: 'tlog', path: '/v5/account/transaction-log', params: { accountType: 'UNIFIED', limit: '50' }, window: 7 },
  { id: 'closed-pnl-linear', path: '/v5/position/closed-pnl', params: { category: 'linear', limit: '100' }, window: 7 },
  { id: 'closed-pnl-inverse', path: '/v5/position/closed-pnl', params: { category: 'inverse', limit: '100' }, window: 7 },
  { id: 'closed-option', path: '/v5/position/get-closed-positions', params: { category: 'option', limit: '100' }, window: 7 },
  { id: 'delivery-option', path: '/v5/asset/delivery-record', params: { category: 'option', limit: '50' }, window: 30 },
  { id: 'delivery-linear', path: '/v5/asset/delivery-record', params: { category: 'linear', limit: '50' }, window: 30 },
  { id: 'deposit', path: '/v5/asset/deposit/query-record', params: { limit: '50' }, window: 29 },
  { id: 'deposit-internal', path: '/v5/asset/deposit/query-internal-record', params: { limit: '50' }, window: 29 },
  { id: 'withdraw', path: '/v5/asset/withdraw/query-record', params: { withdrawType: '2', limit: '50' }, window: 29 },
];

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

async function probe(source, maxDays, now) {
  const runs = []; // run-length ranges of status by age: { status, fromAge, toAge, windows, records }
  const coins = new Set();
  let oldest = null;
  let newest = null;
  let errors = 0;
  let skippedFrom = null;
  for (let age = 0; age < maxDays; age += source.window) {
    const end = now - age * DAY;
    const start = end - source.window * DAY;
    const r = await get(source.path, { ...source.params, startTime: String(start), endTime: String(end) });
    const rows = r.result?.list ?? r.result?.rows ?? [];
    const status = r.retCode === 0 ? (rows.length ? 'данные' : 'пусто') : `отказ ${r.retCode} «${r.retMsg}»`;
    const last = runs.at(-1);
    if (last && last.status === status) {
      last.toAge = age + source.window;
      last.windows += 1;
      last.records += rows.length;
    } else runs.push({ status, fromAge: age, toAge: age + source.window, windows: 1, records: rows.length });
    for (const row of rows) {
      if (row.symbol && source.params.category === 'option') coins.add(row.symbol.split('-')[0]);
      const t = timeOf(row);
      if (Number.isFinite(t)) {
        oldest = oldest === null ? t : Math.min(oldest, t);
        newest = newest === null ? { t, row } : t > newest.t ? { t, row } : newest;
      }
    }
    errors = r.retCode === 0 ? 0 : errors + 1;
    if (errors >= STOP_AFTER_ERRORS) {
      skippedFrom = age + source.window;
      break;
    }
    process.stderr.write(`\r${source.id}: ${age + source.window}/${maxDays} дн.   `);
  }
  process.stderr.write('\n');
  return { runs, coins, oldest, newest, skippedFrom };
}

/** Is endTime inclusive? Ask for [t - 60 s, t] and [t, t + 60 s] around a known execution. */
async function probeEndTime(source, row) {
  const t = Number(row.execTime);
  const params = { ...source.params, symbol: row.symbol };
  if (source.params.category === 'option') params.baseCoin = row.symbol.split('-')[0];
  const has = async (s, e) => {
    const r = await get(source.path, { ...params, startTime: String(s), endTime: String(e) });
    if (r.retCode !== 0) return `отказ ${r.retCode} «${r.retMsg}»`;
    return (r.result?.list ?? []).some((x) => x.execId === row.execId) ? 'есть' : 'нет';
  };
  return { endAtT: await has(t - 60_000, t), startAtT: await has(t, t + 60_000) };
}

async function main() {
  loadEnv();
  if (!process.env.BYBIT_API_KEY || !process.env.BYBIT_API_SECRET) {
    console.error('Нет BYBIT_API_KEY / BYBIT_API_SECRET (окружение или ~/.config/bybit/.env).');
    process.exit(1);
  }
  const maxDays = Number(arg('--days', '1100'));
  const only = arg('--only', '');
  const sources = only ? SOURCES.filter((s) => only.split(',').includes(s.id)) : SOURCES;
  const now = Date.now();
  console.log(`Проверка глубины истории, ${iso(now)}, до ${maxDays} дней назад. Возраст — дни от сегодня.\n`);
  let endTimeChecked = false;
  for (const s of sources) {
    const p = await probe(s, maxDays, now);
    console.log(`## ${s.id}  ${s.path} ${JSON.stringify(s.params)}  окно ${s.window} дн.`);
    for (const r of p.runs) {
      const recs = r.status === 'данные' ? `, записей в первых страницах: ${r.records}` : '';
      console.log(`  ${String(r.fromAge).padStart(4)}–${String(r.toAge).padEnd(4)} дн.: ${r.status} (окон ${r.windows}${recs})`);
    }
    if (p.skippedFrom !== null) console.log(`  глубже ${p.skippedFrom} дн. не проверялось: ${STOP_AFTER_ERRORS} отказа подряд`);
    console.log(`  самая старая запись: ${p.oldest === null ? 'нет' : `${iso(p.oldest)} (${Math.floor((now - p.oldest) / DAY)} дн. назад)`}`);
    if (p.coins.size) console.log(`  базовые монеты опционов: ${[...p.coins].sort().join(', ')}`);
    if (!endTimeChecked && s.path === '/v5/execution/list' && p.newest) {
      const e = await probeEndTime(s, p.newest.row);
      console.log(`  endTime включительно? запись в [t−60с, t]: ${e.endAtT}; в [t, t+60с]: ${e.startAtT}`);
      endTimeChecked = true;
    }
    console.log('');
  }
}

main();
