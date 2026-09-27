/** Raw Bybit V5 account/asset/position shapes, only the fields this skill reads. All numbers are strings (D-4). */

export interface RawPosition {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  positionValue: string;
  unrealisedPnl: string;
  leverage: string;
  liqPrice: string;
  positionIM: string;
  positionMM: string;
}

export interface RawWalletCoin {
  coin: string;
  equity: string;
  usdValue: string;
  walletBalance: string;
  locked: string;
  borrowAmount: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
  marginCollateral: boolean;
}

export interface RawWalletAccount {
  totalEquity: string;
  totalWalletBalance: string;
  totalMarginBalance: string;
  totalAvailableBalance: string;
  totalPerpUPL: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  accountIMRate: string;
  accountMMRate: string;
  coin: RawWalletCoin[];
}

export interface RawWalletBalance {
  list: RawWalletAccount[];
}

export interface RawAccountInfo {
  marginMode: string;
  unifiedMarginStatus: number;
}

export interface RawOptionAsset {
  coin: string;
  totalUPL: string;
  totalRPL: string;
  totalDelta: string;
  assetIM: string;
  assetMM: string;
}

export interface RawFundBalance {
  balance: { coin: string; walletBalance: string; transferBalance: string }[];
}

export interface RawAssetOverview {
  list: { accountType: string; totalEquity: string }[];
}

export interface RawTickers {
  list: { symbol: string; lastPrice: string }[];
}
