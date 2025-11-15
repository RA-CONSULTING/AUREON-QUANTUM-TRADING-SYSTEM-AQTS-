#!/usr/bin/env node
/**
 * Hummingbird Strategy: "Pollinate and Extract"
 * - Uses small ETH to buy one ETH-quoted alt with sufficient notional (>= $10)
 * - Targets quick rotations: take-profit and stop-loss
 * - Sells back to ETH to grow the hive's ETH
 */

import 'dotenv/config';
import { BinanceClient } from '../core/binanceClient';

const SLEEP = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getNumberBalance(client: BinanceClient, asset: string): Promise<number> {
  const acct = await client.getAccount();
  return Number(acct.balances.find((b) => b.asset === asset)?.free || 0);
}

function roundDown(value: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.floor(value * p) / p;
}

async function pickAltSymbol(client: BinanceClient, candidates: string[]): Promise<string | null> {
  // Prefer symbol with highest quote volume (ETH) if available
  let best: { sym: string; vol: number } | null = null;
  for (const sym of candidates) {
    try {
      const stats = await client.get24hStats(sym);
      const vol = Number(stats.quoteAssetVolume);
      if (!isNaN(vol) && (!best || vol > best.vol)) best = { sym, vol };
    } catch {
      // try next
    }
  }
  if (best) return best.sym;

  // Fallback: first symbol that has a price endpoint
  for (const sym of candidates) {
    try {
      const p = await client.getPrice(sym);
      if (p > 0) return sym;
    } catch {
      // continue
    }
  }
  return null;
}

