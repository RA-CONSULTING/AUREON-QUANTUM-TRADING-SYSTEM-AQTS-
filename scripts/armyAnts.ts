#!/usr/bin/env node
/**
 * ArmyAnts: Pick from the floor, bring back to the hive
 * - Ensures >= $11 USDT by selling a slice of ETH if needed
 * - Sequentially buys small amounts ($11) of liquid USDT alts using quoteOrderQty
 * - Takes quick profit or small loss, sells back to USDT
 * - At the end, converts USDT back to ETH (unless RETAIN_USDT=yes)
 */

import 'dotenv/config';
import { BinanceClient } from '../core/binanceClient';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function roundDown(v: number, d: number) {
  const p = Math.pow(10, d);
  return Math.floor(v * p) / p;
}

async function getBalance(client: BinanceClient, asset: string): Promise<number> {
  const acct = await client.getAccount();
  return Number(acct.balances.find((b) => b.asset === asset)?.free || 0);
}

async function ensureUsdt(client: BinanceClient, minUsdt = 11, wait = false): Promise<void> {
  const DRY_RUN = process.env.DRY_RUN === 'true';
  const usdt = await getBalance(client, 'USDT');
  if (usdt >= minUsdt) return;
  const ethPrice = await client.getPrice('ETHUSDT');
  const need = minUsdt + 1 - usdt; // buffer for fees
  const qtyEth = roundDown(need / ethPrice + 0.0002, 6);
  const ethBal = await getBalance(client, 'ETH');
  if (qtyEth * ethPrice < 10 || qtyEth > ethBal) {
    if (DRY_RUN) {
      console.log(`DRY_RUN: would sell ${qtyEth} ETH -> USDT to raise ~$${minUsdt}`);
      return;
    }
    if (!wait) {
      throw new Error(`ETH insufficient to raise USDT >= $${minUsdt}. Have ${ethBal.toFixed(8)} ETH; need ${(qtyEth).toFixed(6)} ETH.`);
    }
    process.stdout.write(`Waiting for funds (need ~$${minUsdt} USDT min)...`);
    for (;;) {
      await sleep(5000);
      const curUsdt = await getBalance(client, 'USDT');
      if (curUsdt >= minUsdt) break;
      const curEth = await getBalance(client, 'ETH');
      const px = await client.getPrice('ETHUSDT');
      const minEth = (minUsdt + 1 - curUsdt) / px + 0.0002;
      if (minEth <= curEth && minEth * px >= 10) break;
      process.stdout.write('.');
    }
    console.log('\nFunds available. Proceeding.');
  }
  console.log(`🔄 Selling ${qtyEth} ETH -> USDT to reach ~$${minUsdt}+`);
  if (DRY_RUN) {
    console.log(`DRY_RUN: simulate SELL ETHUSDT qty=${qtyEth}`);
  } else {
    await client.placeOrder({ symbol: 'ETHUSDT', side: 'SELL', type: 'MARKET', quantity: qtyEth });
  }
}

async function buyUsdtAlt(
  client: BinanceClient,
  symbol: string,
  spendUSDT: number
): Promise<{ baseBought: number; avgPrice: number }> {
  console.log(`🟢 Buying ~$${spendUSDT.toFixed(2)} of ${symbol}`);
  const DRY_RUN = process.env.DRY_RUN === 'true';
  let order: any;
  if (DRY_RUN) {
    const px = await client.getPrice(symbol);
    const qty = spendUSDT / px;
    order = { executedQty: String(qty), cummulativeQuoteQty: String(spendUSDT) };
    console.log(`DRY_RUN: simulate BUY ${symbol} spend $${spendUSDT.toFixed(2)} (~${qty.toFixed(6)} units @ $${px.toFixed(6)})`);
  } else {
    order = await client.placeOrder({ symbol, side: 'BUY', type: 'MARKET', quoteOrderQty: spendUSDT, quantity: 0 });
  }
  const qty = Number(order.executedQty);
  const cost = Number(order.cummulativeQuoteQty);
  const avg = qty > 0 ? cost / qty : 0;
  console.log(`✅ Bought ${qty} ${symbol.replace('USDT','')} @ ~$${avg.toFixed(6)}`);
  return { baseBought: qty, avgPrice: avg };
}

