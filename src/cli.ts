import { spawnSync } from 'node:child_process';
import { buildProgram } from './cli/program.js';
import { SYSTEM_CA_FLAG, bootstrapEnv, printError, shouldRelaunchWithSystemCa } from './cli/runtime.js';

// No top-level await: the bundle is CommonJS (plan section 2).
bootstrapEnv();
buildProgram()
  .parseAsync()
  .catch((err: unknown) => {
    if (!shouldRelaunchWithSystemCa(err, process.execArgv, process.env, process.allowedNodeEnvironmentFlags)) return printError(err);
    console.error(`Сертификат сети не признан встроенным списком Node: повтор с системным хранилищем сертификатов (${SYSTEM_CA_FLAG}).`);
    const child = spawnSync(process.execPath, [SYSTEM_CA_FLAG, ...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit' });
    process.exitCode = child.status ?? 1;
  });
