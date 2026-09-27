/** Stablecoins valued at exactly 1 USD (D-8). */
export const USD_STABLECOINS = ['USDT', 'USDC'];

/** A UTA coin the exchange does not value: held, not collateral, usdValue "0" (docs: WebSocket wallet, usdValue). */
export function isUnvaluedCoin(coin: { equity: string; usdValue: string; marginCollateral: boolean }): boolean {
  throw new Error(`not implemented: ${coin.equity}`);
}

export interface UsdEstimate {
  usd: number | null;
  note: string;
}

/** USD value of a coin amount: stablecoin 1:1, else amount x lastPrice of COINUSDT from spot tickers. */
export function estimateUsd(coin: string, amount: string, spotLastPrice: Map<string, string>): UsdEstimate {
  throw new Error(`not implemented: ${coin} ${amount} ${spotLastPrice.size}`);
}
