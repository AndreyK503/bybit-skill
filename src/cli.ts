import { buildProgram } from './cli/program.js';
import { bootstrapEnv, printError } from './cli/runtime.js';

// No top-level await: the bundle is CommonJS (plan section 2).
bootstrapEnv();
buildProgram().parseAsync().catch(printError);
