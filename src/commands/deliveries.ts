import type { BybitClient } from '../api/client.js';
import type { RawDelivery } from '../api/types-history.js';
import { renderPeriod, utcTime } from '../format/history.js';
import { renderTable } from '../format/table.js';
import { orDash } from '../format/values.js';
import { DEPTH_2Y_DAYS, fetchWindowed, type Coverage, type Period, type WindowDeps } from '../util/window.js';
import { requireReadOnlyKey } from './session-status.js';

export const DELIVERIES_DEFAULT_DAYS = DEPTH_2Y_DAYS;
const CATEGORIES = ['option', 'linear', 'inverse'] as const;

/** Raw delivery-record fields (FR-9): which contract, at what settlement price, with what result. */
export interface DeliveryView {
  category: (typeof CATEGORIES)[number];
  symbol: string;
  side: string;
  position: string;
  entryPrice: string;
  strike: string;
  deliveryPrice: string;
  fee: string;
  deliveryRpl: string;
  deliveryTime: number;
}

export interface DeliveriesResult {
  period: Period;
  coverage: Coverage[];
  deliveries: DeliveryView[];
}

export interface DeliveriesOptions {
  period: Period;
  coin?: string;
}

/** Expiry executions of options and futures, newest first; no key check (callers do it). */
export async function fetchDeliveries(client: BybitClient, period: Period, deps: WindowDeps): Promise<{ deliveries: DeliveryView[]; coverage: Coverage[] }> {
  const views: DeliveryView[] = [];
  const coverage: Coverage[] = [];
  for (const category of CATEGORIES) {
    const source = { label: `экспирации ${category}`, path: '/v5/asset/delivery-record', params: { category, limit: '50' }, windowDays: 30, depthDays: DEPTH_2Y_DAYS, depthText: '2 лет' };
    const r = await fetchWindowed<RawDelivery>(client, source, period, deps);
    views.push(...r.rows.map((d) => ({ category, symbol: d.symbol, side: d.side, position: d.position, entryPrice: d.entryPrice ?? '', strike: d.strike, deliveryPrice: d.deliveryPrice, fee: d.fee, deliveryRpl: d.deliveryRpl, deliveryTime: d.deliveryTime })));
    coverage.push(r.coverage);
  }
  views.sort((a, b) => b.deliveryTime - a.deliveryTime);
  return { deliveries: views, coverage };
}

/** `deliveries` (FR-9): expiry executions for options and futures over a period. */
export async function deliveries(client: BybitClient, options: DeliveriesOptions, deps: WindowDeps): Promise<DeliveriesResult> {
  await requireReadOnlyKey(client);
  const r = await fetchDeliveries(client, options.period, deps);
  const coin = options.coin?.toUpperCase();
  return { period: options.period, coverage: r.coverage, deliveries: coin ? r.deliveries.filter((d) => d.symbol.startsWith(coin)) : r.deliveries };
}

/** Table of expiry executions. */
export function renderDeliveryTable(list: DeliveryView[]): string {
  if (list.length === 0) return 'Экспираций за период нет.';
  const rows = list.map((d) => [utcTime(d.deliveryTime), d.symbol, d.side, d.position, orDash(d.entryPrice), d.deliveryPrice, d.fee, d.deliveryRpl]);
  return renderTable(['Время UTC', 'Контракт', 'Сторона', 'Объём', 'Вход', 'Цена расчёта', 'Комиссия', 'Результат'], rows);
}

export function renderDeliveries(r: DeliveriesResult): string {
  return [renderPeriod(r.period, r.coverage), '', renderDeliveryTable(r.deliveries)].join('\n');
}
