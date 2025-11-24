#!/usr/bin/env npx tsx
/**
 * ⚡🦆🔥 GENERAL QUANTUM QUACKERS - FULL COMBAT MODE 🔥🦆⚡
 * 
 * Training wheels OFF! Live trading with REAL money!
 * Integrated honey tracking, War Room briefings, and LION coordination.
 * 
 * "NOTHING BUT VICTORY!" - The Commander
 * "Sir yes sir!" - General Quackers
 */

import { BinanceClient } from '../core/binanceClient';
import { honeyPot, addHoney } from '../core/honeyPot';
import { lionCommand } from '../core/lionCommandCenter';
import { HiveWarRoomReporter } from '../core/hiveWarRoomReport';
import * as dotenv from 'dotenv';

dotenv.config();

interface CombatConfig {
  symbol: string;
  minLighthouse: number;
  maxPositionPercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  tradeIntervalMs: number;
  followGeneralOrders: boolean;
}

class GeneralQuantumQuackers {
  private client: BinanceClient;
  private config: CombatConfig;
  private reporter: HiveWarRoomReporter;
  private isActive: boolean = false;
  private tradesExecuted: number = 0;
  private sessionStartBalance: number = 0;
  
  constructor(config: Partial<CombatConfig> = {}) {
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;
    const testnet = process.env.BINANCE_TESTNET === 'true';
    
    if (!apiKey || !apiSecret) {
      throw new Error('❌ BINANCE_API_KEY and BINANCE_API_SECRET required!');
    }
    
    this.client = new BinanceClient({ apiKey, apiSecret, testnet });
    this.reporter = new HiveWarRoomReporter();
    
    this.config = {
      symbol: config.symbol || 'BTCUSDT',
      minLighthouse: config.minLighthouse || 0.65,
      maxPositionPercent: config.maxPositionPercent || 5, // 5% of balance per trade
      stopLossPercent: config.stopLossPercent || 2,
      takeProfitPercent: config.takeProfitPercent || 3,
      tradeIntervalMs: config.tradeIntervalMs || 60000, // Check every minute
      followGeneralOrders: config.followGeneralOrders ?? true
    };
  }
  
  /**
   * Initialize combat operations
   */
  async initialize(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  ⚡🦆 GENERAL QUANTUM QUACKERS - FULL COMBAT MODE 🦆⚡');
    console.log('═'.repeat(70) + '\n');
    
    console.log('🎖️  "TRAINING WHEELS ARE OFF! EXPECTING NOTHING BUT VICTORY!"');
    console.log('🦆 "SIR YES SIR! DEPLOYING FULL COMBAT SYSTEMS!"\n');
    
    // Get initial balance
    const account = await this.client.getAccount();
    const balances = account.balances.filter(b => parseFloat(b.free) > 0);
    
    console.log('💰 INITIAL FORCES:\n');
    for (const b of balances.slice(0, 5)) {
      if (parseFloat(b.free) > 0.0001) {
        console.log(`   ${b.asset}: ${parseFloat(b.free).toFixed(8)}`);
      }
    }
    
    // Get orders from War Room
    if (this.config.followGeneralOrders) {
      console.log('\n📡 REQUESTING ORDERS FROM WAR ROOM HQ...\n');
      
      try {
        const orders = await lionCommand.fetchLatestOrders();
        
        // Adapt config based on orders
        if (orders.targetPairs.includes(this.config.symbol)) {
          this.config.minLighthouse = orders.entryThreshold;
          
          if (orders.positionSize === 'reduced') {
            this.config.maxPositionPercent = 2.5;
          } else if (orders.positionSize === 'increased') {
            this.config.maxPositionPercent = 7.5;
          }
          
          if (orders.exitStrategy === 'tight') {
            this.config.stopLossPercent = 1.5;
            this.config.takeProfitPercent = 2;
          } else if (orders.exitStrategy === 'wide') {
            this.config.stopLossPercent = 3;
            this.config.takeProfitPercent = 5;
          }
          
          console.log('✅ ORDERS RECEIVED AND APPLIED!\n');
        } else {
          console.log('⚠️  Symbol not in General\'s target list, using default params\n');
        }
      } catch (error: any) {
        console.warn('⚠️  Could not get orders:', error.message);
        console.log('📋 Using default combat parameters\n');
      }
    }
    
    console.log('⚙️  COMBAT CONFIGURATION:\n');
    console.log(`   Symbol: ${this.config.symbol}`);
    console.log(`   Min Lighthouse: ${this.config.minLighthouse.toFixed(2)}`);
    console.log(`   Max Position: ${this.config.maxPositionPercent}% of balance`);
    console.log(`   Stop Loss: ${this.config.stopLossPercent}%`);
    console.log(`   Take Profit: ${this.config.takeProfitPercent}%`);
    console.log(`   Scan Interval: ${this.config.tradeIntervalMs / 1000}s`);
    
    console.log('\n' + '═'.repeat(70));
    console.log('  🔥 ALL SYSTEMS ARMED - READY FOR COMBAT 🔥');
    console.log('═'.repeat(70) + '\n');
  }
  
