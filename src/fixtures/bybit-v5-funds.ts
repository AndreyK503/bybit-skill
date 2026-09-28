/**
 * Bybit V5 response fixtures for stage E5 (money movement).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/...):
 * - DEPOSIT: asset/deposit/deposit-record.mdx, "Response Example", the single row (verbatim).
 * - INTERNAL_DEPOSIT: asset/deposit/internal-deposit-record.mdx, "Response Example", the single row
 *   (verbatim; the docs JSON has a full-width comma and a trailing comma, values unchanged).
 * - WITHDRAWALS: asset/withdraw/withdraw-record.mdx, "Response Example", both rows (verbatim).
 * - FUNDING_EARN_INTEREST: asset/fund-history.mdx, "Response Example", the single row (verbatim).
 *
 * Live rows from the user's account 2026-09-28 (docs show only an Earn row), memberId replaced
 * by the docs example value 290118:
 * - FUNDING_*: /v5/asset/fundinghistory, one row per type as returned.
 * Live public klines 2026-09-28 (/v5/market/kline?category=spot&interval=D):
 * - KLINE_ETHUSDT_20240116: ETHUSDT, the day of INTERNAL_DEPOSIT (2024-01-16).
 * - KLINE_MNTUSDT_20250424: MNTUSDT, the day of FUNDING_SUB_IN (2025-04-24).
 */
import type { RawDeposit, RawFundingRow, RawInternalDeposit, RawKline, RawWithdrawal } from '../api/types-funds.js';

export const DEPOSIT: RawDeposit & Record<string, unknown> = {
  coin: 'USDT',
  chain: 'TRX',
  amount: '999.0496',
  txID: '04bf3fbad2fc85b107a42cfdc5ff83110092b606ca754efa0f032f8b94b3262e',
  status: 3,
  toAddress: 'TDGYpm5zPacnEqKV34TJPuhJhHom9hcXAy',
  tag: '',
  depositFee: '',
  successAt: '1742728163000',
  confirmations: '50',
  txIndex: '0',
  blockHash: '000000000436ab4dabc8a4a87beb2262d2d87f6761a825494c4f1d5ae11b27e8',
  batchReleaseLimit: '-1',
  depositType: '0',
  fromAddress: 'TJ7hhYhVhaxNx6BPyq7yFpqZrQULL3JSdb',
  taxDepositRecordsId: '0',
  taxStatus: 0,
  id: '160237231',
};

export const INTERNAL_DEPOSIT: RawInternalDeposit & Record<string, unknown> = {
  id: '1103',
  amount: '0.1',
  type: 1,
  coin: 'ETH',
  address: 'xxxx***@gmail.com',
  status: 2,
  createdTime: '1705393280',
  fromMemberId: '118027304',
  txID: '77c37e5c-d9fa-41e5-bd13-c9b59d95',
  complianceStatus: 0,
  taxDepositRecordsId: '0',
  taxStatus: 0,
};

export const WITHDRAWALS: (RawWithdrawal & Record<string, unknown>)[] = [
  {
    coin: 'USDC',
    chain: 'ETH',
    amount: '41.43008',
    txID: '0x3d7bddb797f0e86420c982c0723653b8b728fd0ec9953b6b354445848d83a185',
    status: 'success',
    toAddress: '0xE3De6d711e0951d34777b5Cd93c827F822ee8514',
    tag: '',
    withdrawFee: '5',
    createTime: '1742738305000',
    updateTime: '1742738340000',
    withdrawId: '131629076',
    withdrawType: 0,
    fee: '',
    tax: '',
    taxRate: '',
    taxType: '',
  },
  {
    coin: 'USDT',
    chain: 'SOL',
    amount: '951',
    txID: '53j7mUftUboJ2TVb1q3zjwNi9gNGWyQ8xhEpkFovzqaTf8LzuZKzr83XjbG62TZWBkWbn27km7SD6Sc9e1BuWUfJ',
    status: 'success',
    toAddress: 'DhTEGye1vq2PPr8DPWit4HTDprnvnDiqpVHnHSY1Y82p',
    tag: '',
    withdrawFee: '1',
    createTime: '1742729329000',
    updateTime: '1742729437000',
    withdrawId: '131603458',
    withdrawType: 0,
    fee: '',
    tax: '',
    taxRate: '',
    taxType: '',
  },
];

