import { InvalidArgumentError } from 'commander';
import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';
import { parseExpiryArg, parseStrikeArg, parseTypeArg } from './register-options.js';

describe('opt commands', () => {
  it('registers opt positions, greeks, margin, chain, expiries', () => {
    const opt = buildProgram().commands.find((c) => c.name() === 'opt');
    expect(opt?.commands.map((c) => c.name()).sort()).toEqual(['chain', 'expiries', 'greeks', 'margin', 'positions']);
  });

  it('chain takes a coin and the four filters', () => {
    const chain = buildProgram().commands.find((c) => c.name() === 'opt')?.commands.find((c) => c.name() === 'chain');
    expect(chain?.registeredArguments.map((a) => [a.name(), a.required])).toEqual([['coin', true]]);
    expect(chain?.options.map((o) => o.long).sort()).toEqual(['--expiry', '--max-strike', '--min-strike', '--type']);
  });

  it('expiries coin is optional, greeks has --coin', () => {
    const opt = buildProgram().commands.find((c) => c.name() === 'opt');
    expect(opt?.commands.find((c) => c.name() === 'expiries')?.registeredArguments.map((a) => a.required)).toEqual([false]);
    expect(opt?.commands.find((c) => c.name() === 'greeks')?.options.map((o) => o.long)).toEqual(['--coin']);
  });

  it('expiry: YYYY-MM-DD calendar date only', () => {
    expect(parseExpiryArg('2026-10-30')).toBe('2026-10-30');
    for (const bad of ['30OCT26', '2026-02-30', '2026-13-01', '2026-1-5']) expect(() => parseExpiryArg(bad)).toThrow(InvalidArgumentError);
  });

  it('type: call or put in any case', () => {
    expect(parseTypeArg('call')).toBe('Call');
    expect(parseTypeArg('PUT')).toBe('Put');
    expect(() => parseTypeArg('straddle')).toThrow(InvalidArgumentError);
  });

  it('strike: a finite number', () => {
    expect(parseStrikeArg('0.85')).toBe(0.85);
    for (const bad of ['abc', '', 'Infinity']) expect(() => parseStrikeArg(bad)).toThrow(InvalidArgumentError);
  });
});
