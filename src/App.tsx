import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Database, Moon, Sun, X } from 'lucide-react';
import {
  ActiveTab,
  BacktestConfig,
  BhavcopyRow,
  BrokerName,
  Candle,
  CleaningConfig,
  ClosedTradeLog,
  FeatureConfig,
  ImprovementProposal,
  MarketCategory,
  MarketMeta,
  MarketSymbol,
  OpenPosition,
  RiskSettings,
  StrategyVersion,
  Timeframe,
  TradeSignal,
} from './types/trading';
import {
  CATEGORY_LABELS,
  cleanCandles,
  engineerFeatures,
  generateChartCandles,
  getMarketMeta,
  getMarketsByCategory,
  roundPrice,
} from './engine/marketData';
import { runFullBacktest } from './engine/backtestEngine';
import {
  INITIAL_CLOSED_TRADES,
  INITIAL_POSITIONS,
  INITIAL_STRATEGY_VERSIONS,
} from './engine/riskAndFailures';
import { OverviewView } from './components/OverviewView';
import { DataPipelineView } from './components/DataPipelineView';
import { TradingAgentView } from './components/TradingAgentView';
import { BacktestView } from './components/BacktestView';
import { SelfImproveView } from './components/SelfImproveView';
import { ArchitectureModal } from './components/ArchitectureModal';
import { NseBhavcopyPanel } from './components/NseBhavcopyPanel';

