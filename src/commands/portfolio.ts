import type { BybitClient } from '../api/client.js';
import type { RawAccountInfo, RawAssetOverview, RawOptionAsset } from '../api/types-account.js';
import { renderTable } from '../format/table.js';
import { DASH, numOrDash, orDash } from '../format/values.js';
import { isUnvaluedCoin } from '../valuation/usd.js';
import { UNVALUED_NOTE, earnView, fetchWallet, fundingTotalEquity, totalUsd } from './balance.js';
import { fetchAllPositions } from './positions.js';
import { requireReadOnlyKey } from './session-status.js';

export interface AccountTotals {
  marginMode: string;
  totalEquity: string;
  totalWalletBalance: string;
  totalMarginBalance: string;
  totalAvailableBalance: string;
  totalInitialMargin: string;
  totalMaintenanceMargin: string;
  accountIMRate: string;
  accountMMRate: string;
  totalPerpUPL: string;
}

export interface PortfolioCoin {
  coin: string;
  equity: string;
  usdValue: string;
  unrealisedPnl: string;
  cumRealisedPnl: string;
}

export interface OptionAsset {
  coin: string;
  totalUPL: string;
  totalRPL: string;
  totalDelta: string;
  assetIM: string;
  assetMM: string;
}

/** FR-2: account summary. Raw exchange values; derived values only in computed. */
export interface PortfolioResult {
  account: AccountTotals;
  coins: PortfolioCoin[];
  options: OptionAsset[];
  positionCounts: { linear: number; inverse: number; option: number };
  fundingTotalEquity: string | null;
  earnTotalEquity: string | null;
  computed: {
    totalValueUsd: number | null;
    unrealisedPnlTotal: number | null;
    coinShares: Record<string, number>;
    unvaluedCoins: string[];
  };
  computedNotes: {
    totalValueUsd: string;
    unrealisedPnlTotal: string;
    coinShares: string;
    unvaluedCoins: string;
    realised: string;
  };
}

const REALISED_NOTE =
  'cumRealisedPnl — накопленный реализованный результат по монете за всё время, в единицах монеты (сырое поле wallet-balance). ' +
  'totalRPL — реализованный результат по опционам (option-asset-info). Результат за период — команда pnl.';

function unrealisedTotal(perpUpl: string, options: OptionAsset[]): { value: number | null; note: string } {
  if (perpUpl === '') return { value: null, note: 'Биржа не вернула totalPerpUPL: сумма нереализованного результата не вычислена.' };
  const missing = options.filter((o) => o.totalUPL === '').map((o) => o.coin);
  if (missing.length > 0) {
    return { value: null, note: `Биржа не вернула totalUPL по опционам ${missing.join(', ')}: сумма нереализованного результата не вычислена.` };
  }
  const optionsUpl = options.reduce((sum, o) => sum + Number(o.totalUPL), 0);
  const base = 'Сумма totalPerpUPL (бессрочные и фьючерсы, wallet-balance) и totalUPL по опционам (option-asset-info), USD.';
  return { value: Number(perpUpl) + optionsUpl, note: options.length === 0 ? `${base} Опционов нет.` : base };
}

function coinShares(coins: PortfolioCoin[], unvalued: Set<string>): { shares: Record<string, number>; note: string } {
  const valued = coins.filter((c) => !unvalued.has(c.coin) && Number(c.usdValue) !== 0);
  const sum = valued.reduce((s, c) => s + Number(c.usdValue), 0);
  if (sum <= 0) return { shares: {}, note: 'Сумма долларовых оценок монет не положительна: доли не вычислены.' };
  const shares = Object.fromEntries(valued.map((c) => [c.coin, Number(c.usdValue) / sum]));
  return {
    shares,
    note: 'Доля usdValue монеты от суммы usdValue всех оценённых монет торгового счёта. Монета в долге имеет отрицательный usdValue и отрицательную долю.',
  };
}