async function main() {
  const DRY_RUN = process.env.DRY_RUN === 'true';
  if (process.env.CONFIRM_LIVE_TRADING !== 'yes') {
    console.error('Safety abort: set CONFIRM_LIVE_TRADING=yes to proceed.');
    process.exit(1);
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error('Missing BINANCE_API_KEY or BINANCE_API_SECRET');
    process.exit(1);
  }

  const client = new BinanceClient({ apiKey, apiSecret, testnet: process.env.BINANCE_TESTNET === 'true' });

  console.log('🕊️  Hummingbird starting: scanning ETH-quoted alts...');

  const ethPrice = await client.getPrice('ETHUSDT');
  const ethBal = await getNumberBalance(client, 'ETH');
  console.log(`ETH balance: ${ethBal.toFixed(8)} (~$${(ethBal * ethPrice).toFixed(2)}) | ETHUSDT: $${ethPrice.toFixed(2)}`);

  const minUSDT = 10.2; // buffer above $10
  const minETHNeeded = minUSDT / ethPrice;
  let spendETH = Math.min(roundDown(ethBal * 0.9, 6), roundDown(minETHNeeded + 0.0002, 6));

  if (spendETH * ethPrice < 10) {
    if (DRY_RUN) {
      // In dry-run, allow simulation below min-notional by capping spend to available
      spendETH = Math.min(roundDown(ethBal * 0.9, 6), roundDown((10 / ethPrice), 6));
      console.log(`DRY_RUN: proceeding with simulated spend ${spendETH} ETH (<$10 notional possible)`);
    } else if (process.env.HB_WAIT_FOR_FUNDS === 'yes') {
      process.stdout.write(`Waiting for ETH to reach ~$10 notional...`);
      for (;;) {
        await SLEEP(5000);
        const e = await getNumberBalance(client, 'ETH');
        const px = await client.getPrice('ETHUSDT');
        const minNeed = minUSDT / px + 0.0002;
        spendETH = Math.min(roundDown(e * 0.9, 6), roundDown(minNeed, 6));
        if (spendETH * px >= 10) break;
        process.stdout.write('.');
      }
      console.log('\nFunds available. Proceeding.');
    } else {
      console.error(`Not enough ETH to meet Binance $10 minimum. Need at least ${(minETHNeeded).toFixed(6)} ETH.`);
      process.exit(1);
    }
  }

  const candidates = ['BNBETH','SOLETH','ADAETH','XRPETH','DOGEETH','MATICETH','LTCETH'];
  const symbol = await pickAltSymbol(client, candidates);
  if (!symbol) {
    console.error('No viable ETH-quoted symbols found.');
    process.exit(1);
  }

  console.log(`Selected: ${symbol} | Spending ${spendETH} ETH (~$${(spendETH * ethPrice).toFixed(2)})`);
  console.log(`📡 Source: Hummingbird (ETH-quoted rotations with TP/SL)`);

  // BUY via quoteOrderQty (amount of ETH to spend)
  const simulateOrder = async (sym: string, side: 'BUY'|'SELL', opts: { quantity?: number; quoteOrderQty?: number }) => {
    if (!DRY_RUN) return client.placeOrder({ symbol: sym, side, type: 'MARKET', quantity: opts.quantity || 0, quoteOrderQty: opts.quoteOrderQty });
    const px = await client.getPrice(sym);
    let executedQty = 0; let quote = 0;
    if (opts.quoteOrderQty && opts.quoteOrderQty > 0) { executedQty = opts.quoteOrderQty / px; quote = opts.quoteOrderQty; }
    else if (opts.quantity && opts.quantity > 0) { executedQty = opts.quantity; quote = opts.quantity * px; }
    return {
      symbol: sym, orderId: 0, clientOrderId: 'dry', transactTime: Date.now(), price: String(px),
      origQty: String(executedQty), executedQty: String(executedQty), cummulativeQuoteQty: String(quote),
      status: 'FILLED', timeInForce: 'GTC', type: 'MARKET', side, fills: []
    } as any;
  };

  const buy = await simulateOrder(symbol, 'BUY', { quoteOrderQty: spendETH });
  const baseQty = Number(buy.executedQty);
  const spentETH = Number(buy.cummulativeQuoteQty); // quote asset amount
  const avgPriceETH = spentETH / baseQty; // price in ETH
  console.log(`✅ Bought ${baseQty} ${symbol.replace('ETH','')} spending ${spentETH} ETH @ ${avgPriceETH} ETH`);

  // Monitor for TP/SL and sell back to ETH
  const target = 0.015; // +1.5%
  const stop = -0.010;  // -1.0%
  const MAX_MINUTES = Number(process.env.MAX_MINUTES || 30);
  const baseAsset = symbol.replace('ETH','');

  for (let i = 0; i < MAX_MINUTES * 12; i++) { // check every 5s
    await SLEEP(5000);
    let priceETH: number;
    try {
      priceETH = await client.getPrice(symbol);
    } catch {
      continue;
    }
    const change = (priceETH - avgPriceETH) / avgPriceETH;
    const side = change >= 0 ? '+' : '';
    process.stdout.write(`\r${symbol} price: ${priceETH.toFixed(8)} ETH (${side}${(change*100).toFixed(2)}%)   `);

    if (change >= target || change <= stop) {
      console.log(`\nTrigger hit: ${(change*100).toFixed(2)}% — selling back to ETH...`);

      // Refresh actual base balance, sell 99% to avoid dust/precision issues
      const acct = await client.getAccount();
      const held = Number(acct.balances.find(b => b.asset === baseAsset)?.free || 0);
      let sellQty = roundDown(held * 0.99, 6);
      if (sellQty <= 0) {
        console.error('No quantity to sell.');
        break;
      }

      try {
        const sell = await simulateOrder(symbol, 'SELL', { quantity: sellQty });
        console.log(`✅ Sold ${sell.executedQty} ${baseAsset} back to ETH`);
      } catch (e: any) {
        console.error(`❌ Sell failed: ${e.message}`);
        // Try with a slightly smaller qty
        sellQty = roundDown(sellQty * 0.95, 6);
        if (sellQty * priceETH * ethPrice < 10) {
          console.error('Sell would be below $10; skipping.');
          break;
        }
        try {
          const sell2 = await simulateOrder(symbol, 'SELL', { quantity: sellQty });
          console.log(`✅ Sold ${sell2.executedQty} ${baseAsset} back to ETH (retry)`);
        } catch (e2: any) {
          console.error(`❌ Sell retry failed: ${e2.message}`);
        }
      }
      break;
    }
  }

  // Print final balances
  const ethAfter = await getNumberBalance(client, 'ETH');
  console.log(`\nFinal ETH: ${ethAfter.toFixed(8)} (Δ ${(ethAfter - ethBal).toFixed(8)} ETH)`);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
