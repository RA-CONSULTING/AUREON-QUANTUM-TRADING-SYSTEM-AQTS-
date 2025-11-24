#!/usr/bin/env npx tsx
/**
 * ENHANCED LION HUNT — Takes Orders from General Quackers! 🦆🦁
 * 
 * Flow:
 * 1. Request reconnaissance orders from General Quackers (War Room)
 * 2. Adapt hunting strategy based on field conditions
 * 3. Execute trades following tactical directives
 * 4. Report back to the Hive
 * 
 * "The wise lion listens to his general" — General Quackers, 2025
 */

import { spawn } from 'child_process';
import { lionCommand, LionConfig } from '../core/lionCommandCenter';
import PrideScanner from './prideScanner';

interface EnhancedHuntConfig {
  apiKey: string;
  apiSecret: string;
  testnet: boolean;
  baseCyclesPerTarget: number;
  baseCycleDurationMs: number;
  followGeneralOrders: boolean;
}

class EnhancedLionHunt {
  private config: EnhancedHuntConfig;
  private scanner: PrideScanner;
  private lionConfig: LionConfig | null = null;
  private currentHunt: any = null;
  private huntCount = 0;
  private startTime: Date;

  constructor(config: Partial<EnhancedHuntConfig> = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.BINANCE_API_KEY || '',
      apiSecret: config.apiSecret || process.env.BINANCE_API_SECRET || '',
      testnet: config.testnet ?? (process.env.BINANCE_TESTNET === 'true'),
      baseCyclesPerTarget: config.baseCyclesPerTarget || 20,
      baseCycleDurationMs: config.baseCycleDurationMs || 5000,
      followGeneralOrders: config.followGeneralOrders ?? true,
    };

    if (!this.config.apiKey || !this.config.apiSecret) {
      throw new Error('❌ BINANCE_API_KEY and BINANCE_API_SECRET must be set');
    }