export async function portfolio(client: BybitClient): Promise<PortfolioResult> {
  await requireReadOnlyKey(client);
  const { marginMode } = await client.getPrivate<RawAccountInfo>('/v5/account/info');
  const a = await fetchWallet(client);
  const options = (await client.getPrivate<{ result: RawOptionAsset[] }>('/v5/account/option-asset-info')).result.map((o) => ({
    coin: o.coin,
    totalUPL: o.totalUPL,
    totalRPL: o.totalRPL,
    totalDelta: o.totalDelta,
    assetIM: o.assetIM,
    assetMM: o.assetMM,
  }));
  const positions = await fetchAllPositions(client);
  const overview = await client.getPrivate<RawAssetOverview>('/v5/asset/asset-overview');
  const fundingTotal = fundingTotalEquity(overview);
  const earnTotal = earnView(overview).totalEquity;

  const coins = a.coin.map((c) => ({ coin: c.coin, equity: c.equity, usdValue: c.usdValue, unrealisedPnl: c.unrealisedPnl, cumRealisedPnl: c.cumRealisedPnl }));
  const unvaluedCoins = a.coin.filter(isUnvaluedCoin).map((c) => c.coin);
  const upl = unrealisedTotal(a.totalPerpUPL, options);
  // Funding coins are not fetched here, so a missing funding total is a gap, not zero.
  const total = totalUsd(a.totalEquity, fundingTotal, false, earnTotal);
  const shares = coinShares(coins, new Set(unvaluedCoins));
  const count = (category: string) => positions.filter((p) => p.category === category).length;

  return {
    account: {
      marginMode,
      totalEquity: a.totalEquity,
      totalWalletBalance: a.totalWalletBalance,
      totalMarginBalance: a.totalMarginBalance,
      totalAvailableBalance: a.totalAvailableBalance,
      totalInitialMargin: a.totalInitialMargin,
      totalMaintenanceMargin: a.totalMaintenanceMargin,
      accountIMRate: a.accountIMRate,
      accountMMRate: a.accountMMRate,
      totalPerpUPL: a.totalPerpUPL,
    },
    coins,
    options,
    positionCounts: { linear: count('linear'), inverse: count('inverse'), option: count('option') },
    fundingTotalEquity: fundingTotal,
    earnTotalEquity: earnTotal,
    computed: { totalValueUsd: total.value, unrealisedPnlTotal: upl.value, coinShares: shares.shares, unvaluedCoins },
    computedNotes: { totalValueUsd: total.note, unrealisedPnlTotal: upl.note, coinShares: shares.note, unvaluedCoins: UNVALUED_NOTE, realised: REALISED_NOTE },
  };
}

export function renderPortfolio(r: PortfolioResult): string {
  const a = r.account;
  const share = (coin: string) => {
    const s = r.computed.coinShares[coin];
    return s === undefined ? DASH : `${(s * 100).toFixed(1)}%`;
  };
  const coinRows = r.coins.map((c) => [c.coin, c.equity, r.computed.unvaluedCoins.includes(c.coin) ? DASH : c.usdValue, share(c.coin), c.unrealisedPnl, c.cumRealisedPnl]);
  const optionRows = r.options.map((o) => [o.coin, o.totalUPL, o.totalRPL, o.totalDelta, o.assetIM, o.assetMM]);
  return [
    `Всего (торговый счёт + финансирование + Earn): ${numOrDash(r.computed.totalValueUsd)} USD [расчёт]`,
    `Торговый счёт: ${a.totalEquity} USD   Кошелёк финансирования: ${r.fundingTotalEquity ?? DASH} USD   Earn: ${r.earnTotalEquity ?? DASH} USD`,
    `Свободно: ${a.totalAvailableBalance} USD   Режим маржи: ${a.marginMode}`,
    `Баланс кошелька: ${a.totalWalletBalance}   Маржинальный баланс: ${a.totalMarginBalance}`,
    `IM: ${a.totalInitialMargin} (${a.accountIMRate})   MM: ${a.totalMaintenanceMargin} (${a.accountMMRate})`,
    '',
    `Позиции: бессрочные/фьючерсы ${r.positionCounts.linear}, инверсные ${r.positionCounts.inverse}, опционы ${r.positionCounts.option}`,
    `Нереализованный результат: бессрочные ${orDash(a.totalPerpUPL)}, всего ${numOrDash(r.computed.unrealisedPnlTotal)} USD [расчёт]`,
    '',
    renderTable(['Монета', 'Equity', 'USD', 'Доля [расчёт]', 'Нереализ.', 'Реализ. всего'], coinRows),
    '',
    r.options.length ? renderTable(['Опционы', 'Нереализ.', 'Реализ.', 'Дельта', 'IM', 'MM'], optionRows) : 'Опционов нет.',
    '',
    '[расчёт] — вычислено скиллом:',
    `- Всего: ${r.computedNotes.totalValueUsd}`,
    `- Всего нереализованный: ${r.computedNotes.unrealisedPnlTotal}`,
    `- Доля: ${r.computedNotes.coinShares}`,
    ...(r.computed.unvaluedCoins.length ? [`- Без оценки (${r.computed.unvaluedCoins.join(', ')}): ${r.computedNotes.unvaluedCoins}`] : []),
    `Реализованный результат: ${r.computedNotes.realised}`,
  ].join('\n');
}
