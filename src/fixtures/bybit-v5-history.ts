/**
 * Bybit V5 response fixtures for stage E4 (history).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/...):
 * - EXECUTION_LINEAR: order/execution.mdx, "Response Example", the single list item (verbatim).
 * - TRANSACTION_LOG: account/transaction-log.mdx, "Response Example", the three list items (verbatim).
 *   Note: the SETTLEMENT and the first TRADE item share one `id`.
 * - CLOSED_PNL: position/close-pnl.mdx, "Response Example", the single list item (verbatim).
 * - CLOSED_OPTIONS: position/close-position.mdx, "Response Example", both list items (verbatim).
 * - DELIVERY: asset/delivery.mdx, "Response Example", the single list item (verbatim).
 *
 * Live records from the user's account 2026-09-27 (docs have no option example):
 * - EXECUTION_OPTION: /v5/execution/list?category=option, one item as returned.
 * - EXECUTION_FUNDING: /v5/execution/list?category=linear&execType=Funding, one item as returned.
 * - TLOG_OPTION_TRADE: /v5/account/transaction-log?category=option, TRADE item as returned.
 * - TLOG_OPTION_DELIVERY: /v5/account/transaction-log?category=option, DELIVERY item as returned.
 */

export const EXECUTION_LINEAR = {
  symbol: 'ETHPERP',
  orderType: 'Market',
  underlyingPrice: '',
  orderLinkId: '',
  side: 'Buy',
  indexPrice: '',
  orderId: '8c065341-7b52-4ca9-ac2c-37e31ac55c94',
  stopOrderType: 'UNKNOWN',
  leavesQty: '0',
  execTime: '1672282722429',
  feeCurrency: '',
  isMaker: false,
  execFee: '0.071409',
  feeRate: '0.0006',
  execId: 'e0cbe81d-0f18-5866-9415-cf319b5dab3b',
  tradeIv: '',
  blockTradeId: '',
  markPrice: '1183.54',
  execPrice: '1190.15',
  markIv: '',
  orderQty: '0.1',
  orderPrice: '1236.9',
  execValue: '119.015',
  execType: 'Trade',
  execQty: '0.1',
  closedSize: '',
  extraFees: '',
  seq: 4688002127,
};

export const EXECUTION_OPTION = {
  symbol: 'MNT-30OCT26-0.56-P-USDT',
  orderType: 'Limit',
  underlyingPrice: '0.6982',
  orderLinkId: '7544545149115431060',
  orderId: '0cb101ff-28da-46cd-9ff8-20a7b1c458e2',
  stopOrderType: 'UNKNOWN',
  execTime: '1790467250961',
  feeCurrency: 'USDT',
  createType: 'CreateByUser',
  execFeeV2: '0.20831841',
  feeRate: '0.0003',
  tradeIv: '0.733253',
  blockTradeId: '',
  markPrice: '0.01413021',
  execPrice: '0.0116',
  markIv: '0.7869',
  orderQty: '1000',
  orderPrice: '0.0116',
  execValue: '11.6',
  closedSize: '0',
  execType: 'Trade',
  seq: 16437715384,
  side: 'Sell',
  indexPrice: '0.69439467',
  leavesQty: '0',
  isMaker: false,
  execFee: '0.20831841',
  execId: '15b8baae-5ab8-5b70-8e05-fdacaf0241dc',
  marketUnit: '',
  execQty: '1000',
  extraFees: '',
};