    this.scanner = new PrideScanner(this.config.apiKey, this.config.apiSecret, this.config.testnet);
    this.startTime = new Date();
  }

  /**
   * Initialize: Get orders from General Quackers
   */
  async initialize() {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║          🦁 ENHANCED LION HUNT SYSTEM 🦁                  ║');
    console.log('║                                                           ║');
    console.log('║        Taking Orders from General Quackers 🦆             ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    if (this.config.followGeneralOrders) {
      try {
        console.log('📡 Contacting General Quackers at War Room HQ...\n');
        const orders = await lionCommand.fetchLatestOrders();
        this.lionConfig = lionCommand.translateOrdersToConfig(orders);
        console.log('✅ Orders received and understood!\n');
      } catch (error: any) {
        console.warn('⚠️  Could not reach General:', error.message);
        console.log('🦁 Operating with default hunting protocol\n');
      }
    } else {
      console.log('🦁 Operating independently (General orders disabled)\n');
    }

    console.log('⚙️  Hunt Configuration:');
    console.log(`   • Testnet: ${this.config.testnet ? 'YES' : 'NO'}`);
    if (this.lionConfig) {
      console.log(`   • Target Pairs: ${this.lionConfig.targetPairs?.join(', ') || 'Auto-detect'}`);
      console.log(`   • Min Lighthouse: ${this.lionConfig.minLighthouseIntensity?.toFixed(2) || 'N/A'}`);
      console.log(`   • Aggression: ${this.lionConfig.aggressionLevel?.toUpperCase() || 'NORMAL'}`);
      console.log(`   • Position Size: ${(this.lionConfig.positionSizeMultiplier || 1.0) * 100}%`);
      console.log(`   • Stop Loss Width: ${(this.lionConfig.stopLossMultiplier || 1.0) * 100}%`);
      console.log(`   • Scan Interval: ${(this.lionConfig.scanIntervalMs || 5000) / 1000}s`);
      console.log(`   • Max Concurrent: ${this.lionConfig.maxConcurrentTrades || 3} trades`);
    } else {
      console.log(`   • Base Cycles: ${this.config.baseCyclesPerTarget}`);
      console.log(`   • Base Duration: ${this.config.baseCycleDurationMs}ms`);
    }
    console.log('');
  }

  /**
   * Main hunt loop
   */
  async start() {
    await this.initialize();

    while (true) {
      try {
        this.huntCount++;
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`🦁 HUNT #${this.huntCount} — Scanning the Pride...`);
        console.log(`${'═'.repeat(60)}\n`);

        // 1. Scan the pride
        await this.scanner.scanPride();

        // 2. Get targets based on General's orders or default
        const targets = this.getTargetsBasedOnOrders();

        if (targets.length === 0) {
          console.log('⚠️  No suitable targets per General\'s criteria. Waiting...\n');
          await this.sleep(this.getScanInterval());
          continue;
        }

        // 3. Select the best prey
        const prey = targets[0];
        console.log('\n🎯 THE LION SELECTS HIS PREY:\n');
        console.log(`   Symbol: ${prey.symbol}`);
        console.log(`   Price: $${prey.price?.toFixed(prey.price < 1 ? 6 : 2)}`);
        console.log(`   24h Change: ${prey.priceChangePercent?.toFixed(2)}%`);
        console.log(`   24h Volume: $${((prey.volume24h || 0) / 1000000).toFixed(2)}M`);
        console.log(`   Opportunity Score: ${this.calculateOpportunity(prey).toFixed(0)}`);
        
        if (this.lionConfig?.aggressionLevel) {
          console.log(`   🦆 General's Orders: ${this.lionConfig.aggressionLevel.toUpperCase()}`);
        }
        console.log('');

        // 4. Launch hunt with adapted parameters
        await this.hunt(prey.symbol);

        // 5. Rest before next scan
        console.log('\n🦁 The lion returns to the pride...\n');
        await this.sleep(this.getScanInterval());

      } catch (error: any) {
        console.error(`\n❌ Hunt error: ${error.message}`);
        console.log('⏳ Waiting before retry...\n');
        await this.sleep(30000);
      }
    }
  }

  /**
   * Get targets based on General's orders
   */
  private getTargetsBasedOnOrders(): any[] {
    // If we have specific pairs from General, filter to those
    if (this.lionConfig?.targetPairs && this.lionConfig.targetPairs.length > 0) {
      const allTargets = this.scanner.getHuntingTargets(0.1, 1.0);
      return allTargets.filter(t => 
        this.lionConfig!.targetPairs!.includes(t.symbol)
      ).sort((a, b) => this.calculateOpportunity(b) - this.calculateOpportunity(a));
    }
    
    // Otherwise use default scan with adjusted volatility based on aggression
    let minVolatility = 2.0;
    if (this.lionConfig?.aggressionLevel === 'aggressive') minVolatility = 1.5;
    if (this.lionConfig?.aggressionLevel === 'defensive') minVolatility = 3.0;
    
    return this.scanner.getHuntingTargets(0.1, minVolatility);
  }

  /**
   * Get scan interval based on orders
   */
  private getScanInterval(): number {
    return this.lionConfig?.scanIntervalMs || 10000;
  }

  /**
   * Launch Rainbow Architect with adapted parameters
   */
  private async hunt(symbol: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🌈 DEPLOYING RAINBOW ARCHITECT ON ${symbol}`);
      if (this.lionConfig) {
        console.log(`🦆 Following General's tactical directive`);
      }
      console.log(`${'─'.repeat(60)}\n`);

      // Adjust cycles and interval based on orders
      const cycles = this.adjustCycles();
      const interval = this.lionConfig?.scanIntervalMs || this.config.baseCycleDurationMs;

      const args = [
        'scripts/rainbowArch.ts',
        symbol,
        '--live',
        `--interval=${interval}`,
      ];

      const env = {
        ...process.env,
        BINANCE_API_KEY: this.config.apiKey,
        BINANCE_API_SECRET: this.config.apiSecret,
        BINANCE_TESTNET: this.config.testnet.toString(),
        CONFIRM_LIVE_TRADING: 'yes',
        DRY_RUN: 'false',
        RAINBOW_CYCLES: cycles.toString(),
        // Pass LION config as env vars
        LION_POSITION_MULTIPLIER: (this.lionConfig?.positionSizeMultiplier || 1.0).toString(),
        LION_STOP_MULTIPLIER: (this.lionConfig?.stopLossMultiplier || 1.0).toString(),
        LION_MIN_LIGHTHOUSE: (this.lionConfig?.minLighthouseIntensity || 0.5).toString(),
      };

      this.currentHunt = spawn('npx', ['tsx', ...args], {
        env,
        stdio: 'inherit',
        cwd: '/workspaces/AUREON-QUANTUM-TRADING-SYSTEM-AQTS-',
      });

      let timeout: NodeJS.Timeout;

      this.currentHunt.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.currentHunt.on('close', (code: number) => {
        clearTimeout(timeout);
        this.currentHunt = null;
        if (code === 0) {
          console.log(`\n✅ Hunt completed successfully`);
          resolve();
        } else {
          console.log(`\n⚠️  Hunt exited with code ${code}`);
          resolve();
        }
      });

      const maxDuration = cycles * interval + 30000;
      timeout = setTimeout(() => {
        console.log('\n⏱️  Hunt timeout - moving to next target');
        if (this.currentHunt) {
          this.currentHunt.kill('SIGTERM');
        }
        resolve();
      }, maxDuration);
    });
  }

  /**
   * Adjust cycles based on General's orders
   */
  private adjustCycles(): number {
    let cycles = this.config.baseCyclesPerTarget;
    
    if (this.lionConfig?.aggressionLevel === 'aggressive') {
      cycles = Math.floor(cycles * 1.5); // More cycles when aggressive
    } else if (this.lionConfig?.aggressionLevel === 'defensive') {
      cycles = Math.floor(cycles * 0.7); // Fewer cycles when defensive
    }
    
    return Math.max(5, cycles);
  }

  /**
   * Calculate opportunity score
   */
  private calculateOpportunity(target: any): number {
    const volatility = Math.abs(target.priceChangePercent || 0);
    const volume = (target.volume24h || 0) / 1000000;
    return volatility * volume * 100;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop hunting
   */
  async stop() {
    const runtime = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000 / 60);
    console.log(`\n🦁 Stopping the hunt gracefully... (${runtime} minutes runtime)`);
    if (this.currentHunt) {
      this.currentHunt.kill('SIGTERM');
      this.currentHunt = null;
    }
    console.log('🦆 Reporting back to General Quackers...');
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  const config: Partial<EnhancedHuntConfig> = {
    baseCyclesPerTarget: parseInt(args.find(a => a.startsWith('--cycles='))?.split('=')[1] || '20'),
    baseCycleDurationMs: parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '5000'),
    followGeneralOrders: !args.includes('--no-orders'),
  };

  const lion = new EnhancedLionHunt(config);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🦁 The lion rests...');
    await lion.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await lion.stop();
    process.exit(0);
  });

  await lion.start();
}

main().catch(console.error);

export default EnhancedLionHunt;
