import type { BybitClient } from '../api/client.js';

export interface AccountTotals {
  marginMode: string;
  totalEquity: string;
  totalWalletBalance: string;
  totalMarginBalance: string;
  totalAvailableBalance: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  accountIMRate: string;
  accountMMRate: string;
  totalPerpUPL: string;
}

export interface PortfolioCoin {
  coin: string;
  equity: string;
  usdValue: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
}

export interface OptionAsset {
  coin: string;
  totalUPL: string;
  totalRPL: string;
  totalDelta: string;
  assetIM: string;
  assetMM: string;
}

/** FR-2: account summary. Raw exchange values; derived values only in computed. */
export interface PortfolioResult {
  account: AccountTotals;
  coins: PortfolioCoin[];
  options: OptionAsset[];
  positionCounts: { linear: number; inverse: number; option: number };
  computed: {
    unrealisedPnlTotal: number | null;
    coinShares: Record<string, number>;
    unvaluedCoins: string[];
  };
  computedNotes: {
    unrealisedPnlTotal: string;
    coinShares: string;
    unvaluedCoins: string;
    realised: string;
  };
}

export async function portfolio(client: BybitClient): Promise<PortfolioResult> {
  throw new Error(`not implemented: ${client.baseUrl}`);
}

export function renderPortfolio(result: PortfolioResult): string {
  throw new Error(`not implemented: ${result.coins.length}`);
}
