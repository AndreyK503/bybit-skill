import type { BybitClient } from '../api/client.js';
import type { RawAssetOverview, RawTickers } from '../api/types-account.js';
import { utcTime } from '../format/history.js';
import { renderTable } from '../format/table.js';
import { DASH, numOrDash } from '../format/values.js';
import { DAY_MS, MIN_REQUEST_INTERVAL_MS, type Coverage, type Period } from '../util/window.js';
import { fetchDailyCloses, valueOnDate, type DailyPrices } from '../valuation/daily-close.js';
import { USD_STABLECOINS } from '../valuation/usd.js';
import { earnView, fetchWallet, fundingTotalEquity, totalUsd } from './balance.js';
import { FUNDS_FROM, collectFlows, type FlowView, type FundsDeps, type UnclassifiedRow } from './funds-flows.js';
import { requireReadOnlyKey } from './session-status.js';

export { FUNDS_FROM, FUNDS_SOURCES, classifyFundingRow, type FlowSource, type FlowView, type FundingClass, type FundsDeps, type PacedSource, type UnclassifiedRow } from './funds-flows.js';

export interface KindTotal {
  kind: string;
  direction: 'in' | 'out';
  count: number;
  usd: number | null;
}

export interface FundsResult {
  period: Period;
  coverage: Coverage[];
  current: { unifiedTotalEquity: string; fundingTotalEquity: string | null; earnTotalEquity: string | null };
  flows: FlowView[];
  unclassified: UnclassifiedRow[];
  computed: {
    flowsUsd: Record<string, number | null>;
    byKind: KindTotal[];
    depositedUsd: number | null;
    withdrawnUsd: number | null;
    netInputUsd: number | null;
    currentValueUsd: number | null;
    resultUsd: number | null;
    firstOperationTime: number | null;
    days: number | null;
  };
  computedNotes: {
    flowsUsd: Record<string, string>;
    totals: string;
    currentValueUsd: string;
    resultUsd: string;
    scope: string;
  };
}

const SCOPE =
  'Движение средств через границу основного счёта с 2023-11-20 (первая операция счёта; раньше у биржи записей нет) по момент запроса. ' +
  'Ввод: вводы из блокчейна и от других UID, P2P покупки, отменённые P2P продажи, переводы с субсчёта. ' +
  'Вывод: выводы (сумма, полученная на той стороне; комиссия вывода уменьшает результат), P2P продажи, переводы на субсчёт. ' +
  'P2P оценивается по полученным или отданным USDT 1:1: сколько фиата заплачено, биржа не отдаёт, спред P2P в расчёт не входит. ' +
  'Не ввод: переводы между своими кошельками, награды Earn, Launchpool, аирдропы — они попадают в результат. Займы (Crypto Loans) не учитываются.';

const TOTALS_METHOD =
  'Сумма долларовых оценок завершённых операций. USDT и USDC — 1:1; прочие монеты — по цене закрытия дневной свечи МОНЕТАUSDT на спот-рынке Bybit за день операции (UTC): ' +
  'погрешность — движение цены внутри дня. За текущий день свеча не закрыта — берётся последняя цена.';

/** Current spot pairs and daily closes over the date range of each coin's counted operations; stablecoins need none. */
async function dailyPrices(client: BybitClient, flows: FlowView[], deps: FundsDeps): Promise<DailyPrices> {
  const times = new Map<string, number[]>();
  for (const f of flows.filter((x) => x.counted)) if (!USD_STABLECOINS.includes(f.coin)) times.set(f.coin, [...(times.get(f.coin) ?? []), f.time]);
  const prices: DailyPrices = { pairs: new Set(), closes: new Map(), now: deps.now };
  if (times.size === 0) return prices;
  const tickers = await client.getPublic<RawTickers>('/v5/market/tickers', { category: 'spot' });
  prices.pairs = new Set(tickers.list.map((t) => t.symbol));
  const throttle = deps.throttleFor?.(MIN_REQUEST_INTERVAL_MS) ?? deps.throttle;
  for (const [coin, ts] of times) {
    const pair = `${coin}USDT`;
    if (prices.pairs.has(pair)) prices.closes.set(pair, await fetchDailyCloses(client, pair, { from: Math.min(...ts), to: Math.max(...ts) }, throttle));
  }
  return prices;
}

