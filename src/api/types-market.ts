/** Raw Bybit V5 market shapes (docs market/*), only the fields this skill reads. All numbers are strings (D-4). */

export type MarketCategory = 'spot' | 'linear' | 'inverse';
export type Category = MarketCategory | 'option';

export interface RawInstrument {
  symbol: string;
  baseCoin: string;
  quoteCoin: string;
  status: string;
  /** linear and inverse only. */
  contractType?: string;
}

export interface RawOrderbook {
  s: string;
  b: [string, string][];
  a: [string, string][];
  ts: number;
}

export interface RawOptionBaseCoin {
  baseCoin: string;
  quoteCoin: string;
  settleCoin: string;
  optionShowName: string;
  optionOnlineTime: number;
  hasSymbol: number;
  underlyingType: number;
}
