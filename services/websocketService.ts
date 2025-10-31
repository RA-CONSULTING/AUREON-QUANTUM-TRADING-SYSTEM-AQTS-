import { AureonDataPoint, CoherenceDataPoint, PrismStatus, OHLCV } from '../types';

const DATA_INTERVAL_MS = 150;

// This service simulates a live WebSocket connection by generating and pushing data.
interface WebSocketCallbacks {
  onOpen: () => void;
  onMessage: (data: { aureon: AureonDataPoint, nexus: CoherenceDataPoint }) => void;
  onError: (error: Error) => void;
  onClose: () => void;
}

// The simulation logic, adapted from aureonService.ts, is now encapsulated here.
// It maintains state to generate a continuous, realistic stream of data.
class AureonDataStreamer {
  private time: number = 0;
  private market: OHLCV;
  private sentiment: number = 0;
  private policyRate: number = 0.025;
  private lastState: AureonDataPoint | null = null;
  private cciHistory: number[] = [];
  private schumannHistory: number[] = [];
  // Nexus simulation state
  private lastKappa: number = 0.5;
  private lastCt: number = 2000;

  constructor() {
    this.market = { open: 165, high: 166, low: 164, close: 165, volume: 1000000 };
  }

  // Generates the next data point in the sequence
  getNextPoint(): { aureon: AureonDataPoint; nexus: CoherenceDataPoint } {
    const i = this.time;
    
    // --- Generate Market Data ---
    const economicCycle = Math.sin(i * Math.PI / 180) * 0.1;
    const policyCycle = Math.sin(i * Math.PI / 360);
    this.policyRate = 0.025 + policyCycle * 0.02;

    this.sentiment += (Math.random() - 0.5) * 0.1 - this.sentiment * 0.05 + economicCycle * 0.05;
    this.sentiment = Math.max(-1, Math.min(1, this.sentiment));

    const volatility = 1 + Math.abs(this.sentiment) * 1.5 + Math.random() * 0.5;
    const open = this.market.close;
    let move = (Math.random() - 0.5 + this.sentiment * 0.2 - (this.policyRate - 0.025) * 10) * volatility;
    
    let dataQuality = 1.0;
    if (Math.random() < 0.01) { // 1% chance of a major shock event
        move += (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 20);
        this.sentiment = Math.sign(move) * Math.random() * 0.8;
        dataQuality -= 0.5;
    }
    if (Math.random() < 0.05) {
        dataQuality -= Math.random() * 0.2;
    }
    
    const close = Math.max(10, open + move);
    const high = Math.max(open, close) + Math.random() * volatility * 2;
    const low = Math.min(open, close) - Math.random() * volatility * 2;
    const volume = 1000000 + Math.abs(move) * 200000 + (high - low) * 100000 + Math.random() * 500000;
    this.market = { open, high, low, close, volume };
    
    const schumann = 7.83 + Math.sin(i / 10) * 0.5 + (Math.random() - 0.5) * 0.2;

    // --- Calculate Aureon Metrics ---
    const dataIntegrity = dataQuality;
    const lastMarket = this.lastState ? this.lastState.market : this.market;
    const body = Math.abs(close - open);
    const range = high - low;
    const bodyRatio = range > 0 ? body / range : 0;
    const isUpDay = close > open;
    const isVolConfirm = isUpDay ? volume > lastMarket.volume : volume < lastMarket.volume * 0.9;
    const crystalCoherence = dataIntegrity * (0.4 + (isVolConfirm ? 0.3 : 0) + bodyRatio * 0.3);
    this.cciHistory.push(crystalCoherence);
    this.schumannHistory.push(schumann);
    
    const cciStats = rollingStats(this.cciHistory, 60);
    const polarisBaseline = cciStats.avg;
    const choeranceDrift = Math.atan((crystalCoherence - polarisBaseline) / (cciStats.std + 0.01));
    const pingPong = rollingCorrelation(this.cciHistory, this.schumannHistory, 30);
    
    const stateVector = [dataIntegrity, crystalCoherence, choeranceDrift, pingPong];
    const avg = stateVector.reduce((a, b) => a + b, 0) / stateVector.length;
    const variance = stateVector.reduce((a, b) => a + (b - avg) ** 2, 0) / stateVector.length;
    const unityIndex = Math.max(0, 1 - Math.sqrt(variance));

    let inerchaVector = 0;
    if (this.lastState) {
        const lastVector = [this.lastState.dataIntegrity, this.lastState.crystalCoherence, this.lastState.choeranceDrift, this.lastState.pingPong];
        inerchaVector = Math.sqrt(stateVector.reduce((sum, val, idx) => sum + (val - lastVector[idx]) ** 2, 0));
    }
    
    let prismStatus: PrismStatus = 'Blue';
    if (dataIntegrity < 0.6 || inerchaVector > 0.5) {
        prismStatus = 'Red';
    } else if (unityIndex > 0.9 && crystalCoherence > 0.7) {
        prismStatus = 'Gold';
    }

    const newAureonPoint: AureonDataPoint = {
        time: this.time, market: this.market, sentiment: this.sentiment, policyRate: this.policyRate,
        dataIntegrity, crystalCoherence, celestialModulators: 0, polarisBaseline, choeranceDrift,
        pingPong, gravReflection: 0, unityIndex, inerchaVector, coherenceIndex: unityIndex * dataIntegrity,
        prismStatus,
    };

    // --- Generate Nexus Data ---
    const stress = 0.3 - (i / 1000) * 0.25;
    this.lastCt = 2000 + i * 15;
    const delta_kappa = -0.01 * (this.lastCt / 10000) + 0.02 * stress;
    this.lastKappa = Math.max(0.1, Math.min(3.0, this.lastKappa + delta_kappa));
    const newNexusPoint: CoherenceDataPoint = {
        time: i,
        cognitiveCapacity: 1 / this.lastKappa,
        sporeConcentration: this.lastCt,
        systemRigidity: this.lastKappa,
    };

    this.lastState = newAureonPoint;
    this.time++;
    return { aureon: newAureonPoint, nexus: newNexusPoint };
  }
}

