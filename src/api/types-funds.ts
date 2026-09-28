/** Raw list items of the money-movement endpoints (docs v5: asset/deposit, asset/withdraw, asset/fund-history, market/kline). */

export interface RawDeposit {
  id: string;
  coin: string;
  chain: string;
  amount: string;
  status: number;
  depositFee: string;
  /** ms */
  successAt: string;
}

export interface RawInternalDeposit {
  id: string;
  coin: string;
  amount: string;
  /** 1 processing, 2 success, 3 failed */
  status: number;
  /** seconds, unlike the other sources */
  createdTime: string;
}

export interface RawWithdrawal {
  withdrawId: string;
  coin: string;
  chain: string;
  amount: string;
  withdrawFee: string;
  status: string;
  withdrawType: number;
  /** ms */
  createTime: string;
}

/** Funding-account journal row; `description` is the stable machine key, `descriptionEn` its English text. */
export interface RawFundingRow {
  currency: string;
  ioDirection: string;
  txnAmt: string;
  /** seconds */
  createTime: string;
  showBusiType: string;
  showBusiTypeEn: string;
  description: string;
  descriptionEn: string;
  currcCursor: string;
}

/** [startTime, open, high, low, close, volume, turnover], newest first. */
export type RawKline = string[];
