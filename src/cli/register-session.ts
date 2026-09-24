import type { Command } from 'commander';
import { BybitClient } from '../api/client.js';
import { renderSessionStatus, sessionStatus } from '../commands/session-status.js';
import { readCredentials, resolveBaseUrl } from '../config/config.js';
import { formatOutput } from './runtime.js';

/** Register `session status` (FR-1). */
export function registerSessionCommands(program: Command): void {
  const session = program.command('session').description('состояние доступа к бирже');
  session
    .command('status')
    .description('ключ, права, окружение, часы, связь с биржей')
    .action(async (_opts: unknown, cmd: Command) => {
      const { json } = cmd.optsWithGlobals<{ json?: boolean }>();
      const client = new BybitClient({ credentials: readCredentials(process.env), baseUrl: resolveBaseUrl(process.env) });
      const status = await sessionStatus(client, Date.now);
      console.log(formatOutput(status, Boolean(json), renderSessionStatus));
    });
}
