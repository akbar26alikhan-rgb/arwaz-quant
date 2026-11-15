import {
  ClosedTradeLog,
  EngineeredRow,
  FailurePatterns,
  OpenPosition,
  RiskCheckResult,
  RiskSettings,
  StrategyVersion,
  TradeSignal,
} from '../types/trading';

export const INITIAL_POSITIONS: OpenPosition[] = [
  {
    id: 'pos-1',
    symbol: 'NIFTY50',
    side: 'BUY',
    broker: 'Zerodha Kite',
    qty: 1,
    entryPrice: 22350,
    ltp: 22420,
    stopLoss: 22180,
    target: 22600,
    openedAt: '2026-11-15 10:15',
    orderStatus: 'Filled',
    strategyVersion: 'v2.1',
  },
  {
    id: 'pos-2',
    symbol: 'XAUUSD',
    side: 'BUY',
    broker: 'MetaTrader 5',
    qty: 0.1,
    entryPrice: 2650,
    ltp: 2658,
    stopLoss: 2634,
    target: 2685,
    openedAt: '2026-11-15 08:40',
    orderStatus: 'Filled',
    strategyVersion: 'v2.1',
  },
  {
    id: 'pos-3',
    symbol: 'EURUSD',
    side: 'BUY',
    broker: 'MetaTrader 5',
    qty: 0.5,
    entryPrice: 1.0845,
    ltp: 1.0861,
    stopLoss: 1.0812,
    target: 1.091,
    openedAt: '2026-11-14 19:20',
    orderStatus: 'Filled',
    strategyVersion: 'v2.1',
  },
];

export const INITIAL_CLOSED_TRADES: ClosedTradeLog[] = [
  {
    id: 'tr-101',
    symbol: 'XAUUSD',
    side: 'BUY',
    broker: 'MetaTrader 5',
    qty: 0.2,
    entryPrice: 2642,
    exitPrice: 2619,
    pnl: -460,
    pnlPct: -0.87,
    entryHour: 14,
    adx: 11.8,
    volatilityRatio: 1.9,
    regime: 'High Volatility',
    strategyVersion: 'v2.0',
    closedAt: '2026-11-10 14:45',
    exitReason: 'Stop Loss',
  },
  {
    id: 'tr-102',
    symbol: 'NIFTY50',
    side: 'BUY',
    broker: 'Zerodha Kite',
    qty: 2,
    entryPrice: 22180,
    exitPrice: 22055,
    pnl: -250,
    pnlPct: -0.56,
    entryHour: 13,
    adx: 13.1,
    volatilityRatio: 1.7,
    regime: 'Sideways',
    strategyVersion: 'v2.0',
    closedAt: '2026-11-11 13:30',
    exitReason: 'Stop Loss',
  },
  {
    id: 'tr-103',
    symbol: 'XAUUSD',
    side: 'SELL',
    broker: 'MetaTrader 5',
    qty: 0.15,
    entryPrice: 2628,
    exitPrice: 2649,
    pnl: -315,
    pnlPct: -0.8,
    entryHour: 14,
    adx: 12.2,
    volatilityRatio: 1.85,
    regime: 'High Volatility',
    strategyVersion: 'v2.0',
    closedAt: '2026-11-11 15:05',
    exitReason: 'Stop Loss',
  },
  {
    id: 'tr-104',
    symbol: 'NIFTY50',
    side: 'BUY',
    broker: 'Zerodha Kite',
    qty: 1,
    entryPrice: 22120,
    exitPrice: 22010,
    pnl: -110,
    pnlPct: -0.5,
    entryHour: 13,
    adx: 12.5,
    volatilityRatio: 1.75,
    regime: 'Sideways',
    strategyVersion: 'v2.0',
    closedAt: '2026-11-12 13:50',
    exitReason: 'Stop Loss',
  },
  {
    id: 'tr-105',
    symbol: 'BTCUSDT',
    side: 'BUY',
    broker: 'Binance',
    qty: 0.02,
    entryPrice: 65200,
    exitPrice: 67850,
    pnl: 530,
    pnlPct: 4.06,
    entryHour: 10,
    adx: 28.4,
    volatilityRatio: 1.1,
    regime: 'Trending',
    strategyVersion: 'v2.1',
    closedAt: '2026-11-13 11:20',
    exitReason: 'Target Hit',
  },
  {
    id: 'tr-106',
    symbol: 'AAPL',
    side: 'BUY',
    broker: 'Interactive Brokers',
    qty: 15,
    entryPrice: 221.5,
    exitPrice: 227.9,
    pnl: 96,
    pnlPct: 2.89,
    entryHour: 10,
    adx: 24.6,
    volatilityRatio: 0.95,
    regime: 'Trending',
    strategyVersion: 'v2.1',
    closedAt: '2026-11-13 16:00',
    exitReason: 'Target Hit',
  },
  {
    id: 'tr-107',
    symbol: 'EURUSD',
    side: 'BUY',
    broker: 'MetaTrader 5',
    qty: 0.5,
    entryPrice: 1.0785,
    exitPrice: 1.0842,
    pnl: 285,
    pnlPct: 0.53,
    entryHour: 9,
    adx: 22.9,
    volatilityRatio: 1.05,
    regime: 'Trending',
    strategyVersion: 'v2.1',
    closedAt: '2026-11-14 11:45',
    exitReason: 'Trailing Stop',
  },
  {
    id: 'tr-108',
    symbol: 'BANKNIFTY',
    side: 'BUY',
    broker: 'Dhan',
    qty: 1,
    entryPrice: 49520,
    exitPrice: 49340,
    pnl: -180,
    pnlPct: -0.36,
    entryHour: 14,
    adx: 14.0,
    volatilityRatio: 1.65,
    regime: 'High Volatility',
    strategyVersion: 'v2.1',
    closedAt: '2026-11-14 14:35',
    exitReason: 'Stop Loss',
  },
];

