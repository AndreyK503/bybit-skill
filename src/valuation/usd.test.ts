import { describe, expect, it } from 'vitest';
import { WALLET_COIN } from '../fixtures/bybit-v5-account.js';
import { estimateUsd, isUnvaluedCoin } from './usd.js';

/**
 * BTCUSDT lastPrice 20533.13: docs market/tickers.mdx, Spot example.
 * 0.001 x 20533.13 = 20.53313 (by hand).
 * Unvalued rule: docs websocket/private/wallet.mdx, usdValue: "If this coin cannot be collateral, then it is 0".
 */
const PRICES = new Map([['BTCUSDT', '20533.13']]);

describe('estimateUsd', () => {
  it('stablecoin USDT and USDC are 1:1, noted as exact', () => {
    for (const coin of ['USDT', 'USDC']) {
      const e = estimateUsd(coin, '3', PRICES);
      expect(e.usd).toBe(3);
      expect(e.note).toMatch(/стейблкоин/i);
    }
  });

  it('other coin: amount x lastPrice of COINUSDT, note names the pair and price', () => {
    const e = estimateUsd('BTC', '0.001', PRICES);
    expect(e.usd).toBeCloseTo(20.53313, 10);
    expect(e.note).toContain('BTCUSDT');
    expect(e.note).toContain('20533.13');
  });

  it('no COINUSDT pair -> null with a reason, not 0', () => {
    const e = estimateUsd('ADA', '5', PRICES);
    expect(e.usd).toBeNull();
    expect(e.note).toMatch(/нет/);
    expect(e.note).toContain('ADAUSDT');
  });
});

describe('isUnvaluedCoin', () => {
  it('held, not collateral, usdValue "0" -> unvalued', () => {
    expect(isUnvaluedCoin({ ...WALLET_COIN, equity: '0.5', usdValue: '0', marginCollateral: false })).toBe(true);
  });

  it('docs example coin (equity 0) -> not unvalued', () => {
    expect(isUnvaluedCoin(WALLET_COIN)).toBe(false);
  });

  it('collateral coin with a value -> not unvalued', () => {
    expect(isUnvaluedCoin({ ...WALLET_COIN, equity: '1', usdValue: '999.8', marginCollateral: true })).toBe(false);
  });
});
