// ─── MigiSignals Type Definitions ───

export interface TickData {
  epoch: number;
  quote: number;
  symbol: string;
  lastDigit: number;
  isEven: boolean;
}

export type SignalType = 'EVEN' | 'ODD' | 'NO_SIGNAL';
export type TradeResult = 'WIN' | 'LOSS' | 'PENDING';
export type MomentumDirection = 'RISING' | 'FALLING' | 'NEUTRAL';
export type BotStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'ERROR';

export interface FrequencyData {
  evenPercent: number;
  oddPercent: number;
  digitCounts: number[];
  totalTicks: number;
  lastNDigits: number[];
}

export interface MomentumData {
  sma5: number;
  previousSma5: number;
  direction: MomentumDirection;
  trendStrength: number;
}

export interface AnalysisResult {
  signal: SignalType;
  confidence: number;
  frequency: FrequencyData;
  momentum: MomentumData;
  timestamp: number;
  tickValue: number;
  lastDigit: number;
  reasoning: string;
}

export interface TradeExecution {
  id: string;
  signal: SignalType;
  stake: number;
  confidence: number;
  tickValue: number;
  lastDigit: number;
  result: TradeResult;
  payout: number;
  profitLoss: number;
  cumulativePL: number;
  isSimulated: boolean;
  timestamp: number;
}

export interface RiskState {
  currentStake: number;
  baseStake: number;
  consecutiveLosses: number;
  cumulativePL: number;
  totalTrades: number;
  wins: number;
  losses: number;
  targetProfit: number;
  stopLoss: number;
  maxConsecutiveLosses: number;
  shouldStop: boolean;
  stopReason: string | null;
}

export interface BotConfig {
  derivApiToken: string;
  derivAppId: string;
  symbol: string;
  wsPort: number;
  baseStake: number;
  targetProfit: number;
  stopLoss: number;
  maxConsecutiveLosses: number;
  simulatorMode: boolean;
}

// WebSocket message types (backend → frontend)
export interface WSMessage {
  type: 'tick' | 'analysis' | 'trade' | 'status' | 'risk' | 'error' | 'config';
  data: any;
  timestamp: number;
}
