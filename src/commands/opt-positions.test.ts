import { describe, expect, it } from 'vitest';
import { AppError } from '../api/errors.js';
import { QUERY_API } from '../fixtures/bybit-v5-access.js';
import { OPTION_INSTRUMENT, OPTION_POSITION, instrumentsPage, optionPositionPage } from '../fixtures/bybit-v5-options.js';
import { READ_ONLY_KEY, routedClient, type Route } from '../fixtures/route-fetch.js';
import { optPositions, renderOptPositions } from './opt-positions.js';

/**
 * Fixtures: OPTION_POSITION is the docs position item with the live MNT option put in (see fixture header).
 * MNT_INSTRUMENT is the docs option instrument with symbol and deliveryTime of that position:
 * 1793347200000 = 2026-10-30 08:00 UTC (`date -u -j -f ... "2026-10-30 08:00:00" +%s`).
 * NOW is 1.5 days before it: 1793347200000 - 1.5 * 86400000 = 1793217600000.
 */
const DELIVERY = '1793347200000';
const NOW = 1793217600000;
const MNT_INSTRUMENT = { ...OPTION_INSTRUMENT, symbol: OPTION_POSITION.symbol, baseCoin: 'MNT', deliveryTime: DELIVERY };
const BTC_POSITION = { ...OPTION_POSITION, symbol: 'BTC-27MAR26-70000-P-USDT', size: '0.1', delta: '0.004625425' };

function setup(positions: Route, instruments: Route = () => instrumentsPage([MNT_INSTRUMENT, OPTION_INSTRUMENT], '')) {
  return routedClient({
    '/v5/user/query-api': READ_ONLY_KEY,
    '/v5/position/list': positions,
    '/v5/market/instruments-info': instruments,
  });
}

describe('opt positions', () => {
  it('queries option positions with limit 200 and follows the cursor to the end', async () => {
    const { client, urls } = setup((url) =>
      url.searchParams.get('cursor') === 'p2' ? optionPositionPage([BTC_POSITION], '') : optionPositionPage([OPTION_POSITION], 'p2'),
    );
    const r = await optPositions(client, { now: NOW });
    expect(r.positions.map((p) => p.symbol)).toEqual([OPTION_POSITION.symbol, BTC_POSITION.symbol]);
    const queries = urls.filter((u) => u.pathname === '/v5/position/list').map((u) => Object.fromEntries(u.searchParams));
    expect(queries).toEqual([
      { category: 'option', limit: '200' },
      { category: 'option', limit: '200', cursor: 'p2' },
    ]);
  });

  it('shows raw fields and position greeks as the exchange sent them', async () => {
    const { client } = setup(() => optionPositionPage([OPTION_POSITION], ''));
    const [p] = (await optPositions(client, { now: NOW })).positions;
    expect(p).toMatchObject({
      symbol: 'MNT-30OCT26-0.56-P-USDT',
      side: 'Sell',
      size: '1000',
      avgPrice: '0.0162',
      markPrice: '0.01394745',
      unrealisedPnl: '2.25255',
      delta: '174.02817',
      gamma: '-1670.55842',
      vega: '-0.51935',
      theta: '0.60409',
      deliveryTime: DELIVERY,
    });
  });

  it('puts the contract parsed from the symbol into computed with a note', async () => {
    const { client } = setup(() => optionPositionPage([OPTION_POSITION], ''));
    const [p] = (await optPositions(client, { now: NOW })).positions;
    expect(p?.computed.contract).toEqual({ baseCoin: 'MNT', expiryDate: '2026-10-30', strike: 0.56, type: 'Put', settleCoin: 'USDT' });
    expect(p?.computedNotes.contract).toContain('символ');
  });

  it('days to expiry from instruments-info deliveryTime; instruments queried for all coins, every page', async () => {
    const { client, urls } = setup(
      () => optionPositionPage([OPTION_POSITION], ''),
      (url) => (url.searchParams.get('cursor') === 'i2' ? instrumentsPage([MNT_INSTRUMENT], '') : instrumentsPage([OPTION_INSTRUMENT], 'i2')),
    );
    const [p] = (await optPositions(client, { now: NOW })).positions;
    expect(p?.computed.daysToExpiry).toBe(1.5);
    expect(p?.computedNotes.daysToExpiry).toContain('deliveryTime');
    const queries = urls.filter((u) => u.pathname === '/v5/market/instruments-info').map((u) => Object.fromEntries(u.searchParams));
    expect(queries).toEqual([
      { category: 'option', baseCoin: 'All', limit: '1000' },
      { category: 'option', baseCoin: 'All', limit: '1000', cursor: 'i2' },
    ]);
  });

  it('missing instrument: days to expiry empty with a reason', async () => {
    const { client } = setup(
      () => optionPositionPage([OPTION_POSITION], ''),
      () => instrumentsPage([OPTION_INSTRUMENT], ''),
    );
    const [p] = (await optPositions(client, { now: NOW })).positions;
    expect(p?.deliveryTime).toBe('');
    expect(p?.computed.daysToExpiry).toBeNull();
    expect(p?.computedNotes.daysToExpiry).toContain('instruments-info');
    expect(p?.computed.contract?.strike).toBe(0.56);
  });

  it('unparsed symbol: contract empty with a reason, raw greeks kept', async () => {
    const odd = { ...OPTION_POSITION, symbol: 'MNT-30XYZ26-0.56-P-USDT' };
    const { client } = setup(() => optionPositionPage([odd], ''));
    const [p] = (await optPositions(client, { now: NOW })).positions;
    expect(p?.computed.contract).toBeNull();
    expect(p?.computedNotes.contract).toContain('MNT-30XYZ26-0.56-P-USDT');
    expect(p?.delta).toBe('174.02817');
  });

  it('checks the key is read-only first', async () => {
    const { client, urls } = routedClient({
      '/v5/user/query-api': () => ({ ...QUERY_API, result: { ...QUERY_API.result, readOnly: 0 } }),
    });
    const err = await optPositions(client, { now: NOW }).catch((e: unknown) => e);
    expect((err as AppError).code).toBe('APP_KEY_NOT_READONLY');
    expect(urls.map((u) => u.pathname)).toEqual(['/v5/user/query-api']);
  });

  it('no option positions: empty list and a plain message', async () => {
    const { client } = setup(() => optionPositionPage([], ''));
    const r = await optPositions(client, { now: NOW });
    expect(r.positions).toEqual([]);
    expect(renderOptPositions(r)).toContain('Опционных позиций нет');
  });
});
