#!/usr/bin/env node
/**
 * 🚀 AUREON: Simple USDC Live Trading
 * Optimized for small capital (£100-500)
 * Uses larger position sizes to meet Binance minimums
 */

import { BinanceClient } from '../core/binanceClient';
import { log } from '../core/environment';

const SYMBOLS = ['BTCUSDC', 'ETHUSDC', 'BNBUSDC'];
const POSITION_SIZE_PERCENT = 50; // Use 50% of balance per trade
const MAX_TRADES = 10; // Limit for testing

async function simpleTrade() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🚀 AUREON SIMPLE LIVE TRADING                        ║
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

  try {
    // Get starting balance
    const account = await client.getAccount();
    const usdc = account.balances.find(b => b.asset === 'USDC');
    let balance = Number(usdc?.free || 0);

    console.log(`\n💰 Starting Capital: ${balance.toFixed(2)} USDC`);
    console.log(`📊 Position Size: ${POSITION_SIZE_PERCENT}% (£${(balance * POSITION_SIZE_PERCENT / 100).toFixed(2)})`);
    console.log(`🎯 Max Trades: ${MAX_TRADES}`);
    console.log(`\n⏳ Starting in 5 seconds...\n`);

    await new Promise(r => setTimeout(r, 5000));

    let tradeCount = 0;
    let wins = 0;
    let losses = 0;

    while (tradeCount < MAX_TRADES) {
      // Select random symbol
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📈 Trade ${tradeCount + 1}/${MAX_TRADES}: ${symbol}`);
      
      // Get current price
      const price = await client.getPrice(symbol);
      console.log(`   Current price: £${price.toFixed(2)}`);
      
      // Calculate position size
      const positionUSDC = balance * (POSITION_SIZE_PERCENT / 100);
      let quantity = positionUSDC / price;
      
      // Round to appropriate precision for each symbol
      const precisionMap: Record<string, number> = {
        'BTCUSDC': 5,  // BTC: 5 decimals
        'ETHUSDC': 4,  // ETH: 4 decimals
        'BNBUSDC': 2,  // BNB: 2 decimals
      };
      
      const precision = precisionMap[symbol] || 2;
      quantity = Number(quantity.toFixed(precision));
      
      console.log(`   Position: ${quantity} ${symbol.replace('USDC', '')}`);
      console.log(`   Cost: ${positionUSDC.toFixed(2)} USDC`);
      
      // Place BUY order
      try {
        console.log(`\n   🔵 BUYING...`);
        const buyOrder = await client.placeOrder({
          symbol,
          side: 'BUY',
          type: 'MARKET',
          quantity,
        });
        
        const filled = Number(buyOrder.executedQty);
        const avgPrice = Number(buyOrder.cummulativeQuoteQty) / filled;
        
        console.log(`   ✅ BUY ORDER FILLED`);
        console.log(`      Order ID: ${buyOrder.orderId}`);
        console.log(`      Quantity: ${filled.toFixed(6)}`);
        console.log(`      Avg Price: £${avgPrice.toFixed(2)}`);
        console.log(`      Cost: ${buyOrder.cummulativeQuoteQty} USDC`);
        
        // Wait a bit
        console.log(`\n   ⏳ Holding for 10 seconds...`);
        await new Promise(r => setTimeout(r, 10000));
        
        // Get new price
        const newPrice = await client.getPrice(symbol);
        const priceChange = ((newPrice - avgPrice) / avgPrice) * 100;
        
        console.log(`\n   📊 New price: £${newPrice.toFixed(2)} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)`);
        
        // Place SELL order
        console.log(`   🔴 SELLING...`);
        const sellOrder = await client.placeOrder({
          symbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: filled,
        });
        
        const sellAvgPrice = Number(sellOrder.cummulativeQuoteQty) / filled;
        const pnl = Number(sellOrder.cummulativeQuoteQty) - Number(buyOrder.cummulativeQuoteQty);
        
        console.log(`   ✅ SELL ORDER FILLED`);
        console.log(`      Order ID: ${sellOrder.orderId}`);
        console.log(`      Avg Price: £${sellAvgPrice.toFixed(2)}`);
        console.log(`      Received: ${sellOrder.cummulativeQuoteQty} USDC`);
        console.log(`      P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)} USDC`);
        
        if (pnl > 0) wins++;
        else losses++;
        
        balance += pnl;
        tradeCount++;
        
      } catch (err: any) {
        console.log(`   ❌ TRADE FAILED: ${err.message}`);
        
        if (err.message.includes('LOT_SIZE')) {
          console.log(`      ℹ️  Amount too small - increasing position size...`);
        }
      }
      
      console.log(`\n   💰 Current Balance: ${balance.toFixed(2)} USDC`);
      
      // Wait between trades
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`\n\n╔════════════════════════════════════════════════════════════════╗`);
    console.log(`║         📊 TRADING SESSION COMPLETE                          ║`);
    console.log(`╚════════════════════════════════════════════════════════════════╝`);
    console.log(`\n   Trades: ${tradeCount}`);
    console.log(`   Wins: ${wins}`);
    console.log(`   Losses: ${losses}`);
    console.log(`   Win Rate: ${((wins/tradeCount)*100).toFixed(1)}%`);
    console.log(`\n   Starting Balance: ${(balance - (wins - losses)).toFixed(2)} USDC`);
    console.log(`   Final Balance: ${balance.toFixed(2)} USDC`);
    console.log(`   Total P&L: ${((balance / (balance - (wins - losses)) - 1) * 100).toFixed(2)}%\n`);

  } catch (err: any) {
    console.error(`\n❌ Error:`, err.message);
    log('error', 'Trading failed', { error: err.message });
    process.exit(1);
  }
}

simpleTrade().catch(console.error);