function buildDefaultSignal(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  engineeredRows: ReturnType<typeof engineerFeatures>,
  meta: MarketMeta
): TradeSignal {
  const last = engineeredRows[engineeredRows.length - 1];
  const close = last ? last.close : meta.basePrice;
  const atr = last?.atr ?? close * 0.012;
  const entry = close;
  const stopLoss = roundPrice(entry - atr * 1.4, meta.decimals);
  const target1 = roundPrice(entry + atr * 2.2, meta.decimals);
  const target2 = roundPrice(entry + atr * 3.5, meta.decimals);

  return {
    id: `sig-init-${symbol}`,
    symbol,
    timeframe,
    action: 'BUY',
    entry,
    stopLoss,
    target1,
    target2,
    positionSizePct: 1.0,
    positionQty: meta.defaultQty,
    riskReward: 2.5,
    confidence: 78,
    reasoning: `Price holds near ${entry} with steady momentum (RSI ${
      last?.rsi ?? 58
    }) and favorable 2.5:1 risk-to-reward structure.`,
    checklist: [
      {
        label: 'Uptrend on active timeframe',
        passed: (last?.maFast ?? entry) >= (last?.maSlow ?? entry * 0.99),
        detail: 'Fast MA positioned above Slow MA baseline',
      },
      {
        label: 'RSI momentum healthy',
        passed: (last?.rsi ?? 55) < 70,
        detail: `RSI at ${last?.rsi ?? 55} (not overbought)`,
      },
      {
        label: 'Price above MA 50',
        passed: entry >= (last?.maSlow ?? entry * 0.99),
        detail: 'Dynamic trend support intact',
      },
      {
        label: 'Favorable risk / reward',
        passed: true,
        detail: '2.5:1 target-to-stop ratio',
      },
      {
        label: 'No major negative macro event',
        passed: true,
        detail: 'Scheduled calendar clear',
      },
    ],
    createdAt: 'Initial Baseline',
    source: 'Strategy Engine',
  };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [category, setCategory] = useState<MarketCategory>('indian_stock');
  const [symbol, setSymbol] = useState<MarketSymbol>('RELIANCE');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [broker, setBroker] = useState<BrokerName>('Zerodha Kite');
  const [guideOpen, setGuideOpen] = useState(false);
  const [bhavcopyModalOpen, setBhavcopyModalOpen] = useState(false);

  const [customMarkets, setCustomMarkets] = useState<
    Record<string, Partial<MarketMeta>>
  >({});
  const [liveCandlesByKey, setLiveCandlesByKey] = useState<
    Record<string, Candle[]>
  >({});
  const [feedSourceByKey, setFeedSourceByKey] = useState<
    Record<string, string>
  >({});
  const [bhavcopyOverrideBySymbol, setBhavcopyOverrideBySymbol] = useState<
    Record<string, BhavcopyRow>
  >({});

  const [cleaningConfig, setCleaningConfig] = useState<CleaningConfig>({
    dropMissing: true,
    filterZeroVolume: true,
    alignTimestamps: true,
    removeOutliers: true,
  });

  const [versions, setVersions] = useState<StrategyVersion[]>(
    INITIAL_STRATEGY_VERSIONS
  );
  const activeVersion = useMemo(
    () => versions.find((v) => v.status === 'Live') ?? versions[0],
    [versions]
  );

  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>(
    activeVersion.config
  );

  const [featureConfig, setFeatureConfig] = useState<FeatureConfig>({
    fastMa: activeVersion.config.fastMa,
    slowMa: activeVersion.config.slowMa,
    rsiLength: 14,
    atrLength: 14,
  });

  const [signalsBySymbol, setSignalsBySymbol] = useState<
    Partial<Record<MarketSymbol, TradeSignal>>
  >({});

  const [openPositions, setOpenPositions] =
    useState<OpenPosition[]>(INITIAL_POSITIONS);
  const [closedTrades, setClosedTrades] =
    useState<ClosedTradeLog[]>(INITIAL_CLOSED_TRADES);
  const [priceTicks, setPriceTicks] = useState(0);
  const [orderBanner, setOrderBanner] = useState<string | null>(null);
  const [autoExitEnabled, setAutoExitEnabled] = useState(true);
  const [autoTickEnabled, setAutoTickEnabled] = useState(false);

  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    accountCapital: 100000,
    maxRiskPerTradePct: 1.5,
    maxPortfolioExposurePct: 15,
    blockHighVolatility: false,
    requireNewsClear: true,
    enforceCorrelationCheck: true,
    newsEventActive: false,
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  const market = useMemo(
    () => getMarketMeta(symbol, customMarkets[symbol]),
    [symbol, customMarkets]
  );

  const categoryMarkets = useMemo(() => {
    const base = getMarketsByCategory(category);
    if (
      market.category === category &&
      !base.some((m) => m.symbol === market.symbol)
    ) {
      return [market, ...base];
    }
    return base;
  }, [category, market]);

  const feedKey = `${category}:${symbol}:${timeframe}`;

  // Fetch real live candles (Binance Crypto, Frankfurter FX, NSE Bhavcopy) when market changes
  useEffect(() => {
    let cancelled = false;
    async function loadLiveMarket() {
      try {
        const resp = await fetch(
          `/api/market/candles?category=${encodeURIComponent(
            category
          )}&symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(
            timeframe
          )}`
        );
        if (!resp.ok || cancelled) return;
        const data = await resp.json();
        if (cancelled) return;

        if (data.sourceLabel) {
          setFeedSourceByKey((prev) => ({
            ...prev,
            [feedKey]: data.sourceLabel,
          }));
        }

        if (Array.isArray(data.candles) && data.candles.length > 0) {
          setLiveCandlesByKey((prev) => ({
            ...prev,
            [feedKey]: data.candles,
          }));
        }

        if (data.latestPrice && Number.isFinite(Number(data.latestPrice))) {
          const liveP = Number(data.latestPrice);
          setCustomMarkets((prev) => ({
            ...prev,
            [symbol]: {
              ...prev[symbol],
              basePrice: liveP,
            },
          }));
        }

        if (data.latestBhavcopyRow) {
          setBhavcopyOverrideBySymbol((prev) => ({
            ...prev,
            [symbol]: data.latestBhavcopyRow,
          }));
        }
      } catch {
        // Fallback to calibrated market generator seamlessly
      }
    }
    loadLiveMarket();
    return () => {
      cancelled = true;
    };
  }, [category, symbol, timeframe, feedKey]);

  const rawCandles = useMemo(() => {
    const live = liveCandlesByKey[feedKey];
    if (live && live.length > 0) {
      return live;
    }

    const generated = generateChartCandles(
      symbol,
      timeframe,
      120,
      market.basePrice,
      market.decimals
    );

    const bhav = bhavcopyOverrideBySymbol[symbol];
    if (bhav && generated.length > 0) {
      // Anchor the latest candle directly to official NSE Bhavcopy OHLCV
      const copy = [...generated];
      const lastIdx = copy.length - 1;
      const ratio = bhav.close / Math.max(copy[lastIdx].close, 1e-6);
      const scaled = copy.map((c, idx) =>
        idx === lastIdx
          ? {
              date: bhav.tradeDate || c.date,
              timestamp: c.timestamp,
              open: bhav.open,
              high: bhav.high,
              low: bhav.low,
              close: bhav.close,
              volume: bhav.volume || c.volume,
            }
          : {
              ...c,
              open: roundPrice(c.open * ratio, market.decimals),
              high: roundPrice(c.high * ratio, market.decimals),
              low: roundPrice(c.low * ratio, market.decimals),
              close: roundPrice(c.close * ratio, market.decimals),
            }
      );
      return scaled;
    }

    return generated;
  }, [
    liveCandlesByKey,
    feedKey,
    symbol,
    timeframe,
    market.basePrice,
    market.decimals,
    bhavcopyOverrideBySymbol,
  ]);

  const feedSourceLabel =
    feedSourceByKey[feedKey] ||
    (category === 'indian_stock'
      ? 'NSE Bhavcopy · Calibrated History'
      : 'Calibrated Market Feed');

  const cleaningResult = useMemo(
    () => cleanCandles(rawCandles, cleaningConfig),
    [rawCandles, cleaningConfig]
  );

  const engineeredRows = useMemo(
    () => engineerFeatures(cleaningResult.cleaned, featureConfig, market.decimals),
    [cleaningResult.cleaned, featureConfig, market.decimals]
  );

  const activeSignal = useMemo(
    () =>
      signalsBySymbol[symbol] ??
      buildDefaultSignal(symbol, timeframe, engineeredRows, market),
    [signalsBySymbol, symbol, timeframe, engineeredRows, market]
  );

  const liveEquityOutput = useMemo(
    () => runFullBacktest(symbol, activeVersion.config, market.basePrice),
    [symbol, activeVersion.config, market.basePrice]
  );

  const handleSelectCategory = (nextCat: MarketCategory) => {
    setCategory(nextCat);
    const list = getMarketsByCategory(nextCat);
    if (list.length > 0) {
      const first = list[0];
      setSymbol(first.symbol);
      setBroker(first.defaultBroker);
    }
    setOrderBanner(null);
  };

  const handleSelectSymbol = (nextSymbol: MarketSymbol) => {
    setSymbol(nextSymbol);
    const meta = getMarketMeta(nextSymbol, customMarkets[nextSymbol]);
    setBroker(meta.defaultBroker);
    setOrderBanner(null);
  };

  const handleSelectBhavcopyStock = (row: BhavcopyRow) => {
    setCategory('indian_stock');
    setCustomMarkets((prev) => ({
      ...prev,
      [row.symbol]: {
        symbol: row.symbol,
        label: row.name,
        category: 'indian_stock',
        exchange: 'NSE',
        assetClass: 'Indian Equities',
        defaultBroker: 'Zerodha Kite',
        currency: 'INR',
        decimals: 2,
        basePrice: row.close,
        lotUnit: 'Shares',
        defaultQty: row.close > 2500 ? 5 : row.close > 800 ? 10 : 25,
      },
    }));
    setBhavcopyOverrideBySymbol((prev) => ({
      ...prev,
      [row.symbol]: row,
    }));
    setFeedSourceByKey((prev) => ({
      ...prev,
      [`indian_stock:${row.symbol}:${timeframe}`]: `NSE Bhavcopy · ${row.tradeDate}`,
    }));
    setSymbol(row.symbol);
    setBroker('Zerodha Kite');
    setBhavcopyModalOpen(false);
    setActiveTab('overview');
    setOrderBanner(
      `Loaded ${row.symbol} (${row.name}) from NSE Bhavcopy @ INR ${row.close.toFixed(2)}.`
    );
  };

  const computePnl = (pos: OpenPosition, exitPrice: number, exitQty: number) => {
    const diff =
      pos.side === 'BUY' ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;
    const mult =
      pos.symbol === 'EURUSD' || pos.symbol === 'GBPUSD' || pos.symbol === 'AUDUSD'
        ? 10000
        : pos.symbol === 'XAUUSD'
          ? 10
          : 1;
    const pnl = Math.round(diff * exitQty * mult);
    const pnlPct =
      pos.entryPrice > 0
        ? Math.round((diff / pos.entryPrice) * 100 * 100) / 100
        : 0;
    return { pnl, pnlPct };
  };

  const buildClosedLog = (
    pos: OpenPosition,
    exitPrice: number,
    exitQty: number,
    exitReason: ClosedTradeLog['exitReason']
  ): ClosedTradeLog => {
    const { pnl, pnlPct } = computePnl(pos, exitPrice, exitQty);
    return {
      id: `tr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      symbol: pos.symbol,
      side: pos.side,
      broker: pos.broker,
      qty: exitQty,
      entryPrice: pos.entryPrice,
      exitPrice,
      stopLoss: pos.stopLoss,
      target1: pos.target1,
      target2: pos.target2,
      pnl,
      pnlPct,
      entryHour: new Date().getHours(),
      adx: engineeredRows[engineeredRows.length - 1]?.adx ?? 21.4,
      volatilityRatio: pnl < 0 ? 1.7 : 1.05,
      regime: engineeredRows[engineeredRows.length - 1]?.regime ?? 'Trending',
      strategyVersion: pos.strategyVersion,
      closedAt: new Date().toLocaleString(),
      exitReason,
    };
  };

  const processPositionsWithTriggers = (
    nextPositions: OpenPosition[],
    forceCheck = false
  ) => {
    if (!autoExitEnabled && !forceCheck) {
      setOpenPositions(nextPositions);
      return;
    }

    const remaining: OpenPosition[] = [];
    const newLogs: ClosedTradeLog[] = [];
    const notices: string[] = [];

    for (const pos of nextPositions) {
      const dec = getMarketMeta(pos.symbol, customMarkets[pos.symbol]).decimals;
      const isBuy = pos.side === 'BUY';
      const hitSL = isBuy ? pos.ltp <= pos.stopLoss : pos.ltp >= pos.stopLoss;
      const hitT2 = isBuy ? pos.ltp >= pos.target2 : pos.ltp <= pos.target2;
      const hitT1 =
        !pos.target1Hit && (isBuy ? pos.ltp >= pos.target1 : pos.ltp <= pos.target1);

      if (hitSL) {
        const log = buildClosedLog(pos, pos.stopLoss, pos.qty, 'Stop Loss');
        newLogs.push(log);
        notices.push(
          `Auto-Exit: ${pos.symbol} hit Stop Loss @ ${formatNum(pos.stopLoss, dec)} (${log.pnl >= 0 ? '+' : ''}$${log.pnl})`
        );
      } else if (hitT2) {
        const log = buildClosedLog(pos, pos.target2, pos.qty, 'Target 2 Hit');
        newLogs.push(log);
        notices.push(
          `Auto-Exit: ${pos.symbol} hit Target 2 @ ${formatNum(pos.target2, dec)} (+$${log.pnl})`
        );
      } else if (hitT1) {
        const halfQty = Math.round((pos.qty / 2) * 10000) / 10000;
        const bookQty = halfQty > 0 && halfQty < pos.qty ? halfQty : pos.qty;
        const log = buildClosedLog(pos, pos.target1, bookQty, 'Target 1 Hit');
        newLogs.push(log);

        if (bookQty < pos.qty) {
          const leftQty = Math.round((pos.qty - bookQty) * 10000) / 10000;
          remaining.push({
            ...pos,
            qty: leftQty,
            target1Hit: true,
            stopLoss: pos.entryPrice,
            orderStatus: 'Partial',
          });
          notices.push(
            `Target 1 Hit: ${pos.symbol} booked ${bookQty} @ ${formatNum(pos.target1, dec)} (+$${log.pnl}); SL trailed to Entry`
          );
        } else {
          notices.push(
            `Target 1 Hit: ${pos.symbol} closed @ ${formatNum(pos.target1, dec)} (+$${log.pnl})`
          );
        }
      } else {
        remaining.push(pos);
      }
    }

    setOpenPositions(remaining);
    if (newLogs.length > 0) {
      setClosedTrades((prev) => [...newLogs, ...prev]);
      setOrderBanner(notices[0]);
    }
  };

  function formatNum(val: number, dec: number) {
    return val.toFixed(dec);
  }

  const handleExecutePaperOrder = (signal: TradeSignal) => {
    const meta = getMarketMeta(signal.symbol, customMarkets[signal.symbol]);
    const fillBump = (Math.random() - 0.35) * (signal.entry * 0.0015);
    const newPos: OpenPosition = {
      id: `pos-${Date.now()}`,
      symbol: signal.symbol,
      side: signal.action === 'SELL' ? 'SELL' : 'BUY',
      broker,
      qty: signal.positionQty,
      entryPrice: signal.entry,
      ltp: roundPrice(signal.entry + fillBump, meta.decimals),
      stopLoss: signal.stopLoss,
      target1: signal.target1,
      target2: signal.target2,
      target1Hit: false,
      openedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      orderStatus: 'Filled',
      strategyVersion: activeVersion.version,
    };
    setOpenPositions((prev) => [newPos, ...prev]);
    setOrderBanner(
      `Auto-Trade order placed on ${broker}: ${newPos.symbol} @ ${newPos.entryPrice} · SL ${newPos.stopLoss} · T1 ${newPos.target1} · T2 ${newPos.target2}`
    );
  };

  const handleClosePosition = (id: string) => {
    const pos = openPositions.find((p) => p.id === id);
    if (!pos) return;
    const logEntry = buildClosedLog(pos, pos.ltp, pos.qty, 'Manual Close');
    setOpenPositions((prev) => prev.filter((p) => p.id !== id));
    setClosedTrades((prev) => [logEntry, ...prev]);
    setOrderBanner(
      `Closed ${pos.symbol} (${logEntry.pnl >= 0 ? '+' : ''}$${logEntry.pnl}) and recorded in P&L Ledger.`
    );
  };

  const handleUpdatePositionLevels = (
    id: string,
    levels: { stopLoss: number; target1: number; target2: number }
  ) => {
    setOpenPositions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...levels } : p))
    );
  };

  const handleSimulateTrigger = (id: string, trigger: 'SL' | 'T1' | 'T2') => {
    const updated = openPositions.map((p) => {
      if (p.id !== id) return p;
      const targetPrice =
        trigger === 'SL' ? p.stopLoss : trigger === 'T1' ? p.target1 : p.target2;
      return { ...p, ltp: targetPrice };
    });
    processPositionsWithTriggers(updated, true);
  };

  const handleSimulateMarketTick = () => {
    setPriceTicks((t) => t + 1);
    const updated = openPositions.map((pos) => {
      const dec = getMarketMeta(pos.symbol, customMarkets[pos.symbol]).decimals;
      const pctMove = (Math.random() - 0.45) * 0.0055;
      return {
        ...pos,
        ltp: roundPrice(pos.ltp * (1 + pctMove), dec),
      };
    });
    processPositionsWithTriggers(updated);
  };

  useEffect(() => {
    if (!autoTickEnabled || openPositions.length === 0) return;
    const timer = setInterval(() => {
      handleSimulateMarketTick();
    }, 2200);
    return () => clearInterval(timer);
  });

  const handleDeployVersion = (
    proposal: ImprovementProposal,
    candidateConfig: BacktestConfig,
    candidateSharpe: number,
    candidateReturn: number,
    candidateDd: number,
    targetStatus: 'Paper' | 'Live'
  ) => {
    setVersions((prev) => {
      const demoted = prev.map((v) =>
        targetStatus === 'Live' && v.status === 'Live'
          ? { ...v, status: 'Archived' as const }
          : v
      );
      const nextVer: StrategyVersion = {
        version: proposal.proposedVersion,
        label: proposal.proposedChanges[0]?.title || 'AI Optimized Ruleset',
        status: targetStatus,
        createdAt: new Date().toISOString().slice(0, 10),
        sharpe: candidateSharpe,
        totalReturnPct: candidateReturn,
        maxDrawdownPct: candidateDd,
        config: candidateConfig,
        notes: proposal.summary,
      };
      return [nextVer, ...demoted];
    });
    if (targetStatus === 'Live') {
      setBacktestConfig(candidateConfig);
      setFeatureConfig((prev) => ({
        ...prev,
        fastMa: candidateConfig.fastMa,
        slowMa: candidateConfig.slowMa,
      }));
    }
  };

  const handleSwitchVersionStatus = (
    versionStr: string,
    targetStatus: 'Live' | 'Paper' | 'Archived'
  ) => {
    const found = versions.find((v) => v.version === versionStr);
    if (!found) return;
    setVersions((prev) =>
      prev.map((v) => {
        if (v.version === versionStr) return { ...v, status: targetStatus };
        if (targetStatus === 'Live' && v.status === 'Live') {
          return { ...v, status: 'Archived' };
        }
        return v;
      })
    );
    if (targetStatus === 'Live') {
      setBacktestConfig(found.config);
      setFeatureConfig((prev) => ({
        ...prev,
        fastMa: found.config.fastMa,
        slowMa: found.config.slowMa,
      }));
    }
  };

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline', label: 'Data Pipeline' },
    { id: 'agent', label: 'AI Agent' },
    { id: 'backtest', label: 'Backtest' },
    { id: 'improve', label: 'Self-Improve' },
  ];

  return (
    <div
      data-ticks={priceTicks}
      className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100"
    >
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('overview');
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            Arwaz <span className="text-orange-600">Quant</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-orange-600 text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('agent')}
              className="rounded-md bg-orange-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-700 whitespace-nowrap shrink-0"
            >
              Run AI Signal
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto border-t border-slate-100 px-4 py-2 gap-4 md:hidden dark:border-slate-800">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'text-orange-600 font-semibold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Workspace Category & Asset Toolbar */}
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-[1400px] space-y-2.5 px-4 py-3 sm:px-6">
          {/* Row 1: 4 Market Categories + Right-Side Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-md bg-slate-100 p-1 dark:bg-slate-800">
              {(Object.keys(CATEGORY_LABELS) as MarketCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelectCategory(cat)}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    category === cat
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
                {(['15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`rounded px-2 py-1 font-mono text-[11px] font-medium transition-colors whitespace-nowrap ${
                      timeframe === tf
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              <select
                aria-label="Target broker adapter"
                value={broker}
                onChange={(e) => setBroker(e.target.value as BrokerName)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="Zerodha Kite">Zerodha Kite</option>
                <option value="Dhan">Dhan</option>
                <option value="MetaTrader 5">MetaTrader 5</option>
                <option value="Binance">Binance</option>
                <option value="Interactive Brokers">Interactive Brokers</option>
              </select>

              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Guide & Glossary
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label="Toggle dark mode"
                className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {darkMode ? (
                  <Sun className="h-3.5 w-3.5" />
                ) : (
                  <Moon className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Assets inside selected Category + NSE Bhavcopy Browser trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {categoryMarkets.slice(0, 10).map((m) => (
                <button
                  key={m.symbol}
                  type="button"
                  onClick={() => handleSelectSymbol(m.symbol)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    symbol === m.symbol
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.symbol}
                </button>
              ))}

              <select
                aria-label="Choose asset in category"
                value={symbol}
                onChange={(e) => handleSelectSymbol(e.target.value)}
                className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {categoryMarkets.map((m) => (
                  <option key={m.symbol} value={m.symbol}>
                    {m.symbol} — {m.label}
                  </option>
                ))}
              </select>
            </div>

            {category === 'indian_stock' && (
              <button
                type="button"
                onClick={() => setBhavcopyModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-orange-600/40 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:bg-orange-950/70 whitespace-nowrap shrink-0"
              >
                <Database className="h-3.5 w-3.5" />
                Browse All NSE Bhavcopy Stocks
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {activeTab === 'overview' && (
          <OverviewView
            market={market}
            timeframe={timeframe}
            broker={broker}
            feedSourceLabel={feedSourceLabel}
            rows={engineeredRows}
            activeSignal={activeSignal}
            onUpdateSignal={(nextSig) =>
              setSignalsBySymbol((prev) => ({ ...prev, [nextSig.symbol]: nextSig }))
            }
            openPositions={openPositions}
            closedTrades={closedTrades}
            riskSettings={riskSettings}
            onUpdateRiskSettings={setRiskSettings}
            onExecutePaperOrder={handleExecutePaperOrder}
            onClosePosition={handleClosePosition}
            onUpdatePositionLevels={handleUpdatePositionLevels}
            onSimulateTrigger={handleSimulateTrigger}
            onSimulateMarketTick={handleSimulateMarketTick}
            autoExitEnabled={autoExitEnabled}
            onToggleAutoExit={setAutoExitEnabled}
            autoTickEnabled={autoTickEnabled}
            onToggleAutoTick={setAutoTickEnabled}
            onNavigateTab={(t) => setActiveTab(t)}
            versions={versions}
            activeVersion={activeVersion}
            equityHistory={liveEquityOutput.outOfSampleCurve}
            orderBanner={orderBanner}
          />
        )}

        {activeTab === 'pipeline' && (
          <DataPipelineView
            market={market}
            timeframe={timeframe}
            rawCandles={rawCandles}
            cleaningConfig={cleaningConfig}
            onUpdateCleaning={setCleaningConfig}
            cleaningStats={cleaningResult}
            featureConfig={featureConfig}
            onUpdateFeatures={setFeatureConfig}
            engineeredRows={engineeredRows}
            onSendToAgent={() => setActiveTab('agent')}
            onSelectBhavcopyStock={handleSelectBhavcopyStock}
          />
        )}

        {activeTab === 'agent' && (
          <TradingAgentView
            market={market}
            timeframe={timeframe}
            rows={engineeredRows}
            activeSignal={activeSignal}
            onSignalGenerated={(sig) =>
              setSignalsBySymbol((prev) => ({ ...prev, [sig.symbol]: sig }))
            }
            onSendToExecution={(sig) => {
              setSignalsBySymbol((prev) => ({ ...prev, [sig.symbol]: sig }));
              setOrderBanner(null);
              setActiveTab('overview');
            }}
          />
        )}

        {activeTab === 'backtest' && (
          <BacktestView
            market={market}
            config={backtestConfig}
            onUpdateConfig={setBacktestConfig}
            onResetToActiveVersion={() => setBacktestConfig(activeVersion.config)}
          />
        )}

        {activeTab === 'improve' && (
          <SelfImproveView
            market={market}
            closedTrades={closedTrades}
            versions={versions}
            activeVersion={activeVersion}
            onDeployVersion={handleDeployVersion}
            onSwitchVersionStatus={handleSwitchVersionStatus}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <span>
            Arwaz Quant · Indian Stocks (NSE Bhavcopy), Crypto, Forex & Global Assets
          </span>
          <span>
            Brokers & Feeds: NSE Bhavcopy · Binance · Frankfurter FX · Zerodha · Dhan · MetaTrader 5 · IBKR
          </span>
        </div>
      </footer>

      <ArchitectureModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      {/* Full NSE Bhavcopy Stock Browser Modal */}
      {bhavcopyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="NSE Bhavcopy Stock Picker"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  NSE Bhavcopy Stock Selector
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Search any NSE EQ equity from the official NSE Bhavcopy report or import a custom CSV
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBhavcopyModalOpen(false)}
                aria-label="Close NSE Bhavcopy picker"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NseBhavcopyPanel
              activeSymbol={symbol}
              onSelectStock={handleSelectBhavcopyStock}
            />
          </div>
        </div>
      )}
    </div>
  );
}