export const connectWebSocket = (callbacks: WebSocketCallbacks) => {
  const streamer = new AureonDataStreamer();
  
  // Simulate async connection
  setTimeout(() => {
    callbacks.onOpen();
  }, 500);

  const intervalId = setInterval(() => {
    try {
      const dataPoint = streamer.getNextPoint();
      callbacks.onMessage(dataPoint);
    } catch (error) {
      callbacks.onError(error as Error);
      clearInterval(intervalId);
    }
  }, DATA_INTERVAL_MS);

  return {
    close: () => {
      clearInterval(intervalId);
      callbacks.onClose();
    }
  };
};


// Helper functions
const rollingStats = (data: number[], window: number) => {
    if (data.length === 0) return { avg: 0, std: 0 };
    const slice = data.length > window ? data.slice(-window) : data;
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const std = Math.sqrt(slice.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / slice.length);
    return { avg, std };
};

const rollingCorrelation = (x: number[], y: number[], window: number): number => {
    if (x.length < 2) return 0;
    const sx = x.length > window ? x.slice(-window) : x;
    const sy = y.length > window ? y.slice(-window) : y;
    const len = Math.min(sx.length, sy.length);
    if (len < 2) return 0;

    const meanX = sx.reduce((a, b) => a + b, 0) / len;
    const meanY = sy.reduce((a, b) => a + b, 0) / len;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < len; i++) {
        num += (sx[i] - meanX) * (sy[i] - meanY);
        denX += (sx[i] - meanX) ** 2;
        denY += (sy[i] - meanY) ** 2;
    }
    return denX === 0 || denY === 0 ? 0 : num / Math.sqrt(denX * denY);
};
