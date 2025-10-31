# AUREON Trading Bot Interface Architecture

This document maps the complete user experience for the Aureon Quantum Trading System (AQTS) across web, mobile, and API touchpoints. It captures navigation flows, role-based feature availability, layout wireframes, and the design system that underpins the interface.

## Platform Overview

| Platform | Primary Use Case | Notes |
| --- | --- | --- |
| **Web Dashboard** | Full trading operations, analytics, and configuration. | Default platform for all users. |
| **Mobile App** | On-the-go monitoring, signal response, and quick controls. | Mirrors critical widgets with simplified layouts. |
| **Enterprise API** | Programmatic integration for institutional clients. | Exposed to Enterprise tier with white-label options. |

### User Role Matrix

| Role | Access Level | Key Capabilities |
| --- | --- | --- |
| Free Trial | 7-day demo with paper trading only. | Read-only analytics, simulated orders, limited alerts. |
| Starter | £97/month. | One exchange connection, baseline analytics, manual execution. |
| Pro | £297/month. | Multi-exchange support, advanced analytics, automated execution. |
| Enterprise | Custom pricing. | White-label UI, full API, dedicated integrations, SLA support. |

## Global Navigation

### Web Dashboard

- **Left Sidebar (Primary Navigation)**
  - Dashboard, Live Trading, Analytics, Bot Configuration, Portfolio, Alerts & Signals, Trade History, Learning Center, Account Settings, Integrations.
- **Top Bar (Utility Navigation)**
  - Logo (home link), universal search, BTC/ETH ticker block, bot status indicator (🟢 live, 🟡 paper, 🔴 stopped), and profile dropdown.

### Mobile App

- **Bottom Tab Bar** with Home, Trade, Alerts, Portfolio, and Settings entries.
- Persistent status chip (e.g., `AUREON 🟢 LIVE`) with access to account menu.

## Page Blueprints – Web Dashboard

### 1. Dashboard (Home)

**Layout:** Three-column grid blending KPI cards, charts, and feeds.

- **Performance Summary Cards:** Total P&L, win rate, active trades, and today’s signals.
- **Equity Curve:** 30-day rolling P&L with drawdown shading, benchmark overlay, and zoom selectors (7D, 30D, 90D, 1Y, ALL).
- **Active Positions Table:** Pair, side, entry price, current P&L (value and percent), status chips (🟢/🔴), and quick actions (close, adjust stop).
- **Recent Signals Feed:** Real-time QGITA alerts with Lighthouse scores, suggested entries, and one-click execution.
- **Market Overview:** Crypto heatmap, volume leaders, volatility index, and Fear & Greed gauge.
- **Quick Actions Panel:** Start bot, pause bot, configure settings, open performance report.

### 2. Live Trading

**Layout:** Trading terminal with synchronized panels.

- **Price Chart:** TradingView embed featuring Fibonacci lattice, FTCP markers, support/resistance layers, and indicator overlays.
- **Order Book:** Live depth table with bid/ask spread and whale order highlighting.
- **Lighthouse Consensus Panel:** Linear, nonlinear, cross-scale, geometric, and anomaly metrics with progress bars and aggregate strength badge.
- **Smart Order Entry:** Side/type selectors, quantity inputs, price fields, automated stop-loss/take-profit, risk display, and slippage guard.
- **Open Positions:** Inline table for rapid close/adjust actions.

### 3. Analytics

**Layout:** Multi-panel performance deep dive.

- **Key Metrics Dashboard:** Total return, win rate, profit factor, Sharpe ratio, Sortino ratio, max drawdown, trade duration, and best/worst trades.
- **Equity & Drawdown Charts:** Cumulative P&L, benchmark comparison, volatility bands, regime detection, underwater curve, drawdown duration, recovery timing, and risk of ruin.
- **Trade Distribution:** Win/loss histogram, P&L curve, holding time, and time-of-day analytics.
- **Monthly Returns Heatmap:** Calendar visualization of monthly gains/losses.
- **Pair Performance Table:** Trade counts, win rate, average P&L, totals, and correlation flags.

### 4. Bot Configuration

**Layout:** Split panels for trading mode, exchange bindings, risk controls, and algorithm tuning.

