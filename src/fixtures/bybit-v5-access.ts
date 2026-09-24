/**
 * Bybit V5 response fixtures for stage E1 (access).
 *
 * Sources (raw docs, github.com/bybit-exchange/docs, master, docs/v5/...):
 * - QUERY_API: user/apikey-info.mdx, "Response Example" (verbatim).
 * - ACCOUNT_INFO: account/account-info.mdx, "Response Example" (verbatim; no retExtInfo/time).
 * - MARKET_TIME: market/time.mdx, "Response Example" (verbatim).
 * - errorEnvelope: envelope shape from guide.mdx "Common response parameters",
 *   retCode/retMsg pairs from error.mdx (UTA section). Docs have no full error JSON example.
 */

export const QUERY_API = {
  retCode: 0,
  retMsg: '',
  result: {
    id: '2208369',
    note: 'testnet',
    apiKey: 'XXXXXXXX',
    readOnly: 1,
    secret: '',
    permissions: {
      ContractTrade: ['Order', 'Position'],
      Spot: ['SpotTrade'],
      Wallet: ['AccountTransfer', 'SubMemberTransfer'],
      Options: [],
      Derivatives: ['DerivativesTrade'],
      CopyTrading: [],
      BlockTrade: [],
      Exchange: ['ExchangeHistory'],
      NFT: [],
      Affiliate: [],
      Earn: ['Earn'],
      FiatP2P: ['FiatP2POrder', 'Advertising'],
      FiatConvertBroker: ['FiatConvertBrokerOrder'],
      FiatGlobalPay: [],
      FiatBitPay: ['FaitPayOrder'],
      BitCard: ['BitCard'],
      ByXPost: ['ByXPost'],
    },
    ips: ['18.181.170.164', '13.212.45.47', '13.212.45.48'],
    type: 1,
    deadlineDay: -2,
    expiredAt: '1970-01-01T00:00:00Z',
    createdAt: '2025-10-13T03:20:45Z',
    unified: 0,
    uta: 1,
    userID: 1448939,
    inviterID: 0,
    vipLevel: 'PRO-1',
    mktMakerLevel: '0',
    affiliateID: 0,
    rsaPublicKey: '',
    isMaster: true,
    parentUid: '0',
    kycLevel: 'LEVEL_1',
    kycRegion: 'MYS',
    userIDInt64: '0',
    inviterIDInt64: '0',
    affiliateIDInt64: '0',
    isFixApi: false,
  },
  retExtInfo: {},
  time: 1776149990532,
};

export const ACCOUNT_INFO = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    marginMode: 'REGULAR_MARGIN',
    updatedTime: '1697078946000',
    unifiedMarginStatus: 4,
    dcpStatus: 'OFF',
    timeWindow: 10,
    smpGroup: 0,
    isMasterTrader: false,
    spotHedgingStatus: 'OFF',
  },
};

export const MARKET_TIME = {
  retCode: 0,
  retMsg: 'OK',
  result: {
    timeSecond: '1688639403',
    timeNano: '1688639403423213947',
  },
  retExtInfo: {},
  time: 1688639403423,
};

/** retMsg values verbatim from error.mdx (UTA section). */
export const ERROR_MESSAGES: Record<number, string> = {
  10000: 'Server Timeout',
  10002: 'The request time exceeds the time window range. ',
  10003: 'API key is invalid. Check whether the key and domain are matched, there are 4 env: mainnet, testnet, mainnet-demo, testnet-demo',
  10004: 'Error sign, please check your signature generation algorithm. ',
  10005: 'Permission denied, please check your API key permissions. ',
  10006: 'Too many visits. Exceeded the API Rate Limit. ',
  10009: 'Service Restricted: Access is currently unavailable for your region. Please contact our support team for further assistance',
  10010: "Unmatched IP, please check your API key's bound IP addresses. ",
  10016: 'Server error. ',
  10024: 'Compliance rules triggered',
  33004: '(Derivatives) Your api key has expired ',
};

/** Error envelope built from the documented shape; retMsg from ERROR_MESSAGES. */
export function errorEnvelope(retCode: number) {
  return { retCode, retMsg: ERROR_MESSAGES[retCode] ?? 'unknown', result: {}, retExtInfo: {}, time: 1688639403423 };
}