const row = (r: RawFundingRow & { afterAmt: string }) => ({ memberId: '290118', ...r });

export const FUNDING_EARN_INTEREST = row({
  currency: 'BTC',
  ioDirection: 'I',
  txnAmt: '0.00003561',
  afterAmt: '7.5547230662687035',
  createTime: '1772669763',
  showBusiType: 'fundingAccountRecordEarn',
  showBusiTypeEn: 'Earn',
  description: 'fundingAccountRecordFlexSavingInterestDistribution',
  descriptionEn: 'Easy Earn | Flexible Interest Distribution',
  currcCursor: 'NTg2MDQzMTI0OA==',
});

/** Crosses the account boundary: P2P and main-subaccount transfers. */
export const FUNDING_P2P_PURCHASE = row({ currency: 'USDT', ioDirection: 'I', txnAmt: '196.0784', afterAmt: '3578.0446', createTime: '1700481498', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordP2PPurchase', descriptionEn: 'P2P Purchase', currcCursor: 'MjA4MzQ3NTUz' });
export const FUNDING_P2P_SALE = row({ currency: 'USDT', ioDirection: 'O', txnAmt: '80.0000', afterAmt: '116.0310', createTime: '1700977426', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordP2PSale', descriptionEn: 'P2P Sale', currcCursor: 'MjE2NDY1MzU5' });
export const FUNDING_P2P_SALE_CANCELED = row({ currency: 'USDT', ioDirection: 'I', txnAmt: '606.7962', afterAmt: '606.7962', createTime: '1720347680', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordCancelledP2PSale', descriptionEn: 'Canceled P2P Sale', currcCursor: 'MTE0MjY0NjQ4Mw==' });
export const FUNDING_SUB_IN = row({ currency: 'MNT', ioDirection: 'I', txnAmt: '1996.4000', afterAmt: '1996.4000', createTime: '1745476506', showBusiType: 'fundingAccountRecordTransferIn', showBusiTypeEn: 'Transfer in', description: 'fundingAccountRecordTransferFromSubAccount', descriptionEn: 'Main-Subaccount Transfer', currcCursor: 'MjgzMzI2NDkxOQ==' });
export const FUNDING_SUB_OUT = row({ currency: 'USDT', ioDirection: 'O', txnAmt: '300.8834', afterAmt: '0.0000', createTime: '1730184566', showBusiType: 'fundingAccountRecordTransferOut', showBusiTypeEn: 'Transfer out', description: 'fundingAccountRecordTransferOut2SubAccount', descriptionEn: 'Main-Subaccount Transfer', currcCursor: 'MTY2MjIwMTc0OA==' });

/** Inside the account: moves between own wallets, income, conversions, loans, P2P security deposit, rows covered by deposit/withdraw records. */
export const FUNDING_INSIDE = [
  FUNDING_EARN_INTEREST,
  row({ currency: 'USDT', ioDirection: 'I', txnAmt: '10000.4000', afterAmt: '10075.8308', createTime: '1700837024', showBusiType: 'fundingAccountRecordTransferIn', showBusiTypeEn: 'Transfer in', description: 'fundingAccountRecordTransferFromTradingAccount', descriptionEn: 'Transfer from Unified Trading Account', currcCursor: 'MjE0NDUxODU1' }),
  row({ currency: 'USDT', ioDirection: 'O', txnAmt: '10000.0000', afterAmt: '75.4308', createTime: '1700833836', showBusiType: 'fundingAccountRecordTransferOut', showBusiTypeEn: 'Transfer out', description: 'fundingAccountRecordTransfer2TradingAccount', descriptionEn: 'Transfer to Unified Trading Account', currcCursor: 'MjE0Mzg4MTc0' }),
  row({ currency: 'USDT', ioDirection: 'I', txnAmt: '700.0000', afterAmt: '700.0310', createTime: '1700977118', showBusiType: 'fundingAccountRecordTypeDeposit', showBusiTypeEn: 'Deposit', description: 'fundingAccountRecordTypeDeposit', descriptionEn: 'Deposit', currcCursor: 'MjE2NDYyODM4' }),
  row({ currency: 'USDT', ioDirection: 'O', txnAmt: '10000.3000', afterAmt: '75.5308', createTime: '1700837040', showBusiType: 'fundingAccountRecordTypeWithdraw', showBusiTypeEn: 'Withdraw', description: 'fundingAccountRecordWithdraw', descriptionEn: 'Withdrawal', currcCursor: 'MjE0NDUyMTgx' }),
  row({ currency: 'USDC', ioDirection: 'I', txnAmt: '8.340723', afterAmt: '8.340723', createTime: '1716433362', showBusiType: 'fundingAccountRecordConvert', showBusiTypeEn: 'Convert', description: 'fundingAccountRecordConvert', descriptionEn: 'Convert', currcCursor: 'OTM5Njk1NDk3' }),
  row({ currency: 'OBT', ioDirection: 'I', txnAmt: '115.0935', afterAmt: '115.0935', createTime: '1737851034', showBusiType: 'fundingAccountRecordEarn', showBusiTypeEn: 'Earn', description: 'fundingAccountRecordLaunchpoolIssuance', descriptionEn: 'Launchpool Yield', currcCursor: 'MjI3ODQxNTc3MQ==' }),
  row({ currency: 'X', ioDirection: 'I', txnAmt: '1.0000', afterAmt: '3.0000', createTime: '1743123995', showBusiType: 'fundingAccountRecordAirdrop', showBusiTypeEn: 'Airdrop', description: 'fundingAccountRecordAirdropBonus', descriptionEn: 'Airdrop Bonus', currcCursor: 'MjY3MDM0OTUzNQ==' }),
  row({ currency: 'USDT', ioDirection: 'O', txnAmt: '1000.0000', afterAmt: '494.8182', createTime: '1720512234', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordPendingDeposit', descriptionEn: 'Pending Deposit', currcCursor: 'MTE1MDI2MzQ1Mg==' }),
  row({ currency: 'USDT', ioDirection: 'O', txnAmt: '1000.0000', afterAmt: '1.0457', createTime: '1729220359', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordFiatGAFreeze', descriptionEn: 'P2P Security Deposit Frozen', currcCursor: 'MTYwNzQ0OTc0NA==' }),
  row({ currency: 'USDT', ioDirection: 'I', txnAmt: '1000.0000', afterAmt: '1001.0457', createTime: '1729220359', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordConfirmedDeposit', descriptionEn: 'Confirmed Deposit', currcCursor: 'MTYwNzQ0OTc0Mw==' }),
  row({ currency: 'USDT', ioDirection: 'I', txnAmt: '1000.0000', afterAmt: '1000.0000318176877', createTime: '1755526216', showBusiType: 'fundingAccountRecordFiat', showBusiTypeEn: 'Fiat', description: 'fundingAccountRecordFiatGAUNFreeze', descriptionEn: 'Unfreeze P2P Assets', currcCursor: 'MzU4OTQ2NTkxNQ==' }),
  row({ currency: 'USDT', ioDirection: 'O', txnAmt: '200.0000', afterAmt: '0.000081186823279233', createTime: '1759664632', showBusiType: 'fundingAccountRecordFixedRateLoans', showBusiTypeEn: 'Crypto Loans', description: 'fundingAccountRecordFixedRateLoansPledgeIncrease', descriptionEn: 'Increase Collateral \n', currcCursor: 'MzkxNjU1NjAzOA==' }),
];

export const KLINE_ETHUSDT_20240116: RawKline = ['1705363200000', '2511.8', '2647.58', '2500.22', '2587.54', '90838.99345', '231759394.360256'];
export const KLINE_MNTUSDT_20250424: RawKline = ['1745452800000', '0.703', '0.7681', '0.6806', '0.7305', '193389189.66', '136363546.891956'];