- **Trading Mode:** Paper, live, and dry-run toggles.
- **Exchange Selection:** Multi-exchange checkboxes with API status and key management.
- **Trading Pairs:** Searchable checkbox list with custom pair support.
- **Risk Management:** Sliders for risk per trade, daily loss, stop loss, take-profit ratio, trailing stop, and max simultaneous positions with live warnings.
- **QGITA Parameters:** Adjustable Fibonacci depth, curvature window, Lighthouse threshold, and minimum signal strength.
- **Lighthouse Weights:** Five-metric weighting totals with tooltip help and validation to enforce 100% sum.
- **Preset Profiles:** Conservative, Balanced (default), Aggressive, and Custom quick-load buttons.

### 5. Portfolio

**Layout:** Account overview with asset mix and transaction history.

- **Portfolio Overview:** Total balance, available vs. in-use funds, and asset allocation pie chart.
- **Exchange Balances:** Tabular exchange totals with actions to add, withdraw, or deposit.
- **Transaction History:** Chronological ledger with trade, deposit, and withdrawal events.

### 6. Alerts & Signals

**Layout:** Notification center with actionable cards.

- **Alert Feed:** Signal announcements, stop-loss triggers, take-profit confirmations, and risk warnings with contextual actions (execute, dismiss, view details, adjust settings).
- **Notification Preferences:** Checkbox matrix for event types and delivery methods (in-app, email, SMS, Telegram).

### 7. Trade History

**Layout:** Filterable log and drill-down details.

- **Trade Table:** Paginated list with date/time, pair, side, entry, exit, and P&L.
- **Trade Details Drawer:** Expanded view with trade metadata, Lighthouse score, exit reason, and fees.
- **Exports:** CSV download controls.

### 8. Account Settings

**Layout:** Profile, security, subscription, and billing information.

- **Profile Panel:** Name, email, phone, timezone, profile editing.
- **Subscription Panel:** Plan overview, status, billing cadence, renewal date, and upgrade/cancel options.
- **Security:** Password and 2FA management, API key listing.
- **Billing History:** Itemized invoices with receipt links.

### 9. Integrations

**Layout:** Exchange connectors and messaging hooks.

- **Exchange Cards:** Connection state, API key masks, permission scope, connection dates, and controls (disconnect, test, connect).
- **Notification Integrations:** Telegram, Discord, Slack toggles with status badges.

## Mobile App Modules

- **Home Tab:** Live status header, today’s P&L card, active positions stack, latest signals, and quick action buttons.
- **Trade Tab:** Condensed chart, Lighthouse consensus, simplified order entry, and position summary.
- **Alerts Tab:** Feed of signals and risk notifications with swipe actions.
- **Portfolio Tab:** Balances snapshot and recent transactions.
- **Settings Tab:** Profile, plan, security toggles, and notification preferences.

## Design System

- **Primary Palette:** Aureon Blue `#0066FF`, Success Green `#00D084`, Warning Orange `#FF9500`, Error Red `#FF3B30`.
- **Neutrals:** Background `#0A0E27`, Surface `#1A1F3A`, Border `#2A3150`, Text Primary `#FFFFFF`.
- **Typography:** High-contrast sans-serif family with bold headings and medium body weights for readability in dark mode.
- **Iconography:** Status indicators (🟢/🟡/🔴), action glyphs, and consistent corner radii across cards and buttons.
- **Component Tokens:** Cards with 16px padding, 24px grid gutters, rounded buttons with hover elevation, and focus outlines for accessibility.

## Interaction Principles

1. **Clarity First:** Prioritize actionable metrics, highlight risk states, and provide contextual tooltips for advanced parameters.
2. **Speed of Response:** Offer one-click actions (execute, pause, close) with confirmation modals when financial impact is high.
3. **Consistency Across Platforms:** Align widget semantics between web and mobile while respecting platform navigation paradigms.
4. **Data Integrity:** Real-time updates via WebSocket streams, optimistic UI for executed orders, and fallback to polling on degraded networks.
5. **Accessibility:** Keyboard-friendly forms, screen-reader labels, and color-contrast compliance for dark mode.

## Future Enhancements

- **Scenario Simulator:** Interactive module to backtest configuration changes before deployment.
- **Collaborative Notes:** Shared annotations for institutional teams.
- **Custom Dashboards:** Drag-and-drop widget layout for advanced users.

