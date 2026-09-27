import type { BybitClient } from '../api/client.js';
import { AppError } from '../api/errors.js';
import type { RawAssetOverview, RawFundBalance, RawTickers, RawWalletBalance, RawWalletCoin } from '../api/types-account.js';
import { renderTable } from '../format/table.js';
import { DASH, numOrDash } from '../format/values.js';
import { estimateUsd, isUnvaluedCoin } from '../valuation/usd.js';
import { requireReadOnlyKey } from './session-status.js';

export interface UnifiedCoinView {
  coin: string;
  equity: string;
  walletBalance: string;
  locked: string;
  borrowAmount: string;
  usdValue: string;
}

export interface FundingCoinView {
  coin: string;
  walletBalance: string;
  transferBalance: string;
}

export interface EarnCoinView {
  coin: string;
  equity: string;
  category: string;
}

export interface EarnView {
  totalEquity: string | null;
  coins: EarnCoinView[];
}

/** FR-3: balances split by trading account (UTA), funding wallet and Earn. */
export interface BalanceResult {
  unified: { totalEquity: string; coins: UnifiedCoinView[] };
  funding: { totalEquity: string | null; coins: FundingCoinView[] };
  earn: EarnView;
  computed: {
    unvaluedCoins: string[];
    fundingUsd: Record<string, number | null>;
    totalUsd: number | null;
  };
  computedNotes: {
    unvaluedCoins: string;
    fundingUsd: Record<string, string>;
    totalUsd: string;
  };
}

export const UNVALUED_NOTE =
  'Биржа не оценивает в долларах монету, которая не может быть залогом (marginCollateral=false): usdValue приходит 0. ' +
  'Оценка не показывается, чтобы не выдавать 0 за стоимость (docs WebSocket wallet, usdValue).';

/** Raw UTA account; the unified trading account always has exactly one entry. */
export async function fetchWallet(client: BybitClient) {
  const wallet = await client.getPrivate<RawWalletBalance>('/v5/account/wallet-balance', { accountType: 'UNIFIED' });
  const account = wallet.list[0];
  if (!account) {
    throw new AppError({
      code: 'APP_ACCOUNT_NOT_UTA',
      userMessage: 'Биржа не вернула единый торговый счёт (UTA). Проверьте режим счёта: session status.',
    });
  }
  return account;
}

function unifiedView(c: RawWalletCoin): UnifiedCoinView {
  return { coin: c.coin, equity: c.equity, walletBalance: c.walletBalance, locked: c.locked, borrowAmount: c.borrowAmount, usdValue: c.usdValue };
}

/** Raw USD total of the funding wallet from asset-overview, or null when the exchange did not list it. */
export function fundingTotalEquity(overview: RawAssetOverview): string | null {
  return overview.list.find((a) => a.accountType === 'FundingAccount')?.totalEquity ?? null;
}

async function spotPrices(client: BybitClient): Promise<Map<string, string>> {
  const tickers = await client.getPublic<RawTickers>('/v5/market/tickers', { category: 'spot' });
  return new Map(tickers.list.map((t) => [t.symbol, t.lastPrice]));
}

/** Raw Earn total and coins from asset-overview (A-2); empty when the exchange did not list Earn. */
export function earnView(overview: RawAssetOverview): EarnView {
  const earn = overview.list.find((a) => a.accountType === 'Earn');
  if (!earn) return { totalEquity: null, coins: [] };
  const coins = (earn.categories ?? []).flatMap((c) => c.coinDetail.map((d) => ({ coin: d.coin, equity: d.equity, category: c.category })));
  return { totalEquity: earn.totalEquity, coins };
}

/**
 * Trading account + funding wallet + Earn in USD (A-2).
 * Empty with a reason if the funding total is missing while the wallet holds coins.
 */
