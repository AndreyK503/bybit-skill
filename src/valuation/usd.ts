/** Stablecoins valued at exactly 1 USD (D-8). */
export const USD_STABLECOINS = ['USDT', 'USDC'];

/** A UTA coin the exchange does not value: held, not collateral, usdValue "0" (docs: WebSocket wallet, usdValue). */
export function isUnvaluedCoin(coin: { equity: string; usdValue: string; marginCollateral: boolean }): boolean {
  return Number(coin.equity) !== 0 && Number(coin.usdValue) === 0 && !coin.marginCollateral;
}

export interface UsdEstimate {
  usd: number | null;
  note: string;
}

/** USD value of a coin amount: stablecoin 1:1, else amount x lastPrice of COINUSDT from spot tickers. */
export function estimateUsd(coin: string, amount: string, spotLastPrice: Map<string, string>): UsdEstimate {
  if (USD_STABLECOINS.includes(coin)) return { usd: Number(amount), note: 'Стейблкоин, принят равным 1 USD: точная оценка.' };
  const pair = `${coin}USDT`;
  const price = spotLastPrice.get(pair);
  if (price === undefined) return { usd: null, note: `На Bybit нет спотовой пары ${pair}: оценка в долларах невозможна.` };
  return { usd: Number(amount) * Number(price), note: `Количество × lastPrice ${pair} = ${price} (спот Bybit, на момент запроса).` };
}
