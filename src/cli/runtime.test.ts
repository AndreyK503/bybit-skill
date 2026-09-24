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
