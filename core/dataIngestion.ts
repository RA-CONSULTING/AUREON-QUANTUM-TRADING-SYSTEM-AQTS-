import { OHLCV } from '../types';

export interface ExchangeFeedSnapshot {
  exchange: string;
  price: number;
  volume24h: number;
  fundingRate: number;
  spread: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  side: 'bid' | 'ask';
}

export interface OnChainMetricSnapshot {
  activeAddresses: number;
  exchangeFlows: number;
  whaleAlerts: number;
}

export interface SentimentSnapshot {
  source: 'twitter' | 'reddit' | 'telegram';
  score: number;
  trendingKeywords: string[];
}

export interface NewsHeadline {
  source: string;
  title: string;
  impactScore: number;
}

export interface MacroSignalSnapshot {
  fearGreedIndex: number;
  fundingRateAverage: number;
  liquidations24h: number;
}

export interface DataIngestionSnapshot {
  timestamp: number;
  exchangeFeeds: ExchangeFeedSnapshot[];
  orderBookDepth: OrderBookLevel[];
  onChain: OnChainMetricSnapshot;
  sentiment: SentimentSnapshot[];
  news: NewsHeadline[];
  macro: MacroSignalSnapshot;
  consolidatedOHLCV: OHLCV;
}

const EXCHANGES = ['Binance', 'Coinbase', 'Kraken', 'Bybit', 'KuCoin'];
const KEYWORDS = ['ETF', 'halving', 'regulation', 'bull-run', 'whale', 'leverage'];

const pickKeywords = () => {
  const shuffled = [...KEYWORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
};

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

export class DataIngestionEngine {
  private price: number;

  constructor(initialPrice = 42000) {
    this.price = initialPrice;
  }

  public next(): DataIngestionSnapshot {
    const volatility = randomBetween(0.002, 0.012);
    const drift = randomBetween(-0.004, 0.006);
    this.price = Math.max(1000, this.price * (1 + drift + volatility * (Math.random() - 0.5)));

    const exchangeFeeds = EXCHANGES.map((exchange, idx) => {
      const priceNoise = (Math.random() - 0.5) * 0.002 * this.price;
      const price = this.price + priceNoise;
      const volume24h = randomBetween(50, 500) * 1e6 * (1 + idx * 0.1);
      const fundingRate = randomBetween(-0.02, 0.02);
      const spread = Math.abs(priceNoise) / this.price;
      return { exchange, price, volume24h, fundingRate, spread } satisfies ExchangeFeedSnapshot;
    });

    const bestBid = Math.max(...exchangeFeeds.map(f => f.price)) * (1 - 0.0008);
    const bestAsk = Math.min(...exchangeFeeds.map(f => f.price)) * (1 + 0.0008);

    const orderBookDepth: OrderBookLevel[] = Array.from({ length: 10 }, (_, i) => {
      const side = i % 2 === 0 ? 'bid' : 'ask';
      const spreadOffset = side === 'bid' ? -0.5 : 0.5;
      const price = (side === 'bid' ? bestBid : bestAsk) + spreadOffset * i;
      const size = randomBetween(5, 75) * (10 - i);
      return { price, size, side } satisfies OrderBookLevel;
    });

    const onChain: OnChainMetricSnapshot = {
      activeAddresses: randomBetween(800000, 1200000),
      exchangeFlows: randomBetween(-2000, 2000),
      whaleAlerts: randomBetween(5, 30),
    };

    const sentiment: SentimentSnapshot[] = [
      { source: 'twitter', score: randomBetween(-1, 1), trendingKeywords: pickKeywords() },
      { source: 'reddit', score: randomBetween(-0.8, 0.8), trendingKeywords: pickKeywords() },
      { source: 'telegram', score: randomBetween(-0.6, 0.6), trendingKeywords: pickKeywords() },
    ];

    const newsSources = ['CoinDesk', 'CoinTelegraph', 'Bloomberg', 'Decrypt'];
    const news: NewsHeadline[] = newsSources.map(source => ({
      source,
      title: `${source}: ${pickKeywords()[0]} momentum intensifies`,
      impactScore: randomBetween(0, 1),
    }));

    const macro: MacroSignalSnapshot = {
      fearGreedIndex: randomBetween(10, 90),
      fundingRateAverage: exchangeFeeds.reduce((acc, feed) => acc + feed.fundingRate, 0) / exchangeFeeds.length,
      liquidations24h: randomBetween(50, 250) * 1e6,
    };

    const open = this.price * (1 - drift);
    const high = Math.max(open, this.price) * (1 + volatility * 1.5);
    const low = Math.min(open, this.price) * (1 - volatility * 1.5);
    const close = this.price;
    const volume = exchangeFeeds.reduce((acc, feed) => acc + feed.volume24h, 0) / 24;

    return {
      timestamp: Date.now(),
      exchangeFeeds,
      orderBookDepth,
      onChain,
      sentiment,
      news,
      macro,
      consolidatedOHLCV: { open, high, low, close, volume },
    };
  }
}
