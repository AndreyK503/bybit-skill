import { POSITION } from './bybit-v5-account.js';

/**
 * Bybit V5 response fixtures for stage E3 (options).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/...):
 * - COIN_GREEKS: account/coin-greeks.mdx, "Response Example" (verbatim).
 * - OPTION_TICKER: market/tickers.mdx, "Response Example", Option tab, the single list item (verbatim).
 * - OPTION_INSTRUMENT: market/instrument.mdx, "Response Example", Option tab, the single list item (verbatim).
 * - PORTFOLIO_MARGIN: asset/portfolio-margin.mdx, "Response Example" (verbatim).
 * - OPTION_POSITION: position/position.mdx example item (docs example is inverse and has no greeks);
 *   symbol, side, size, prices and greeks replaced with the live option position
 *   MNT-30OCT26-0.56-P-USDT observed on the user's account 2026-09-27.
 */

export const COIN_GREEKS = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    list: [
      {
        baseCoin: 'BTC',
        totalDelta: '0.00004001',
        totalGamma: '-0.00000009',
        totalVega: '-0.00039689',
        totalTheta: '0.01243824',
      },
    ],
  },
  retExtInfo: {},
  time: 1672287887942,
};

export const OPTION_TICKER = {
  symbol: 'BTC-30DEC22-18000-C',
  bid1Price: '0',
  bid1Size: '0',
  bid1Iv: '0',
  ask1Price: '435',
  ask1Size: '0.66',
  ask1Iv: '5',
  lastPrice: '435',
  highPrice24h: '435',
  lowPrice24h: '165',
  markPrice: '0.00000009',
  indexPrice: '16600.55',
  markIv: '0.7567',
  underlyingPrice: '16590.42',
  openInterest: '6.3',
  turnover24h: '2482.73',
  volume24h: '0.15',
  totalVolume: '99',
  totalTurnover: '1967653',
  delta: '0.00000001',
  gamma: '0.00000001',
  vega: '0.00000004',
  theta: '-0.00000152',
  predictedDeliveryPrice: '0',
  change24h: '86',
};

export const OPTION_INSTRUMENT = {
  symbol: 'BTC-27MAR26-70000-P-USDT',
  status: 'Trading',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  settleCoin: 'USDT',
  optionsType: 'Put',
  launchTime: '1743669649256',
  deliveryTime: '1774598400000',
  deliveryFeeRate: '0.00015',
  priceFilter: { minPrice: '5', maxPrice: '1110000', tickSize: '5' },
  lotSizeFilter: { maxOrderQty: '500', minOrderQty: '0.01', qtyStep: '0.01' },
  displayName: 'BTCUSDT-27MAR26-70000-P',
};

export const OPTION_POSITION = {
  ...POSITION,
  symbol: 'MNT-30OCT26-0.56-P-USDT',
  side: 'Sell',
  size: '1000',
  avgPrice: '0.0162',
  markPrice: '0.01394745',
  positionValue: '13.94745',
  unrealisedPnl: '2.25255',
  leverage: '',
  liqPrice: '',
  positionIM: '',
  positionMM: '',
  delta: '174.02817',
  gamma: '-1670.55842',
  vega: '-0.51935',
  theta: '0.60409',
};

export function tickersPage(list: (typeof OPTION_TICKER)[]) {
  return { retCode: 0, retMsg: 'OK', result: { category: 'option', list }, retExtInfo: {}, time: 1672376592395 };
}

export function instrumentsPage(list: (typeof OPTION_INSTRUMENT)[], nextPageCursor: string) {
  return { retCode: 0, retMsg: 'OK', result: { category: 'option', nextPageCursor, list }, retExtInfo: {}, time: 1672712537130 };
}

export function optionPositionPage(list: (typeof OPTION_POSITION)[], nextPageCursor: string) {
  return { retCode: 0, retMsg: 'OK', result: { list, nextPageCursor, category: 'option' }, retExtInfo: {}, time: 1697684980172 };
}

const BTC_ALL_RANGES = [
  { priceScale: '-0.1', pnls: ['-1004.74710000'] },
  { priceScale: '-0.08', pnls: ['-807.88000000'] },
  { priceScale: '-0.06', pnls: ['-610.19020000'] },
  { priceScale: '-0.04', pnls: ['-411.59200000'] },
  { priceScale: '-0.02', pnls: ['-212.00760000'] },
  { priceScale: '0.0', pnls: ['-11.36910000'] },
  { priceScale: '0.02', pnls: ['191.78950000'] },
  { priceScale: '0.04', pnls: ['396.10080000'] },
  { priceScale: '0.06', pnls: ['601.59360000'] },
  { priceScale: '0.08', pnls: ['808.28220000'] },
  { priceScale: '0.1', pnls: ['1016.16720000'] },
];

const BTC_PERP_RANGES = [
  { priceScale: '-0.1', pnls: ['-972.14482880'] },
  { priceScale: '-0.08', pnls: ['-777.71586304'] },
  { priceScale: '-0.06', pnls: ['-583.28689728'] },
  { priceScale: '-0.04', pnls: ['-388.85793152'] },
  { priceScale: '-0.02', pnls: ['-194.42896576'] },
  { priceScale: '0.0', pnls: ['0.00000000'] },
  { priceScale: '0.02', pnls: ['194.42896576'] },
  { priceScale: '0.04', pnls: ['388.85793152'] },
  { priceScale: '0.06', pnls: ['583.28689728'] },
  { priceScale: '0.08', pnls: ['777.71586304'] },
  { priceScale: '0.1', pnls: ['972.14482880'] },
];

