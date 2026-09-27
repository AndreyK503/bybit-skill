/** Raw list items of the history endpoints (docs v5: order/execution, account/transaction-log, position, asset/delivery). */

export interface RawExecution {
  symbol: string;
  side: string;
  execId: string;
  execPrice: string;
  execQty: string;
  execValue: string;
  execFee: string;
  feeCurrency?: string;
  isMaker: boolean;
  execType: string;
  execTime: string;
  tradeIv: string;
  markIv: string;
  underlyingPrice: string;
  indexPrice: string;
}

export interface RawTransaction {
  id: string;
  symbol: string;
  category: string;
  side: string;
  transactionTime: string;
  type: string;
  qty: string;
  size: string;
  currency: string;
  tradePrice: string;
  funding: string;
  fee: string;
  cashFlow: string;
  change: string;
  cashBalance: string;
}

export interface RawClosedPnl {
  symbol: string;
  side: string;
  closedSize: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  closedPnl: string;
  updatedTime: string;
}

export interface RawClosedOption {
  symbol: string;
  side: string;
  qty: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  deliveryPrice: string;
  totalOpenFee: string;
  totalCloseFee: string;
  deliveryFee: string;
  totalPnl: string;
  openTime: number;
  closeTime: number;
}

export interface RawDelivery {
  symbol: string;
  side: string;
  position: string;
  entryPrice?: string;
  deliveryPrice: string;
  strike: string;
  fee: string;
  deliveryRpl: string;
  deliveryTime: number;
}
