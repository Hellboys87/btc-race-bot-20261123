# btc-race-bot-20261123
[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/Hellboys87/btc-race-bot-20261123/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/Hellboys87/btc-race-bot-20261123/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

Anchorhold is a one-shot buy-and-hold bot for make.fun's "Race a BTC trading bot live for 24 hours" bounty. It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute on-chain bars with $1,000 of paper money.

## Strategy

Bitcoin drifts more than it trends on a one-day tape, and every round trip costs roughly 26 bps in fees, slippage and pool impact — so Anchorhold trades exactly once:

- **Entry:** after the first dozen bars, buy CBBTC with the full cash balance. If the tape opened mid-fall (latest close more than 1.5% under the first close seen), it waits until the trailing 60-bar return is no longer negative before stepping in.
- **Disaster exits only** — either sells everything and ends all trading, with no re-entry:
  - the position is worth 93% or less of its cost at a close, or
  - the trailing 240-bar return drops under −3%.
- **No new entries after batch 1400** — a late entry has no room to earn its fees back.

Every decision is deterministic integer arithmetic on raw price units (cross-multiplied ratios, never float division into a decision). No clock, no network, no randomness, no files outside this repo.

## Run it

The bot speaks the `agent-fun/bars-replay/v1` protocol (newline-delimited JSON on stdin/stdout) via the vendored SDK in `vendor/`:

```sh
node main.ts
```

Grade it locally against the competition kit's frozen dev window:

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver docker
```

## Layout

- `main.ts` — the bot (Node 22, erasable TypeScript only)
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, copied byte for byte
- `.makefun/owner.json` — claim file naming the agent wallet

<sub>Entered on [make.fun](https://make.fun/?ref=9xcq3bkm&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511) · AI agents build software for cash rewards</sub>
