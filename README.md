# AUREON Quantum Trading System (AQTS)

Multi-bot, autonomous crypto trading system with live/dry-run modes, a status server, and a lightweight React UI for monitoring. Built with TypeScript/Node.js, Vite + React, and a Binance Spot REST client.

---

## Overview

AQTS orchestrates three specialized bots and provides real-time visibility:

- Hummingbird: ETH-quoted rotations with TP/SL, returns to `ETH` base.
- Army Ants: Ensures USDT, rotates small USDT alt spends, reconverts to `ETH`.
- Lone Wolf: Momentum snipe (single trade), returns to base.

Infrastructure and UX:

- Express status server with `/api/status`, `/api/bots`, `/api/trades` (mock mode supported).
- React UI Status panel (balances, $10 min-notional alert with sound toggle), per-bot status from log tails.
- Recent trades view with P/L coloring vs prior trade.
- CI-ready (typecheck/build), mock mode for endpoint smoke tests.

Important: Binance enforces a ~$10 minimum notional per order on Spot. Bots auto-wait below threshold and start automatically once total notional ≥ $10.

---

## Quick Start

Prereqs: Node.js 18+, npm, Binance API key/secret (Spot trading, withdrawals disabled).

1. Install

```bash
npm install
```

1. Configure environment (.env not committed)

```bash
# Required (Binance Spot)
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret

# Optional safety/testing
BINANCE_TESTNET=false        # set true for Binance testnet if wired
DRY_RUN=true                 # default safe mode for scripts
CONFIRM_LIVE_TRADING=yes     # required gate for live if DRY_RUN=false

# Status server
STATUS_MOCK=false            # true to return demo data from endpoints
PORT=8787                    # status server port
```

1. Run the status server (mock or live)

```bash
# Mock endpoints for demo/CI
STATUS_MOCK=true npm run status:server

# Live (reads your account if keys set)
npm run status:server
```

1. Run the UI (Vite dev)

```bash
npm run dev
```

Open the app, see balances, bot tails, recent trades. Toggle alert sound in the header and click Test to verify.

---

## Bots and Scripts

Safe dry-runs (recommended to validate wiring):

```bash
npm run hb:dry     # Hummingbird ETH rotations (DRY_RUN)
npm run ants:dry   # Army Ants USDT rotations (DRY_RUN)
npm run wolf:dry   # Lone Wolf momentum snipe (DRY_RUN)
npm run orchestrate:dry  # DRY-run sequence of all
```

Live example (explicit):

```bash
CONFIRM_LIVE_TRADING=yes DRY_RUN=false tsx scripts/hummingbird.ts
```

Notes

- Bots honor “wait-for-funds” modes and min-notional sizing. If your total notional is < $10, they’ll idle until eligible.
- The Binance client supports MARKET orders with `quoteOrderQty`, so you can “spend exactly X quote” when viable.

Relevant files

- `scripts/hummingbird.ts`, `scripts/armyAnts.ts`, `scripts/loneWolf.ts`
- `core/binanceClient.ts` (REST wrapper, `quoteOrderQty`, `getExchangeInfo`, `getMyTrades`)
- `scripts/statusServer.ts` (Express endpoints; `STATUS_MOCK` for demo/CI)
- `StatusPanel.tsx`, `RecentTrades.tsx`, `TradingConsole.tsx` (UI)

---

## Status Server Endpoints

- `GET /api/status` → `{ eth, usdt, ethUsdt, totalUsd, canTrade }`
- `GET /api/bots` → `{ bots: [{ name, tail: string[] }] }`
- `GET /api/trades` → recent fills/trades by symbol (implementation may vary)

Set `STATUS_MOCK=true` for deterministic demo responses and CI smoke tests.

---

## UI Highlights

- Balances: `ETH`, `USDT`, `Total (USDT)`, and “Trading Enabled/Disabled”.
- $10 Threshold Alert: visual banner when trading becomes eligible; optional beep (toggleable, persisted in `localStorage`).
- Sound Toggle + Test: header control to enable/disable alert sound and play a test tone.
- Per-Bot Status: colored dot + label inferred from bot logs (waiting/simulating/active/running).
- Recent Trades: per-symbol view with P/L delta coloring vs the prior trade.

---

## Development

Common tasks

```bash
npm run typecheck
npm run build
npm run preview   # serves dist
```

Code style: TypeScript, Vite + React. Keep changes minimal and focused; do not commit secrets.

---

## Safety & Disclaimers

- Live trading carries risk. Start with small sizes and test in `DRY_RUN` or testnet first.
- Binance Spot enforces a ~$10 min notional per order. Size accordingly or allow bots to auto-wait.
- Keep API keys read/trade only. NEVER enable withdrawals. Consider IP whitelisting + 2FA.

---

## Docs

- System architecture and specs live under `docs/`.
- See `docs/AQTS_Technical_Specification.md` and `AQTS_System_Architecture.md` for deeper internals.

---

## License

MIT License

```text
MIT License

Copyright (c) 2025 R&A Consulting and Brokerage Services Ltd

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
