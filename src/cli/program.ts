import { Command } from 'commander';
import { registerAccountCommands } from './register-account.js';
import { registerHistoryCommands } from './register-history.js';
import { registerMarketCommands } from './register-market.js';
import { registerOptionCommands } from './register-options.js';
import { registerSessionCommands } from './register-session.js';

/** Build the root CLI program. Commands are registered by stage (plan section 10). */
export function buildProgram(): Command {
  const program = new Command()
    .name('bybit')
    .description('Read-only access to a Bybit account')
    .version('1.0.3')
    .option('--json', 'машинный вывод (JSON)');
  registerSessionCommands(program);
  registerAccountCommands(program);
  registerOptionCommands(program);
  registerHistoryCommands(program);
  registerMarketCommands(program);
  return program;
}
