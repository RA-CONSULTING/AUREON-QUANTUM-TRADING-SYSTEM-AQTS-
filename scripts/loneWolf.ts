#!/usr/bin/env node
/**
 * LoneWolf: Stalks momentum, makes a single clean kill, returns to base
 * - Base AUTO: prefers USDT if >= $10, else ETH if >= $10 notional
 * - Scans liquid symbols, picks high momentum, buys with exact quote notional
 * - Tight TP/SL; exits back to base
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

type BaseMode = 'USDT' | 'ETH';

async function chooseBase(client: BinanceClient, modeEnv?: string): Promise<{ base: BaseMode; spendQuote: number } | null> {
  const ethPrice = await client.getPrice('ETHUSDT');
  const usdt = await getBalance(client, 'USDT');
  const eth = await getBalance(client, 'ETH');
  const minUSDT = Number(process.env.WOLF_SPEND_USDT || 12);
  const minETH = Number(process.env.WOLF_SPEND_USD || 12) / ethPrice + 0.0002;

  const mode = (modeEnv || 'AUTO').toUpperCase();
  if (mode === 'USDT') {
    if (usdt >= 10) return { base: 'USDT', spendQuote: Math.min(usdt * 0.95, Math.max(11, Number(process.env.WOLF_SPEND_USDT || 12))) };
    return null;
  }
  if (mode === 'ETH') {
    if (eth * ethPrice >= 10) return { base: 'ETH', spendQuote: Math.max(minETH, 10 / ethPrice + 0.0002) };
    return null;
  }
  // AUTO
  if (usdt >= 10) return { base: 'USDT', spendQuote: Math.min(usdt * 0.95, Math.max(11, Number(process.env.WOLF_SPEND_USDT || 12))) };
  if (eth * ethPrice >= 10) return { base: 'ETH', spendQuote: Math.max(minETH, 10 / ethPrice + 0.0002) };
  return null;
}

async function pickMomentumSymbol(client: BinanceClient, base: BaseMode): Promise<string | null> {
  const universeUSDT = (process.env.WOLF_UNIVERSE_USDT || 'BTCUSDT,ETHUSDT,SOLUSDT,LINKUSDT,AVAXUSDT,NEARUSDT,MATICUSDT,XRPUSDT,DOGEUSDT,ADAUSDT').split(',');
  const universeETH = (process.env.WOLF_UNIVERSE_ETH || 'BNBETH,SOLETH,LINKETH,ADAETH,MATICETH').split(',');
  const list = base === 'USDT' ? universeUSDT : universeETH;

  let best: { sym: string; score: number } | null = null;
  for (const sym of list) {
    try {
      const s = await client.get24hStats(sym);
      const pct = Number(s.priceChangePercent); // momentum
      const vol = Number(s.quoteAssetVolume);   // liquidity
      // Simple score: momentum weighted by log(volume)
      const score = pct * Math.log(1 + Math.max(1, vol));
      if (!best || score > best.score) best = { sym, score };
    } catch {
      // ignore
    }
  }
  if (best) return best.sym;

  // Fallback: first with a price
  for (const sym of list) {
    try { const p = await client.getPrice(sym); if (p > 0) return sym; } catch {}
  }
  return null;
}

async function tradeOnce(client: BinanceClient, base: BaseMode, symbol: string, spendQuote: number, tp=0.008, sl=-0.006, maxMinutes=5): Promise<void> {
  const DRY_RUN = process.env.DRY_RUN === 'true';
  console.log(`🐺 LoneWolf hunting ${symbol} with spend ${base==='USDT' ? '$'+spendQuote.toFixed(2) : spendQuote.toFixed(6)+' ETH'}`);

  // Buy using quoteOrderQty (spend amount in base quote)
  let buy: any;
  if (DRY_RUN) {
    const px = await client.getPrice(symbol);
    const qty = spendQuote / px;
    buy = { executedQty: String(qty), cummulativeQuoteQty: String(spendQuote) };
    console.log(`DRY_RUN: simulate BUY ${symbol} spend ${base==='USDT' ? '$'+spendQuote.toFixed(2) : spendQuote.toFixed(6)+' ETH'} (~${qty.toFixed(6)} units @ ${base==='USDT' ? '$'+px.toFixed(6) : (px.toFixed(8)+' ETH')})`);
  } else {
    buy = await client.placeOrder({ symbol, side: 'BUY', type: 'MARKET', quoteOrderQty: spendQuote, quantity: 0 });
  }
  const baseQty = Number(buy.executedQty);
  const cost = Number(buy.cummulativeQuoteQty);
  const avg = baseQty > 0 ? cost / baseQty : 0;
  console.log(`✅ Entry ${baseQty} ${symbol.replace(base,'')} @ ~${base==='USDT' ? '$'+avg.toFixed(6) : avg.toFixed(8)+' ETH'}`);

  // Monitor
  for (let i = 0; i < maxMinutes * 12; i++) {
    await sleep(5000);
    let px: number; try { px = await client.getPrice(symbol); } catch { continue; }
    const ch = (px - avg) / avg;
    const sign = ch >= 0 ? '+' : '';
    process.stdout.write(`\r${symbol} ${base==='USDT' ? '$'+px.toFixed(6) : px.toFixed(8)+' ETH'} (${sign}${(ch*100).toFixed(2)}%)   `);
    if (ch >= tp || ch <= sl) {
      console.log(`\nTrigger ${(ch*100).toFixed(2)}% — exiting...`);
      const sellQty = roundDown(baseQty * 0.99, 6);
      if (sellQty > 0) {
        if (DRY_RUN) {
          console.log(`DRY_RUN: simulate SELL ${symbol} qty=${sellQty}`);
        } else {
          await client.placeOrder({ symbol, side: 'SELL', type: 'MARKET', quantity: sellQty });
        }
      }
      break;
    }
  }
}

async function main() {
  if (process.env.CONFIRM_LIVE_TRADING !== 'yes') {
    console.error('Safety abort: set CONFIRM_LIVE_TRADING=yes');
    process.exit(1);
  }
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  if (!apiKey || !apiSecret) { console.error('Missing BINANCE_API_KEY/SECRET'); process.exit(1); }

  const client = new BinanceClient({ apiKey, apiSecret, testnet: process.env.BINANCE_TESTNET === 'true' });
  const waitForFunds = process.env.WOLF_WAIT_FOR_FUNDS === 'yes';
  const tp = Number(process.env.WOLF_TP || 0.008);
  const sl = Number(process.env.WOLF_SL || -0.006);
  const maxMin = Number(process.env.WOLF_MAX_MIN || 5);

  let chooser = await chooseBase(client, process.env.WOLF_BASE);
  if (!chooser) {
    if (!waitForFunds) {
      console.error('Insufficient funds to meet $10 min-notional in USDT or ETH.');
      process.exit(1);
    }
    console.log('Waiting for funds to reach $10 min-notional...');
    for (;;) {
      await sleep(5000);
      chooser = await chooseBase(client, process.env.WOLF_BASE);
      if (chooser) break;
      process.stdout.write('.');
    }
    console.log('\nFunds available. Starting.');
  }
  const { base, spendQuote } = chooser;
  const symbol = await pickMomentumSymbol(client, base);
  if (!symbol) { console.error('No symbol available.'); process.exit(1); }
  await tradeOnce(client, base, symbol, spendQuote, tp, sl, maxMin);

  // Return to ETH if base was USDT and RETAIN_USDT != yes
  if (base === 'USDT' && process.env.WOLF_RETAIN_USDT !== 'yes') {
    const usdt = await getBalance(client, 'USDT');
    if (usdt >= 10) {
      const spend = usdt * 0.98;
      console.log(`🔁 Converting $${spend.toFixed(2)} USDT -> ETH`);
      await client.placeOrder({ symbol: 'ETHUSDT', side: 'BUY', type: 'MARKET', quoteOrderQty: spend, quantity: 0 });
    }
  }

  const eth = await getBalance(client, 'ETH');
  const ethPx = await client.getPrice('ETHUSDT');
  console.log(`\n🏁 LoneWolf done. ETH: ${eth.toFixed(8)} (~$${(eth*ethPx).toFixed(2)})`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
