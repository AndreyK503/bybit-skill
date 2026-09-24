import { buildProgram } from './cli/program.js';

// No top-level await: the bundle is CommonJS (plan section 2).
buildProgram()
  .parseAsync()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
