import type { Command } from 'commander';
import { BybitClient } from '../api/client.js';
import { balance, renderBalance } from '../commands/balance.js';
import { portfolio, renderPortfolio } from '../commands/portfolio.js';
import { positions, renderPositions } from '../commands/positions.js';
import { loadCredentials, resolveBaseUrl } from '../config/config.js';
import { formatOutput } from './runtime.js';

/** Data commands need a configured key: APP_KEY_MISSING otherwise. */
function dataClient(): BybitClient {
  return new BybitClient({ credentials: loadCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
}

function register<T>(program: Command, name: string, description: string, run: (c: BybitClient) => Promise<T>, render: (r: T) => string) {
  program
    .command(name)
    .description(description)
    .action(async (_opts: unknown, cmd: Command) => {
      const { json } = cmd.optsWithGlobals<{ json?: boolean }>();
      console.log(formatOutput(await run(dataClient()), Boolean(json), render));
    });
}

/** Register `portfolio`, `balance`, `positions` (FR-2, FR-3, FR-4). */
export function registerAccountCommands(program: Command): void {
  register(program, 'portfolio', 'сводка счёта: капитал, маржа, результат, распределение', portfolio, renderPortfolio);
  register(program, 'balance', 'остатки по монетам: торговый счёт и кошелёк финансирования', balance, renderBalance);
  register(program, 'positions', 'открытые позиции: бессрочные, инверсные, опционы', positions, renderPositions);
}