/** Sum of one direction; empty when any counted operation has no USD value. */
function directionTotal(flows: FlowView[], usd: Record<string, number | null>, direction: 'in' | 'out'): number | null {
  const values = flows.filter((f) => f.counted && f.direction === direction).map((f) => usd[f.id] ?? null);
  return values.includes(null) ? null : values.reduce<number>((s, v) => s + (v ?? 0), 0);
}

function byKind(flows: FlowView[], usd: Record<string, number | null>): KindTotal[] {
  const groups = new Map<string, FlowView[]>();
  for (const f of flows.filter((x) => x.counted)) groups.set(`${f.direction}|${f.kind}`, [...(groups.get(`${f.direction}|${f.kind}`) ?? []), f]);
  return [...groups.values()].map((g) => ({ kind: g[0]!.kind, direction: g[0]!.direction, count: g.length, usd: directionTotal(g, usd, g[0]!.direction) }));
}

function totalsNote(flows: FlowView[], usd: Record<string, number | null>, notes: Record<string, string>, unclassified: UnclassifiedRow[]): string {
  if (unclassified.length > 0) {
    const types = [...new Set(unclassified.map((u) => `${u.descriptionEn} (${u.description})`))].join(', ');
    return `В журнале кошелька финансирования есть строки незнакомого типа: ${types}. Это может быть ввод или вывод, поэтому итоги не вычислены.`;
  }
  const unvalued = flows.filter((f) => f.counted && usd[f.id] === null).map((f) => `${f.id}: ${notes[f.id]}`);
  if (unvalued.length > 0) return `${TOTALS_METHOD} Итог направления не вычислен, есть неоценённые операции: ${unvalued.join(' ')}`;
  return TOTALS_METHOD;
}

function resultNote(netInput: number | null, current: { value: number | null; note: string }, hasFlows: boolean, inProgress: FlowView[]): string {
  if (!hasFlows) return 'Вводов и выводов не найдено: результат не вычислен.';
  if (inProgress.length > 0) {
    const list = inProgress.map((f) => `${f.id} (${f.kind}, ${f.amount} ${f.coin}, статус ${f.status})`).join(', ');
    return `Есть незавершённые операции: ${list}. Деньги по ним могут быть уже зачислены или списаны, а в итоги они не входят: результат не вычислен.`;
  }
  if (netInput === null) return 'Нетто-ввод не вычислен (см. итоги): результат не вычислен.';
  if (current.value === null) return `Стоимость счёта не вычислена: ${current.note}`;
  return 'Текущая стоимость счёта минус нетто-ввод (введено − выведено).';
}

