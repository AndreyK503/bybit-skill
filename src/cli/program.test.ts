import { describe, expect, it } from 'vitest';
import { buildProgram } from './program.js';

describe('buildProgram', () => {
  it('creates the root command named bybit', () => {
    expect(buildProgram().name()).toBe('bybit');
  });
});
