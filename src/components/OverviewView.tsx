import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Play,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import {
  BrokerName,
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
  openPositions: OpenPosition[];
  riskSettings: RiskSettings;
  onUpdateRiskSettings: (next: RiskSettings) => void;
  onExecutePaperOrder: (signal: TradeSignal) => void;
  onClosePosition: (id: string) => void;
  onSimulateMarketTick: () => void;
  onNavigateTab: (tab: 'agent' | 'backtest' | 'improve') => void;
  versions: StrategyVersion[];
  activeVersion: StrategyVersion;
  equityHistory: Array<{ label: string; strategy: number; benchmark: number; drawdownPct: number }>;
  orderBanner: string | null;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  market,
  timeframe,
  broker,
  feedSourceLabel,
  rows,
  activeSignal,
  openPositions,
  riskSettings,
  onUpdateRiskSettings,
  onExecutePaperOrder,
  onClosePosition,
  onSimulateMarketTick,
  onNavigateTab,
  versions,
  activeVersion,
  equityHistory,
  orderBanner,
}) => {
  const [showMaFast, setShowMaFast] = useState(true);
  const [showMaSlow, setShowMaSlow] = useState(true);
  const [eqRange, setEqRange] = useState<'1M' | '3M' | '6M' | 'All'>('6M');

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
      const mult = pos.symbol === 'EURUSD' ? 10000 : pos.symbol === 'XAUUSD' ? 10 : 1;
      return sum + diff * pos.qty * mult;
    }, 0);
  }, [openPositions]);

  const filteredEquity = useMemo(() => {
    if (eqRange === '1M') return equityHistory.slice(-8);
    if (eqRange === '3M') return equityHistory.slice(-16);
    if (eqRange === '6M') return equityHistory.slice(-26);
    return equityHistory;
  }, [equityHistory, eqRange]);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Return ({activeVersion.version})
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{activeVersion.totalReturnPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Out-of-sample
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Sharpe Ratio
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {activeVersion.sharpe.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Risk-adjusted
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
            Max Drawdown
          </p>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold text-red-600 dark:text-red-400 tabular-nums">
              {activeVersion.maxDrawdownPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Peak-to-trough
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart + Risk-Gated Execution Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Candlestick Chart (8 cols) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {market.label} · {timeframe} · {market.exchange}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {feedSourceLabel} · AI trade levels mapped directly on price
              </p>
            </div>
            <div className="flex items-center gap-2">
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
                onClick={onSimulateMarketTick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                Tick Prices
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

        {/* Pre-Trade Risk Gate & Execution Layer (4 cols) */}
        <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Execution Risk Gate
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target Broker: {broker}
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

            {/* Active Signal Summary */}
            <div className="space-y-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Queued Signal · {activeSignal.symbol}
                </span>
                <span
                  className={`font-mono font-semibold ${
                    activeSignal.action === 'BUY'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : activeSignal.action === 'SELL'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {activeSignal.action} · R:R {activeSignal.riskReward.toFixed(1)}:1
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-500">Entry</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {formatPrice(activeSignal.entry, getMarketMeta(activeSignal.symbol).decimals)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Stop Loss</span>
                  <span className="font-mono font-medium text-red-600 dark:text-red-400">
                    {formatPrice(activeSignal.stopLoss, getMarketMeta(activeSignal.symbol).decimals)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target 1</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {formatPrice(activeSignal.target1, getMarketMeta(activeSignal.symbol).decimals)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target 2</span>
                  <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                    {formatPrice(activeSignal.target2, getMarketMeta(activeSignal.symbol).decimals)}
                  </span>
                </div>
              </div>
            </div>

            {/* 6 Automated Risk Rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Pre-Trade Safety Checks
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
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
                  Simulate News Halt
                </label>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {riskChecks.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between py-1.5 text-xs"
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
                  ? `Execute Paper ${activeSignal.action} via ${broker}`
                  : 'Trade Blocked by Risk Manager'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Open Positions + Live Equity Curve + Version History */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Open Positions Table */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Open Positions ({openPositions.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Closing a position logs it directly to the Self-Improvement Observability layer
              </p>
            </div>
          </div>

          {openPositions.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              No active positions. Generate a signal in AI Trading Agent or execute the queued signal above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2 font-medium">Symbol</th>
                    <th className="py-2 font-medium">Broker</th>
                    <th className="py-2 text-right font-medium">Qty</th>
                    <th className="py-2 text-right font-medium">Entry</th>
                    <th className="py-2 text-right font-medium">LTP</th>
                    <th className="py-2 text-right font-medium">PnL</th>
                    <th className="py-2 text-right font-medium">Action</th>
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
                      pos.symbol === 'EURUSD' ? 10000 : pos.symbol === 'XAUUSD' ? 10 : 1;
                    const pnl = Math.round(diff * pos.qty * mult);
                    return (
                      <tr
                        key={pos.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {pos.symbol} · {pos.side}
                        </td>
                        <td className="py-2.5 text-slate-600 dark:text-slate-400">
                          {pos.broker}
                        </td>
                        <td className="py-2.5 text-right font-mono">{pos.qty}</td>
                        <td className="py-2.5 text-right font-mono">
                          {formatPrice(pos.entryPrice, dec)}
                        </td>
                        <td className="py-2.5 text-right font-mono">
                          {formatPrice(pos.ltp, dec)}
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
                          <button
                            type="button"
                            onClick={() => onClosePosition(pos.id)}
                            className="rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
                          >
                            Close Trade
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Equity Curve & Version History */}
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
                    <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
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
