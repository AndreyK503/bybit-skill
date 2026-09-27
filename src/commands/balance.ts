import type { BybitClient } from '../api/client.js';

export interface UnifiedCoinView {
  coin: string;
  equity: string;
  walletBalance: string;
  locked: string;
  borrowAmount: string;
  usdValue: string;
}

export interface FundingCoinView {
  coin: string;
  walletBalance: string;
  transferBalance: string;
}

/** FR-3: balances split by trading account (UTA) and funding wallet. */
export interface BalanceResult {
  unified: { totalEquity: string; coins: UnifiedCoinView[] };
  funding: { totalEquity: string | null; coins: FundingCoinView[] };
  computed: {
    unvaluedCoins: string[];
    fundingUsd: Record<string, number | null>;
    totalUsd: number | null;
  };
  computedNotes: {
    unvaluedCoins: string;
    fundingUsd: Record<string, string>;
    totalUsd: string;
  };
}

export async function balance(client: BybitClient): Promise<BalanceResult> {
  throw new Error(`not implemented: ${client.baseUrl}`);
}

export function renderBalance(result: BalanceResult): string {
  throw new Error(`not implemented: ${result.unified.coins.length}`);
}
