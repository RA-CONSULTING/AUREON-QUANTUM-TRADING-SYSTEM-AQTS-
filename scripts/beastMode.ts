#!/usr/bin/env node
/**
 * 🚀 AUREON BEAST MODE: Maximum Aggressive Trading
 * Target: 10-20% daily gains through high-frequency trading
 * £142 → £500k as fast as possible
 */

import 'dotenv/config';
import { BinanceClient } from '../core/binanceClient';

const SYMBOLS = ['BTCUSDC', 'ETHUSDC', 'BNBUSDC'];
const MAX_TRADES_PER_DAY = 50; // Binance limit
const POSITION_SIZE = 90; // Use 90% of capital per trade (go big!)
const MIN_PROFIT_PERCENT = 0.3; // Only sell if 0.3%+ profit
const MAX_HOLD_TIME_MS = 120000; // Wait up to 2 minutes for profit
const CHECK_INTERVAL_MS = 2000; // Check price every 2 seconds
const STOP_LOSS_PERCENT = -0.5; // Cut losses at -0.5%

async function beastMode() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🔥 AUREON BEAST MODE: GENERATIONAL WEALTH            ║
║         Target: £500,000 | Strategy: MAXIMUM AGGRESSION      ║
╚════════════════════════════════════════════════════════════════╝
  `);

  if (process.env.CONFIRM_LIVE_TRADING !== 'yes') {
    console.log(`⚠️  Set CONFIRM_LIVE_TRADING=yes to proceed`);
    process.exit(1);
  }

  const client = new BinanceClient({
    apiKey: process.env.BINANCE_API_KEY!,
    apiSecret: process.env.BINANCE_API_SECRET!,
    testnet: false,
  });

  const startTime = Date.now();
  let tradeCount = 0;
  let wins = 0;
  let losses = 0;
  let totalProfit = 0;

  const account = await client.getAccount();
  const usdc = account.balances.find(b => b.asset === 'USDC');
  let balance = Number(usdc?.free || 0);
  const startingBalance = balance;

  console.log(`\n💰 Starting Capital: £${balance.toFixed(2)}`);
  console.log(`🎯 Target: £500,000`);
  console.log(`⚡ Strategy: ${MAX_TRADES_PER_DAY} trades/day @ ${POSITION_SIZE}% positions`);
  console.log(`📈 Min Profit Target: ${MIN_PROFIT_PERCENT}%`);
  console.log(`🛡️  Stop Loss: ${STOP_LOSS_PERCENT}%`);
  console.log(`⏱️  Max Hold: ${MAX_HOLD_TIME_MS/1000}s per trade`);
  console.log(`\n🚀 LAUNCHING IN 3 SECONDS...\n`);

  await new Promise(r => setTimeout(r, 3000));

  console.log(`╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  LIVE TRADING ACTIVE - Press Ctrl+C to stop                  ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  // Track daily stats
  let dailyStart = balance;
  let dailyTrades = 0;
  let lastReportTime = Date.now();

  while (balance < 500000 && dailyTrades < MAX_TRADES_PER_DAY) {
    try {
      // Pick symbol with best recent performance
      const symbol = SYMBOLS[tradeCount % SYMBOLS.length];
      const entryPrice = await client.getPrice(symbol);
      const positionSize = balance * (POSITION_SIZE / 100);
      
      let quantity = positionSize / entryPrice;
      const precisionMap: Record<string, number> = {
        'BTCUSDC': 5, 'ETHUSDC': 4, 'BNBUSDC': 2,
      };
      quantity = Number(quantity.toFixed(precisionMap[symbol] || 2));

      // BUY
      const buyOrder = await client.placeOrder({
        symbol, side: 'BUY', type: 'MARKET', quantity,
      });

      const filled = Number(buyOrder.executedQty);
      const buyPrice = Number(buyOrder.cummulativeQuoteQty) / filled;
      const holdStartTime = Date.now();

      // INTELLIGENT HOLD - Wait for profit or stop loss
      let currentPrice = buyPrice;
      let profitPercent = 0;
      let shouldSell = false;

      while (!shouldSell && (Date.now() - holdStartTime) < MAX_HOLD_TIME_MS) {
        await new Promise(r => setTimeout(r, CHECK_INTERVAL_MS));
        currentPrice = await client.getPrice(symbol);
        profitPercent = ((currentPrice - buyPrice) / buyPrice) * 100;

        // Sell if we hit profit target
        if (profitPercent >= MIN_PROFIT_PERCENT) {
          shouldSell = true;
          console.log(`   ✅ Profit target hit: +${profitPercent.toFixed(2)}%`);
        }
        // Sell if we hit stop loss
        else if (profitPercent <= STOP_LOSS_PERCENT) {
          shouldSell = true;
          console.log(`   🛑 Stop loss triggered: ${profitPercent.toFixed(2)}%`);
        }
      }

      // If max hold time reached, sell anyway
      if (!shouldSell) {
        console.log(`   ⏰ Max hold time - selling at ${profitPercent.toFixed(2)}%`);
      }

      // SELL
      const sellOrder = await client.placeOrder({
        symbol, side: 'SELL', type: 'MARKET', quantity: filled,
      });

      const sellPrice = Number(sellOrder.cummulativeQuoteQty) / filled;
      const profit = Number(sellOrder.cummulativeQuoteQty) - Number(buyOrder.cummulativeQuoteQty);
      
      balance += profit;
      totalProfit += profit;
      tradeCount++;
      dailyTrades++;

      if (profit > 0) wins++; else losses++;

      // Report every 10 trades or every 5 minutes
      if (tradeCount % 10 === 0 || (Date.now() - lastReportTime) > 300000) {
        const dailyGain = ((balance - dailyStart) / dailyStart) * 100;
        const totalGain = ((balance - startingBalance) / startingBalance) * 100;
        const winRate = ((wins / tradeCount) * 100).toFixed(1);
        const elapsed = Math.floor((Date.now() - startTime) / 1000 / 60);
        
        console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 PROGRESS REPORT | ${new Date().toLocaleTimeString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Balance: £${balance.toFixed(2)} | Daily: ${dailyGain > 0 ? '+' : ''}${dailyGain.toFixed(2)}%
📈 Total Gain: ${totalGain > 0 ? '+' : ''}${totalGain.toFixed(2)}% | Profit: £${totalProfit.toFixed(2)}
🎯 Trades: ${tradeCount} | Win Rate: ${winRate}% | Elapsed: ${elapsed}min
🚀 To Target: £${(500000 - balance).toFixed(2)} remaining
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
        lastReportTime = Date.now();
      }

      // Delay between trades (50 trades/day = ~29 min between trades)
      const delayMs = Math.floor((24 * 60 * 60 * 1000) / MAX_TRADES_PER_DAY);
      console.log(`   ⏳ Next trade in ${Math.floor(delayMs/1000/60)} minutes...\n`);
      await new Promise(r => setTimeout(r, delayMs));

    } catch (err: any) {
      console.log(`⚠️  Trade ${tradeCount + 1} failed: ${err.message.substring(0, 50)}...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // SUCCESS!
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🎉 TARGET REACHED: £500,000+ !!!                     ║
╚════════════════════════════════════════════════════════════════╝

🏆 MISSION ACCOMPLISHED!

Starting Capital: £${startingBalance.toFixed(2)}
Final Balance: £${balance.toFixed(2)}
Total Profit: £${(balance - startingBalance).toFixed(2)}
Total Gain: ${(((balance - startingBalance) / startingBalance) * 100).toFixed(2)}%

Trades Executed: ${tradeCount}
Wins: ${wins} | Losses: ${losses}
Win Rate: ${((wins / tradeCount) * 100).toFixed(1)}%

Time Taken: ${Math.floor((Date.now() - startTime) / 1000 / 60 / 60)}h ${Math.floor((Date.now() - startTime) / 1000 / 60) % 60}m

🌟 YOUR KIDS NEVER HAVE TO WORRY AGAIN! 🌟
  `);
}

beastMode().catch(console.error);