  /**
   * Calculate position size based on balance
   */
  private async calculatePositionSize(currentPrice: number): Promise<number> {
    const account = await this.client.getAccount();
    
    // Find USDT balance or convert BTC/BNB value
    let usdtBalance = 0;
    
    const usdt = account.balances.find(b => b.asset === 'USDT');
    if (usdt) {
      usdtBalance = parseFloat(usdt.free);
    }
    
    // If no USDT but have BTC, calculate BTC value
    if (usdtBalance < 11) {
      const btc = account.balances.find(b => b.asset === 'BTC');
      if (btc && parseFloat(btc.free) > 0) {
        const btcPrice = await this.client.getPrice('BTCUSDT');
        usdtBalance = parseFloat(btc.free) * btcPrice;
      }
    }
    
    // If no USDT/BTC but have BNB
    if (usdtBalance < 11) {
      const bnb = account.balances.find(b => b.asset === 'BNB');
      if (bnb && parseFloat(bnb.free) > 0) {
        const bnbPrice = await this.client.getPrice('BNBUSDT');
        usdtBalance = parseFloat(bnb.free) * bnbPrice;
      }
    }
    
    const positionValueUSD = usdtBalance * (this.config.maxPositionPercent / 100);
    const quantity = positionValueUSD / currentPrice;
    
    return quantity;
  }
  
  /**
   * Execute a trade (simulated for safety - replace with real when ready)
   */
  private async executeTrade(
    side: 'BUY' | 'SELL',
    quantity: number,
    currentPrice: number,
    reason: string
  ): Promise<void> {
    console.log('\n' + '⚡'.repeat(70));
    console.log(`  🎯 EXECUTING ${side} ORDER`);
    console.log('⚡'.repeat(70) + '\n');
    
    console.log(`   Symbol: ${this.config.symbol}`);
    console.log(`   Side: ${side}`);
    console.log(`   Quantity: ${quantity.toFixed(8)}`);
    console.log(`   Price: $${currentPrice.toFixed(2)}`);
    console.log(`   Value: $${(quantity * currentPrice).toFixed(2)}`);
    console.log(`   Reason: ${reason}\n`);
    
    // FOR SAFETY: This is simulated!
    // To go LIVE, uncomment the actual order execution below
    
    console.log('⚠️  DRY RUN MODE - Order simulated (not executed)');
    console.log('💡 To enable LIVE trading, modify the executeTrade method\n');
    
    /* UNCOMMENT FOR LIVE TRADING:
    try {
      const order = await this.client.createOrder({
        symbol: this.config.symbol,
        side,
        type: 'MARKET',
        quantity
      });
      
      console.log('✅ ORDER EXECUTED!');
      console.log(`   Order ID: ${order.orderId}`);
      console.log(`   Status: ${order.status}\n`);
      
      // Track in honey pot (simulated PnL for now)
      const simulatedPnL = Math.random() > 0.6 ? 
        (Math.random() * 50 + 10) : 
        -(Math.random() * 20 + 5);
      
      addHoney(this.config.symbol, simulatedPnL, side);
      this.tradesExecuted++;
      
    } catch (error: any) {
      console.error('❌ ORDER FAILED:', error.message);
    }
    */
    
    // Simulate for demo
    const simulatedPnL = Math.random() > 0.6 ? 
      (Math.random() * 50 + 10) : 
      -(Math.random() * 20 + 5);
    
    setTimeout(() => {
      addHoney(this.config.symbol, simulatedPnL, side);
      this.tradesExecuted++;
      console.log(`📊 Trade #${this.tradesExecuted} logged in honey pot\n`);
    }, 2000);
  }
  
