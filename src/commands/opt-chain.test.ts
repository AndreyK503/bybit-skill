import { describe, expect, it } from 'vitest';
import { OPTION_INSTRUMENT, OPTION_TICKER, instrumentsPage, tickersPage } from '../fixtures/bybit-v5-options.js';
import { publicClient, type Route } from '../fixtures/route-fetch.js';
import { optChain } from './opt-chain.js';

/**
 * Fixtures: OPTION_TICKER and OPTION_INSTRUMENT (docs examples); variants change only symbol,
 * optionsType and deliveryTime. Timestamps (`date -u -j -f "%Y-%m-%d %H:%M:%S" ... +%s`):
 * 2026-09-28 08:00 UTC = 1790582400, 2026-10-30 08:00 = 1793347200, 2026-11-27 08:00 = 1795766400.
 * NOW = 1793217600000 (2026-10-28 20:00 UTC): the 28SEP26 expiry is past, 30OCT26 is the nearest.
 * Monthly = last Friday of the month (`cal 10 2026`: 23 Oct is a Friday, 30 Oct the last one).
 * 2026-10-23 08:00 UTC = 1792742400; NOW_EARLY 2026-10-20 00:00 UTC = 1792454400.
 */
const T_PAST = '1790582400000';
const T_OCT = '1793347200000';
const T_NOV = '1795766400000';
const NOW = 1793217600000;

const CONTRACTS: [string, string, string][] = [
  ['BTC-28SEP26-60000-C-USDT', 'Call', T_PAST],
  ['BTC-30OCT26-70000-C-USDT', 'Call', T_OCT],
  ['BTC-30OCT26-60000-P-USDT', 'Put', T_OCT],
  ['BTC-30OCT26-65000-P-USDT', 'Put', T_OCT],
  ['BTC-30OCT26-60000-C-USDT', 'Call', T_OCT],
  ['BTC-27NOV26-70000-P-USDT', 'Put', T_NOV],
];
const INSTRUMENTS = CONTRACTS.map(([symbol, optionsType, deliveryTime]) => ({ ...OPTION_INSTRUMENT, symbol, optionsType, deliveryTime }));
const TICKERS = CONTRACTS.map(([symbol]) => ({ ...OPTION_TICKER, symbol }));

function setup(tickers: Route = () => tickersPage(TICKERS), instruments: Route = () => instrumentsPage(INSTRUMENTS, '')) {
  return publicClient({ '/v5/market/tickers': tickers, '/v5/market/instruments-info': instruments });
}

const symbols = (r: { rows: { symbol: string }[] }) => r.rows.map((x) => x.symbol);

