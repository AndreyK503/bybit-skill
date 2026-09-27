/** Raw Bybit V5 option shapes, only the fields this skill reads. All numbers are strings (D-4). */

export interface RawOptionPosition {
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  unrealisedPnl: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
}

export interface RawOptionInstrument {
  symbol: string;
  baseCoin: string;
  optionsType: string;
  deliveryTime: string;
}

export interface RawOptionTicker {
  symbol: string;
  bid1Price: string;
  bid1Size: string;
  bid1Iv: string;
  ask1Price: string;
  ask1Size: string;
  ask1Iv: string;
  markPrice: string;
  markIv: string;
  underlyingPrice: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
  volume24h: string;
  openInterest: string;
}

export interface RawCoinGreeks {
  list: { baseCoin: string; totalDelta: string; totalGamma: string; totalVega: string; totalTheta: string }[];
}

export interface RawPnlRange {
  priceScale: string;
  pnls: string[];
}

export interface RawPmAsset {
  baseCoin: string;
  totalPnlRanges: Partial<Record<'ALL' | 'PERPETUAL' | 'OPTION', { pnlRanges: RawPnlRange[] }>>;
  optionExpiryDatePnlRanges: { optionPositionPnlRanges: { symbolName: string; position: string; pnlRanges: RawPnlRange[] }[] }[];
  contingency: { contingencyComponents: string };
  asset: { assetIM: string; assetMM: string };
  maxLossPriceMove: string;
  maxLossIvShock: string;
}

export interface RawPortfolioMargin {
  wallet: { equity: string; marginBalance: string; accountIM: string; accountMM: string; accountIMRate: string; accountMMRate: string };
  assetPnlRange: RawPmAsset[];
}
