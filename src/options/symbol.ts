/** Contract fields parsed from an option symbol (enum "symbol", Option). */
export interface OptionContract {
  baseCoin: string;
  expiryDate: string;
  strike: number;
  type: 'Call' | 'Put';
  settleCoin: string;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const SYMBOL = /^([A-Z0-9]+)-(\d{1,2})([A-Z]{3})(\d{2})-(\d+(?:\.\d+)?)-([CP])(?:-([A-Z]+))?$/;

/** UTC date as YYYY-MM-DD, or null when the day does not exist in that month. */
function calendarDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month, day));
  if (d.getUTCMonth() !== month || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

/** Parse `BASE-DMMMYY-STRIKE-C|P[-SETTLE]`; no suffix means USDC (docs enum). Null when not an option symbol. */
export function parseOptionSymbol(symbol: string): OptionContract | null {
  const m = SYMBOL.exec(symbol);
  if (!m) return null;
  const [, baseCoin = '', day = '', mon = '', yy = '', strike = '', cp = '', settle] = m;
  const month = MONTHS.indexOf(mon);
  if (month < 0) return null;
  const expiryDate = calendarDate(2000 + Number(yy), month, Number(day));
  if (!expiryDate) return null;
  return { baseCoin, expiryDate, strike: Number(strike), type: cp === 'C' ? 'Call' : 'Put', settleCoin: settle ?? 'USDC' };
}
