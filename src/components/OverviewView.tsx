import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  BrokerName,
  ClosedTradeLog,
  EngineeredRow,
  MarketMeta,
  OpenPosition,
  RiskSettings,
  StrategyVersion,
  Timeframe,
  TradeSignal,
} from '../types/trading';
import { formatPrice, getMarketMeta } from '../engine/marketData';
import { evaluateRiskGate } from '../engine/riskAndFailures';
import { CandlestickChart, DualEquityChart } from './Charts';

interface OverviewViewProps {
  market: MarketMeta;
  timeframe: Timeframe;
  broker: BrokerName;
  feedSourceLabel: string;
  rows: EngineeredRow[];
  activeSignal: TradeSignal;
  onUpdateSignal: (next: TradeSignal) => void;
  openPositions: OpenPosition[];
  closedTrades: ClosedTradeLog[];
  riskSettings: RiskSettings;
  onUpdateRiskSettings: (next: RiskSettings) => void;
  onExecutePaperOrder: (signal: TradeSignal) => void;
  onClosePosition: (id: string) => void;
  onUpdatePositionLevels: (
    id: string,
    levels: { stopLoss: number; target1: number; target2: number }
  ) => void;
  onSimulateTrigger: (id: string, trigger: 'SL' | 'T1' | 'T2') => void;
  onSimulateMarketTick: () => void;
  onSyncLiveFeed: () => void;
  syncingLiveFeed: boolean;
  autoExitEnabled: boolean;
  onToggleAutoExit: (next: boolean) => void;
  autoTickEnabled: boolean;
  onToggleAutoTick: (next: boolean) => void;
  onNavigateTab: (tab: 'agent' | 'backtest' | 'improve') => void;
  versions: StrategyVersion[];
  activeVersion: StrategyVersion;
  equityHistory: Array<{
    label: string;
    strategy: number;
    benchmark: number;
    drawdownPct: number;
  }>;
  orderBanner: string | null;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  market,
  timeframe,
  broker,
  feedSourceLabel,
  rows,
  activeSignal,
  onUpdateSignal,
  openPositions,
  closedTrades,
  riskSettings,
  onUpdateRiskSettings,
  onExecutePaperOrder,
  onClosePosition,
  onSimulateTrigger,
  onSimulateMarketTick,
  onSyncLiveFeed,
  syncingLiveFeed,
  autoExitEnabled,
  onToggleAutoExit,
  autoTickEnabled,
  onToggleAutoTick,
  onNavigateTab,
  versions,
  activeVersion,
  equityHistory,
  orderBanner,
}) => {
  const [showMaFast, setShowMaFast] = useState(true);
  const [showMaSlow, setShowMaSlow] = useState(true);
  const [eqRange, setEqRange] = useState<'1M' | '3M' | '6M' | 'All'>('6M');
  const [ledgerFilter, setLedgerFilter] = useState<
    'all' | 'targets' | 'sl' | 'manual'
  >('all');

  const latestBar = rows[rows.length - 1];
  const riskChecks = useMemo(
    () => evaluateRiskGate(activeSignal, riskSettings, openPositions, latestBar),
    [activeSignal, riskSettings, openPositions, latestBar]
  );
  const allRiskPassed = riskChecks.every((c) => c.passed);

  const totalOpenPnl = useMemo(() => {
    return openPositions.reduce((sum, pos) => {
      const diff =
        pos.side === 'BUY' ? pos.ltp - pos.entryPrice : pos.entryPrice - pos.ltp;
      const mult =
        pos.symbol === 'EURUSD' || pos.symbol === 'GBPUSD' || pos.symbol === 'AUDUSD'
          ? 10000
          : pos.symbol === 'XAUUSD'
            ? 10
            : 1;
      return sum + diff * pos.qty * mult;
    }, 0);
  }, [openPositions]);

  const ledgerSummary = useMemo(() => {
    const netPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const grossProfit = closedTrades
      .filter((t) => t.pnl > 0)
      .reduce((s, t) => s + t.pnl, 0);
    const grossLoss = closedTrades
      .filter((t) => t.pnl < 0)
      .reduce((s, t) => s + t.pnl, 0);
    const wins = closedTrades.filter((t) => t.pnl > 0).length;
    const winRate =
      closedTrades.length > 0
        ? Math.round((wins / closedTrades.length) * 1000) / 10
        : 0;
    return { netPnl, grossProfit, grossLoss, wins, winRate };
  }, [closedTrades]);

  const filteredLedger = useMemo(() => {
    if (ledgerFilter === 'targets') {
      return closedTrades.filter((t) => t.exitReason.includes('Target'));
    }
    if (ledgerFilter === 'sl') {
      return closedTrades.filter((t) => t.exitReason === 'Stop Loss');
    }
    if (ledgerFilter === 'manual') {
      return closedTrades.filter(
        (t) =>
          t.exitReason === 'Manual Close' || t.exitReason === 'Trailing Stop'
      );
    }
    return closedTrades;
  }, [closedTrades, ledgerFilter]);

  const filteredEquity = useMemo(() => {
    if (eqRange === '1M') return equityHistory.slice(-8);
    if (eqRange === '3M') return equityHistory.slice(-16);
    if (eqRange === '6M') return equityHistory.slice(-26);
    return equityHistory;
  }, [equityHistory, eqRange]);

  const updateSignalField = (
    field: 'stopLoss' | 'target1' | 'target2' | 'positionQty',
    rawVal: string
  ) => {
    const num = Number(rawVal);
    if (!Number.isFinite(num) || num <= 0) return;
    const next = { ...activeSignal, [field]: num };
    const riskDist = Math.abs(next.entry - next.stopLoss);
    const rewardDist = Math.abs(next.target1 - next.entry);
    next.riskReward =
      riskDist > 0 ? Math.round((rewardDist / riskDist) * 10) / 10 : next.riskReward;
    onUpdateSignal(next);
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Realized P&amp;L Ledger
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                ledgerSummary.netPnl >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {ledgerSummary.netPnl >= 0 ? '+' : ''}$
              {ledgerSummary.netPnl.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {closedTrades.length} closed
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Open Paper PnL
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                totalOpenPnl >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {totalOpenPnl >= 0 ? '+' : ''}$
              {Math.round(totalOpenPnl).toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {openPositions.length} open
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Strategy Return ({activeVersion.version})
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{activeVersion.totalReturnPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Sharpe {activeVersion.sharpe.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Max Drawdown
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {activeVersion.maxDrawdownPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Win {ledgerSummary.winRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart + Auto-Trading Execution Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Candlestick Chart (8 cols) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {market.label} · {timeframe} · {market.exchange}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {feedSourceLabel} · Entry, Stop Loss, Target 1 &amp; Target 2 mapped on chart
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMaFast((v) => !v)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showMaFast
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                MA 20
              </button>
              <button
                type="button"
                onClick={() => setShowMaSlow((v) => !v)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  showMaSlow
                    ? 'border-orange-600 bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400'
                }`}
              >
                MA 50
              </button>
              <button
                type="button"
                onClick={onSyncLiveFeed}
                disabled={syncingLiveFeed}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70 whitespace-nowrap shrink-0"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncingLiveFeed ? 'animate-spin' : ''}`}
                />
                Sync Live
              </button>
              <button
                type="button"
                onClick={onSimulateMarketTick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                Tick Prices
              </button>
              <button
                type="button"
                onClick={() => onToggleAutoTick(!autoTickEnabled)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  autoTickEnabled
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {autoTickEnabled ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {autoTickEnabled ? 'Auto-Tick On' : 'Auto-Tick Off'}
              </button>
            </div>
          </div>

          <CandlestickChart
            rows={rows}
            decimals={market.decimals}
            showMaFast={showMaFast}
            showMaSlow={showMaSlow}
            signal={activeSignal.symbol === market.symbol ? activeSignal : null}
          />
        </div>

        {/* Auto-Trading Order Ticket & Risk Gate (4 cols) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Auto-Trade &amp; Risk Gate
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Broker: {broker} · Editable SL, Target 1 &amp; Target 2
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('agent')}
                className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 hover:underline dark:text-orange-400 whitespace-nowrap shrink-0"
              >
                Edit in Agent
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Editable SL / Target 1 / Target 2 */}
            <div className="space-y-2.5 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Signal · {activeSignal.symbol} ({activeSignal.action})
                </span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  R:R {activeSignal.riskReward.toFixed(1)}:1
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">
                    Entry Price
                  </label>
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 tabular-nums">
                    {formatPrice(
                      activeSignal.entry,
                      getMarketMeta(activeSignal.symbol).decimals
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-slate-500">
                    Quantity ({market.lotUnit})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={activeSignal.positionQty}
                    onChange={(e) =>
                      updateSignalField('positionQty', e.target.value)
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-red-600 dark:text-red-400">
                    Stop Loss
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={activeSignal.stopLoss}
                    onChange={(e) => updateSignalField('stopLoss', e.target.value)}
                    className="w-full rounded-md border border-red-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-red-700 focus:border-red-500 focus:outline-none dark:border-red-900/70 dark:bg-slate-950 dark:text-red-400 tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-emerald-600 dark:text-emerald-400">
                    Target 1 (50% Book + Trail)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={activeSignal.target1}
                    onChange={(e) => updateSignalField('target1', e.target.value)}
                    className="w-full rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-emerald-700 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/70 dark:bg-slate-950 dark:text-emerald-400 tabular-nums"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-[11px] text-emerald-600 dark:text-emerald-400">
                    Target 2 (Final Exit)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={activeSignal.target2}
                    onChange={(e) => updateSignalField('target2', e.target.value)}
                    className="w-full rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-emerald-700 focus:border-emerald-500 focus:outline-none dark:border-emerald-900/70 dark:bg-slate-950 dark:text-emerald-400 tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* 6 Automated Risk Rules */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Safety &amp; Auto-Exit Rules
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoExitEnabled}
                      onChange={(e) => onToggleAutoExit(e.target.checked)}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    Auto SL/T1/T2
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={riskSettings.newsEventActive}
                      onChange={(e) =>
                        onUpdateRiskSettings({
                          ...riskSettings,
                          newsEventActive: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    News Halt
                  </label>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {riskChecks.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between py-1 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {rule.passed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
                      )}
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {rule.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap pl-2 tabular-nums">
                      {rule.passed ? 'Pass' : 'Blocked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 pt-2">
            {!allRiskPassed && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Order blocked by risk rules. Clear duplicate position or news halt before routing to {broker}.
                </span>
              </div>
            )}

            {orderBanner && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>{orderBanner}</span>
              </div>
            )}

            <button
              type="button"
              disabled={!allRiskPassed || activeSignal.action === 'HOLD'}
              onClick={() => onExecutePaperOrder(activeSignal)}
              className="w-full rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
            >
              {activeSignal.action === 'HOLD'
                ? 'Signal is HOLD — No Order Queued'
                : allRiskPassed
                  ? `Place Auto-Trade ${activeSignal.action} (SL + T1 + T2)`
                  : 'Trade Blocked by Risk Manager'}
            </button>
          </div>
        </div>
      </div>

      {/* Open Auto-Trading Positions Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active Auto-Trading Positions ({openPositions.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitors Stop Loss, Target 1 (books 50% &amp; trails SL to Entry), and Target 2 automatically — or test any trigger directly
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Auto-Exit Watcher: {autoExitEnabled ? 'Active' : 'Paused'}
          </span>
        </div>

        {openPositions.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            No active auto-trading positions. Place a trade above to monitor Stop Loss, Target 1, and Target 2.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 font-medium">Symbol</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Entry</th>
                  <th className="py-2 text-right font-medium">LTP</th>
                  <th className="py-2 text-right font-medium text-red-600 dark:text-red-400">
                    Stop Loss
                  </th>
                  <th className="py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    Target 1
                  </th>
                  <th className="py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                    Target 2
                  </th>
                  <th className="py-2 text-right font-medium">Live PnL</th>
                  <th className="py-2 text-right font-medium">Simulate / Exit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {openPositions.map((pos) => {
                  const dec = getMarketMeta(pos.symbol).decimals;
                  const diff =
                    pos.side === 'BUY'
                      ? pos.ltp - pos.entryPrice
                      : pos.entryPrice - pos.ltp;
                  const mult =
                    pos.symbol === 'EURUSD' ||
                    pos.symbol === 'GBPUSD' ||
                    pos.symbol === 'AUDUSD'
                      ? 10000
                      : pos.symbol === 'XAUUSD'
                        ? 10
                        : 1;
                  const pnl = Math.round(diff * pos.qty * mult);
                  return (
                    <tr
                      key={pos.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <div>
                          {pos.symbol} · {pos.side}
                        </div>
                        <div className="text-[11px] font-normal text-slate-500">
                          {pos.broker}
                          {pos.target1Hit ? ' · T1 Booked (SL at Entry)' : ''}
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono">{pos.qty}</td>
                      <td className="py-2.5 text-right font-mono">
                        {formatPrice(pos.entryPrice, dec)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {formatPrice(pos.ltp, dec)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-red-600 dark:text-red-400">
                        {formatPrice(pos.stopLoss, dec)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatPrice(pos.target1, dec)}
                        {pos.target1Hit ? ' ✓' : ''}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {formatPrice(pos.target2, dec)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-semibold ${
                          pnl >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}${pnl}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSimulateTrigger(pos.id, 'SL')}
                            title="Simulate Stop Loss hit"
                            className="rounded border border-red-200 px-1.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/50 whitespace-nowrap"
                          >
                            Hit SL
                          </button>
                          {!pos.target1Hit && (
                            <button
                              type="button"
                              onClick={() => onSimulateTrigger(pos.id, 'T1')}
                              title="Simulate Target 1 hit"
                              className="rounded border border-emerald-200 px-1.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/50 whitespace-nowrap"
                            >
                              Hit T1
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onSimulateTrigger(pos.id, 'T2')}
                            title="Simulate Target 2 hit"
                            className="rounded border border-emerald-200 px-1.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-950/50 whitespace-nowrap"
                          >
                            Hit T2
                          </button>
                          <button
                            type="button"
                            onClick={() => onClosePosition(pos.id)}
                            className="rounded border border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Profit & Loss Ledger + Equity Curve & Version History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profit & Loss Ledger (7 cols) */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Profit &amp; Loss Ledger ({filteredLedger.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Realized profit &amp; loss automatically recorded after hitting Stop Loss, Target 1, or Target 2
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'targets', label: 'Targets' },
                  { id: 'sl', label: 'Stop Loss' },
                  { id: 'manual', label: 'Manual' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setLedgerFilter(tab.id)}
                  className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                    ledgerFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Totals Strip */}
          <div className="mb-4 grid grid-cols-3 gap-4 border-b border-slate-100 pb-3 text-xs dark:border-slate-800 tabular-nums">
            <div>
              <span className="text-slate-500">Gross Profit</span>
              <p className="mt-0.5 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                +${ledgerSummary.grossProfit.toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Gross Loss</span>
              <p className="mt-0.5 font-mono font-semibold text-red-600 dark:text-red-400">
                -${Math.abs(ledgerSummary.grossLoss).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Net Realized P&amp;L</span>
              <p
                className={`mt-0.5 font-mono font-semibold ${
                  ledgerSummary.netPnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {ledgerSummary.netPnl >= 0 ? '+' : ''}$
                {ledgerSummary.netPnl.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="max-h-72 overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 font-medium">Symbol</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Entry</th>
                  <th className="py-2 text-right font-medium">Exit</th>
                  <th className="py-2 pl-3 font-medium">Trigger</th>
                  <th className="py-2 text-right font-medium">P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {filteredLedger.map((t) => {
                  const dec = getMarketMeta(t.symbol).decimals;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-2.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {t.symbol} · {t.side}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {t.closedAt}
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono">{t.qty}</td>
                      <td className="py-2.5 text-right font-mono">
                        {formatPrice(t.entryPrice, dec)}
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        {formatPrice(t.exitPrice, dec)}
                      </td>
                      <td className="py-2.5 pl-3">
                        <span
                          className={`font-medium ${
                            t.exitReason.includes('Target')
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : t.exitReason === 'Stop Loss'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {t.exitReason}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-semibold ${
                          t.pnl >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        <div>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-normal">
                          {t.pnlPct >= 0 ? '+' : ''}
                          {t.pnlPct}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Equity Curve & Version History (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Performance Equity Curve
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 dark:bg-slate-800">
                {(['1M', '3M', '6M', 'All'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEqRange(r)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      eqRange === r
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <DualEquityChart
              data={filteredEquity}
              primaryLabel={`Strategy (${activeVersion.version})`}
              secondaryLabel="Buy & Hold"
              height={175}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Strategy Version Control
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('improve')}
                className="text-xs font-medium text-orange-600 hover:underline dark:text-orange-400"
              >
                Manage Loop
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {versions.slice(0, 4).map((v) => (
                <div
                  key={v.version}
                  className="flex items-center justify-between py-2"
                >
                  <div className="min-w-0">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {v.version}
                    </span>
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 truncate">
                      {v.label}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-medium whitespace-nowrap pl-2 ${
                      v.status === 'Live'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : v.status === 'Paper'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
