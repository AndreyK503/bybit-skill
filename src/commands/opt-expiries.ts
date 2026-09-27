import type { BybitClient } from '../api/client.js';
import { renderTable } from '../format/table.js';
import { MONTHLY_RULE, fetchOptionInstruments, isMonthly, utcDate } from '../options/instruments.js';

export interface ExpiryRow {
  baseCoin: string;
  date: string;
  deliveryTime: string;
  calls: number;
  puts: number;
  computed: { monthly: boolean };
}

export interface OptExpiriesResult {
  expiries: ExpiryRow[];
  computedNotes: { monthly: string };
}

/** `opt expiries [coin]` (FR-6, criterion 10). Without a coin: all base coins. Public data. */
export async function optExpiries(client: BybitClient, options: { coin?: string } = {}): Promise<OptExpiriesResult> {
  const instruments = await fetchOptionInstruments(client, options.coin?.toUpperCase() ?? 'All');
  const groups = new Map<string, ExpiryRow>();
  for (const i of instruments) {
    const key = `${i.baseCoin}|${i.deliveryTime}`;
    const row = groups.get(key) ?? { baseCoin: i.baseCoin, date: utcDate(i.deliveryTime), deliveryTime: i.deliveryTime, calls: 0, puts: 0, computed: { monthly: isMonthly(i.deliveryTime) } };
    if (i.optionsType === 'Call') row.calls += 1;
    else row.puts += 1;
    groups.set(key, row);
  }
  const expiries = [...groups.values()].sort((a, b) => Number(a.deliveryTime) - Number(b.deliveryTime) || a.baseCoin.localeCompare(b.baseCoin));
  return { expiries, computedNotes: { monthly: MONTHLY_RULE } };
}

/** Human-readable list: date, UTC time, contract counts. */
export function renderOptExpiries(r: OptExpiriesResult): string {
  if (r.expiries.length === 0) return 'Опционов по этой монете нет.';
  const rows = r.expiries.map((e) => [e.baseCoin, e.date, new Date(Number(e.deliveryTime)).toISOString().slice(11, 16), e.computed.monthly ? 'да' : '', String(e.calls), String(e.puts)]);
  return [renderTable(['Монета', 'Дата', 'Время UTC', 'Месячная*', 'Call', 'Put'], rows), '', `* [расчёт] ${r.computedNotes.monthly}`].join('\n');
}
