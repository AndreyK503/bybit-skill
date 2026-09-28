import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';
import { AppError } from '../api/errors.js';
import { formatOutput, shouldRelaunchWithSystemCa } from './runtime.js';

describe('formatOutput (NFR-5)', () => {
  const value = { a: 1, b: 'x' };
  const render = (v: typeof value) => `a=${v.a} b=${v.b}`;

  it('--json prints machine-readable JSON', () => {
    expect(JSON.parse(formatOutput(value, true, render))).toEqual(value);
  });

  it('without --json prints human text', () => {
    expect(formatOutput(value, false, render)).toBe('a=1 b=x');
  });
});

describe('CLI registration', () => {
  it('has session status and a global --json flag', () => {
    const program = buildProgram();
    const session = program.commands.find((c) => c.name() === 'session');
    expect(session?.commands.map((c) => c.name())).toContain('status');
    expect(program.options.map((o) => o.long)).toContain('--json');
  });
});

describe('review fixes: printError with BYBIT_DEBUG (D-10)', () => {
  it('prints message, code and details but not the key from a client failure', async () => {
    const { BybitClient } = await import('../api/client.js');
    const { printError } = await import('./runtime.js');
    const creds = { apiKey: 'LEAKKEY123456', apiSecret: 'LEAKSECRET987654' };
    const fetchFn = (async () => {
      throw new TypeError(`Headers.append: "${creds.apiKey}" is an invalid header value.`);
    }) as typeof fetch;
    const err = await new BybitClient({ credentials: creds, baseUrl: 'https://api.bybit.com', fetchFn })
      .getPrivate('/v5/account/info')
      .catch((e: unknown) => e);
    const lines: string[] = [];
    const orig = console.error;
    const prevDebug = process.env.BYBIT_DEBUG;
    const prevExit = process.exitCode;
    console.error = (...args: unknown[]) => lines.push(args.map(String).join(' '));
    process.env.BYBIT_DEBUG = '1';
    try {
      printError(err);
    } finally {
      console.error = orig;
      process.env.BYBIT_DEBUG = prevDebug;
      process.exitCode = prevExit;
    }
    const out = lines.join('\n');
    expect(out).toContain('[APP_UNAVAILABLE]');
    expect(out).not.toContain(creds.apiKey);
    expect(out).not.toContain(creds.apiSecret);
  });
});

describe('E2 CLI registration', () => {
  it('has portfolio, balance and positions commands', () => {
    const names = buildProgram().commands.map((c) => c.name());
    expect(names).toEqual(expect.arrayContaining(['portfolio', 'balance', 'positions']));
  });
});

describe('relaunch with the system certificate store (corporate TLS interception)', () => {
  const tlsError = new AppError({ code: 'APP_TLS_UNTRUSTED', userMessage: 'x' });
  const supported = new Set(['--use-system-ca']);

  it('untrusted certificate, flag supported and not yet used -> relaunch', () => {
    expect(shouldRelaunchWithSystemCa(tlsError, [], {}, supported)).toBe(true);
  });

  it('already running with the flag (argv or NODE_OPTIONS) -> no relaunch loop', () => {
    expect(shouldRelaunchWithSystemCa(tlsError, ['--use-system-ca'], {}, supported)).toBe(false);
    expect(shouldRelaunchWithSystemCa(tlsError, [], { NODE_OPTIONS: '--use-system-ca' }, supported)).toBe(false);
  });

  it('Node without the flag -> no relaunch, the error is shown', () => {
    expect(shouldRelaunchWithSystemCa(tlsError, [], {}, new Set())).toBe(false);
  });

  it('any other error -> no relaunch', () => {
    expect(shouldRelaunchWithSystemCa(new AppError({ code: 'APP_UNAVAILABLE', userMessage: 'x' }), [], {}, supported)).toBe(false);
    expect(shouldRelaunchWithSystemCa(new Error('x'), [], {}, supported)).toBe(false);
  });
});