export function totalUsd(
  unified: string,
  funding: string | null,
  fundingEmpty: boolean,
  earn: string | null,
): { value: number | null; note: string } {
  const scope =
    'Сумма totalEquity торгового счёта (wallet-balance), кошелька финансирования и Earn (asset-overview). ' +
    'Боты, займы и прочие счета не входят (A-2).';
  if (funding === null && !fundingEmpty) {
    return { value: null, note: 'Биржа не вернула итог кошелька финансирования (asset-overview), хотя в нём есть монеты: сумма не вычислена.' };
  }
  const notes = [scope];
  if (funding === null) notes.push('Кошелёк финансирования пуст.');
  if (earn === null) notes.push('Earn: биржа не вернула счёт, в сумму не входит.');
  return { value: Number(unified) + Number(funding ?? 0) + Number(earn ?? 0), note: notes.join(' ') };
}

export async function balance(client: BybitClient): Promise<BalanceResult> {
  await requireReadOnlyKey(client);
  const account = await fetchWallet(client);
  const fund = await client.getPrivate<RawFundBalance>('/v5/asset/transfer/query-account-coins-balance', { accountType: 'FUND' });
  const overview = await client.getPrivate<RawAssetOverview>('/v5/asset/asset-overview');
  const fundingCoins = fund.balance
    .filter((b) => Number(b.walletBalance) !== 0)
    .map((b) => ({ coin: b.coin, walletBalance: b.walletBalance, transferBalance: b.transferBalance }));
  const prices = fundingCoins.length > 0 ? await spotPrices(client) : new Map<string, string>();

  const fundingUsd: Record<string, number | null> = {};
  const fundingNotes: Record<string, string> = {};
  for (const c of fundingCoins) {
    const e = estimateUsd(c.coin, c.walletBalance, prices);
    fundingUsd[c.coin] = e.usd;
    fundingNotes[c.coin] = e.note;
  }
  const fundingTotal = fundingTotalEquity(overview);
  const earn = earnView(overview);
  const total = totalUsd(account.totalEquity, fundingTotal, fundingCoins.length === 0, earn.totalEquity);

  return {
    unified: { totalEquity: account.totalEquity, coins: account.coin.map(unifiedView) },
    funding: { totalEquity: fundingTotal, coins: fundingCoins },
    earn,
    computed: { unvaluedCoins: account.coin.filter(isUnvaluedCoin).map((c) => c.coin), fundingUsd, totalUsd: total.value },
    computedNotes: { unvaluedCoins: UNVALUED_NOTE, fundingUsd: fundingNotes, totalUsd: total.note },
  };
}

export function renderBalance(r: BalanceResult): string {
  const unvalued = new Set(r.computed.unvaluedCoins);
  const utaRows = r.unified.coins.map((c) => [
    c.coin,
    c.equity,
    c.walletBalance,
    c.locked,
    c.borrowAmount,
    unvalued.has(c.coin) ? `${DASH} (не оценивается биржей)` : c.usdValue,
  ]);
  const fundRows = r.funding.coins.map((c) => [c.coin, c.walletBalance, c.transferBalance, numOrDash(r.computed.fundingUsd[c.coin])]);
  const lines = [
    `Торговый счёт (UTA): ${r.unified.totalEquity} USD`,
    renderTable(['Монета', 'Equity', 'Кошелёк', 'Заблок.', 'Долг', 'USD'], utaRows),
    '',
    `Кошелёк финансирования: ${r.funding.totalEquity ?? DASH} USD`,
    fundRows.length ? renderTable(['Монета', 'Кошелёк', 'Доступно к переводу', 'USD [расчёт]'], fundRows) : 'Пусто.',
    '',
    `Earn: ${r.earn.totalEquity ?? DASH} USD`,
    r.earn.coins.length ? renderTable(['Монета', 'Количество', 'Продукт'], r.earn.coins.map((c) => [c.coin, c.equity, c.category])) : 'Пусто.',
    '',
    `Итого, торговый счёт + финансирование + Earn: ${numOrDash(r.computed.totalUsd)} USD [расчёт]`,
    '',
    '[расчёт] — вычислено скиллом:',
    `- Итого: ${r.computedNotes.totalUsd}`,
    ...Object.entries(r.computedNotes.fundingUsd).map(([coin, note]) => `- ${coin}: ${note}`),
  ];
  if (unvalued.size > 0) lines.push(`- Без оценки (${[...unvalued].join(', ')}): ${r.computedNotes.unvaluedCoins}`);
  return lines.join('\n');
}
