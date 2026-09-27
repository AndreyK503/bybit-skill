import { describe, expect, it } from 'vitest';
import { parseOptionSymbol } from './symbol.js';

/**
 * Symbols: docs enum "symbol" (Option): BTC-13FEB25-89000-P-USDT is a USDT option,
 * ETH-28FEB25-2800-C a USDC option. MNT-9OCT26-0.85-C-USDT and BTC-27NOV26-104000-C-USDT
 * are live symbols (2026-09-27): one-digit day, decimal strike.
 */
describe('parseOptionSymbol', () => {
  it('parses a USDT option', () => {
    expect(parseOptionSymbol('BTC-27NOV26-104000-C-USDT')).toEqual({
      baseCoin: 'BTC',
      expiryDate: '2026-11-27',
      strike: 104000,
      type: 'Call',
      settleCoin: 'USDT',
    });
  });

  it('parses the docs enum USDT put', () => {
    expect(parseOptionSymbol('BTC-13FEB25-89000-P-USDT')).toEqual({
      baseCoin: 'BTC',
      expiryDate: '2025-02-13',
      strike: 89000,
      type: 'Put',
      settleCoin: 'USDT',
    });
  });

  it('no suffix is USDC', () => {
    expect(parseOptionSymbol('ETH-28FEB25-2800-C')).toEqual({
      baseCoin: 'ETH',
      expiryDate: '2025-02-28',
      strike: 2800,
      type: 'Call',
      settleCoin: 'USDC',
    });
  });

  it('decimal strike, one-digit day', () => {
    expect(parseOptionSymbol('MNT-9OCT26-0.85-C-USDT')).toEqual({
      baseCoin: 'MNT',
      expiryDate: '2026-10-09',
      strike: 0.85,
      type: 'Call',
      settleCoin: 'USDT',
    });
  });

  it.each(['BTCUSDT', 'BTCUSDT-21FEB25', 'BTC-24MAR23', 'BTC-30FOO26-100-C', 'BTC-32DEC26-100-C', 'BTC-30FEB26-100-C', 'BTC-30DEC26-abc-C', 'BTC-30DEC26-100-X', ''])(
    'rejects non-option %j',
    (symbol) => {
      expect(parseOptionSymbol(symbol)).toBeNull();
    },
  );
});
