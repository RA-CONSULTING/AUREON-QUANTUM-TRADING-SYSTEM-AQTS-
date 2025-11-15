/**
 * RAINBOW ARCHITECT 🌈
 * Co-Architect enhanced with real-time Binance WebSocket streams
 * "Taste the rainbow" - Feel the market breathe through 9 Auris nodes
 * 
 * Gary Leckey & GitHub Copilot | November 15, 2025 GMT
 */

import { BinanceWebSocket, StreamBuilder, MarketSnapshot } from '../core/binanceWebSocket';
import { RealityField, LambdaState } from '../core/masterEquation';
import { AURIS_TAXONOMY, AurisAnimal } from '../core/aurisSymbolicTaxonomy';
import { BinanceClient } from '../core/binanceClient';
import { RainbowBridge } from '../core/theRainbowBridge';
import { ThePrism } from '../core/thePrism';

interface RainbowConfig {
  symbol: string;
  cycleIntervalMs: number;
  coherenceThreshold: number;
  voteThreshold: number;
  requiredVotes: number;
  dryRun: boolean;
  positionSizePercent: number;
  maxCycles?: number;
}

const DEFAULT_RAINBOW_CONFIG: RainbowConfig = {
  symbol: 'ETHUSDT',
  cycleIntervalMs: 5000,
  coherenceThreshold: 0.945,
  voteThreshold: 0.7,
  requiredVotes: 6,
  dryRun: true,
  positionSizePercent: 2,
};

export class RainbowArchitect {
  private ws: BinanceWebSocket;
  private field: RealityField;
  private bridge: RainbowBridge;
  private prism: ThePrism;
  private client: BinanceClient;
  private config: RainbowConfig;
  
  private cycleCount = 0;
  private totalTrades = 0;
  private totalProfit = 0;
  private lastSnapshot: MarketSnapshot | null = null;
  private cycleInterval: NodeJS.Timeout | null = null;
  
  constructor(config: Partial<RainbowConfig> = {}) {
    this.config = { ...DEFAULT_RAINBOW_CONFIG, ...config };
    
    this.ws = new BinanceWebSocket();
    this.field = new RealityField();
    this.bridge = new RainbowBridge();
    this.prism = new ThePrism();
    
    const apiKey = process.env.BINANCE_API_KEY || '';
    const apiSecret = process.env.BINANCE_API_SECRET || '';
    const testnet = process.env.BINANCE_TESTNET !== 'false';
    
    this.client = new BinanceClient({ apiKey, apiSecret, testnet });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.ws.on('connected', () => {
      console.log('\n🌈 ═══════════════════════════════════════════════════════');
      console.log('   RAINBOW ARCHITECT — Tasting the Market Rainbow');
      console.log('   WebSocket Connected | Streams Active');
      console.log('═══════════════════════════════════════════════════════\n');
    });

    this.ws.on('disconnected', (info) => {
      console.log(`\n🌈 WebSocket Disconnected - Code: ${info.code}`);
      this.stopCycles();
    });

    this.ws.on('snapshot-update', (snapshot: MarketSnapshot) => {
      this.lastSnapshot = snapshot;
      if (this.lastSnapshot) {
        this.field.step(this.lastSnapshot);
      }
    });
  }