export const INITIAL_STRATEGY_VERSIONS: StrategyVersion[] = [
  {
    version: 'v2.1',
    label: 'Volatility Filter + ATR Trailing',
    status: 'Live',
    createdAt: '2026-11-12',
    sharpe: 1.42,
    totalReturnPct: 28.6,
    maxDrawdownPct: -12.1,
    config: {
      fastMa: 20,
      slowMa: 50,
      rsiBuyMax: 68,
      adxMin: 20,
      atrStopMult: 1.8,
      feesRate: 0.0003,
      slippageRate: 0.0005,
      initialCapital: 100000,
      avoidChopHours: true,
    },
    notes: 'Added ADX > 20 regime filter and ATR-scaled position sizing.',
  },
  {
    version: 'v2.0',
    label: 'Trend Parameters Baseline',
    status: 'Paper',
    createdAt: '2026-10-28',
    sharpe: 1.18,
    totalReturnPct: 21.4,
    maxDrawdownPct: -14.8,
    config: {
      fastMa: 20,
      slowMa: 50,
      rsiBuyMax: 72,
      adxMin: 15,
      atrStopMult: 1.5,
      feesRate: 0.0003,
      slippageRate: 0.0005,
      initialCapital: 100000,
      avoidChopHours: false,
    },
    notes: 'MA 20/50 trend following with RSI confirmation.',
  },
  {
    version: 'v1.3',
    label: 'Risk Management Update',
    status: 'Archived',
    createdAt: '2026-09-14',
    sharpe: 0.96,
    totalReturnPct: 16.2,
    maxDrawdownPct: -16.4,
    config: {
      fastMa: 15,
      slowMa: 45,
      rsiBuyMax: 75,
      adxMin: 12,
      atrStopMult: 1.3,
      feesRate: 0.0003,
      slippageRate: 0.0005,
      initialCapital: 100000,
      avoidChopHours: false,
    },
    notes: 'Added hard 1% risk-per-trade portfolio cap.',
  },
  {
    version: 'v1.2',
    label: 'Initial Entry Logic',
    status: 'Archived',
    createdAt: '2026-08-03',
    sharpe: 0.82,
    totalReturnPct: 12.4,
    maxDrawdownPct: -18.2,
    config: {
      fastMa: 12,
      slowMa: 35,
      rsiBuyMax: 78,
      adxMin: 10,
      atrStopMult: 1.2,
      feesRate: 0.0003,
      slippageRate: 0.0005,
      initialCapital: 100000,
      avoidChopHours: false,
    },
    notes: 'Basic crossover without volatility or chop-hour filtering.',
  },
];

