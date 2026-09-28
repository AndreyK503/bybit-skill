import type { BybitClient } from '../api/client.js';
import type { RawDeposit, RawFundingRow, RawInternalDeposit, RawWithdrawal } from '../api/types-funds.js';
import { MIN_REQUEST_INTERVAL_MS, fetchWindowed, type Coverage, type Period, type WindowDeps, type WindowedSource } from '../util/window.js';

/** First operation of the account (live 2026-09-28); the exchange has nothing earlier. */
export const FUNDS_FROM = Date.parse('2023-11-20T00:00:00Z');

export type FlowSource = 'deposit' | 'internalDeposit' | 'withdrawal' | 'funding';

/** A windowed source with its own pace from the docs rate-limit table. */
export type PacedSource = WindowedSource & { intervalMs: number };

const ANY_DEPTH = { depthDays: Infinity, depthText: '' };
const toSeconds = (w: Period) => ({ createTimeFrom: String(Math.floor(w.from / 1000)), createTimeTo: String(Math.floor(w.to / 1000)) });

/** Windows below the documented "less than 30 days" / "7 days"; paces from docs rate-limit with a margin. */
export const FUNDS_SOURCES: Record<FlowSource, PacedSource> = {
  deposit: { label: 'вводы', path: '/v5/asset/deposit/query-record', params: { limit: '50' }, windowDays: 29, intervalMs: 650, ...ANY_DEPTH },
  internalDeposit: { label: 'вводы от других UID', path: '/v5/asset/deposit/query-internal-record', params: { limit: '50' }, windowDays: 29, intervalMs: MIN_REQUEST_INTERVAL_MS, ...ANY_DEPTH },
  withdrawal: { label: 'выводы', path: '/v5/asset/withdraw/query-record', params: { withdrawType: '2', limit: '50' }, windowDays: 29, intervalMs: 220, ...ANY_DEPTH },
  funding: { label: 'журнал кошелька финансирования', path: '/v5/asset/fundinghistory', params: { limit: '100' }, windowDays: 7, intervalMs: MIN_REQUEST_INTERVAL_MS, timeParams: toSeconds, ...ANY_DEPTH },
};

/** One money movement across the account boundary (raw fields). */
export interface FlowView {
  id: string;
  source: FlowSource;
  kind: string;
  direction: 'in' | 'out';
  coin: string;
  amount: string;
  fee: string;
  status: string;
  time: number;
  /** false: not final (pending, failed), shown but not summed */
  counted: boolean;
  /** not final yet: the money may already be credited or debited */
  inProgress: boolean;
}

/** Funding-journal row of a type the skill does not know. */
export interface UnclassifiedRow {
  currency: string;
  ioDirection: string;
  txnAmt: string;
  time: number;
  showBusiType: string;
  description: string;
  descriptionEn: string;
}

export interface FundsDeps extends WindowDeps {
  /** A throttle keeping calls at least intervalMs apart; one per source. */
  throttleFor?: (intervalMs: number) => () => Promise<void>;
}

export type FundingClass = 'in' | 'out' | 'inside' | 'unclassified';

/** P2P and main-subaccount transfers: money crossing the boundary of the main account (live 2026-09-28). */
const BOUNDARY: Record<string, 'in' | 'out'> = {
  fundingAccountRecordP2PPurchase: 'in',
  fundingAccountRecordCancelledP2PSale: 'in',
  fundingAccountRecordTransferFromSubAccount: 'in',
  fundingAccountRecordP2PSale: 'out',
  fundingAccountRecordTransferOut2SubAccount: 'out',
};

/** Groups wholly inside the account: income, conversions, loans; deposits and withdrawals come from their own endpoints. */
const INSIDE_GROUPS = [
  'fundingAccountRecordEarn',
  'fundingAccountRecordAirdrop',
  'fundingAccountRecordConvert',
  'fundingAccountRecordFixedRateLoans',
  'fundingAccountRecordTypeDeposit',
  'fundingAccountRecordTypeWithdraw',
];

/** Inside rows of groups that also hold boundary rows: own-wallet transfers and the P2P security deposit. */
const INSIDE_TYPES = [
  'fundingAccountRecordTransferFromTradingAccount',
  'fundingAccountRecordTransfer2TradingAccount',
  'fundingAccountRecordPendingDeposit',
  'fundingAccountRecordFiatGAFreeze',
  'fundingAccountRecordConfirmedDeposit',
  'fundingAccountRecordFiatGAUNFreeze',
];

/** Where a funding-journal row stands relative to the account boundary, by its machine keys. */
export function classifyFundingRow(row: RawFundingRow): FundingClass {
  const boundary = BOUNDARY[row.description];
  if (boundary) return boundary;
  if (INSIDE_GROUPS.includes(row.showBusiType) || INSIDE_TYPES.includes(row.description)) return 'inside';
  return 'unclassified';
}

