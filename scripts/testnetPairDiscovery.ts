#!/usr/bin/env tsx
/**
 * TESTNET PAIR DISCOVERY
 * 
 * Discovers all available trading pairs on Binance testnet
 * Validates the count and prepares for all-pair trading
 * 
 * Gary Leckey | November 23, 2025
 */

import { BinanceClient } from '../core/binanceClient';
import { writeFileSync } from 'fs';

interface TestnetPairInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  minNotional?: string;
  minQty?: string;
}

interface TestnetPairAnalysis {
  totalPairs: number;
  tradingPairs: number;
  byQuoteAsset: Record<string, number>;
  pairs: TestnetPairInfo[];
  timestamp: string;
}

async function discoverTestnetPairs(): Promise<TestnetPairAnalysis> {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║         🔍 TESTNET PAIR DISCOVERY 🔍                     ║');
  console.log('║                                                           ║');
  console.log('║     Discovering All Available Testnet Trading Pairs      ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const apiKey = process.env.BINANCE_API_KEY || '';
  const apiSecret = process.env.BINANCE_API_SECRET || '';
  const testnet = process.env.BINANCE_TESTNET === 'true';

  console.log(`⚙️  Configuration:`);
  console.log(`   • Testnet Mode: ${testnet ? 'YES' : 'NO'}`);
  console.log(`   • API Key Set: ${apiKey ? 'YES' : 'NO (using public endpoints)'}`);
  console.log('');

  const client = new BinanceClient({ 
    apiKey: apiKey || 'dummy', 
    apiSecret: apiSecret || 'dummy', 
    testnet 
  });

  console.log('📡 Fetching exchange information...\n');

  try {
    const exchangeInfo = await client.getExchangeInfo();
    
    const allSymbols = exchangeInfo.symbols;
    const tradingPairs = allSymbols.filter((s: any) => s.status === 'TRADING');
    
    console.log(`✅ Exchange Information Retrieved:`);
    console.log(`   • Total Symbols: ${allSymbols.length}`);
    console.log(`   • Trading Pairs: ${tradingPairs.length}`);
    console.log('');

    // Group by quote asset
    const byQuoteAsset: Record<string, number> = {};
    const pairs: TestnetPairInfo[] = [];

    for (const symbol of tradingPairs) {
      const quoteAsset = symbol.quoteAsset;
      byQuoteAsset[quoteAsset] = (byQuoteAsset[quoteAsset] || 0) + 1;

      // Extract minimum notional from filters
      let minNotional = undefined;
      let minQty = undefined;
      
      if (symbol.filters) {
        const notionalFilter = symbol.filters.find((f: any) => f.filterType === 'MIN_NOTIONAL');
        if (notionalFilter) {
          minNotional = notionalFilter.minNotional;
        }
        
        const lotSizeFilter = symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE');
        if (lotSizeFilter) {
          minQty = lotSizeFilter.minQty;
        }
      }

      pairs.push({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        status: symbol.status,
        minNotional,
        minQty,
      });
    }

    // Display breakdown by quote asset
    console.log('📊 Pairs by Quote Asset:');
    const sortedQuotes = Object.entries(byQuoteAsset).sort((a, b) => b[1] - a[1]);
    for (const [quote, count] of sortedQuotes) {
      console.log(`   • ${quote.padEnd(8)} : ${count.toString().padStart(4)} pairs`);
    }
    console.log('');

    // Create analysis object
    const analysis: TestnetPairAnalysis = {
      totalPairs: allSymbols.length,
      tradingPairs: tradingPairs.length,
      byQuoteAsset,
      pairs,
      timestamp: new Date().toISOString(),
    };

    // Save to file
    const outputPath = './testnet_pairs.json';
    writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`💾 Analysis saved to: ${outputPath}`);
    console.log('');

    // Display sample pairs from each major quote asset
    console.log('─────────────────────────────────────────────────────');
    console.log('SAMPLE PAIRS BY QUOTE ASSET:');
    console.log('─────────────────────────────────────────────────────\n');

    for (const quote of ['USDT', 'BTC', 'ETH', 'BNB'].filter(q => byQuoteAsset[q])) {
      const quotePairs = pairs.filter(p => p.quoteAsset === quote).slice(0, 5);
      console.log(`${quote} Pairs (showing 5/${byQuoteAsset[quote]}):`);
      quotePairs.forEach(p => {
        console.log(`   • ${p.symbol.padEnd(12)} (${p.baseAsset})`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   ✅ DISCOVERY COMPLETE: ${tradingPairs.length} TRADING PAIRS`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return analysis;

  } catch (error: any) {
    console.error('❌ Failed to fetch exchange info:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    const analysis = await discoverTestnetPairs();
    console.log('🎯 Next Steps:');
    console.log('   1. Review testnet_pairs.json for complete pair list');
    console.log(`   2. Configure trading strategy for ${analysis.tradingPairs} pairs`);
    console.log('   3. Implement all-pair trading mechanism');
    console.log('');
  } catch (error: any) {
    console.error('\n❌ Discovery failed:', error.message);
    process.exit(1);
  }
}

main();

export default discoverTestnetPairs;