async function sellUsdtAlt(
  client: BinanceClient,
  symbol: string,
  qty: number
): Promise<void> {
  const q = roundDown(qty * 0.99, 6);
  if (q <= 0) return;
  console.log(`🔴 Selling ${q} ${symbol.replace('USDT','')} back to USDT`);
  const DRY_RUN = process.env.DRY_RUN === 'true';
  if (DRY_RUN) {
    console.log(`DRY_RUN: simulate SELL ${symbol} qty=${q}`);
  } else {
    await client.placeOrder({ symbol, side: 'SELL', type: 'MARKET', quantity: q });
  }
}

async function rotateSymbol(
  client: BinanceClient,
  symbol: string,
  spendUSDT = 11,
  tp = 0.006, // +0.6%
  sl = -0.005, // -0.5%
  maxMinutes = 3
): Promise<void> {
  try {
    const wait = process.env.ANTS_WAIT_FOR_FUNDS === 'yes';
    await ensureUsdt(client, spendUSDT, wait);
  } catch (e: any) {
    console.log(`⏭️  Skip: ${e.message}`);
    return;
  }
  const { baseBought, avgPrice } = await buyUsdtAlt(client, symbol, spendUSDT);
  if (baseBought <= 0) return;

  for (let i = 0; i < maxMinutes * 12; i++) {
    await sleep(5000);
    let price: number;
    try {
      price = await client.getPrice(symbol);
    } catch {
      continue;
    }
    const change = (price - avgPrice) / avgPrice;
    const sign = change >= 0 ? '+' : '';
    process.stdout.write(`\r${symbol} $${price.toFixed(6)} (${sign}${(change * 100).toFixed(2)}%)   `);
    if (change >= tp || change <= sl) {
      console.log(`\nTrigger ${(change * 100).toFixed(2)}% — exiting...`);
      await sellUsdtAlt(client, symbol, baseBought);
      break;
    }
  }
}

async function convertBackToEth(client: BinanceClient, retainUsdt = false): Promise<void> {
  const usdt = await getBalance(client, 'USDT');
  if (usdt < 10) return;
  const toSpend = retainUsdt ? Math.max(0, usdt - 12) : usdt * 0.98;
  if (toSpend < 10) return;
  console.log(`🧭 Converting $${toSpend.toFixed(2)} USDT -> ETH`);
  await client.placeOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'MARKET', quoteOrderQty: toSpend, quantity: 0 });
}

async function main() {
  if (process.env.CONFIRM_LIVE_TRADING !== 'yes') {
    console.error('Safety abort: set CONFIRM_LIVE_TRADING=yes');
    process.exit(1);
  }
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error('Missing BINANCE_API_KEY/SECRET');
    process.exit(1);
  }
  const client = new BinanceClient({ apiKey, apiSecret, testnet: process.env.BINANCE_TESTNET === 'true' });

  const retain = process.env.RETAIN_USDT === 'yes';
  const universe = (process.env.ANTS_UNIVERSE || 'ADAUSDT,DOGEUSDT,XRPUSDT,SOLUSDT,MATICUSDT,LTCUSDT,LINKUSDT,ATOMUSDT,AVAXUSDT,NEARUSDT').split(',');
  const maxRotations = Number(process.env.ANTS_ROTATIONS || 4);
  const spend = Number(process.env.ANTS_SPEND_USDT || 11);
  const tp = Number(process.env.ANTS_TP || 0.006);
  const sl = Number(process.env.ANTS_SL || -0.005);
  const minutes = Number(process.env.ANTS_MAX_MIN || 3);

  const startEth = await getBalance(client, 'ETH');
  const ethPrice = await client.getPrice('ETHUSDT');
  console.log(`🐜 ArmyAnts starting with ${startEth.toFixed(8)} ETH (~$${(startEth * ethPrice).toFixed(2)})`);

  for (let i = 0; i < Math.min(maxRotations, universe.length); i++) {
    const sym = universe[i].trim();
    try {
      await rotateSymbol(client, sym, spend, tp, sl, minutes);
    } catch (e: any) {
      console.log(`⚠️  Rotation error on ${sym}: ${e.message}`);
    }
  }

  await convertBackToEth(client, retain);
  const endEth = await getBalance(client, 'ETH');
  console.log(`\n🏁 Done. ETH: ${endEth.toFixed(8)} (Δ ${(endEth - startEth).toFixed(8)} ETH)`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
