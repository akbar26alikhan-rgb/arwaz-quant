import React, { useMemo, useState } from 'react';
import { CheckCircle2, Code2, RotateCcw, XCircle } from 'lucide-react';
import { BacktestConfig, MarketMeta } from '../types/trading';
import { runFullBacktest } from '../engine/backtestEngine';
import {
  CrossMarketBarChart,
  DrawdownChart,
  DualEquityChart,
  MonteCarloChart,
  SensitivityHeatmap,
} from './Charts';

interface BacktestViewProps {
  market: MarketMeta;
  config: BacktestConfig;
  onUpdateConfig: (next: BacktestConfig) => void;
  onResetToActiveVersion: () => void;
}

export const BacktestView: React.FC<BacktestViewProps> = ({
  market,
  config,
  onUpdateConfig,
  onResetToActiveVersion,
}) => {
  const [showPython, setShowPython] = useState(false);

  const output = useMemo(
    () => runFullBacktest(market.symbol, config),
    [market.symbol, config]
  );

  const passedChecks = output.validationChecklist.filter((c) => c.passed).length;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              06. Backtesting & Walk-Forward Validation · {market.label}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Test strategy ideas on historical data with realistic fees, slippage, out-of-sample splits, and Monte Carlo robustness checks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPython((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <Code2 className="h-3.5 w-3.5" />
              {showPython ? 'Hide vectorbt Code' : 'View vectorbt Code'}
            </button>
            <button
              type="button"
              onClick={onResetToActiveVersion}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Active Version
            </button>
          </div>
        </div>

        {/* Interactive Parameter Controls */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Fast MA</span>
              <span className="font-mono font-semibold tabular-nums">{config.fastMa}</span>
            </div>
            <input
              type="range"
              min={8}
              max={40}
              value={config.fastMa}
              onChange={(e) =>
                onUpdateConfig({ ...config, fastMa: Number(e.target.value) })
              }
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Slow MA</span>
              <span className="font-mono font-semibold tabular-nums">{config.slowMa}</span>
            </div>
            <input
              type="range"
              min={25}
              max={100}
              value={config.slowMa}
              onChange={(e) =>
                onUpdateConfig({ ...config, slowMa: Number(e.target.value) })
              }
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Min ADX</span>
              <span className="font-mono font-semibold tabular-nums">{config.adxMin}</span>
            </div>
            <input
              type="range"
              min={10}
              max={30}
              value={config.adxMin}
              onChange={(e) =>
                onUpdateConfig({ ...config, adxMin: Number(e.target.value) })
              }
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">ATR Stop</span>
              <span className="font-mono font-semibold tabular-nums">
                {config.atrStopMult.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={3.0}
              step={0.1}
              value={config.atrStopMult}
              onChange={(e) =>
                onUpdateConfig({ ...config, atrStopMult: Number(e.target.value) })
              }
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Fees (%)</span>
              <span className="font-mono font-semibold tabular-nums">
                {(config.feesRate * 100).toFixed(2)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0001}
              max={0.0015}
              step={0.0001}
              value={config.feesRate}
              onChange={(e) =>
                onUpdateConfig({ ...config, feesRate: Number(e.target.value) })
              }
              className="w-full accent-orange-600"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={config.avoidChopHours}
                onChange={(e) =>
                  onUpdateConfig({ ...config, avoidChopHours: e.target.checked })
                }
                className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
              />
              Avoid Chop Window
            </label>
          </div>
        </div>

        {showPython && (
          <pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
            {`import vectorbt as vbt
fast = vbt.MA.run(price, window=${config.fastMa})
slow = vbt.MA.run(price, window=${config.slowMa})
entries = fast.ma_crossed_above(slow)
exits = fast.ma_crossed_below(slow)
pf = vbt.Portfolio.from_entries(price, entries, exits, fees=${config.feesRate}, slippage=${config.slippageRate}, init_cash=${config.initialCapital})
print(pf.stats())`}
          </pre>
        )}
      </div>

      {/* In-Sample vs Out-of-Sample + Validation Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Equity Curves */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                In-Sample Results (2020–2023)
              </h3>
              <div className="flex flex-wrap gap-4 font-mono text-xs tabular-nums">
                <span className={output.inSampleMetrics.totalReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                  Return {output.inSampleMetrics.totalReturnPct >= 0 ? '+' : ''}
                  {output.inSampleMetrics.totalReturnPct}%
                </span>
                <span className="text-red-600 dark:text-red-400">
                  Max DD {output.inSampleMetrics.maxDrawdownPct}%
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  Sharpe {output.inSampleMetrics.sharpeRatio}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  Win {output.inSampleMetrics.winRatePct}%
                </span>
              </div>
            </div>
            <DualEquityChart
              data={output.inSampleCurve}
              primaryLabel="Strategy"
              secondaryLabel="Buy & Hold"
              height={190}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Out-of-Sample Walk-Forward (2024–2025)
              </h3>
              <div className="flex flex-wrap gap-4 font-mono text-xs tabular-nums">
                <span className={output.outOfSampleMetrics.totalReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}>
                  Return {output.outOfSampleMetrics.totalReturnPct >= 0 ? '+' : ''}
                  {output.outOfSampleMetrics.totalReturnPct}%
                </span>
                <span className="text-red-600 dark:text-red-400">
                  Max DD {output.outOfSampleMetrics.maxDrawdownPct}%
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  Sharpe {output.outOfSampleMetrics.sharpeRatio}
                </span>
                <span className="text-slate-700 dark:text-slate-300">
                  Win {output.outOfSampleMetrics.winRatePct}%
                </span>
              </div>
            </div>
            <DualEquityChart
              data={output.outOfSampleCurve}
              primaryLabel="Strategy (Unseen Data)"
              secondaryLabel="Buy & Hold"
              height={190}
            />
          </div>
        </div>

        {/* 9-Point Validation Checklist */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Validation Checklist
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prevent overfitting before live deployment
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {passedChecks}/9 Passed
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {output.validationChecklist.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 py-2.5 text-xs"
              >
                <div className="flex items-start gap-2">
                  {item.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  )}
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Robustness Tests */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Parameter Sensitivity (Sharpe)
          </h4>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Fast MA vs Slow MA stability surface
          </p>
          <SensitivityHeatmap cells={output.heatmap} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Monte Carlo Simulation
          </h4>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            32 randomized trade-order paths + median
          </p>
          <MonteCarloChart
            paths={output.monteCarloPaths}
            median={output.monteCarloMedian}
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Performance Across Markets
          </h4>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Same rules across equities, FX, gold & crypto
          </p>
          <CrossMarketBarChart data={output.crossMarket} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h4 className="mb-1 text-xs font-semibold text-slate-900 dark:text-slate-100">
            Underwater Drawdown Analysis
          </h4>
          <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">
            Max historical peak-to-trough decline
          </p>
          <DrawdownChart data={output.inSampleCurve} />
        </div>
      </div>
    </div>
  );
};
