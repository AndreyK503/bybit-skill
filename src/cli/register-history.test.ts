import { InvalidArgumentError } from 'commander';
import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';
import { parseCategoryArg, parseDateArg, parseDaysArg } from './register-history.js';
import { progressReporter } from './runtime.js';

describe('history commands', () => {
  const cmd = (name: string) => buildProgram().commands.find((c) => c.name() === name);

  it('registers trades, operations, pnl, deliveries with period flags and their filters', () => {
    const longs = (name: string) => cmd(name)?.options.map((o) => o.long).sort();
    expect(longs('trades')).toEqual(['--category', '--days', '--from', '--symbol', '--to']);
    expect(longs('operations')).toEqual(['--currency', '--days', '--from', '--to', '--type']);
    expect(longs('pnl')).toEqual(['--days', '--from', '--to']);
    expect(longs('deliveries')).toEqual(['--coin', '--days', '--from', '--to']);
  });

  it('--days: a positive integer', () => {
    expect(parseDaysArg('7')).toBe(7);
    for (const bad of ['0', '-3', '1.5', 'abc', '']) expect(() => parseDaysArg(bad)).toThrow(InvalidArgumentError);
  });

  it('--from/--to: YYYY-MM-DD calendar date only', () => {
    expect(parseDateArg('2026-09-01')).toBe('2026-09-01');
    for (const bad of ['01.09.2026', '2026-02-30', '2026-9-1']) expect(() => parseDateArg(bad)).toThrow(InvalidArgumentError);
  });

  it('--category: spot, linear, inverse, option', () => {
    expect(parseCategoryArg('OPTION')).toBe('option');
    expect(() => parseCategoryArg('futures')).toThrow(InvalidArgumentError);
  });
});

describe('progressReporter (NFR-7)', () => {
  const lines = (total: number) => {
    const out: string[] = [];
    const report = progressReporter((s) => out.push(s));
    for (let i = 1; i <= total; i++) report('сделки', i, total);
    return out;
  };

  it('long collection: one line per 10% of windows, the last says done', () => {
    const out = lines(20);
    expect(out).toHaveLength(10);
    expect(out.at(-1)).toContain('20 из 20');
  });

  it('short collection: a line per window', () => {
    expect(lines(3)).toHaveLength(3);
  });
});