export const EXECUTION_FUNDING = {
  symbol: 'MNTUSDT',
  orderType: 'UNKNOWN',
  underlyingPrice: '',
  orderLinkId: '',
  orderId: '857d7328-99b5-488c-a5d9-8321a7f2c6fe',
  stopOrderType: 'UNKNOWN',
  execTime: '1790524800000',
  feeCurrency: 'USDT',
  createType: '',
  execFeeV2: '0.29850517',
  feeRate: '0.000049',
  tradeIv: '',
  blockTradeId: '',
  markPrice: '0.6729',
  execPrice: '0.6729',
  markIv: '',
  orderQty: '0',
  orderPrice: '0',
  execValue: '6056.1',
  closedSize: '0',
  execType: 'Funding',
  seq: 281223096243,
  side: 'Sell',
  indexPrice: '',
  leavesQty: '0',
  isMaker: false,
  execFee: '0.29850517',
  execId: '4d72a335-767e-4370-855b-061ef78be498',
  marketUnit: '',
  execQty: '9000',
  extraFees: '',
};

export const TRANSACTION_LOG = [
  {
    transSubType: '',
    id: '592324_XRPUSDT_161440249321',
    symbol: 'XRPUSDT',
    side: 'Buy',
    funding: '-0.003676',
    orderLinkId: '',
    orderId: '1672128000-8-592324-1-2',
    fee: '0.00000000',
    change: '-0.003676',
    cashFlow: '0',
    transactionTime: '1672128000000',
    type: 'SETTLEMENT',
    feeRate: '0.0001',
    bonusChange: '',
    size: '100',
    qty: '100',
    cashBalance: '5086.55825002',
    currency: 'USDT',
    category: 'linear',
    tradePrice: '0.3676',
    tradeId: '534c0003-4bf7-486f-aa02-78cee36825e4',
    extraFees: '',
  },
  {
    transSubType: '',
    id: '592324_XRPUSDT_161440249321',
    symbol: 'XRPUSDT',
    side: 'Buy',
    funding: '',
    orderLinkId: 'linear-order',
    orderId: '592b7e41-78fd-42e2-9aa3-91e1835ef3e1',
    fee: '0.01908720',
    change: '-0.0190872',
    cashFlow: '0',
    transactionTime: '1672121182224',
    type: 'TRADE',
    feeRate: '0.0006',
    bonusChange: '-0.1430544',
    size: '100',
    qty: '88',
    cashBalance: '5086.56192602',
    currency: 'USDT',
    category: 'linear',
    tradePrice: '0.3615',
    tradeId: '5184f079-88ec-54c7-8774-5173cafd2b4e',
    extraFees: '',
  },
  {
    transSubType: '',
    id: '592324_XRPUSDT_161407743011',
    symbol: 'XRPUSDT',
    side: 'Buy',
    funding: '',
    orderLinkId: 'linear-order',
    orderId: '592b7e41-78fd-42e2-9aa3-91e1835ef3e1',
    fee: '0.00260280',
    change: '-0.0026028',
    cashFlow: '0',
    transactionTime: '1672121182224',
    type: 'TRADE',
    feeRate: '0.0006',
    bonusChange: '',
    size: '12',
    qty: '12',
    cashBalance: '5086.58101322',
    currency: 'USDT',
    category: 'linear',
    tradePrice: '0.3615',
    tradeId: '8569c10f-5061-5891-81c4-a54929847eb3',
    extraFees: '',
  },
];

export const TLOG_OPTION_TRADE = {
  transSubType: '',
  symbol: 'MNT-30OCT26-0.56-P-USDT',
  side: 'Sell',
  funding: '0',
  orderLinkId: '7544545149115431060',
  orderId: '0cb101ff-28da-46cd-9ff8-20a7b1c458e2',
  fee: '0.20831841',
  change: '11.39168159',
  cashFlow: '11.6',
  transactionTime: '1790467250961',
  type: 'TRADE',
  feeRate: '0.0003',
  bonusChange: '0',
  displayType: 'TRADE',
  size: '-1000',
  qty: '1000',
  cashBalance: '14554.23022671',
  currency: 'USDT',
  id: '116442203_MNT-30OCT26-0.56-P-USDT_16437715384-0',
  category: 'option',
  tradePrice: '0.0116',
  extraFees: '',
  tradeId: '15b8baae-5ab8-5b70-8e05-fdacaf0241dc',
};

