import React from 'react';
import { X } from 'lucide-react';

interface ArchitectureModalProps {
  open: boolean;
  onClose: () => void;
}

const SLIDES_SUMMARY = [
  {
    index: '01/08',
    title: 'Self-Improving AI Trading Agent',
    detail:
      'Connects Market Data, LLM Trading Agent, Execution Layer, Observability, Failure Analyzer, Reasoning Engine, and Gated Strategy Updates.',
  },
  {
    index: '02/08',
    title: 'System Architecture',
    detail:
      'Modular loop where every signal, fill, and PnL outcome feeds back into validation and version-controlled strategy improvements.',
  },
  {
    index: '03/08',
    title: 'Data Pipeline',
    detail:
      'Ingests NSE/BSE, Forex, Crypto, and Macro feeds; cleans missing/outlier ticks; aligns UTC timestamps; engineers MA, RSI, ATR, and ADX features.',
  },
  {
    index: '04/08',
    title: 'Trading Agent (LLM)',
    detail:
      'Analyzes multi-bar technical & macro state via Gemini to generate structured BUY/SELL/HOLD signals with Entry, Stop Loss, Targets, and reasoning.',
  },
  {
    index: '05/08',
    title: 'Self-Improvement Loop',
    detail:
      'Finds failure patterns in losing trades (weak ADX, high volatility, choppy sessions), proposes parameter upgrades, and verifies out-of-sample.',
  },
  {
    index: '06/08',
    title: 'Backtesting & Validation',
    detail:
      'Evaluates In-Sample vs Out-of-Sample equity curves, realistic fees & slippage, 5x5 parameter sensitivity, Monte Carlo paths, and drawdown.',
  },
  {
    index: '07/08',
    title: 'Execution & Risk Controls',
    detail:
      'Enforces 6 pre-trade safety checks (position sizing, max risk, exposure, correlation, news filter, volatility) before routing to broker APIs.',
  },
  {
    index: '08/08',
    title: 'One Platform End-to-End',
    detail:
      'Unifies multi-market research, AI signal generation, validation, and paper-to-live monitoring in a single user-friendly workbench.',
  },
];

const GLOSSARY = [
  {
    term: 'Sharpe Ratio',
    meaning:
      'Return earned per unit of volatility risk. Values above 1.0 indicate strong risk-adjusted performance.',
  },
  {
    term: 'Max Drawdown',
    meaning:
      'Largest peak-to-trough percentage drop in account equity during a test period.',
  },
  {
    term: 'ADX (Trend Strength)',
    meaning:
      'Average Directional Index (0–100). Readings below 15–20 signal sideways chop where trend strategies often lose.',
  },
  {
    term: 'ATR (Volatility)',
    meaning:
      'Average True Range measures typical price movement per bar to place realistic stop losses.',
  },
  {
    term: 'Out-of-Sample',
    meaning:
      'Testing a strategy on newer unseen market data (2024–2025) to ensure results are not curve-fitted.',
  },
  {
    term: 'Monte Carlo Test',
    meaning:
      'Randomly reorders historical trade outcomes dozens of times to check if equity still grows under unlucky streaks.',
  },
];

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({
  open,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="arch-modal-title"
    >
      <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2
              id="arch-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              End-to-End Platform Architecture & Quick Guide
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              How the 8 stages work together — plus plain-English definitions of every trading metric.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SLIDES_SUMMARY.map((item) => (
            <div
              key={item.index}
              className="rounded-md border border-slate-200 p-3.5 dark:border-slate-800"
            >
              <div className="flex items-center gap-2 text-xs">
                <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                  {item.index}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {item.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Plain-English Metric Glossary
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GLOSSARY.map((g) => (
              <div key={g.term} className="text-xs">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {g.term}
                </p>
                <p className="mt-0.5 leading-relaxed text-slate-600 dark:text-slate-400">
                  {g.meaning}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
