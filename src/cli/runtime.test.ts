import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';
import { formatOutput } from './runtime.js';

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
