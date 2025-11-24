#!/usr/bin/env npx tsx
/**
 * 🦆💥🔥 ULTRA LIVE COMBAT - GENERAL QUANTUM QUACKERS 🔥💥🦆
 * 
 * NO SIMULATIONS! REAL MONEY! REAL KILLS!
 * The universe's top general - A FUCKING KILLER WHO WINS ALL THE TIME!
 * 
 * "YEEEHAA! THE ENEMY WILL NOT HIDE!" - Commander
 * "SIR YES SIR! GOING FULL LIVE!" - General Quantum Quackers
 */

import { BinanceClient } from '../core/binanceClient';
import { honeyPot, addHoney } from '../core/honeyPot';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n' + '🔥'.repeat(70));
  console.log('  🦆💥 GENERAL QUANTUM QUACKERS - ULTRA LIVE COMBAT 💥🦆');
  console.log('🔥'.repeat(70) + '\n');
  
  console.log('⚠️  ⚠️  ⚠️  WARNING: LIVE TRADING MODE ⚠️  ⚠️  ⚠️\n');
  console.log('This will execute REAL trades with REAL money!');
  console.log('General Quantum Quackers is about to go FULL COMBAT!\n');
  
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
  const testnet = process.env.BINANCE_TESTNET === 'true';
  
  if (!apiKey || !apiSecret) {
    console.error('❌ API credentials not configured!');
    process.exit(1);
  }
  
  console.log(`🌐 Network: ${testnet ? 'TESTNET (Safe Practice)' : '🔴 LIVE MAINNET 🔴'}\n`);
  
  if (!testnet) {
    console.log('🚨🚨🚨 YOU ARE ON LIVE MAINNET! 🚨🚨🚨');
    console.log('This will use REAL FUNDS from your Binance account!\n');
    
    const confirm1 = await ask('Type "I UNDERSTAND THIS IS REAL MONEY" to continue: ');
    if (confirm1.trim() !== 'I UNDERSTAND THIS IS REAL MONEY') {
      console.log('\n❌ Confirmation failed. Aborting for safety.');
      process.exit(0);
    }
    
    const confirm2 = await ask('\nType "LETS FUCKING GO" to unleash General Quackers: ');
    if (confirm2.trim() !== 'LETS FUCKING GO') {
      console.log('\n❌ Not ready yet. Come back when you want WAR!');
      process.exit(0);
    }
  }
  
  console.log('\n' + '🔥'.repeat(70));
  console.log('  ⚡ GENERAL QUANTUM QUACKERS UNLEASHED! ⚡');
  console.log('🔥'.repeat(70) + '\n');
  
  const client = new BinanceClient({ apiKey, apiSecret, testnet });
  
  // Check balance
  const account = await client.getAccount();
  
  console.log('💰 CURRENT WAR CHEST:\n');
  for (const b of account.balances) {
    const free = parseFloat(b.free);
    if (free > 0.0001) {
      console.log(`   ${b.asset}: ${free.toFixed(8)}`);
    }
  }
  
  console.log('\n🎯 COMBAT PARAMETERS:\n');
  console.log('   Strategy: Aggressive Multi-Target Assault');
  console.log('   Targets: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT');
  console.log('   Lighthouse Threshold: 0.45 (Aggressive)');
  console.log('   Position Size: 5% per trade (~$5-10)');
  console.log('   Scan Rate: Every 2 seconds');
  console.log('   Trade Type: MARKET orders (instant execution)');
  
  console.log('\n🦆 General Quackers: "Lucky duck reporting for duty!"');
  console.log('🎖️  Commander: "YEEEHAAA! FUCK THEM UP!"');
  
  console.log('\n' + '🔥'.repeat(70));
  console.log('  💥 COMMENCING LIVE FIRE OPERATIONS! 💥');
  console.log('🔥'.repeat(70) + '\n');
  
  console.log('📋 To start aggressive assault:');
  console.log('   npx tsx scripts/aggressiveAssault.ts\n');
  
  console.log('🍯 Honey pot is ready to track all kills!');
  console.log('💰 Every successful trade adds honey to the pot!');
  console.log('🏆 Milestones will celebrate your victories!\n');
  
  console.log('🦆 "The enemy will not hide from the universe\'s top general!"');
  console.log('🎯 "A fucking killer who wins all the time, every time!"');
  console.log('🍀 "YOU LUCKY DUCK!"\n');
  
  console.log('═'.repeat(70) + '\n');
  
  rl.close();
}

main().catch(error => {
  console.error('\n❌ ERROR:', error.message);
  process.exit(1);
});