describe('opt chain', () => {
  it('one tickers call and every instruments page for the uppercased coin, without a key', async () => {
    const { client, urls } = setup(undefined, (url) =>
      url.searchParams.get('cursor') === 'c2' ? instrumentsPage(INSTRUMENTS.slice(3), '') : instrumentsPage(INSTRUMENTS.slice(0, 3), 'c2'),
    );
    const r = await optChain(client, { coin: 'btc', now: NOW });
    expect(r.baseCoin).toBe('BTC');
    const q = urls.map((u) => [u.pathname, Object.fromEntries(u.searchParams)]);
    expect(q.filter(([p]) => p === '/v5/market/tickers')).toEqual([['/v5/market/tickers', { category: 'option', baseCoin: 'BTC' }]]);
    expect(q.filter(([p]) => p === '/v5/market/instruments-info')).toEqual([
      ['/v5/market/instruments-info', { category: 'option', baseCoin: 'BTC', limit: '1000' }],
      ['/v5/market/instruments-info', { category: 'option', baseCoin: 'BTC', limit: '1000', cursor: 'c2' }],
    ]);
  });

  it('row: raw ticker and instrument fields, strike in computed', async () => {
    const { client } = setup();
    const r = await optChain(client, { coin: 'BTC', expiry: '2026-11-27', now: NOW });
    expect(r.rows).toEqual([
      {
        symbol: 'BTC-27NOV26-70000-P-USDT',
        optionsType: 'Put',
        deliveryTime: T_NOV,
        bid1Price: '0',
        bid1Size: '0',
        ask1Price: '435',
        ask1Size: '0.66',
        markPrice: '0.00000009',
        bid1Iv: '0',
        ask1Iv: '5',
        markIv: '0.7567',
        delta: '0.00000001',
        gamma: '0.00000001',
        vega: '0.00000004',
        theta: '-0.00000152',
        volume24h: '0.15',
        openInterest: '6.3',
        underlyingPrice: '16590.42',
        computed: { strike: 70000 },
      },
    ]);
    expect(r.computedNotes.strike).toContain('символ');
  });

  it('default: nearest monthly expiry after now, named in the result, sorted by strike, Call before Put', async () => {
    const { client } = setup();
    const r = await optChain(client, { coin: 'BTC', now: NOW });
    expect(r.expiry).toEqual({ date: '2026-10-30', deliveryTime: T_OCT });
    expect(symbols(r)).toEqual(['BTC-30OCT26-60000-C-USDT', 'BTC-30OCT26-60000-P-USDT', 'BTC-30OCT26-65000-P-USDT', 'BTC-30OCT26-70000-C-USDT']);
    expect(r.availableExpiries).toEqual(['2026-10-30', '2026-11-27']);
  });

  it('type filter', async () => {
    const { client } = setup();
    const r = await optChain(client, { coin: 'BTC', type: 'Put', now: NOW });
    expect(symbols(r)).toEqual(['BTC-30OCT26-60000-P-USDT', 'BTC-30OCT26-65000-P-USDT']);
  });

  it('strike range is inclusive', async () => {
    const { client } = setup();
    const r = await optChain(client, { coin: 'BTC', minStrike: 60000, maxStrike: 65000, now: NOW });
    expect(symbols(r)).toEqual(['BTC-30OCT26-60000-C-USDT', 'BTC-30OCT26-60000-P-USDT', 'BTC-30OCT26-65000-P-USDT']);
  });

  it('expiry with no contracts: empty chain, not an error, available dates named', async () => {
    const { client } = setup();
    const r = await optChain(client, { coin: 'BTC', expiry: '2026-12-25', now: NOW });
    expect(r.rows).toEqual([]);
    expect(r.expiry).toBeNull();
    expect(r.availableExpiries).toEqual(['2026-10-30', '2026-11-27']);
    expect(r.notes.join('\n')).toContain('2026-12-25');
  });

  it('coin without options: empty chain and a plain note', async () => {
    const { client } = setup(() => tickersPage([]), () => instrumentsPage([], ''));
    const r = await optChain(client, { coin: 'DOT', now: NOW });
    expect(r.rows).toEqual([]);
    expect(r.expiry).toBeNull();
    expect(r.notes.join('\n')).toContain('DOT');
  });

  it('ticker without an instrument card is left out and named in notes', async () => {
    const extra = { ...OPTION_TICKER, symbol: 'BTC-30OCT26-80000-C-USDT' };
    const { client } = setup(() => tickersPage([...TICKERS, extra]));
    const r = await optChain(client, { coin: 'BTC', now: NOW });
    expect(symbols(r)).not.toContain(extra.symbol);
    expect(r.notes.join('\n')).toContain(extra.symbol);
  });

  it('default skips weekly: 23OCT26 is nearer, 30OCT26 (last Friday) is taken', async () => {
    const weekly = { ...OPTION_INSTRUMENT, symbol: 'BTC-23OCT26-60000-P-USDT', optionsType: 'Put', deliveryTime: '1792742400000' };
    const { client } = setup(
      () => tickersPage([...TICKERS, { ...OPTION_TICKER, symbol: weekly.symbol }]),
      () => instrumentsPage([...INSTRUMENTS, weekly], ''),
    );
    const r = await optChain(client, { coin: 'BTC', now: 1792454400000 });
    expect(r.expiry).toEqual({ date: '2026-10-30', deliveryTime: T_OCT });
    expect(symbols(r)).not.toContain(weekly.symbol);
    expect(r.notes.join('\n')).toContain('последняя пятница');
  });

  it('no monthly expiry ahead: nearest one is taken and the note says so', async () => {
    const weekly = { ...OPTION_INSTRUMENT, symbol: 'BTC-23OCT26-60000-P-USDT', optionsType: 'Put', deliveryTime: '1792742400000' };
    const { client } = setup(() => tickersPage([{ ...OPTION_TICKER, symbol: weekly.symbol }]), () => instrumentsPage([weekly], ''));
    const r = await optChain(client, { coin: 'BTC', now: 1792454400000 });
    expect(r.expiry).toEqual({ date: '2026-10-23', deliveryTime: '1792742400000' });
    expect(r.notes.join('\n')).toContain('месячной');
  });
});
