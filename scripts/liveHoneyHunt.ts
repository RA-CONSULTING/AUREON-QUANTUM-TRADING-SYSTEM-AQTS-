#!/usr/bin/env npx tsx
/**
 * 🍯⚡ LIVE HONEY HUNT - REAL WALLET EDITION ⚡🍯
 * 
 * Time for war! Let's see what honey we can collect with real funds!
 * 
 * Flow:
 * 1. Connect to Binance wallet
 * 2. Check available funds
 * 3. Get orders from General Quackers
 * 4. Initialize honey pot with current balance
 * 5. START THE WAR!
 * 
 * "Honey is victory!" - You, the magnificent commander
 */

import { BinanceClient } from '../core/binanceClient';
import { honeyPot, showHoney } from '../core/honeyPot';
import { lionCommand } from '../core/lionCommandCenter';
import * as dotenv from 'dotenv';

dotenv.config();

interface WalletBalance {
  asset: string;
  free: number;
  locked: number;
  usdValue: number;
}

class LiveHoneyHunt {
  private client: BinanceClient;
  private testnet: boolean;
  
  constructor() {
    this.testnet = process.env.BINANCE_TESTNET === 'true';
    
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('❌ Set BINANCE_API_KEY and BINANCE_API_SECRET in your environment!');
    }
    