export const TLOG_OPTION_DELIVERY = {
  transSubType: '',
  symbol: 'SOL-25SEP26-110-C-USDT',
  side: 'Buy',
  funding: '0',
  orderLinkId: '',
  orderId: '',
  fee: '0.6972337',
  change: '-186.8657098',
  cashFlow: '-186.1684761',
  transactionTime: '1790323201527',
  type: 'DELIVERY',
  feeRate: '0.0002',
  bonusChange: '0',
  displayType: 'DELIVERY',
  size: '0',
  qty: '30',
  cashBalance: '12824.35972602',
  currency: 'USDT',
  id: 'userDelivery-373642-24265043444-116442203_0',
  category: 'option',
  tradePrice: '116.20561587',
  extraFees: '',
  tradeId: '',
};

export const CLOSED_PNL = {
  symbol: 'ETHPERP',
  orderType: 'Market',
  leverage: '3',
  updatedTime: '1672214887236',
  side: 'Sell',
  orderId: '5a373bfe-188d-4913-9c81-d57ab5be8068',
  closedPnl: '-47.4065323',
  avgEntryPrice: '1194.97516667',
  qty: '3',
  cumEntryValue: '3584.9255',
  createdTime: '1672214887231',
  orderPrice: '1122.95',
  closedSize: '3',
  avgExitPrice: '1180.59833333',
  execType: 'Trade',
  fillCount: '4',
  cumExitValue: '3541.795',
};

export const CLOSED_OPTIONS = [
  {
    symbol: 'BTC-12JUN25-104019-C-USDT',
    side: 'Sell',
    totalOpenFee: '0.94506647',
    deliveryFee: '0.32184533',
    totalCloseFee: '0.00000000',
    qty: '0.02',
    closeTime: 1749726002161,
    avgExitPrice: '107281.77405000',
    deliveryPrice: '107281.77405031',
    openTime: 1749722990063,
    avgEntryPrice: '3371.50000000',
    totalPnl: '0.90760719',
  },
  {
    symbol: 'BTC-12JUN25-104000-C-USDT',
    side: 'Buy',
    totalOpenFee: '0.86379999',
    deliveryFee: '0.32287622',
    totalCloseFee: '0.00000000',
    qty: '0.02',
    closeTime: 1749715220240,
    avgExitPrice: '107625.40470150',
    deliveryPrice: '107625.40470159',
    openTime: 1749710568608,
    avgEntryPrice: '3946.50000000',
    totalPnl: '-7.60858218',
  },
];

export const DELIVERY = {
  symbol: 'BTC-29DEC22-16000-P',
  side: 'Buy',
  deliveryTime: 1672300800860,
  strike: '16000',
  fee: '0.00000000',
  position: '0.01',
  deliveryPrice: '16541.86369547',
  deliveryRpl: '3.5',
};

/** Envelope with a list page; `category` only where the endpoint returns it. */
export function listPage(list: unknown[], nextPageCursor = '', category?: string) {
  return { retCode: 0, retMsg: 'OK', result: { ...(category ? { category } : {}), list, nextPageCursor }, retExtInfo: {}, time: 1672284129153 };
}

/**
 * Test route like the exchange: rows of the requested category (key '' when the endpoint has none)
 * whose time field is within the inclusive [startTime, endTime] (live 2026-09-27).
 */
export function timeRoute(rows: Record<string, Record<string, unknown>[]>, timeField: string) {
  return (url: URL) => {
    const s = Number(url.searchParams.get('startTime'));
    const e = Number(url.searchParams.get('endTime'));
    const list = (rows[url.searchParams.get('category') ?? ''] ?? []).filter((r) => Number(r[timeField]) >= s && Number(r[timeField]) <= e);
    return listPage(list, '', url.searchParams.get('category') ?? undefined);
  };
}