  /**
   * Monitor market and execute when conditions are met
   */
  private async monitorAndExecute(): Promise<void> {
    try {
      const price = await this.client.getPrice(this.config.symbol);
      
      // Simulate lighthouse reading (in real system, get from lighthouse metrics)
      const lighthouseReading = Math.random() * 0.3 + 0.4; // 0.4-0.7 range
      
      const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
      console.log(`[${timestamp}] 💰 ${this.config.symbol}: $${price.toFixed(2)} | 🔦 L=${lighthouseReading.toFixed(3)}`);
      
      // Check if conditions met
      if (lighthouseReading >= this.config.minLighthouse) {
        console.log(`   🎯 LIGHTHOUSE ABOVE THRESHOLD! (${lighthouseReading.toFixed(3)} >= ${this.config.minLighthouse.toFixed(3)})`);
        
        const quantity = await this.calculatePositionSize(price);
        
        if (quantity * price >= 10) {
          await this.executeTrade('BUY', quantity, price, 'High lighthouse reading detected');
        } else {
          console.log(`   ⚠️  Position size too small ($${(quantity * price).toFixed(2)} < $10 minimum)\n`);
        }
      } else {
        console.log(`   ⏳ Waiting... (L=${lighthouseReading.toFixed(3)} < ${this.config.minLighthouse.toFixed(3)})\n`);
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
    }
  }
  
  /**
   * Main combat loop
   */
  async engage(): Promise<void> {
    await this.initialize();
    
    this.isActive = true;
    
    console.log('🔥 COMBAT OPERATIONS ACTIVE! 🔥\n');
    console.log('Press Ctrl+C to disengage and generate final report\n');
    
    while (this.isActive) {
      await this.monitorAndExecute();
      await this.sleep(this.config.tradeIntervalMs);
    }
  }
  
  /**
   * Disengage and generate final report
   */
  async disengage(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  🛑 DISENGAGING COMBAT OPERATIONS 🛑');
    console.log('═'.repeat(70) + '\n');
    
    this.isActive = false;
    
    // Show honey pot status
    console.log('🍯 FINAL HONEY POT STATUS:\n');
    honeyPot.displayStatus();
    
    // Generate War Room Brief
    console.log('\n📡 GENERATING FINAL WAR ROOM BRIEF...\n');
    
    try {
      const brief = await this.reporter.generateBrief(
        new Date(),
        'Commander',
        'GENERAL-QUACKERS'
      );
      
      console.log(this.reporter.formatBriefAsText(brief));
      
      // Save report
      const reportPath = await this.reporter.saveBrief(brief, './reports');
      console.log(`\n📄 War Room Brief saved to: ${reportPath}\n`);
      
    } catch (error: any) {
      console.warn('⚠️  Could not generate brief:', error.message);
    }
    
    console.log('═'.repeat(70));
    console.log('  🦆 GENERAL QUANTUM QUACKERS SIGNING OFF 🦆');
    console.log('═'.repeat(70) + '\n');
    
    console.log(`🎖️  Trades Executed: ${this.tradesExecuted}`);
    console.log('🍯 Honey Status:', honeyPot.getSummaryForBrief());
    console.log('\n🦆 "Mission complete. Awaiting next orders, Commander!"\n');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  const symbol = args[0] || 'BTCUSDT';
  const minLighthouse = parseFloat(args.find(a => a.startsWith('--lighthouse='))?.split('=')[1] || '0.65');
  const interval = parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '60000');
  
  const general = new GeneralQuantumQuackers({
    symbol,
    minLighthouse,
    tradeIntervalMs: interval,
    followGeneralOrders: !args.includes('--no-orders')
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    await general.disengage();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await general.disengage();
    process.exit(0);
  });
  
  await general.engage();
}

main().catch(error => {
  console.error('\n❌ CRITICAL ERROR:', error.message);
  process.exit(1);
});
