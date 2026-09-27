import type { BybitClient } from '../api/client.js';
import type { RawOptionAsset } from '../api/types-account.js';
import type { RawCoinGreeks } from '../api/types-options.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';
import { requireReadOnlyKey } from './session-status.js';

/** Net option greeks per base coin, raw: delta from option-asset-info, the rest from coin-greeks. "" when missing. */
export interface GreeksRow {
  baseCoin: string;
  delta: string;
  gamma: string;
  vega: string;
  theta: string;
}

export interface OptGreeksResult {
  coins: GreeksRow[];
  notes: string[];
}

const SOURCE_NOTES = [
  'Delta — totalDelta из option-asset-info: только опционные позиции, без спота и бессрочных.',
  'Gamma, Vega, Theta — из coin-greeks; на живом счёте равны сумме греков опционных позиций.',
  'Все значения сырые, получены от биржи; скилл их не пересчитывает.',
];

/** `opt greeks` (FR-5, criterion 8). */
export async function optGreeks(client: BybitClient, options: { coin?: string } = {}): Promise<OptGreeksResult> {
  await requireReadOnlyKey(client);
  const coin = options.coin?.toUpperCase();
  const greeks = await client.getPrivate<RawCoinGreeks>('/v5/asset/coin-greeks', coin ? { baseCoin: coin } : {});
  const { result: assets } = await client.getPrivate<{ result: RawOptionAsset[] }>('/v5/account/option-asset-info');
  const deltas = new Map(assets.filter((a) => !coin || a.coin === coin).map((a) => [a.coin, a.totalDelta]));
  const byCoin = new Map(greeks.list.map((g) => [g.baseCoin, g]));
  const notes = [...SOURCE_NOTES];
  const coins = [...new Set([...byCoin.keys(), ...deltas.keys()])].map((baseCoin) => {
    const g = byCoin.get(baseCoin);
    const delta = deltas.get(baseCoin);
    if (delta === undefined) notes.push(`${baseCoin}: нет в option-asset-info — дельта по опционам не получена.`);
    if (!g) notes.push(`${baseCoin}: нет в coin-greeks — гамма, вега и тета не получены.`);
    return { baseCoin, delta: delta ?? '', gamma: g?.totalGamma ?? '', vega: g?.totalVega ?? '', theta: g?.totalTheta ?? '' };
  });
  return { coins, notes };
}

/** Human-readable table of raw greeks with source notes. */
export function renderOptGreeks(r: OptGreeksResult): string {
  if (r.coins.length === 0) return 'Нетто-греков нет: опционных позиций нет.';
  const rows = r.coins.map((c) => [c.baseCoin, orDash(c.delta), orDash(c.gamma), orDash(c.vega), orDash(c.theta)]);
  return [renderTable(['Монета', 'Delta', 'Gamma', 'Vega', 'Theta'], rows), '', ...r.notes.map((n) => `- ${n}`)].join('\n');
}
