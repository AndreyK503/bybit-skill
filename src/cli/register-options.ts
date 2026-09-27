import { InvalidArgumentError, type Command } from 'commander';
import { BybitClient } from '../api/client.js';
import { optChain, renderOptChain, type ChainOptions, type OptionType } from '../commands/opt-chain.js';
import { optExpiries, renderOptExpiries } from '../commands/opt-expiries.js';
import { optGreeks, renderOptGreeks } from '../commands/opt-greeks.js';
import { optMargin, renderOptMargin } from '../commands/opt-margin.js';
import { optPositions, renderOptPositions } from '../commands/opt-positions.js';
import { loadCredentials, resolveBaseUrl } from '../config/config.js';
import { formatOutput } from './runtime.js';

/** `--expiry YYYY-MM-DD`: a real calendar date, else InvalidArgumentError. */
export function parseExpiryArg(value: string): string {
  const ms = Date.parse(`${value}T00:00:00Z`);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(ms) && new Date(ms).toISOString().startsWith(value);
  if (!ok) throw new InvalidArgumentError('дата экспирации в формате ГГГГ-ММ-ДД, например 2026-10-30.');
  return value;
}

/** `--type call|put` (any case) to the exchange spelling. */
export function parseTypeArg(value: string): OptionType {
  const v = value.toLowerCase();
  if (v === 'call') return 'Call';
  if (v === 'put') return 'Put';
  throw new InvalidArgumentError('тип контракта: call или put.');
}

/** `--min-strike` / `--max-strike`: a finite number. */
export function parseStrikeArg(value: string): number {
  const n = Number(value);
  if (value.trim() === '' || !Number.isFinite(n)) throw new InvalidArgumentError('страйк — число, например 60000 или 0.85.');
  return n;
}

/** Account data needs a key: APP_KEY_MISSING otherwise. */
const accountClient = () => new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
/** Market data is public: no key is read. */
const marketClient = () => new BybitClient({ baseUrl: resolveBaseUrl(process.env) });

function print<T>(cmd: Command, value: T, render: (v: T) => string): void {
  const { json } = cmd.optsWithGlobals<{ json?: boolean }>();
  console.log(formatOutput(value, Boolean(json), render));
}

/** Register `opt positions|greeks|margin|chain|expiries` (FR-5, FR-6). */
export function registerOptionCommands(program: Command): void {
  const opt = program.command('opt').description('опционы: позиции, греки, маржа, доска, экспирации');
  opt
    .command('positions')
    .description('опционные позиции: контракт, дни до экспирации, греки')
    .action(async (_o: unknown, cmd: Command) => print(cmd, await optPositions(accountClient()), renderOptPositions));
  opt
    .command('greeks')
    .description('нетто-греки опционов по базовой монете')
    .option('--coin <coin>', 'одна базовая монета, например BTC')
    .action(async (o: { coin?: string }, cmd: Command) => print(cmd, await optGreeks(accountClient(), o), renderOptGreeks));
  opt
    .command('margin')
    .description('маржа Portfolio Margin по монетам и вклад опционов в худший сценарий')
    .action(async (_o: unknown, cmd: Command) => print(cmd, await optMargin(accountClient()), renderOptMargin));
  opt
    .command('chain')
    .description('доска опционов по монете; по умолчанию ближайшая экспирация')
    .argument('<coin>', 'базовая монета, например BTC')
    .option('--expiry <date>', 'дата экспирации ГГГГ-ММ-ДД', parseExpiryArg)
    .option('--type <type>', 'call или put', parseTypeArg)
    .option('--min-strike <n>', 'страйк от (включительно)', parseStrikeArg)
    .option('--max-strike <n>', 'страйк до (включительно)', parseStrikeArg)
    .action(async (coin: string, o: Omit<ChainOptions, 'coin'>, cmd: Command) => print(cmd, await optChain(marketClient(), { ...o, coin }), renderOptChain));
  opt
    .command('expiries')
    .description('даты экспирации; без монеты — по всем монетам')
    .argument('[coin]', 'базовая монета, например BTC')
    .action(async (coin: string | undefined, _o: unknown, cmd: Command) => print(cmd, await optExpiries(marketClient(), { coin }), renderOptExpiries));
}
