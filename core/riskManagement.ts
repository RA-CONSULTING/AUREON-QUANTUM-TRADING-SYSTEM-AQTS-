import { DecisionSignal } from './decisionFusion';
import { DataIngestionSnapshot } from './dataIngestion';

export interface Position {
  direction: 'long' | 'short';
  entryPrice: number;
  size: number;
  leverage: number;
  timestamp: number;
  stopLoss: number;
  takeProfit: number;
}

export interface PortfolioState {
  equity: number;
  maxDrawdown: number;
  openPositions: Position[];
}

export interface RiskParameters {
  maxPortfolioRisk: number;
  maxLeverage: number;
  circuitBreaker: number;
}

export interface RiskAdjustedOrder {
  direction: 'long' | 'short';
  notional: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  holdMinutes: number;
}

const DEFAULT_PARAMS: RiskParameters = {
  maxPortfolioRisk: 0.03,
  maxLeverage: 5,
  circuitBreaker: 0.1,
};

const kellyCriterion = (winRate: number, rewardRisk: number) => {
  if (rewardRisk <= 0) return 0;
  return Math.max(0, Math.min(1, winRate - (1 - winRate) / rewardRisk));
};

export class RiskManager {
  private state: PortfolioState;
  private params: RiskParameters;

  constructor(initialEquity = 100000, params: RiskParameters = DEFAULT_PARAMS) {
    this.state = {
      equity: initialEquity,
      maxDrawdown: 0,
      openPositions: [],
    } satisfies PortfolioState;
    this.params = params;
  }

  getState(): PortfolioState {
    return this.state;
  }

  evaluate(decision: DecisionSignal, snapshot: DataIngestionSnapshot): RiskAdjustedOrder | null {
    if (decision.action === 'hold') {
      return null;
    }

    const direction = decision.action === 'buy' ? 'long' : 'short';

    const recentVolatility = snapshot.consolidatedOHLCV.high - snapshot.consolidatedOHLCV.low;
    const normalizedVol = Math.max(0.001, recentVolatility / snapshot.consolidatedOHLCV.close);

    const winRate = 0.55 * decision.confidence + 0.45 * Math.random();
    const rewardRisk = 1.5 + decision.confidence;
    const kellyFraction = kellyCriterion(winRate, rewardRisk);

    const baseRisk = Math.min(this.params.maxPortfolioRisk, kellyFraction * decision.positionSize);
    const riskBudget = this.state.equity * baseRisk;

    if (riskBudget <= 0) {
      return null;
    }

    const leverage = Math.min(this.params.maxLeverage, 1 / normalizedVol);
    const notional = riskBudget * leverage;

    const stopLossDistance = snapshot.consolidatedOHLCV.close * normalizedVol * 1.2;
    const takeProfitDistance = stopLossDistance * rewardRisk;

    const stopLoss = direction === 'long'
      ? snapshot.consolidatedOHLCV.close - stopLossDistance
      : snapshot.consolidatedOHLCV.close + stopLossDistance;

    const takeProfit = direction === 'long'
      ? snapshot.consolidatedOHLCV.close + takeProfitDistance
      : snapshot.consolidatedOHLCV.close - takeProfitDistance;

    const holdMinutes = Math.round(60 + decision.confidence * 180);

    return {
      direction,
      notional,
      leverage,
      stopLoss,
      takeProfit,
      holdMinutes,
    } satisfies RiskAdjustedOrder;
  }

  registerFill(order: RiskAdjustedOrder, fillPrice: number) {
    const size = order.notional / fillPrice;
    const position: Position = {
      direction: order.direction,
      entryPrice: fillPrice,
      size,
      leverage: order.leverage,
      timestamp: Date.now(),
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
    };
    this.state.openPositions.push(position);
  }

  markToMarket(price: number) {
    const equityBase = this.state.equity;
    let unrealized = 0;
    this.state.openPositions.forEach(position => {
      const pnl = position.direction === 'long'
        ? (price - position.entryPrice) * position.size
        : (position.entryPrice - price) * position.size;
      unrealized += pnl;
    });

    const equity = equityBase + unrealized;
    const drawdown = (this.state.equity - equity) / this.state.equity;
    this.state.maxDrawdown = Math.max(this.state.maxDrawdown, drawdown);

    if (drawdown > this.params.circuitBreaker) {
      this.state.openPositions = [];
    }
  }
}
