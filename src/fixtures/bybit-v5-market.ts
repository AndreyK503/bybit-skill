/**
 * Bybit V5 response fixtures for stage E6 (market data and search).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/market/..., fetched 2026-09-28):
 * - SPOT_TICKER: tickers.mdx, "Response Example", Spot tab, the single list item (verbatim).
 * - INVERSE_TICKER: tickers.mdx, "Response Example", Inverse tab, the single list item (verbatim).
 * - LINEAR_TICKER: the docs have no Linear tab; the Inverse item with symbol BTCUSDT (docs: linear and
 *   inverse share one field list).
 * - SPOT_INSTRUMENT: instrument.mdx, "Response Example", Spot tab, the single list item (verbatim).
 * - LINEAR_INSTRUMENT, PRELAUNCH_INSTRUMENT: instrument.mdx, Linear tab, BTCUSDT and the pre-market
 *   BIOUSDT items (verbatim; nextPageCursor of the BIOUSDT page is `first%3DBIOUSDT%26last%3DBIOUSDT`).
 * - KLINE_LIST: kline.mdx, "Response Example", list (verbatim; newest first).
 * - ORDERBOOK: orderbook.mdx, "Response Example" (verbatim).
 * - OPTION_BASE_COINS: option-base-coins.mdx, "Response Example", BTC and SPCX items (verbatim).
 */

export const SPOT_TICKER = {
  symbol: 'BTCUSDT',
  bid1Price: '20517.96',
  bid1Size: '2',
  ask1Price: '20527.77',
  ask1Size: '1.862172',
  lastPrice: '20533.13',
  prevPrice24h: '20393.48',
  price24hPcnt: '0.0068',
  highPrice24h: '21128.12',
  lowPrice24h: '20318.89',
  turnover24h: '243765620.65899866',
  volume24h: '11801.27771',
  usdIndexPrice: '20784.12009279',
};

export const INVERSE_TICKER = {
  symbol: 'BTCUSD',
  lastPrice: '120635.50',
  indexPrice: '114890.92',
  markPrice: '114898.43',
  prevPrice24h: '105595.90',
  price24hPcnt: '0.142425',
  highPrice24h: '131309.30',
  lowPrice24h: '102007.60',
  prevPrice1h: '119806.10',
  openInterest: '240113967',
  openInterestValue: '2089.79',
  turnover24h: '115.6907',
  volume24h: '13713832.0000',
  fundingRate: '0.0001',
  nextFundingTime: '1760371200000',
  predictedDeliveryPrice: '',
  basisRate: '',
  deliveryFeeRate: '',
  deliveryTime: '0',
  ask1Size: '9854',
  bid1Price: '103401.00',
  ask1Price: '109152.80',
  bid1Size: '1063',
  basis: '',
  preOpenPrice: '',
  preQty: '',
  curPreListingPhase: '',
  fundingIntervalHour: '8',
  basisRateYear: '',
  fundingCap: '0.005',
};

export const LINEAR_TICKER = { ...INVERSE_TICKER, symbol: 'BTCUSDT' };

export function tickerPage(category: string, list: object[]) {
  return { retCode: 0, retMsg: 'OK', result: { category, list }, retExtInfo: {}, time: 1673859087947 };
}

export const SPOT_INSTRUMENT = {
  symbolId: 9,
  symbol: 'BTCUSDT',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  innovation: '0',
  status: 'Trading',
  marginTrading: 'utaOnly',
  stTag: '0',
  lotSizeFilter: {
    basePrecision: '0.000001',
    quotePrecision: '0.0000001',
    minOrderQty: '0.000011',
    maxOrderQty: '83',
    minOrderAmt: '5',
    maxOrderAmt: '8000000',
    maxLimitOrderQty: '83',
    maxMarketOrderQty: '41.5',
    postOnlyMaxLimitOrderSize: '60000',
  },
  priceFilter: { tickSize: '0.1' },
  riskParameters: { priceLimitRatioX: '0.005', priceLimitRatioY: '0.01' },
  symbolType: '',
};

export const LINEAR_INSTRUMENT = {
  symbol: 'BTCUSDT',
  symbolId: 5,
  contractType: 'LinearPerpetual',
  status: 'Trading',
  baseCoin: 'BTC',
  quoteCoin: 'USDT',
  launchTime: '1585526400000',
  deliveryTime: '0',
  deliveryFeeRate: '',
  priceScale: '2',
  leverageFilter: { minLeverage: '1', maxLeverage: '100.00', leverageStep: '0.01' },
  priceFilter: { minPrice: '0.10', maxPrice: '1999999.80', tickSize: '0.10' },
  lotSizeFilter: {
    maxOrderQty: '1190.000',
    minOrderQty: '0.001',
    qtyStep: '0.001',
    postOnlyMaxOrderQty: '1190.000',
    maxMktOrderQty: '500.000',
    minNotionalValue: '5',
  },
  unifiedMarginTrade: true,
  fundingInterval: 480,
  settleCoin: 'USDT',
  copyTrading: 'both',
  upperFundingRate: '0.00375',
  lowerFundingRate: '-0.00375',
  isPreListing: false,
  preListingInfo: null,
  riskParameters: { priceLimitRatioX: '0.01', priceLimitRatioY: '0.02' },
  symbolType: '',
};