/** `funds` (FR-13): net input since the first operation, current value, absolute result. */
export async function funds(client: BybitClient, deps: FundsDeps): Promise<FundsResult> {
  await requireReadOnlyKey(client);
  const period = { from: FUNDS_FROM, to: deps.now };
  const { flows, unclassified, coverage } = await collectFlows(client, period, deps);
  const prices = await dailyPrices(client, flows, deps);

  const flowsUsd: Record<string, number | null> = {};
  const flowNotes: Record<string, string> = {};
  for (const f of flows) {
    const e = valueOnDate(f.coin, f.amount, f.time, prices);
    flowsUsd[f.id] = e.usd;
    flowNotes[f.id] = e.note;
  }

  const known = unclassified.length === 0;
  const deposited = known ? directionTotal(flows, flowsUsd, 'in') : null;
  const withdrawn = known ? directionTotal(flows, flowsUsd, 'out') : null;
  const netInput = deposited === null || withdrawn === null ? null : deposited - withdrawn;

  const account = await fetchWallet(client);
  const overview = await client.getPrivate<RawAssetOverview>('/v5/asset/asset-overview');
  const current = { unifiedTotalEquity: account.totalEquity, fundingTotalEquity: fundingTotalEquity(overview), earnTotalEquity: earnView(overview).totalEquity };
  const currentValue = totalUsd(current.unifiedTotalEquity, current.fundingTotalEquity, false, current.earnTotalEquity);

  const counted = flows.filter((f) => f.counted);
  const inProgress = flows.filter((f) => f.inProgress);
  const first = counted.length > 0 ? Math.min(...counted.map((f) => f.time)) : null;
  const result = counted.length > 0 && inProgress.length === 0 && netInput !== null && currentValue.value !== null ? currentValue.value - netInput : null;

  return {
    period,
    coverage,
    current,
    flows,
    unclassified,
    computed: {
      flowsUsd,
      byKind: byKind(flows, flowsUsd),
      depositedUsd: deposited,
      withdrawnUsd: withdrawn,
      netInputUsd: netInput,
      currentValueUsd: currentValue.value,
      resultUsd: result,
      firstOperationTime: first,
      days: first === null ? null : Math.floor((deps.now - first) / DAY_MS),
    },
    computedNotes: {
      flowsUsd: flowNotes,
      totals: totalsNote(flows, flowsUsd, flowNotes, unclassified),
      currentValueUsd: currentValue.note,
      resultUsd: resultNote(netInput, currentValue, counted.length > 0, inProgress),
      scope: SCOPE,
    },
  };
}

const DIRECTION = { in: 'ввод', out: 'вывод' };

export function renderFunds(r: FundsResult): string {
  const c = r.computed;
  const usd = (v: number | null) => `${numOrDash(v)} USD [расчёт]`;
  const lines = [
    `Период: 2023-11-20 — ${utcTime(r.period.to)} UTC`,
    `Первая операция: ${c.firstOperationTime === null ? DASH : `${utcTime(c.firstOperationTime)} UTC`}   Срок: ${c.days ?? DASH} дн. [расчёт]`,
    '',
    `Введено:     ${usd(c.depositedUsd)}`,
    `Выведено:    ${usd(c.withdrawnUsd)}`,
    `Нетто-ввод:  ${usd(c.netInputUsd)}`,
    `Стоимость счёта сейчас: ${usd(c.currentValueUsd)} (торговый ${r.current.unifiedTotalEquity} + финансирование ${r.current.fundingTotalEquity ?? DASH} + Earn ${r.current.earnTotalEquity ?? DASH})`,
    `Результат:   ${usd(c.resultUsd)}`,
    '',
    c.byKind.length === 0 ? 'Операций нет.' : renderTable(['Тип', 'Направление', 'Операций', 'USD [расчёт]'], c.byKind.map((k) => [k.kind, DIRECTION[k.direction], String(k.count), numOrDash(k.usd)])),
  ];
  const pending = r.flows.filter((f) => !f.counted);
  if (pending.length > 0) {
    lines.push('', 'Не учтено (незавершённые и неуспешные):');
    lines.push(renderTable(['Время UTC', 'Тип', 'Монета', 'Сумма', 'Статус'], pending.map((f) => [utcTime(f.time), f.kind, f.coin, f.amount, f.status])));
  }
  if (r.unclassified.length > 0) {
    lines.push('', 'Строки журнала незнакомого типа (не учтены, итоги не вычислены):');
    lines.push(renderTable(['Время UTC', 'Тип', 'Ключ', 'Монета', 'Сумма', 'Направление'], r.unclassified.map((u) => [utcTime(u.time), u.descriptionEn, u.description, u.currency, u.txnAmt, u.ioDirection])));
  }
  lines.push(
    '',
    'Пояснения [расчёт]:',
    `- Охват: ${r.computedNotes.scope}`,
    `- Итоги: ${r.computedNotes.totals}`,
    `- Стоимость счёта: ${r.computedNotes.currentValueUsd}`,
    `- Результат: ${r.computedNotes.resultUsd}`,
  );
  return lines.join('\n');
}
