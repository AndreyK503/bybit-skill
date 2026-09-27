import { Command } from 'commander';
import { registerAccountCommands } from './register-account.js';
import { registerHistoryCommands } from './register-history.js';
import { registerOptionCommands } from './register-options.js';
import { registerSessionCommands } from './register-session.js';

/** Build the root CLI program. Commands are registered by stage (plan section 10). */
export function buildProgram(): Command {
  const program = new Command()
    .name('bybit')
    .description('Read-only access to a Bybit account')
    .version('0.1.0')
    .option('--json', 'машинный вывод (JSON)');
  registerSessionCommands(program);
  registerAccountCommands(program);
  registerOptionCommands(program);
  registerHistoryCommands(program);
  return program;
}