const BTC_OPTION_RANGES = [
  { priceScale: '-0.1', pnls: ['-39.65273684'] },
  { priceScale: '-0.08', pnls: ['-35.80450518'] },
  { priceScale: '-0.06', pnls: ['-31.13352117'] },
  { priceScale: '-0.04', pnls: ['-25.55420042'] },
  { priceScale: '-0.02', pnls: ['-18.98866670'] },
  { priceScale: '0.0', pnls: ['-11.36906857'] },
  { priceScale: '0.02', pnls: ['-2.63944748'] },
  { priceScale: '0.04', pnls: ['7.24291762'] },
  { priceScale: '0.06', pnls: ['18.30672359'] },
  { priceScale: '0.08', pnls: ['30.56641060'] },
  { priceScale: '0.1', pnls: ['44.02244694'] },
];

const BTC_OPTION_POSITION_RANGES = [
  { priceScale: '-0.1', pnls: ['-24.06747339', '-33.15841013', '-39.65273684'] },
  { priceScale: '-0.08', pnls: ['-18.12509537', '-28.31048642', '-35.80450518'] },
  { priceScale: '-0.06', pnls: ['-11.36193138', '-22.62748031', '-31.13352117'] },
  { priceScale: '-0.04', pnls: ['-3.73852526', '-16.04846592', '-25.55420042'] },
  { priceScale: '-0.02', pnls: ['4.77766694', '-8.52041879', '-18.98866670'] },
  { priceScale: '0.0', pnls: ['14.21190294', '0.00067229', '-11.36906857'] },
  { priceScale: '0.02', pnls: ['24.58198339', '9.54902598', '-2.63944748'] },
  { priceScale: '0.04', pnls: ['35.89827143', '20.14862960', '7.24291762'] },
  { priceScale: '0.06', pnls: ['48.16388381', '31.81313064', '18.30672359'] },
  { priceScale: '0.08', pnls: ['61.37503018', '44.54603289', '30.56641060'] },
  { priceScale: '0.1', pnls: ['75.52147477', '58.34116026', '44.02244694'] },
];

export const PM_ASSET = {
  baseCoin: 'BTC',
  totalPnlRanges: {
    ALL: { pnlRanges: BTC_ALL_RANGES },
    PERPETUAL: { pnlRanges: BTC_PERP_RANGES },
    OPTION: { pnlRanges: BTC_OPTION_RANGES },
  },
  perpPositionPnlRanges: [
    {
      symbolName: 'BTCUSDT',
      position: '0.038',
      pnlRanges: BTC_PERP_RANGES,
      sessionAvgPrice: '75995.4295',
      markPrice: '255902.31000000',
      orderSize: '0.0',
      contractType: 2,
      settleCoin: 'USDT',
      symbolAlias: 'BTCUSDT',
    },
  ],
  optionExpiryDatePnlRanges: [
    {
      expiryDateRepresentation: '25SEP26',
      pnlRanges: BTC_OPTION_POSITION_RANGES,
      optionPositionPnlRanges: [
        {
          symbolName: 'BTC-25SEP26-80000-C-USDT',
          position: '0.02',
          pnlRanges: BTC_OPTION_POSITION_RANGES,
          sessionAvgPrice: '0',
          markPrice: '2608.56395729',
          orderSize: '0.0',
          contractType: 5,
          settleCoin: 'USDT',
        },
      ],
    },
  ],
  contingency: {
    optionContingency: '0.00000000',
    futureDeltaContingency: '56.89174177',
    optionVegaContingency: '0.00000000',
    contingencyComponents: '57.69544638',
    usdtUsdcContingency: '0.00000000',
    futureContingency: '0.80370460',
  },
  asset: { coin: 'BTC', assetIM: '1274.8190514137673', assetMM: '1062.3492095114727' },
  maxLossPriceMove: '-0.1',
  maxLossIvShock: '-0.2',
  totalClosePzFee: '-0.2',
  spotHedgeInfo: {
    hedgeSpotSize: '-0.00100006',
    walletBalance: '-0.00000007',
    usdIndexPrice: '0',
    pnlRanges: [
      { priceScale: '-0.1', pnls: ['7.05047869'] },
      { priceScale: '-0.08', pnls: ['5.64038295'] },
      { priceScale: '-0.06', pnls: ['4.23028721'] },
      { priceScale: '-0.04', pnls: ['2.82019147'] },
      { priceScale: '-0.02', pnls: ['1.41009574'] },
      { priceScale: '0.0', pnls: ['0'] },
      { priceScale: '0.02', pnls: ['0'] },
      { priceScale: '0.04', pnls: ['0'] },
      { priceScale: '0.06', pnls: ['0'] },
      { priceScale: '0.08', pnls: ['0'] },
      { priceScale: '0.1', pnls: ['0'] },
    ],
  },
  maxLossIvShockList: ['-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2', '-0.2'],
};

export const PM_WALLET = {
  equity: '52197.86892104',
  cashBalance: '45391.74423708',
  marginBalance: '52145.70917115',
  availableBalance: '50893.36062347',
  accountIM: '1304.50829757',
  accountMM: '1069.93399838',
  accountMMRate: '0.0204',
  accountIMRate: '0.0249',
};

export function portfolioMarginPage(assetPnlRange: unknown[], wallet: unknown = PM_WALLET) {
  return { retCode: 0, retMsg: 'Success', result: { wallet, assetPnlRange }, retExtInfo: {}, time: 1774319290506 };
}

export const PORTFOLIO_MARGIN = portfolioMarginPage([PM_ASSET]);
