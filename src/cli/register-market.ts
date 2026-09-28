import { InvalidArgumentError, type Command } from 'commander';
import { BybitClient } from '../api/client.js';
import type { Category } from '../api/types-market.js';
import type { CatalogDeps } from '../catalog/catalog.js';
import { CANDLE_INTERVALS, HISTORY_DEFAULT_DAYS, history, renderHistory, type CandleInterval } from '../commands/history.js';
import { instrument, renderInstrument } from '../commands/instrument.js';
import { ORDERBOOK_MAX_DEPTH, orderbook, renderOrderbook } from '../commands/orderbook.js';
import { quote, renderQuote } from '../commands/quote.js';
import { renderSearch, search } from '../commands/search.js';
import { CACHE_DIR, resolveBaseUrl } from '../config/config.js';
import { resolvePeriod, type PeriodArgs } from '../util/period.js';
import { parseCategoryArg, parseDateArg, parseDaysArg } from './register-history.js';
import { formatOutput } from './runtime.js';

/** `--interval D|W|M` (any case): daily and longer only (decision 2026-09-28). */
export function parseIntervalArg(value: string): CandleInterval {
  const v = value.toUpperCase() as CandleInterval;
  if (!CANDLE_INTERVALS.includes(v)) throw new InvalidArgumentError('интервал свечей: D (день), W (неделя) или M (месяц).');
  return v;
}

/** `--depth N`: integer 1..1000. */
export function parseDepthArg(value: string): number {
  const n = Number(value);
  if (!/^\d+$/.test(value) || n < 1 || n > ORDERBOOK_MAX_DEPTH) throw new InvalidArgumentError(`глубина стакана — целое от 1 до ${ORDERBOOK_MAX_DEPTH}.`);
  return n;
}

/** Market data is public: no key is read. */
const client = () => new BybitClient({ baseUrl: resolveBaseUrl(process.env) });
const deps = (): CatalogDeps => ({ cacheDir: CACHE_DIR, now: Date.now(), warn: (line) => process.stderr.write(`${line}\n`) });

function print<T>(cmd: Command, value: T, render: (v: T) => string): void {
  const { json } = cmd.optsWithGlobals<{ json?: boolean }>();
  console.log(formatOutput(value, Boolean(json), render));
}

type SymbolOpts = { category?: Category };
const CATEGORY_HELP = 'spot, linear, inverse или option (по умолчанию — по справочнику)';

/** Register `quote`, `history`, `orderbook`, `instrument`, `search` (FR-10, FR-11). */
export function registerMarketCommands(program: Command): void {
  program
    .command('quote')
    .description('котировка; тикер из нескольких разделов — по каждому')
    .argument('<symbol>', 'тикер, например BTCUSDT')
    .option('--category <c>', CATEGORY_HELP, parseCategoryArg)
    .action(async (symbol: string, o: SymbolOpts, cmd: Command) => print(cmd, await quote(client(), { symbol, ...o }, deps()), renderQuote));
  program
    .command('history')
    .description('свечи: дневные, недельные, месячные; при споте и бессрочном — спот')
    .argument('<symbol>', 'тикер, например BTCUSDT')
    .option('--category <c>', CATEGORY_HELP, parseCategoryArg)
    .option('--interval <i>', 'D, W или M (по умолчанию D)', parseIntervalArg)
    .option('--days <n>', `последние N дней (по умолчанию ${HISTORY_DEFAULT_DAYS}, до 3 лет и глубже)`, parseDaysArg)
    .option('--from <date>', 'с даты ГГГГ-ММ-ДД (UTC)', parseDateArg)
    .option('--to <date>', 'по дату ГГГГ-ММ-ДД включительно (UTC)', parseDateArg)
    .action(async (symbol: string, o: PeriodArgs & SymbolOpts & { interval?: CandleInterval }, cmd: Command) => {
      const d = deps();
      const period = resolvePeriod(o, HISTORY_DEFAULT_DAYS, d.now);
      print(cmd, await history(client(), { symbol, category: o.category, interval: o.interval ?? 'D', period }, d), renderHistory);
    });
  program
    .command('orderbook')
    .description('стакан; при споте и бессрочном — спот')
    .argument('<symbol>', 'тикер, например BTCUSDT')
    .option('--category <c>', CATEGORY_HELP, parseCategoryArg)
    .option('--depth <n>', 'уровней на сторону (по умолчанию 25, у опционов не больше 25)', parseDepthArg)
    .action(async (symbol: string, o: SymbolOpts & { depth?: number }, cmd: Command) => print(cmd, await orderbook(client(), { symbol, ...o }, deps()), renderOrderbook));
  program
    .command('instrument')
    .description('карточка инструмента: статус, шаги цены и количества, плечо, даты')
    .argument('<symbol>', 'тикер, например BTCUSDT')
    .option('--category <c>', CATEGORY_HELP, parseCategoryArg)
    .action(async (symbol: string, o: SymbolOpts, cmd: Command) => print(cmd, await instrument(client(), { symbol, ...o }, deps()), renderInstrument));
  program
    .command('search')
    .description('поиск по тикеру: спот, бессрочные, фьючерсы; опционы — по монете')
    .argument('<query>', 'часть тикера, например sol')
    .action(async (query: string, _o: unknown, cmd: Command) => print(cmd, await search(client(), query, deps()), renderSearch));
}
