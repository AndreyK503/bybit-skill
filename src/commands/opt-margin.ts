import type { BybitClient } from '../api/client.js';
import type { RawAccountInfo } from '../api/types-account.js';
import type { RawPmAsset, RawPnlRange, RawPortfolioMargin } from '../api/types-options.js';
import { renderTable } from '../format/table.js';
import { numOrDash, orDash } from '../format/values.js';
import { requireReadOnlyKey } from './session-status.js';

export interface MarginAccount {
  equity: string;
  marginBalance: string;
  accountIM: string;
  accountMM: string;
  accountIMRate: string;
  accountMMRate: string;
}

/** Portfolio Margin per base coin: raw exchange values; share and per-option loss in computed. */
export interface MarginCoin {
  baseCoin: string;
  assetIM: string;
  assetMM: string;
  maxLossPriceMove: string;
  maxLossIvShock: string;
  contingencyComponents: string;
  /** Loss at priceScale = maxLossPriceMove; "" when the exchange sent no such row. */
  worstLoss: { all: string; option: string; perpetual: string };
  options: { symbol: string; position: string }[];
  notes: string[];
  computed: { shareOfAccountMM: number | null; optionLoss: Record<string, number | null> };
  computedNotes: { shareOfAccountMM: string; optionLoss: string };
}

export interface OptMarginResult {
  marginMode: string;
  account: MarginAccount | null;
  coins: MarginCoin[];
  notes: string[];
}

/** Largest gap in USD between the sum of per-option losses and the OPTION total that still counts as a match. */
const SUM_TOLERANCE = 0.01;

const METHOD_NOTE =
  'Portfolio Margin: MM монеты = худший убыток по сетке сценариев цены и IV (все позиции монеты) + contingency; IM = 1.2 × MM; ' +
  'MM счёта = сумма MM монет; accountMMRate = accountMM / equity. Маржу на отдельный опцион биржа не назначает (сверено на счёте 2026-09-27).';
const SHARE_NOTE = 'assetMM / accountMM.';
const LOSS_NOTE =
  'Убыток опциона в худшем сценарии монеты (priceScale = maxLossPriceMove), из portfolio-margin. У опциона три значения на сценарий: ' +
  'IV вверх, без изменений, вниз; берётся по знаку maxLossIvShock (порядок в документации не описан, выведен из примера документации ' +
  'и живого счёта). Проверка: сумма по опционам совпадает с итогом OPTION до 0.01. Это вклад в риск, не маржа позиции: contingency не делится.';

const atScale = (ranges: RawPnlRange[] | undefined, scale: number) => ranges?.find((r) => Number(r.priceScale) === scale)?.pnls;

function ivIndex(pnls: string[], shock: number): number {
  if (pnls.length === 1) return 0;
  return shock > 0 ? 0 : shock < 0 ? 2 : 1;
}

function optionLosses(a: RawPmAsset, scale: number, optionTotal: string): { values: Record<string, number | null>; note: string } {
  const positions = a.optionExpiryDatePnlRanges.flatMap((e) => e.optionPositionPnlRanges);
  if (positions.length === 0) return { values: {}, note: 'Опционных позиций по монете нет.' };
  const shock = Number(a.maxLossIvShock);
  const picked = positions.map((p) => {
    const pnls = atScale(p.pnlRanges, scale);
    const v = pnls?.[ivIndex(pnls, shock)];
    return [p.symbolName, v === undefined ? null : Number(v)] as const;
  });
  const empty = Object.fromEntries(positions.map((p) => [p.symbolName, null]));
  if (picked.some(([, v]) => v === null) || optionTotal === '') {
    return { values: empty, note: `Нет сценария priceScale = ${a.maxLossPriceMove} по опционам или итога OPTION: убыток по опционам не определён.` };
  }
  const sum = picked.reduce((s, [, v]) => s + (v ?? 0), 0);
  if (Math.abs(sum - Number(optionTotal)) > SUM_TOLERANCE) {
    return { values: empty, note: `Сумма по опционам (${sum.toFixed(2)}) не сходится с итогом OPTION (${optionTotal}): выбор значения не подтверждён, убытки не показаны.` };
  }
  return { values: Object.fromEntries(picked), note: LOSS_NOTE };
}

