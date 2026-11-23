// Anchorhold — a one-shot buy-and-hold bot for the make.fun BTC race.
//
// The whole idea fits in one paragraph: step in once, early, with everything,
// then sit still unless the trade is clearly going wrong. Bitcoin drifts more
// than it trends on a one-day tape, and every round trip here costs roughly
// 26 bps in fees, slippage and pool impact, so chopping in and out is how a
// bot bleeds to death. One full-size entry, two disaster exits, no re-entry.
//
// Entry: after the first dozen bars have printed, spend all cash on CBBTC.
// One exception: if the tape already opened mid-fall — the latest close more
// than 1.5% under the very first close seen — hold off until the trailing
// 60-bar return stops being negative, so we do not catch a falling knife.
//
// Exits (either one sells the whole position and ends all trading):
//   (a) the position is worth 93% or less of what it cost, at a close;
//   (b) the trailing 240-bar return drops under -3%.
//
// Nothing after batch 1400: a late entry has no room to earn its fees back.
//
// Every decision is integer arithmetic on raw price units (cross-multiplied
// ratios, never a float division feeding a decision), so two runs on the same
// bars answer byte for byte the same. No clock, no network, no randomness,
// no files outside this repository.

import { runBars, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// How many closes to watch before the first (and only) buy.
const ENTRY_BARS = 12;
// No new entries after this batch.
const LAST_ENTRY_BATCH = 1400;
// Mid-fall tripwire: latest close more than this far under the first close.
const FALL_TRIP_NUM = 15; // 1.5% = 15 / 1000
const FALL_TRIP_DEN = 1000;
// Wait-out window for the tripwire: the trailing return over this many bars.
const FALL_WAIT_BARS = 60;
// Disaster exit (a): position value at or under this share of its cost.
const RUIN_NUM = 93;
const RUIN_DEN = 100;
// Disaster exit (b): trailing return under this over this many bars.
const SLIDE_BARS = 240;
const SLIDE_NUM = 97; // -3% = 97 / 100
const SLIDE_DEN = 100;
// Let fills land wherever the next open is; the strategy never leans on a
// tight slippage bound.
const WIDE_SLIPPAGE_BPS = 10_000;

// Closes seen so far, oldest first, in raw price units.
const closes: bigint[] = [];
let bought = false;
let finished = false;

await runBars({
  onBatch(state) {
    // Warm-up batches cannot trade; any order decided on one is rejected.
    if (state.warmingUp || finished) return [];

    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    const n = closes.length;

    const held = state.positions.get(SYMBOL);
    if (held !== undefined && held.qty > 0n) {
      // --- disaster exits, checked on every close while we hold ---
      const worth = state.value(SYMBOL, held.qty, close);
      // (a) worth <= 93% of cost  <=>  worth * 100 <= cost * 93
      if (worth * BigInt(RUIN_DEN) <= held.cost * BigInt(RUIN_NUM)) {
        finished = true;
        return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: WIDE_SLIPPAGE_BPS } satisfies SellInput];
      }
      // (b) trailing 240-bar return < -3%  <=>  close * 100 < close240ago * 97
      if (n > SLIDE_BARS) {
        const back = closes[n - 1 - SLIDE_BARS];
        if (close * BigInt(SLIDE_DEN) < back * BigInt(SLIDE_NUM)) {
          finished = true;
          return [{ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: WIDE_SLIPPAGE_BPS } satisfies SellInput];
        }
      }
      return [];
    }

    // --- the one entry ---
    if (bought || state.seq > LAST_ENTRY_BATCH || n < ENTRY_BARS) return [];

    // Opened mid-fall? Then wait until the 60-bar return is no longer down.
    const first = closes[0];
    if (close * BigInt(FALL_TRIP_DEN) < first * BigInt(FALL_TRIP_DEN - FALL_TRIP_NUM)) {
      if (n <= FALL_WAIT_BARS) return [];
      const back = closes[n - 1 - FALL_WAIT_BARS];
      if (close < back) return [];
    }

    bought = true;
    return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: WIDE_SLIPPAGE_BPS } satisfies BuyInput];
  },
});