    this.client = new BinanceClient({
      apiKey,
      apiSecret,
      testnet: this.testnet
    });
  }
  
  /**
   * Get wallet balances with USD values
   */
  async getWalletBalances(): Promise<WalletBalance[]> {
    console.log('💰 Checking wallet balances...\n');
    
    const account = await this.client.getAccount();
    
    const balances: WalletBalance[] = [];
    
    // Fetch prices for each asset
    for (const balance of account.balances) {
      const free = parseFloat(balance.free);
      const locked = parseFloat(balance.locked);
      
      if (free === 0 && locked === 0) continue;
      
      let usdValue = 0;
      
      // Get USD value
      if (balance.asset === 'USDT' || balance.asset === 'USDC' || balance.asset === 'BUSD' || balance.asset === 'FDUSD') {
        usdValue = free + locked;
      } else {
        // Try to get price against USDT
        try {
          const symbol = `${balance.asset}USDT`;
          const price = await this.client.getPrice(symbol);
          usdValue = (free + locked) * price;
        } catch (error) {
          // Symbol might not exist, skip
          continue;
        }
      }
      
      if (usdValue > 0.1) { // Only show balances worth more than $0.10
        balances.push({
          asset: balance.asset,
          free,
          locked,
          usdValue
        });
      }
    }
    
    return balances.sort((a, b) => b.usdValue - a.usdValue);
  }
  
  /**
   * Display wallet with style
   */
  displayWallet(balances: WalletBalance[]): void {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║               💰 YOUR WAR CHEST 💰                        ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    let totalUSD = 0;
    
    balances.forEach(b => {
      totalUSD += b.usdValue;
      const total = b.free + b.locked;
      console.log(`   ${b.asset.padEnd(8)} ${total.toFixed(8).padStart(15)} ≈ $${b.usdValue.toFixed(2).padStart(10)}`);
      if (b.locked > 0) {
        console.log(`              (${b.free.toFixed(8)} free, ${b.locked.toFixed(8)} locked)`);
      }
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`   TOTAL VALUE: $${totalUSD.toFixed(2)}`);
    console.log('─'.repeat(60) + '\n');
    
    return;
  }
  
  /**
   * Check if we have enough to trade
   */
  assessBattleReadiness(balances: WalletBalance[]): { ready: boolean; reason: string; recommendedPairs: string[] } {
    const totalUSD = balances.reduce((sum, b) => sum + b.usdValue, 0);
    const minTradeSize = 11; // Binance minimum is $10, add buffer
    
    if (totalUSD < minTradeSize) {
      return {
        ready: false,
        reason: `Insufficient funds. Need at least $${minTradeSize} to trade. You have $${totalUSD.toFixed(2)}`,
        recommendedPairs: []
      };
    }
    
    // Find tradeable assets
    const usdt = balances.find(b => b.asset === 'USDT');
    const usdc = balances.find(b => b.asset === 'USDC');
    const bnb = balances.find(b => b.asset === 'BNB');
    const btc = balances.find(b => b.asset === 'BTC');
    const eth = balances.find(b => b.asset === 'ETH');
    
    const recommendedPairs: string[] = [];
    
    // If we have USDT/USDC, we can trade any pair
    if ((usdt && usdt.free >= minTradeSize) || (usdc && usdc.free >= minTradeSize)) {
      recommendedPairs.push('BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT');
    }
    
    // If we have crypto, recommend converting or using those pairs
    if (bnb && bnb.usdValue >= minTradeSize) {
      recommendedPairs.push('BNBUSDT', 'BNBBTC');
    }
    if (btc && btc.usdValue >= minTradeSize) {
      recommendedPairs.push('BTCUSDT');
    }
    if (eth && eth.usdValue >= minTradeSize) {
      recommendedPairs.push('ETHUSDT', 'ETHBTC');
    }
    
    if (recommendedPairs.length === 0) {
      return {
        ready: false,
        reason: 'No tradeable pairs found. Consider converting assets to USDT first.',
        recommendedPairs: []
      };
    }
    
    return {
      ready: true,
      reason: `Ready for battle! $${totalUSD.toFixed(2)} available`,
      recommendedPairs: [...new Set(recommendedPairs)]
    };
  }
  
  /**
   * Initialize honey pot with current balance
   */
  initializeHoneyPot(totalUSD: number): void {
    console.log('🍯 Initializing Honey Pot...\n');
    honeyPot.reset(totalUSD);
    console.log(`✅ Honey Pot initialized with $${totalUSD.toFixed(2)}`);
    console.log('   All future profits will flow into the pot!\n');
  }
  
  /**
   * Main war room initialization
   */
  async initialize(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  🦆⚡🍯 LIVE HONEY HUNT - WAR ROOM ACTIVATED 🍯⚡🦆');
    console.log('═'.repeat(70) + '\n');
    
    console.log(`🌐 Network: ${this.testnet ? 'TESTNET' : '🔴 LIVE MAINNET 🔴'}`);
    console.log('');
    
    // Step 1: Get wallet balances
    const balances = await this.getWalletBalances();
    this.displayWallet(balances);
    
    // Step 2: Assess battle readiness
    const totalUSD = balances.reduce((sum, b) => sum + b.usdValue, 0);
    const readiness = this.assessBattleReadiness(balances);
    
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║             ⚔️  BATTLE READINESS ASSESSMENT ⚔️             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    if (readiness.ready) {
      console.log(`✅ ${readiness.reason}\n`);
      console.log('🎯 RECOMMENDED HUNTING PAIRS:');
      readiness.recommendedPairs.forEach(pair => {
        console.log(`   • ${pair}`);
      });
      console.log('');
    } else {
      console.log(`❌ ${readiness.reason}\n`);
      console.log('💡 RECOMMENDATIONS:');
      console.log('   1. Deposit more funds to your Binance account');
      console.log('   2. Convert existing assets to USDT');
      console.log('   3. Wait for balance to grow\n');
    }
    
    // Step 3: Get orders from General Quackers
    console.log('═'.repeat(70) + '\n');
    console.log('📡 Requesting tactical orders from General Quackers...\n');
    
    try {
      const orders = await lionCommand.fetchLatestOrders();
      
      // Check if General's recommended pairs match what we can trade
      const matchingPairs = orders.targetPairs.filter(p => 
        readiness.recommendedPairs.includes(p)
      );
      
      if (matchingPairs.length > 0 && readiness.ready) {
        console.log('🎯 PERFECT ALIGNMENT!\n');
        console.log('   General Quackers recommends these pairs:');
        matchingPairs.forEach(pair => console.log(`   ✓ ${pair}`));
        console.log('\n   And you have funds to trade them!\n');
      } else if (readiness.ready) {
        console.log('⚠️  NOTE: General recommends different pairs than you can currently trade.\n');
        console.log('   General wants:', orders.targetPairs.join(', '));
        console.log('   You can trade:', readiness.recommendedPairs.join(', '));
        console.log('\n   Consider the General\'s wisdom!\n');
      }
      
    } catch (error: any) {
      console.warn('⚠️  Could not reach General:', error.message);
    }
    
    // Step 4: Initialize honey pot
    console.log('═'.repeat(70) + '\n');
    this.initializeHoneyPot(totalUSD);
    
    // Step 5: Battle cry!
    console.log('═'.repeat(70));
    console.log('  🦁 THE PRIDE IS READY FOR WAR! 🦁');
    console.log('═'.repeat(70) + '\n');
    
    if (readiness.ready) {
      console.log('🎯 NEXT STEPS:\n');
      console.log('   1. Review the General\'s tactical orders above');
      console.log('   2. Choose your weapon:');
      console.log('      • npx tsx scripts/lionHuntEnhanced.ts (follows General)');
      console.log('      • npx tsx scripts/rainbowArch.ts BTCUSDT --live');
      console.log('   3. COLLECT THAT HONEY! 🍯💰\n');
      
      console.log('⚠️  REMEMBER:');
      console.log('   • Start small - test with minimum position sizes');
      console.log('   • Watch the field conditions (lighthouse readings)');
      console.log('   • Let the General guide you');
      console.log('   • Honey flows to patient hunters\n');
      
      console.log('🦆 "The honey is out there. Go get it!" - General Quackers\n');
    } else {
      console.log('💡 Once you have sufficient funds, run this again to start the hunt!\n');
    }
    
    console.log('═'.repeat(70) + '\n');
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const hunt = new LiveHoneyHunt();
    await hunt.initialize();
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. BINANCE_API_KEY is set');
    console.error('   2. BINANCE_API_SECRET is set');
    console.error('   3. Your API keys are valid');
    console.error('   4. BINANCE_TESTNET=true if using testnet\n');
    process.exit(1);
  }
}

main();