export function evaluateRiskGate(
  signal: TradeSignal,
  settings: RiskSettings,
  openPositions: OpenPosition[],
  latestBar?: EngineeredRow
): RiskCheckResult[] {
  const sameSymbolOpen = openPositions.some((p) => p.symbol === signal.symbol);
  const currentExposurePct = openPositions.length * 3.2;
  const projectedExposurePct = currentExposurePct + signal.positionSizePct * 2.5;
  const isHighVol = latestBar?.regime === 'High Volatility';

  return [
    {
      id: 'pos-size',
      name: 'Position size calculation',
      passed: signal.positionSizePct > 0 && signal.positionSizePct <= 2.5,
      detail: `${signal.positionSizePct}% equity risk (${signal.positionQty} units)`,
    },
    {
      id: 'max-risk',
      name: 'Max risk per trade',
      passed: signal.positionSizePct <= settings.maxRiskPerTradePct,
      detail: `${signal.positionSizePct}% vs ${settings.maxRiskPerTradePct}% cap`,
    },
    {
      id: 'exposure',
      name: 'Portfolio exposure limit',
      passed: projectedExposurePct <= settings.maxPortfolioExposurePct,
      detail: `${projectedExposurePct.toFixed(1)}% vs ${settings.maxPortfolioExposurePct}% max`,
    },
    {
      id: 'correlation',
      name: 'Correlation & duplicate check',
      passed: !settings.enforceCorrelationCheck || !sameSymbolOpen,
      detail: sameSymbolOpen
        ? `Existing ${signal.symbol} exposure active`
        : 'No duplicate symbol overlap',
    },
    {
      id: 'news',
      name: 'News & macro event filter',
      passed: !settings.requireNewsClear || !settings.newsEventActive,
      detail: settings.newsEventActive
        ? 'High-impact macro event window active'
        : 'Calendar clear',
    },
    {
      id: 'volatility',
      name: 'Volatility regime check',
      passed: !settings.blockHighVolatility || !isHighVol,
      detail: isHighVol
        ? 'High Volatility regime flagged'
        : `${latestBar?.regime ?? 'Trending'} (ATR nominal)`,
    },
  ];
}

export function analyzeTradeFailures(trades: ClosedTradeLog[]): FailurePatterns {
  const losing = trades.filter((t) => t.pnl < 0);
  const winning = trades.filter((t) => t.pnl >= 0);

  const avgLossVol =
    losing.reduce((acc, t) => acc + t.volatilityRatio, 0) /
    Math.max(1, losing.length);
  const avgWinVol =
    winning.reduce((acc, t) => acc + t.volatilityRatio, 0) /
    Math.max(1, winning.length);
  const highVolRatio =
    avgWinVol > 0 ? Math.round((avgLossVol / avgWinVol) * 10) / 10 : 1.8;

  const meanLosingAdx =
    Math.round(
      (losing.reduce((acc, t) => acc + t.adx, 0) / Math.max(1, losing.length)) *
        10
    ) / 10;

  // Find peak losing hour bucket
  const hourCounts: Record<number, number> = {};
  for (const t of losing) {
    hourCounts[t.entryHour] = (hourCounts[t.entryHour] ?? 0) + 1;
  }
  const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
  const topHour = sortedHours.length > 0 ? Number(sortedHours[0][0]) : 13;
  const endHour = Math.min(23, topHour + 2);
  const worstHourWindow = `${String(topHour).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`;

  const symbolCounts: Record<string, number> = {};
  for (const t of losing) {
    symbolCounts[t.symbol] = (symbolCounts[t.symbol] ?? 0) + 1;
  }
  const worstSymbols = Object.entries(symbolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map((e) => e[0]);

  let streak = 0;
  let maxConsecutiveLosses = 0;
  for (const t of trades) {
    if (t.pnl < 0) {
      streak++;
      if (streak > maxConsecutiveLosses) maxConsecutiveLosses = streak;
    } else {
      streak = 0;
    }
  }

  return {
    losingTradeCount: losing.length,
    totalTradeCount: trades.length,
    highVolRatio,
    meanLosingAdx,
    worstHourWindow,
    worstSymbols: worstSymbols.length > 0 ? worstSymbols : ['XAUUSD', 'NIFTY50'],
    maxConsecutiveLosses,
    avgSlippageImpactPct: 0.08,
  };
}