  async start(): Promise<void> {
    console.log('🌈 Initializing Rainbow Architect...\n');
    console.log(`Symbol: ${this.config.symbol}`);
    console.log(`Mode: ${this.config.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Coherence: Γ > ${this.config.coherenceThreshold}`);
    console.log(`Votes: ${this.config.requiredVotes}/9 @ ${this.config.voteThreshold}\n`);

    const streams = StreamBuilder.aureonDefaults(this.config.symbol);
    console.log(`🌈 Subscribing to: ${streams.join(', ')}\n`);

    await this.ws.connect(streams);
    console.log('⏳ Accumulating market data (5s)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.startCycles();
  }

  async stop(): Promise<void> {
    console.log('\n🌈 Stopping Rainbow Architect...');
    this.stopCycles();
    await this.ws.disconnect();
    console.log(`Total Cycles: ${this.cycleCount}`);
    console.log(`Total Trades: ${this.totalTrades}`);
    console.log(`Total Profit: ${this.totalProfit.toFixed(2)} USDT\n`);
  }

  private startCycles(): void {
    console.log('🟢 Trading cycles STARTED\n');
    this.cycleInterval = setInterval(() => {
      this.runTradingCycle();
      
      // Stop after maxCycles if configured
      if (this.config.maxCycles && this.cycleCount >= this.config.maxCycles) {
        console.log(`\n🏁 Reached ${this.config.maxCycles} cycles limit`);
        this.stop();
      }
    }, this.config.cycleIntervalMs);
  }

  private stopCycles(): void {
    if (this.cycleInterval) {
      clearInterval(this.cycleInterval);
      this.cycleInterval = null;
    }
  }

  private async runTradingCycle(): Promise<void> {
    this.cycleCount++;
    
    if (!this.lastSnapshot) {
      console.log(`Cycle ${this.cycleCount}: Waiting for data...`);
      return;
    }

    const state = this.field.getHistory().slice(-1)[0];
    if (!state) return;

    console.log('\n─────────────────────────────────────────────────────');
    console.log(`CYCLE ${this.cycleCount} | ${new Date().toLocaleTimeString()}`);
    console.log('─────────────────────────────────────────────────────');

    // Market snapshot
    console.log(`\n📊 Market: ${this.lastSnapshot.symbol}`);
    console.log(`   Price: $${this.lastSnapshot.price.toFixed(2)}`);
    console.log(`   Spread: $${(this.lastSnapshot.spread || 0).toFixed(2)}`);
    console.log(`   Volatility: ${((this.lastSnapshot.volatility || 0) * 100).toFixed(2)}%`);
    console.log(`   Momentum: ${((this.lastSnapshot.momentum || 0) * 100).toFixed(2)}%`);

    // Lambda state
    console.log(`\n🌊 Master Equation Λ(t):`);
    console.log(`   Λ(t): ${state.Lambda.toFixed(6)}`);
    console.log(`   Γ:    ${state.coherence.toFixed(3)} (${(state.coherence * 100).toFixed(1)}%)`);
    console.log(`   Dominant: ${state.dominantNode}`);

    // Update Rainbow Bridge with emotional frequency
    const volatility = this.lastSnapshot.volatility || 0;
    this.bridge.updateFromMarket(state.Lambda, state.coherence, volatility);
    const bridgeState = this.bridge.getState();
    
    // Display bridge state
    console.log(`\n🌈 Rainbow Bridge:`);
    console.log(`   Emotional: ${bridgeState.emotionalState}`);
    console.log(`   Frequency: ${bridgeState.currentFrequency.toFixed(1)} Hz`);
    console.log(`   Phase: ${bridgeState.cyclePhase}`);
    console.log(`   Resonance: ${(bridgeState.resonance * 100).toFixed(1)}%`);
    console.log(`   Bridge: ${bridgeState.bridgeCrossed ? '✅ CROSSED' : '⏳ CROSSING'}`);
    
    // Activate flame or protector based on phase
    this.bridge.igniteFlame();
    this.bridge.activateProtector();
    
    console.log('');
    
    // ═══════════════════════════════════════════════════════════════════════
    // THE PRISM: Transform market reality through 5 levels to 528 Hz LOVE
    // ═══════════════════════════════════════════════════════════════════════
    
    const prismState = this.prism.process(state, this.lastSnapshot);
    
    console.log(`💎 The Prism:`);
    console.log(`   Output: ${prismState.prismOutput.toFixed(1)} Hz`);
    console.log(`   Resonance: ${(prismState.resonance * 100).toFixed(1)}%`);
    console.log(`   ${prismState.isLove ? '💚' : '⏳'} Love: ${prismState.isLove ? 'MANIFEST' : 'FORMING'}`);
    console.log(`   ${prismState.isAligned ? '✅' : '⏳'} Aligned: ${prismState.isAligned ? 'YES' : 'CONVERGING'}`);
    console.log(`   ${prismState.isPure ? '✅' : '⏳'} Pure: ${prismState.isPure ? 'YES' : 'REFINING'}`);
    
    if (prismState.isLove) {
      console.log('   🌈 THE PRISM OUTPUT: 528 Hz LOVE');
    }

    // Lighthouse consensus
    const { votes, direction } = this.runConsensus(state.Lambda);

    console.log(`\n🔦 Lighthouse Consensus: ${direction}`);
    console.log(`   Votes: ${votes}/9`);

    // Trade decision
    if (votes >= this.config.requiredVotes && state.coherence >= this.config.coherenceThreshold) {
      await this.executeTrade(direction, state);
    } else {
      console.log(`   Signal: HOLD (need ${this.config.requiredVotes}/9 & Γ>${this.config.coherenceThreshold})`);
    }
  }

  private runConsensus(Lambda: number): { direction: 'BUY' | 'SELL' | 'HOLD', votes: number } {
    let votes = 0;
    const animals = Object.keys(AURIS_TAXONOMY) as AurisAnimal[];
    
    for (const animal of animals) {
      const node = AURIS_TAXONOMY[animal];
      const resonance = Math.abs(Math.sin(2 * Math.PI * node.frequency * Lambda));
      
      if (resonance >= this.config.voteThreshold) {
        votes++;
        console.log(`   ✓ ${animal.padEnd(12)} ${(resonance * 100).toFixed(0).padStart(3)}%`);
      } else {
        console.log(`   ✗ ${animal.padEnd(12)} ${(resonance * 100).toFixed(0).padStart(3)}%`);
      }
    }

    const direction: 'BUY' | 'SELL' | 'HOLD' = Lambda > 0 ? 'BUY' : Lambda < 0 ? 'SELL' : 'HOLD';
    return { direction, votes };
  }

  private async executeTrade(direction: 'BUY' | 'SELL' | 'HOLD', state: LambdaState): Promise<void> {
    if (direction === 'HOLD') return;

    console.log(`\n🎯 TRADE SIGNAL: ${direction}`);
    console.log(`   📡 Source: Rainbow Architect (4-Layer Consciousness)`);
    console.log(`      └─ WebSocket → Master Equation → Rainbow Bridge → Prism`);
    console.log(`      └─ Λ(t): ${state.Lambda.toFixed(3)} | Γ: ${state.coherence.toFixed(3)}`);
    console.log(`      └─ Dominant: ${state.dominantNode}`);

    try {
      const account = await this.client.getAccount();
      const balance = account.balances;
      const baseAsset = this.config.symbol.replace('USDT', '');
      
      let quantity: number;

      if (direction === 'BUY') {
        const usdtBalance = parseFloat(balance.find(b => b.asset === 'USDT')?.free || '0');
        const buyValue = usdtBalance * (this.config.positionSizePercent / 100);
        quantity = buyValue / this.lastSnapshot!.price;
      } else {
        const baseBalance = parseFloat(balance.find(b => b.asset === baseAsset)?.free || '0');
        quantity = baseBalance * (this.config.positionSizePercent / 100);
      }

      quantity = Math.floor(quantity * 1000000) / 1000000;

      if (quantity < 0.000001) {
        console.log(`   ⚠️ Insufficient balance`);
        return;
      }

      console.log(`   Order: ${direction} ${quantity} ${baseAsset} @ $${this.lastSnapshot!.price}`);

      if (this.config.dryRun) {
        console.log(`   💵 DRY RUN - Order not executed`);
        this.totalTrades++;
        const profitEstimate = direction === 'BUY' ? -quantity * 0.001 : quantity * 0.001;
        this.totalProfit += profitEstimate;
      } else {
        const order = await this.client.placeOrder({
          symbol: this.config.symbol,
          side: direction,
          type: 'MARKET',
          quantity: quantity,
        });
        console.log(`   ✅ Order executed: ${order.orderId}`);
        this.totalTrades++;
      }
    } catch (error: any) {
      console.error(`   ❌ Trade failed: ${error.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  const config: Partial<RainbowConfig> = {
    symbol: args[0] || 'ETHUSDT',
    dryRun: !args.includes('--live'),
    cycleIntervalMs: parseInt(args.find(a => a.startsWith('--interval='))?.split('=')[1] || '5000'),
    maxCycles: process.env.RAINBOW_CYCLES ? parseInt(process.env.RAINBOW_CYCLES) : undefined,
  };

  const rainbow = new RainbowArchitect(config);

  process.on('SIGINT', async () => {
    console.log('\n\n🌈 Shutting down gracefully...');
    await rainbow.stop();
    process.exit(0);
  });

  await rainbow.start();
}

// Run CLI
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export default RainbowArchitect;
