import { DataIngestionSnapshot, ExchangeFeedSnapshot } from './dataIngestion';
import { RiskAdjustedOrder } from './riskManagement';

export interface ExecutionFill {
  exchange: string;
  price: number;
  size: number;
  latencyMs: number;
}

export interface ExecutionReport {
  success: boolean;
  fills: ExecutionFill[];
  averagePrice: number;
  slippage: number;
}

const chooseVenue = (feeds: ExchangeFeedSnapshot[], direction: 'long' | 'short') => {
  if (direction === 'long') {
    return feeds.reduce((best, current) => current.price < best.price ? current : best, feeds[0]);
  }
  return feeds.reduce((best, current) => current.price > best.price ? current : best, feeds[0]);
};

export class ExecutionEngine {
  execute(order: RiskAdjustedOrder, snapshot: DataIngestionSnapshot): ExecutionReport {
    const venue = chooseVenue(snapshot.exchangeFeeds, order.direction);
    const priceNoise = (Math.random() - 0.5) * venue.spread * snapshot.consolidatedOHLCV.close;
    const fillPrice = venue.price + priceNoise * (order.direction === 'long' ? 1 : -1);
    const size = order.notional / fillPrice;

    const latencyMs = 50 + Math.random() * 100;
    const fills: ExecutionFill[] = [{ exchange: venue.exchange, price: fillPrice, size, latencyMs }];

    const midPrice = snapshot.consolidatedOHLCV.close;
    const slippage = (fillPrice - midPrice) / midPrice;

    return {
      success: true,
      fills,
      averagePrice: fillPrice,
      slippage,
    } satisfies ExecutionReport;
  }
}
