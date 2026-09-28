import { InvalidArgumentError, type Command } from 'commander';
import { BybitClient } from '../api/client.js';
import { funds, renderFunds } from '../commands/funds.js';
import { DELIVERIES_DEFAULT_DAYS, deliveries, renderDeliveries } from '../commands/deliveries.js';
import { OPERATIONS_DEFAULT_DAYS, operations, renderOperations } from '../commands/operations.js';
import { PNL_DEFAULT_DAYS, pnl, renderPnl } from '../commands/pnl.js';
import { TRADES_DEFAULT_DAYS, TRADE_CATEGORIES, renderTrades, trades, type TradeCategory } from '../commands/trades.js';
import { loadCredentials, resolveBaseUrl } from '../config/config.js';
import { resolvePeriod, type PeriodArgs } from '../util/period.js';
import { MIN_REQUEST_INTERVAL_MS, createThrottle, type WindowDeps } from '../util/window.js';
import { formatOutput, progressReporter } from './runtime.js';

/** `--days N`: a positive integer. */
export function parseDaysArg(value: string): number {
  if (!/^\d+$/.test(value) || Number(value) < 1) throw new InvalidArgumentError('число дней — целое больше нуля, например 30.');
  return Number(value);
}

/** `--from` / `--to`: a real calendar date YYYY-MM-DD. */
export function parseDateArg(value: string): string {
  const ms = Date.parse(`${value}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(value);
  if (!ok) throw new InvalidArgumentError('дата в формате ГГГГ-ММ-ДД, например 2026-09-01.');
  return value;
}

/** `--category`: spot, linear, inverse or option, any case. */
export function parseCategoryArg(value: string): TradeCategory {
  const v = value.toLowerCase() as TradeCategory;
  if (!TRADE_CATEGORIES.includes(v)) throw new InvalidArgumentError('категория: spot, linear, inverse или option.');
  return v;
}

const client = () => new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Real clock, throttle and progress to stderr: stdout stays clean for --json. */
function liveDeps(): WindowDeps & { throttleFor: (intervalMs: number) => () => Promise<void> } {
  return {
    now: Date.now(),
    throttle: createThrottle(MIN_REQUEST_INTERVAL_MS, Date.now, sleep),
    throttleFor: (intervalMs) => createThrottle(intervalMs, Date.now, sleep),
    onProgress: progressReporter((line) => process.stderr.write(`${line}\n`)),
  };
}

function withPeriod(cmd: Command, defaultDays: number, text: string): Command {
  return cmd
    .option('--days <n>', `последние N дней (по умолчанию ${text})`, parseDaysArg)
    .option('--from <date>', 'с даты ГГГГ-ММ-ДД (UTC)', parseDateArg)
    .option('--to <date>', 'по дату ГГГГ-ММ-ДД включительно (UTC)', parseDateArg);
}

function print<T>(cmd: Command, value: T, render: (v: T) => string): void {
  const { json } = cmd.optsWithGlobals<{ json?: boolean }>();
  console.log(formatOutput(value, Boolean(json), render));
}

/** Register `trades`, `operations`, `pnl`, `deliveries`, `funds` (FR-7, FR-8, FR-9, FR-13). */
export function registerHistoryCommands(program: Command): void {
  withPeriod(program.command('trades').description('история сделок: цена, объём, комиссия; IV и базовый актив по опционам'), TRADES_DEFAULT_DAYS, '30, до 2 лет')
    .option('--category <c>', 'spot, linear, inverse или option', parseCategoryArg)
    .option('--symbol <s>', 'один инструмент, например BTCUSDT')
    .action(async (o: PeriodArgs & { category?: TradeCategory; symbol?: string }, cmd: Command) => {
      const deps = liveDeps();
      print(cmd, await trades(client(), { period: resolvePeriod(o, TRADES_DEFAULT_DAYS, deps.now), category: o.category, symbol: o.symbol }, deps), renderTrades);
    });
  withPeriod(program.command('operations').description('журнал операций с итогами по типам'), OPERATIONS_DEFAULT_DAYS, '30, до 2 лет')
    .option('--type <t>', 'тип операции, например TRADE, SETTLEMENT, DELIVERY')
    .option('--currency <c>', 'валюта, например USDT')
    .action(async (o: PeriodArgs & { type?: string; currency?: string }, cmd: Command) => {
      const deps = liveDeps();
      print(cmd, await operations(client(), { period: resolvePeriod(o, OPERATIONS_DEFAULT_DAYS, deps.now), type: o.type, currency: o.currency }, deps), renderOperations);
    });
  withPeriod(program.command('pnl').description('реализованный результат: закрытые позиции, экспирации, фандинг'), PNL_DEFAULT_DAYS, 'вся глубина биржи, 2 года').action(
    async (o: PeriodArgs, cmd: Command) => {
      const deps = liveDeps();
      print(cmd, await pnl(client(), { period: resolvePeriod(o, PNL_DEFAULT_DAYS, deps.now) }, deps), renderPnl);
    },
  );
  withPeriod(program.command('deliveries').description('исполнения на экспирации: контракт, цена расчёта, результат'), DELIVERIES_DEFAULT_DAYS, '2 года')
    .option('--coin <coin>', 'базовая монета, например BTC')
    .action(async (o: PeriodArgs & { coin?: string }, cmd: Command) => {
      const deps = liveDeps();
      print(cmd, await deliveries(client(), { period: resolvePeriod(o, DELIVERIES_DEFAULT_DAYS, deps.now), coin: o.coin }, deps), renderDeliveries);
    });
  program
    .command('funds')
    .description('нетто-ввод средств с первой операции (2023-11-20), стоимость счёта и результат')
    .action(async (_o: unknown, cmd: Command) => {
      print(cmd, await funds(client(), liveDeps()), renderFunds);
    });
}
