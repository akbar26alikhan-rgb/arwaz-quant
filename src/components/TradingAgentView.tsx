import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  EngineeredRow,
  MarketMeta,
  Timeframe,
  TradeSignal,
} from '../types/trading';
import { formatCurrencyPrice, roundPrice } from '../engine/marketData';

interface TradingAgentViewProps {
  market: MarketMeta;
  timeframe: Timeframe;
  rows: EngineeredRow[];
  activeSignal: TradeSignal;
  onSignalGenerated: (signal: TradeSignal) => void;
  onSendToExecution: (signal: TradeSignal) => void;
}

export const TradingAgentView: React.FC<TradingAgentViewProps> = ({
  market,
  timeframe,
  rows,
  activeSignal,
  onSignalGenerated,
  onSendToExecution,
}) => {
  const [strategyMode, setStrategyMode] = useState<
    'Trend + Momentum' | 'Breakout + Volume' | 'Mean Reversion'
  >('Trend + Momentum');
  const [riskPct, setRiskPct] = useState(1.0);
  const [macroContext, setMacroContext] = useState(
    'Broad breadth steady; no high-impact central bank surprise scheduled today.'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const latest = rows[rows.length - 1];

  const handleAnalyze = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: market.symbol,
          exchange: market.exchange,
          timeframe,
          riskPerTradePct: riskPct,
          strategyMode,
          macroContext,
          recentCandles: rows.slice(-20),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Gemini Trading Agent request failed.');
      }

      const raw = data.signal;
      const entry = roundPrice(Number(raw.entry), market.decimals);
      const stopLoss = roundPrice(Number(raw.stopLoss), market.decimals);
      const target1 = roundPrice(Number(raw.target1), market.decimals);
      const target2 = roundPrice(Number(raw.target2), market.decimals);
      const riskDist = Math.abs(entry - stopLoss);
      const rewardDist = Math.abs(target1 - entry);
      const riskReward =
        riskDist > 0 ? Math.round((rewardDist / riskDist) * 10) / 10 : 2.0;

      const generated: TradeSignal = {
        id: `sig-${Date.now()}`,
        symbol: market.symbol,
        timeframe,
        action:
          raw.action === 'BUY' || raw.action === 'SELL' ? raw.action : 'HOLD',
        entry,
        stopLoss,
        target1,
        target2,
        positionSizePct: riskPct,
        positionQty: market.defaultQty,
        riskReward,
        confidence: Math.min(100, Math.max(0, Math.round(Number(raw.confidence) || 72))),
        reasoning: String(raw.reasoning || 'Structured technical evaluation completed.'),
        checklist: Array.isArray(raw.checklist) ? raw.checklist : [],
        createdAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        source: 'AI Agent',
      };

      onSignalGenerated(generated);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach AI Trading Agent.'
      );
    } finally {
      setLoading(false);
    }
  };

  const jsonPreview = JSON.stringify(
    {
      symbol: activeSignal.symbol,
      action: activeSignal.action,
      entry: activeSignal.entry,
      stop_loss: activeSignal.stopLoss,
      target_1: activeSignal.target1,
      target_2: activeSignal.target2,
      position_size: `${activeSignal.positionSizePct}% risk`,
      risk_reward: `${activeSignal.riskReward}:1`,
      reasoning: activeSignal.reasoning,
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            04. AI Trading Agent — Analyze, Reason & Generate Signal
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Reads engineered OHLCV, MA, RSI, ATR, and ADX context via Gemini to output structured trade levels with explicit reasoning.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}
          {loading ? 'Analyzing Market Context...' : `Analyze ${market.symbol} with Gemini`}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">AI Trading Agent Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950 whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Market Context & Strategy Controls */}
        <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            1. Market Context Snapshot
          </h3>

          {latest && (
            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 pb-4 text-xs dark:border-slate-800 tabular-nums">
              <div>
                <span className="text-slate-500">Latest Close</span>
                <p className="font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrencyPrice(latest.close, market.decimals, market.currency)}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Market Regime</span>
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {latest.regime}
                </p>
              </div>
              <div>
                <span className="text-slate-500">RSI (14)</span>
                <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {latest.rsi ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">ATR (14) · ADX</span>
                <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {latest.atr !== null
                    ? formatCurrencyPrice(latest.atr, market.decimals, market.currency)
                    : '—'}{' '}
                  · {latest.adx ?? '—'}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Strategy Mode
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    'Trend + Momentum',
                    'Breakout + Volume',
                    'Mean Reversion',
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setStrategyMode(mode)}
                    className={`rounded-md border px-2.5 py-2 text-xs font-medium transition-colors ${
                      strategyMode === mode
                        ? 'border-orange-600 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <label className="font-medium text-slate-700 dark:text-slate-300">
                  Risk Per Trade
                </label>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {riskPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.5}
                step={0.5}
                value={riskPct}
                onChange={(e) => setRiskPct(Number(e.target.value))}
                className="w-full accent-orange-600"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                Macro & News Context Notes
              </label>
              <textarea
                rows={3}
                value={macroContext}
                onChange={(e) => setMacroContext(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                placeholder="Add macro events, earnings, or central bank context..."
              />
            </div>
          </div>
        </div>

        {/* Right: Structured Signal Ticket + Reasoning + JSON */}
        <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                2. Generated Trade Signal · {activeSignal.symbol} ({activeSignal.timeframe})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Source: {activeSignal.source} · Updated {activeSignal.createdAt} · Confidence {activeSignal.confidence}%
              </p>
            </div>
            <span
              className={`rounded-md px-3 py-1 font-mono text-xs font-semibold ${
                activeSignal.action === 'BUY'
                  ? 'bg-emerald-600 text-white'
                  : activeSignal.action === 'SELL'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500 text-slate-950'
              }`}
            >
              {activeSignal.action}
            </span>
          </div>

          {/* Key Price Levels */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 tabular-nums">
            <div>
              <span className="text-[11px] text-slate-500">Entry</span>
              <p className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrencyPrice(activeSignal.entry, market.decimals, market.currency)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Stop Loss</span>
              <p className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                {formatCurrencyPrice(activeSignal.stopLoss, market.decimals, market.currency)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Target 1</span>
              <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyPrice(activeSignal.target1, market.decimals, market.currency)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Target 2</span>
              <p className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrencyPrice(activeSignal.target2, market.decimals, market.currency)}
              </p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Risk / Reward</span>
              <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                {activeSignal.riskReward.toFixed(1)}:1
              </p>
            </div>
          </div>

          {/* Reasoning Prose */}
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Agent Reasoning Summary
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800 dark:text-slate-200">
              {activeSignal.reasoning}
            </p>
          </div>

          {/* Checklist + JSON side-by-side */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Decision Checklist
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeSignal.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-2 text-xs">
                    {item.passed ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {item.label}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Structured Signal Payload (JSON)
              </p>
              <pre className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
                {jsonPreview}
              </pre>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onSendToExecution(activeSignal)}
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              Send Signal to Execution Risk Gate
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
