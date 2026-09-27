/**
 * Bybit V5 response fixtures for stage E2 (account).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/...):
 * - WALLET_BALANCE: account/wallet-balance.mdx, "Response Example" (verbatim).
 * - FUND_BALANCE: asset/balance/all-balance.mdx, "Response Example" (verbatim).
 * - ASSET_OVERVIEW: asset/balance/asset-overview.mdx, "Response Example", trimmed to the
 *   FundingAccount and UnifiedTradingAccount entries (values verbatim).
 * - OPTION_ASSET_INFO: account/option-asset-info.mdx, "Response Example" (verbatim).
 * - POSITION: position/position.mdx, "Response Example", the single list item (verbatim).
 * - SPOT_TICKERS: market/tickers.mdx, "Response Example", Spot tab (verbatim).
 */

export const WALLET_BALANCE = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    list: [
      {
        totalEquity: '3.31216591',
        accountIMRate: '0',
        accountIMRateByMp: '0',
        totalMarginBalance: '3.00326056',
        totalInitialMargin: '0',
        totalInitialMarginByMp: '0',
        accountType: 'UNIFIED',
        totalAvailableBalance: '3.00326056',
        accountMMRate: '0',
        accountMMRateByMp: '0',
        totalPerpUPL: '0',
        totalWalletBalance: '3.00326056',
        accountLTV: '0',
        totalMaintenanceMargin: '0',
        totalMaintenanceMarginByMp: '0',
        coin: [
          {
            availableToBorrow: '3',
            bonus: '0',
            accruedInterest: '0',
            availableToWithdraw: '0',
            totalOrderIM: '0',
            equity: '0',
            totalPositionMM: '0',
            usdValue: '0',
            spotHedgingQty: '0.01592413',
            unrealisedPnl: '0',
            collateralSwitch: true,
            borrowAmount: '0.0',
            totalPositionIM: '0',
            walletBalance: '0',
            cumRealisedPnl: '0',
            locked: '0',
            marginCollateral: true,
            coin: 'BTC',
            spotBorrow: '0',
          },
        ],
      },
    ],
  },
  retExtInfo: {},
  time: 1690872862481,
};

export type WalletCoin = (typeof WALLET_BALANCE.result.list)[number]['coin'][number];
export const WALLET_COIN: WalletCoin = WALLET_BALANCE.result.list[0]!.coin[0]!;
export const WALLET_ACCOUNT = WALLET_BALANCE.result.list[0]!;

export const FUND_BALANCE = {
  retCode: 0,
  retMsg: 'success',
  result: {
    memberId: 'XXXX',
    accountType: 'FUND',
    balance: [{ coin: 'USDC', transferBalance: '0', walletBalance: '0', bonus: '' }],
  },
  retExtInfo: {},
  time: 1675866354913,
};

export const ASSET_OVERVIEW = {
  retCode: 0,
  retMsg: 'Success',
  result: {
    totalEquity: '7457023',
    list: [
      {
        totalEquity: '7175590.45',
        valuationCurrency: 'USD',
        accountType: 'FundingAccount',
        coinDetail: [
          { equity: '100', coin: 'AED' },
          { equity: '97.99999988', coin: 'BTC' },
          { equity: '101', coin: 'SOL' },
          { equity: '9950', coin: 'MNT' },
          { equity: '10000', coin: 'TON' },
          { equity: '98.9', coin: 'ETH' },
          { equity: '12220.5558', coin: 'USDT' },
          { equity: '100000', coin: 'USDC' },
          { equity: '9000', coin: 'NEAR' },
          { equity: '89490', coin: 'ADA' },
        ],
        snapshotTime: '1772449024908',
      },
      {
        totalEquity: '213399.38',
        valuationCurrency: 'USD',
        accountType: 'UnifiedTradingAccount',
        snapshotTime: '1772449024908',
        categories: [
          {
            category: 'crypto',
            equity: '210000.00',
            coinDetail: [
              { equity: '37283.5394', coin: 'USDT' },
              { equity: '2.62897721', coin: 'BTC' },
              { equity: '1', coin: 'ETH' },
            ],
          },
          { category: 'stocks', equity: '3399.38', coinDetail: [{ equity: '399.6', coin: 'AED' }] },
        ],
      },
    ],
  },
  retExtInfo: {},
  time: 1772449024909,
};

export const OPTION_ASSET_INFO = {
  retCode: 0,
  retMsg: 'Success',
  result: {
    result: [
      {
        totalDelta: '0.0118',
        assetIM: '0.0000',
        totalUPL: '-47.6318',
        totalRPL: '-0.2790',
        assetMM: '0.0000',
        coin: 'BTC',
        sendTime: 1773230923530,
      },
    ],
  },
  retExtInfo: {},
  time: 1773230923533,
};

export const POSITION = {
  positionIdx: 0,
  riskId: 1,
  riskLimitValue: '150',
  symbol: 'BTCUSD',
  side: 'Sell',
  size: '300',
  avgPrice: '27464.50441675',
  positionValue: '0.01092319',
  tradeMode: 0,
  positionStatus: 'Normal',
  autoAddMargin: 1,
  adlRankIndicator: 2,
  leverage: '10',
  breakEvenPrice: '93556.73034991',
  positionBalance: '0.00139186',
  markPrice: '28224.50',
  liqPrice: '',
  bustPrice: '999999.00',
  positionMM: '0.0000015',
  positionMMByMp: '0.0000015',
  positionIM: '0.00010923',
  positionIMByMp: '0.00010923',
  tpslMode: 'Full',
  takeProfit: '0.00',
  stopLoss: '0.00',
  trailingStop: '0.00',
  unrealisedPnl: '-0.00029413',
  curRealisedPnl: '0.00013123',
  cumRealisedPnl: '-0.00096902',
  seq: 5723621632,
  isReduceOnly: false,
  mmrSysUpdateTime: '',
  leverageSysUpdatedTime: '',
  sessionAvgPrice: '',
  createdTime: '1676538056258',
  updatedTime: '1697673600012',
};

/** One page of /v5/position/list in the documented envelope. */
export function positionPage(category: string, list: (typeof POSITION)[], nextPageCursor: string) {
  return { retCode: 0, retMsg: 'OK', result: { list, nextPageCursor, category }, retExtInfo: {}, time: 1697684980172 };
}

export const SPOT_TICKERS = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    category: 'spot',
    list: [
      {
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
      },
    ],
  },
  retExtInfo: {},
  time: 1673859087947,
};

/** Earn entry of asset/balance/asset-overview.mdx "Response Example" (verbatim). */
export const ASSET_OVERVIEW_EARN = {
  totalEquity: '20888.1',
  valuationCurrency: 'USD',
  accountType: 'Earn',
  snapshotTime: '1772449024908',
  categories: [
    {
      coinDetail: [
        { equity: '0.3', coin: 'BTC' },
        { equity: '100', coin: 'MNT' },
        { equity: '200', coin: 'USDT' },
      ],
      category: 'Easy Earn',
      equity: '20888.1',
    },
  ],
};

/** Docs asset-overview trimmed to FundingAccount, UnifiedTradingAccount and Earn. */
export const ASSET_OVERVIEW_WITH_EARN = {
  ...ASSET_OVERVIEW,
  result: { ...ASSET_OVERVIEW.result, list: [...ASSET_OVERVIEW.result.list, ASSET_OVERVIEW_EARN] },
};