/** Pre-market item of the docs Linear tab; preListingInfo trimmed to null (not read by the skill). */
export const PRELAUNCH_INSTRUMENT = {
  ...LINEAR_INSTRUMENT,
  symbol: 'BIOUSDT',
  status: 'PreLaunch',
  baseCoin: 'BIO',
  launchTime: '1735032510000',
  priceScale: '4',
  isPreListing: true,
};

export const PRELAUNCH_CURSOR = 'first%3DBIOUSDT%26last%3DBIOUSDT';

export function instrumentPage(category: string, list: object[], nextPageCursor?: string) {
  const result = nextPageCursor === undefined ? { category, list } : { category, list, nextPageCursor };
  return { retCode: 0, retMsg: 'OK', result, retExtInfo: {}, time: 1735809771618 };
}

export const KLINE_LIST = [
  ['1670608800000', '17071', '17073', '17027', '17055.5', '268611', '15.74462667'],
  ['1670605200000', '17071.5', '17071.5', '17061', '17071', '4177', '0.24469757'],
  ['1670601600000', '17086.5', '17088', '16978', '17071.5', '6356', '0.37288112'],
];

export function klinePage(category: string, symbol: string, list: string[][]) {
  return { retCode: 0, retMsg: 'OK', result: { symbol, category, list }, retExtInfo: {}, time: 1672025956592 };
}

export const ORDERBOOK = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    s: 'BTCUSDT',
    a: [['65557.7', '16.606555']],
    b: [['65485.47', '47.081829']],
    ts: 1716863719031,
    u: 230704,
    seq: 1432604333,
    cts: 1716863718905,
  },
  retExtInfo: {},
  time: 1716863719382,
};

export const OPTION_BASE_COINS = {
  retCode: 0,
  retMsg: 'success',
  result: {
    list: [
      { baseCoin: 'BTC', quoteCoin: 'USDT', settleCoin: 'USDT', optionShowName: 'BTC-Options', optionOnlineTime: 1739952000000, hasSymbol: 1, underlyingType: 0 },
      { baseCoin: 'SPCX', quoteCoin: 'USDT', settleCoin: 'USDT', optionShowName: 'SPCX-Options', optionOnlineTime: 1789675200000, hasSymbol: 1, underlyingType: 2 },
    ],
  },
  retExtInfo: {},
  time: 1790055708162,
};

/** Live answer to an unknown symbol (tickers, 2026-09-28). */
export const NOT_SUPPORTED_SYMBOLS = { retCode: 10001, retMsg: 'Not supported symbols', result: {}, retExtInfo: {}, time: 1790574047095 };

/** Test route for instruments-info: one page per category, filtered by `symbol` when it is passed. */
export function instrumentsRoute(byCategory: Record<string, { symbol: string }[]>) {
  return (url: URL) => {
    const category = url.searchParams.get('category') ?? '';
    const symbol = url.searchParams.get('symbol');
    const list = (byCategory[category] ?? []).filter((i) => symbol === null || i.symbol === symbol);
    return instrumentPage(category, list, category === 'spot' ? undefined : '');
  };
}

/** Live answers for a non-existent option BTC-30OCT26-100000-C-USDT (2026-09-28): each endpoint says it differently. */
export const MISSING_OPTION = 'BTC-30OCT26-100000-C-USDT';
export const MISSING_OPTION_TICKERS = { retCode: 0, retMsg: 'SUCCESS', result: { category: 'option', list: [] }, retExtInfo: {}, time: 1790575418944 };
export const MISSING_OPTION_ORDERBOOK = { retCode: 0, retMsg: 'SUCCESS', result: [], retExtInfo: {}, time: 1790575419898 };
export const MISSING_OPTION_INSTRUMENT = { retCode: 110023, retMsg: 'The contract is not available for trades.', result: { category: 'option', nextPageCursor: '', list: [] }, retExtInfo: {}, time: 1790575420000 };

/** Live answers for NOPEUSDT with an explicit category (2026-09-28): 10001, text differs per endpoint. */
const bad = (retMsg: string, result: object = {}) => ({ retCode: 10001, retMsg, result, retExtInfo: {}, time: 1790575668650 });
export const NOPE_SPOT_TICKERS = bad('Not supported symbols');
export const NOPE_LINEAR_ORDERBOOK = bad('params error: symbol invalid');
export const NOPE_LINEAR_KLINE = bad('params error: Symbol Is Invalid');
export const NOPE_LINEAR_INSTRUMENT = bad('params error: symbol invalid', { category: '', list: [], nextPageCursor: '' });
