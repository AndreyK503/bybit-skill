import { Command } from 'commander';

/** Build the root CLI program. Commands are registered by stage (plan section 10). */
export function buildProgram(): Command {
  return new Command()
    .name('bybit')
    .description('Read-only access to a Bybit account')
    .version('0.1.0');
}
