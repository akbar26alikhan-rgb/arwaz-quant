export type MarketCategory = 'indian_stock' | 'crypto' | 'forex' | 'others';

export type MarketSymbol = string;

export type Timeframe = '15m' | '1h' | '4h' | '1D';

export type BrokerName =
  | 'Zerodha Kite'
  | 'Dhan'
  | 'MetaTrader 5'
  | 'Binance'
  | 'Interactive Brokers';

export type ActiveTab =
  | 'overview'
  | 'pipeline'
  | 'agent'
  | 'backtest'
  | 'improve';

export interface MarketMeta {
  symbol: MarketSymbol;
  label: string;
  category: MarketCategory;
  exchange: string;
  assetClass:
    | 'Indian Equities'
    | 'Crypto'
    | 'Forex'
    | 'Commodities'
    | 'US Equities'
    | 'Indices';
  defaultBroker: BrokerName;
  currency: string;
  decimals: number;
  basePrice: number;
  lotUnit: string;
  defaultQty: number;
}

export interface BhavcopyRow {
  symbol: string;
  name: string;
  series: string;
  isin: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  last: number;
  prevClose: number;
  changePct: number;
  volume: number;
  turnover: number;
  trades: number;
}

export interface Candle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EngineeredRow extends Candle {
  maFast: number | null;
  maSlow: number | null;
  rsi: number | null;
  atr: number | null;
  adx: number | null;
  regime: 'Trending' | 'Sideways' | 'High Volatility';
}

export interface CleaningConfig {
  dropMissing: boolean;
  filterZeroVolume: boolean;
  alignTimestamps: boolean;
  removeOutliers: boolean;
}

export interface FeatureConfig {
  fastMa: number;
  slowMa: number;
  rsiLength: number;
  atrLength: number;
}

export interface SignalChecklistItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface TradeSignal {
  id: string;
  symbol: MarketSymbol;
  timeframe: Timeframe;
  action: 'BUY' | 'SELL' | 'HOLD';
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  positionSizePct: number;
  positionQty: number;
  riskReward: number;
  confidence: number;
  reasoning: string;
  checklist: SignalChecklistItem[];
  createdAt: string;
  source: 'AI Agent' | 'Strategy Engine';
}

export interface RiskSettings {
  accountCapital: number;
  maxRiskPerTradePct: number;
  maxPortfolioExposurePct: number;
  blockHighVolatility: boolean;
  requireNewsClear: boolean;
  enforceCorrelationCheck: boolean;
  newsEventActive: boolean;
}

export interface RiskCheckResult {
  id: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface OpenPosition {
  id: string;
  symbol: MarketSymbol;
  side: 'BUY' | 'SELL';
  broker: BrokerName;
  qty: number;
  entryPrice: number;
  ltp: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target1Hit?: boolean;
  openedAt: string;
  orderStatus: 'Filled' | 'Partial' | 'Sent';
  strategyVersion: string;
}

export interface ClosedTradeLog {
  id: string;
  symbol: MarketSymbol;
  side: 'BUY' | 'SELL';
  broker: BrokerName;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  target1?: number;
  target2?: number;
  pnl: number;
  pnlPct: number;
  entryHour: number;
  adx: number;
  volatilityRatio: number;
  regime: 'Trending' | 'Sideways' | 'High Volatility';
  strategyVersion: string;
  closedAt: string;
  exitReason:
    | 'Target 1 Hit'
    | 'Target 2 Hit'
    | 'Target Hit'
    | 'Stop Loss'
    | 'Manual Close'
    | 'Trailing Stop';
}

export interface BacktestConfig {
  fastMa: number;
  slowMa: number;
  rsiBuyMax: number;
  adxMin: number;
  atrStopMult: number;
  feesRate: number;
  slippageRate: number;
  initialCapital: number;
  avoidChopHours: boolean;
}

export interface EquityPoint {
  label: string;
  strategy: number;
  benchmark: number;
  drawdownPct: number;
}

export interface BacktestSummaryMetrics {
  totalReturnPct: number;
  benchmarkReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  winRatePct: number;
  totalTrades: number;
  profitFactor: number;
}

export interface SensitivityCell {
  fastMa: number;
  slowMa: number;
  sharpe: number;
  returnPct: number;
}

export interface CrossMarketResult {
  marketLabel: string;
  symbol: MarketSymbol;
  strategyReturnPct: number;
  buyHoldReturnPct: number;
}

export interface ValidationCheckItem {
  id: string;
  label: string;
  passed: boolean;
  value: string;
}

export interface BacktestOutput {
  inSampleMetrics: BacktestSummaryMetrics;
  outOfSampleMetrics: BacktestSummaryMetrics;
  inSampleCurve: EquityPoint[];
  outOfSampleCurve: EquityPoint[];
  heatmap: SensitivityCell[];
  monteCarloPaths: number[][];
  monteCarloMedian: number[];
  crossMarket: CrossMarketResult[];
  validationChecklist: ValidationCheckItem[];
}

export interface FailurePatterns {
  losingTradeCount: number;
  totalTradeCount: number;
  highVolRatio: number;
  meanLosingAdx: number;
  worstHourWindow: string;
  worstSymbols: string[];
  maxConsecutiveLosses: number;
  avgSlippageImpactPct: number;
}

export interface ImprovementProposal {
  proposedVersion: string;
  summary: string;
  rootCauseFindings: string[];
  proposedChanges: Array<{
    title: string;
    parameterKey: keyof BacktestConfig;
    currentValue: string;
    proposedValue: string;
    rationale: string;
  }>;
  suggestedConfigPatch: Partial<BacktestConfig>;
  safetyGateNotes: string[];
}

export interface StrategyVersion {
  version: string;
  label: string;
  status: 'Live' | 'Paper' | 'Archived';
  createdAt: string;
  sharpe: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  config: BacktestConfig;
  notes: string;
}

export type McpTransportMode = 'stdio' | 'streamable-http' | 'sse';

export interface McpToolSummary {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  mode: McpTransportMode;
  targetLabel: string;
  remoteUrl: string;
  serverName: string;
  serverVersion: string;
  toolCount: number;
  tools: McpToolSummary[];
  lastError: string | null;
  connectedAt: string | null;
}

export interface NseSnapshot {
  fetchedAt: string;
  marketStatus: Array<Record<string, unknown>>;
  indices: Array<Record<string, unknown>>;
}

export interface McpToolExecutionResult {
  ok: boolean;
  toolName: string;
  durationMs: number;
  isError: boolean;
  data: unknown;
  rawText: string;
  error?: string;
}
