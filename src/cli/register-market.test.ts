import { InvalidArgumentError } from 'commander';
import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';
import { parseDepthArg, parseIntervalArg } from './register-market.js';

describe('market commands', () => {
  it('registers quote, history, orderbook, instrument, search', () => {
    const names = buildProgram().commands.map((c) => c.name());
    for (const n of ['quote', 'history', 'orderbook', 'instrument', 'search']) expect(names).toContain(n);
  });

  it('history takes a symbol, --category, --interval and a period', () => {
    const cmd = buildProgram().commands.find((c) => c.name() === 'history');
    expect(cmd?.registeredArguments.map((a) => [a.name(), a.required])).toEqual([['symbol', true]]);
    expect(cmd?.options.map((o) => o.long).sort()).toEqual(['--category', '--days', '--from', '--interval', '--to']);
  });

  it('interval: D, W, M in any case; minutes and hours refused (decision 2026-09-28)', () => {
    expect(parseIntervalArg('d')).toBe('D');
    expect(parseIntervalArg('W')).toBe('W');
    expect(parseIntervalArg('m')).toBe('M');
    for (const bad of ['1', '60', '240', 'H', '']) expect(() => parseIntervalArg(bad), bad).toThrow(InvalidArgumentError);
  });

  it('depth: integer 1..1000', () => {
    expect(parseDepthArg('1')).toBe(1);
    expect(parseDepthArg('1000')).toBe(1000);
    for (const bad of ['0', '1001', '2.5', 'x', '']) expect(() => parseDepthArg(bad), bad).toThrow(InvalidArgumentError);
  });
});