function toCoin(a: RawPmAsset, accountMM: number): MarginCoin {
  const scale = Number(a.maxLossPriceMove);
  const loss = (k: 'ALL' | 'OPTION' | 'PERPETUAL') => atScale(a.totalPnlRanges[k]?.pnlRanges, scale)?.[0] ?? '';
  const worstLoss = { all: loss('ALL'), option: loss('OPTION'), perpetual: loss('PERPETUAL') };
  const notes =
    worstLoss.all === ''
      ? [`Биржа не вернула сценарий priceScale = ${a.maxLossPriceMove} (maxLossPriceMove): убыток в худшем сценарии не показан.`]
      : (['OPTION', 'PERPETUAL'] as const)
          .filter((k) => loss(k) === '')
          .map((k) => `Итога ${k} для сценария priceScale = ${a.maxLossPriceMove} в ответе биржи нет.`);
  const losses = optionLosses(a, scale, worstLoss.option);
  const share = accountMM > 0 ? Number(a.asset.assetMM) / accountMM : null;
  return {
    baseCoin: a.baseCoin,
    assetIM: a.asset.assetIM,
    assetMM: a.asset.assetMM,
    maxLossPriceMove: a.maxLossPriceMove,
    maxLossIvShock: a.maxLossIvShock,
    contingencyComponents: a.contingency.contingencyComponents,
    worstLoss,
    options: a.optionExpiryDatePnlRanges.flatMap((e) => e.optionPositionPnlRanges.map((p) => ({ symbol: p.symbolName, position: p.position }))),
    notes,
    computed: { shareOfAccountMM: share, optionLoss: losses.values },
    computedNotes: { shareOfAccountMM: share === null ? 'accountMM равен нулю или пуст: доля не вычислена.' : SHARE_NOTE, optionLoss: losses.note },
  };
}

/** `opt margin` (FR-5 addition 2026-09-27): Portfolio Margin breakdown by coin and option. */
export async function optMargin(client: BybitClient): Promise<OptMarginResult> {
  await requireReadOnlyKey(client);
  const { marginMode } = await client.getPrivate<RawAccountInfo>('/v5/account/info');
  if (marginMode !== 'PORTFOLIO_MARGIN') {
    const note = `Режим маржи ${marginMode}, не Portfolio Margin: маржа считается по каждой позиции — см. команду positions (positionIM, positionMM).`;
    return { marginMode, account: null, coins: [], notes: [note] };
  }
  const pm = await client.getPrivate<RawPortfolioMargin>('/v5/asset/portfolio-margin');
  const { equity, marginBalance, accountIM, accountMM, accountIMRate, accountMMRate } = pm.wallet;
  const account = { equity, marginBalance, accountIM, accountMM, accountIMRate, accountMMRate };
  return { marginMode, account, coins: pm.assetPnlRange.map((a) => toCoin(a, Number(accountMM))), notes: [METHOD_NOTE] };
}

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`);

/** Human-readable breakdown: account, coins, options; computed values marked. */
export function renderOptMargin(r: OptMarginResult): string {
  if (!r.account) return r.notes.join('\n');
  const a = r.account;
  const lines = [
    `Капитал ${a.equity} USD, MM ${a.accountMM} (${a.accountMMRate}), IM ${a.accountIM} (${a.accountIMRate})`,
    '',
    renderTable(
      ['Монета', 'MM', 'IM', 'Доля MM*', 'Сдвиг цены', 'IV-шок', 'Убыток всего', 'опционы', 'бессрочные', 'Contingency'],
      r.coins.map((c) => [c.baseCoin, c.assetMM, c.assetIM, pct(c.computed.shareOfAccountMM), c.maxLossPriceMove, c.maxLossIvShock,
        orDash(c.worstLoss.all), orDash(c.worstLoss.option), orDash(c.worstLoss.perpetual), c.contingencyComponents]),
    ),
  ];
  const optionRows = r.coins.flatMap((c) => c.options.map((o) => [c.baseCoin, o.symbol, o.position, numOrDash(c.computed.optionLoss[o.symbol])]));
  if (optionRows.length) lines.push('', renderTable(['Монета', 'Опцион', 'Позиция', 'Убыток в худшем сценарии*'], optionRows));
  const coinNotes = r.coins.flatMap((c) => [...c.notes.map((n) => `${c.baseCoin}: ${n}`), ...(c.computedNotes.optionLoss === LOSS_NOTE ? [] : [`${c.baseCoin}: ${c.computedNotes.optionLoss}`])]);
  lines.push('', '* [расчёт] — вычислено скиллом:', `- Доля MM: ${SHARE_NOTE}`, `- Убыток опциона: ${LOSS_NOTE}`, ...coinNotes.map((n) => `- ${n}`), '', ...r.notes);
  return lines.join('\n');
}
