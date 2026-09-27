import type { BybitClient } from '../api/client.js';

export type PositionCategory = 'linear' | 'inverse' | 'option';

/** Raw position fields from /v5/position/list (FR-4). Empty strings are kept as the exchange sent them. */
export interface PositionView {
  category: PositionCategory;
  symbol: string;
  side: string;
  size: string;
  avgPrice: string;
  markPrice: string;
  positionValue: string;
  unrealisedPnl: string;
  leverage: string;
  liqPrice: string;
  positionIM: string;
  positionMM: string;
}

/** Fields the exchange may leave empty; the reason is given in fieldNotes. */
export type EmptiableField = 'leverage' | 'liqPrice' | 'positionIM' | 'positionMM';

export interface PositionsResult {
  marginMode: string;
  positions: PositionView[];
  fieldNotes: Partial<Record<EmptiableField, string>>;
}

/** All open positions across option, linear USDT, linear USDC and inverse, every page. No key check. */
export async function fetchAllPositions(client: BybitClient): Promise<PositionView[]> {
  throw new Error(`not implemented: ${client.baseUrl}`);
}

/** `positions` command: read-only key check, margin mode, all positions. */
export async function positions(client: BybitClient): Promise<PositionsResult> {
  throw new Error(`not implemented: ${client.baseUrl}`);
}

/** Human-readable table; empty exchange values shown as a dash with the reason below. */
export function renderPositions(result: PositionsResult): string {
  throw new Error(`not implemented: ${result.positions.length}`);
}