/** Final statuses (docs enum depositStatus, withdrawStatus); any other is still in progress. */
const DEPOSIT_DONE = [3, 70012];
const DEPOSIT_FAILED = [4, 70011];
const INTERNAL_FAILED = [3];
const WITHDRAWAL_FAILED = ['CancelByUser', 'Reject', 'Fail'];

const depositFlow = (d: RawDeposit): FlowView => ({
  id: `deposit:${d.id}`, source: 'deposit', kind: 'Ввод (блокчейн)', direction: 'in', coin: d.coin, amount: d.amount,
  fee: d.depositFee, status: String(d.status), time: Number(d.successAt), counted: DEPOSIT_DONE.includes(d.status),
  inProgress: !DEPOSIT_DONE.includes(d.status) && !DEPOSIT_FAILED.includes(d.status),
});

const internalFlow = (d: RawInternalDeposit): FlowView => ({
  id: `internalDeposit:${d.id}`, source: 'internalDeposit', kind: 'Ввод от другого UID', direction: 'in', coin: d.coin, amount: d.amount,
  fee: '', status: String(d.status), time: Number(d.createdTime) * 1000, counted: d.status === 2,
  inProgress: d.status !== 2 && !INTERNAL_FAILED.includes(d.status),
});

const withdrawalFlow = (w: RawWithdrawal): FlowView => ({
  id: `withdrawal:${w.withdrawId}`, source: 'withdrawal', kind: w.withdrawType === 1 ? 'Вывод на другой UID' : 'Вывод (блокчейн)', direction: 'out',
  coin: w.coin, amount: w.amount, fee: w.withdrawFee, status: w.status, time: Number(w.createTime), counted: w.status === 'success',
  inProgress: w.status !== 'success' && !WITHDRAWAL_FAILED.includes(w.status),
});

const fundingFlow = (r: RawFundingRow, direction: 'in' | 'out'): FlowView => ({
  id: `funding:${r.currcCursor}`, source: 'funding', kind: r.descriptionEn.trim(), direction, coin: r.currency, amount: r.txnAmt,
  fee: '', status: '', time: Number(r.createTime) * 1000, counted: true, inProgress: false,
});

const unclassifiedRow = (r: RawFundingRow): UnclassifiedRow => ({
  currency: r.currency, ioDirection: r.ioDirection, txnAmt: r.txnAmt, time: Number(r.createTime) * 1000,
  showBusiType: r.showBusiType, description: r.description, descriptionEn: r.descriptionEn.trim(),
});

/** Keep the first row per key: a record on a second boundary can come in two windows. */
const uniqueBy = <T>(rows: T[], key: (r: T) => string) => [...new Map(rows.map((r) => [key(r), r] as const)).values()];

async function collect<T>(client: BybitClient, source: PacedSource, period: Period, deps: FundsDeps) {
  return fetchWindowed<T>(client, source, period, { ...deps, throttle: deps.throttleFor?.(source.intervalMs) ?? deps.throttle });
}

/** All movements across the account boundary over the period, plus funding rows of unknown type. */
export async function collectFlows(client: BybitClient, period: Period, deps: FundsDeps): Promise<{ flows: FlowView[]; unclassified: UnclassifiedRow[]; coverage: Coverage[] }> {
  const dep = await collect<RawDeposit>(client, FUNDS_SOURCES.deposit, period, deps);
  const internal = await collect<RawInternalDeposit>(client, FUNDS_SOURCES.internalDeposit, period, deps);
  const wd = await collect<RawWithdrawal>(client, FUNDS_SOURCES.withdrawal, period, deps);
  const fund = await collect<RawFundingRow>(client, FUNDS_SOURCES.funding, period, deps);

  const flows = [
    ...uniqueBy(dep.rows, (d) => d.id).map(depositFlow),
    ...uniqueBy(internal.rows, (d) => d.id).map(internalFlow),
    ...uniqueBy(wd.rows, (w) => w.withdrawId).map(withdrawalFlow),
  ];
  const unclassified: UnclassifiedRow[] = [];
  for (const r of uniqueBy(fund.rows, (f) => f.currcCursor)) {
    const cls = classifyFundingRow(r);
    if (cls === 'in' || cls === 'out') flows.push(fundingFlow(r, cls));
    if (cls === 'unclassified') unclassified.push(unclassifiedRow(r));
  }
  flows.sort((a, b) => a.time - b.time);
  return { flows, unclassified, coverage: [dep.coverage, internal.coverage, wd.coverage, fund.coverage] };
}
