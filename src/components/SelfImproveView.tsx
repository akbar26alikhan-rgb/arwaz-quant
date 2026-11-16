import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  GitBranch,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import {
  BacktestConfig,
  BrokerName,
  ClosedTradeLog,
  ImprovementProposal,
  MarketMeta,
  StrategyVersion,
} from '../types/trading';
import { analyzeTradeFailures } from '../engine/riskAndFailures';
import { runFullBacktest } from '../engine/backtestEngine';
import { formatSignedPnl, getMarketMeta } from '../engine/marketData';
import { DualEquityChart } from './Charts';

interface SelfImproveViewProps {
  market: MarketMeta;
  closedTrades: ClosedTradeLog[];
  versions: StrategyVersion[];
  activeVersion: StrategyVersion;
  onDeployVersion: (proposal: ImprovementProposal, candidateConfig: BacktestConfig, candidateSharpe: number, candidateReturn: number, candidateDd: number, targetStatus: 'Paper' | 'Live') => void;
  onSwitchVersionStatus: (version: string, status: 'Live' | 'Paper' | 'Archived') => void;
}

export const SelfImproveView: React.FC<SelfImproveViewProps> = ({
  market,
  closedTrades,
  versions,
  activeVersion,
  onDeployVersion,
  onSwitchVersionStatus,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ImprovementProposal | null>(null);
  const [selectedBrokerTab, setSelectedBrokerTab] =
    useState<BrokerName>('Zerodha Kite');
  const [deployBanner, setDeployBanner] = useState<string | null>(null);

  const failurePatterns = useMemo(
    () => analyzeTradeFailures(closedTrades),
    [closedTrades]
  );

  const baselineBacktest = useMemo(
    () => runFullBacktest(market.symbol, activeVersion.config),
    [market.symbol, activeVersion.config]
  );

  const candidateConfig: BacktestConfig | null = useMemo(() => {
    if (!proposal) return null;
    return {
      ...activeVersion.config,
      ...proposal.suggestedConfigPatch,
    };
  }, [proposal, activeVersion.config]);

  const candidateBacktest = useMemo(() => {
    if (!candidateConfig) return null;
    return runFullBacktest(market.symbol, candidateConfig);
  }, [market.symbol, candidateConfig]);

  const comparisonCurve = useMemo(() => {
    if (!candidateBacktest) return [];
    return baselineBacktest.outOfSampleCurve.map((pt, i) => ({
      label: pt.label,
      strategy: candidateBacktest.outOfSampleCurve[i]?.strategy ?? pt.strategy,
      benchmark: pt.strategy,
      drawdownPct: pt.drawdownPct,
    }));
  }, [baselineBacktest, candidateBacktest]);

  const handleRunReasoning = async () => {
    setLoading(true);
    setErrorMsg(null);
    setDeployBanner(null);
    try {
      const losingSample = closedTrades.filter((t) => t.pnl < 0).slice(0, 6);
      const resp = await fetch('/api/agent/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentVersion: activeVersion.version,
          currentConfig: activeVersion.config,
          failurePatterns,
          losingSample,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'AI Reasoning Engine failed.');
      }
      setProposal(data.proposal);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to reach AI Reasoning Engine.'
      );
    } finally {
      setLoading(false);
    }
  };

  const brokerSnippets: Record<BrokerName, string> = {
    'Zerodha Kite': `from kiteconnect import KiteConnect
kite = KiteConnect(api_key=API_KEY)
order_id = kite.place_order(
    variety="regular", exchange="NSE",
    tradingsymbol="${market.symbol}", transaction_type="BUY",
    quantity=${market.defaultQty}, order_type="LIMIT",
    price=${market.basePrice}, product="MIS", validity="DAY"
)`,
    Dhan: `from dhanhq import dhanhq
dhan = dhanhq(CLIENT_ID, ACCESS_TOKEN)
dhan.place_order(
    security_id="1333", exchange_segment=dhan.NSE_FNO,
    transaction_type=dhan.BUY, quantity=${market.defaultQty},
    order_type=dhan.LIMIT, product_type=dhan.INTRADAY, price=${market.basePrice}
)`,
    'MetaTrader 5': `import MetaTrader5 as mt5
mt5.order_send({
    "action": mt5.TRADE_ACTION_DEAL,
    "symbol": "${market.symbol}", "volume": ${market.defaultQty},
    "type": mt5.ORDER_TYPE_BUY, "price": ${market.basePrice},
    "deviation": 10, "type_time": mt5.ORDER_TIME_GTC
})`,
    Binance: `from binance.client import Client
client.create_order(
    symbol="${market.symbol}", side="BUY",
    type="LIMIT", timeInForce="GTC",
    quantity=${market.defaultQty}, price="${market.basePrice}"
)`,
    'Interactive Brokers': `from ib_insync import Stock, LimitOrder
contract = Stock("${market.symbol}", "SMART", "USD")
order = LimitOrder("BUY", ${market.defaultQty}, ${market.basePrice})
ib.placeOrder(contract, order)`,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            05. Self-Improvement Loop & Gated Deployment
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Detect patterns across losing trades, diagnose root causes with Gemini, validate candidate parameters out-of-sample, and gate deployment via Paper Trading.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunReasoning}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-60 whitespace-nowrap shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="h-4 w-4" />
          )}
          {loading ? 'Diagnosing Failures...' : 'Diagnose Failures & Propose vNext'}
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Reasoning Engine Error</p>
              <p className="text-xs mt-0.5">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunReasoning}
            disabled={loading}
            className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-red-950 whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {deployBanner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{deployBanner}</span>
        </div>
      )}

      {/* Step 1 & 2: Failure Patterns + Observability Trade Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Statistical Failure Patterns */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                1. Failure Analyzer (From Losing Trades)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Computed across {failurePatterns.losingTradeCount} losses out of{' '}
                {failurePatterns.totalTradeCount} logged trades
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800 tabular-nums">
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600 dark:text-slate-400">
                High Volatility Ratio (Loss vs Win)
              </span>
              <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                {failurePatterns.highVolRatio}x higher
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600 dark:text-slate-400">
                Weak Trend Strength (Mean ADX)
              </span>
              <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                {failurePatterns.meanLosingAdx} (choppy)
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600 dark:text-slate-400">
                Peak Losing Session Window
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {failurePatterns.worstHourWindow}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600 dark:text-slate-400">
                Most Affected Instruments
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {failurePatterns.worstSymbols.join(', ')}
              </span>
            </div>
            <div className="flex justify-between py-2.5">
              <span className="text-slate-600 dark:text-slate-400">
                Max Consecutive Losses
              </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {failurePatterns.maxConsecutiveLosses} trades
              </span>
            </div>
          </div>
        </div>

        {/* Observability Ledger */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                2. Observability Layer — Trade Decision Ledger
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Logs entry/exit, ADX, volatility regime, and exit trigger for continuous learning
              </p>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-slate-900">
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 font-medium">Symbol</th>
                  <th className="py-2 font-medium">Regime</th>
                  <th className="py-2 text-right font-medium">ADX</th>
                  <th className="py-2 text-right font-medium">Hour</th>
                  <th className="py-2 font-medium pl-3">Exit Reason</th>
                  <th className="py-2 text-right font-medium">PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                {closedTrades.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="py-2 font-medium text-slate-900 dark:text-slate-100">
                      {t.symbol} · {t.side}
                    </td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">
                      {t.regime}
                    </td>
                    <td className="py-2 text-right font-mono">{t.adx}</td>
                    <td className="py-2 text-right font-mono">
                      {String(t.entryHour).padStart(2, '0')}:00
                    </td>
                    <td className="py-2 pl-3 text-slate-600 dark:text-slate-300">
                      {t.exitReason}
                    </td>
                    <td
                      className={`py-2 text-right font-mono font-semibold ${
                        t.pnl >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatSignedPnl(t.pnl, getMarketMeta(t.symbol).currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Step 3 & 4: AI Proposal & Side-by-Side Candidate Backtest */}
      {proposal && candidateBacktest && candidateConfig ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  3. AI Reasoning Proposal · {proposal.proposedVersion}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Generated by Gemini from failure diagnostics
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                Candidate Ready
              </span>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              {proposal.summary}
            </p>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Proposed Parameter Changes
              </p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {proposal.proposedChanges.map((ch, idx) => (
                  <div key={idx} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between font-medium text-slate-900 dark:text-slate-100">
                      <span>{ch.title}</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {ch.currentValue} → {ch.proposedValue}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {ch.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                4. Out-of-Sample Validation ({activeVersion.version} vs{' '}
                {proposal.proposedVersion})
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs tabular-nums">
              <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Total Return</span>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {baselineBacktest.outOfSampleMetrics.totalReturnPct}% →{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {candidateBacktest.outOfSampleMetrics.totalReturnPct}%
                  </span>
                </p>
              </div>
              <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Max Drawdown</span>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {baselineBacktest.outOfSampleMetrics.maxDrawdownPct}% →{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {candidateBacktest.outOfSampleMetrics.maxDrawdownPct}%
                  </span>
                </p>
              </div>
              <div className="border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Sharpe Ratio</span>
                <p className="mt-0.5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {baselineBacktest.outOfSampleMetrics.sharpeRatio} →{' '}
                  <span className="text-blue-600 dark:text-blue-400">
                    {candidateBacktest.outOfSampleMetrics.sharpeRatio}
                  </span>
                </p>
              </div>
            </div>

            <DualEquityChart
              data={comparisonCurve}
              primaryLabel={`Candidate (${proposal.proposedVersion})`}
              secondaryLabel={`Current (${activeVersion.version})`}
              currency={market.currency}
              height={175}
            />

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProposal(null)}
                className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reject Proposal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeployVersion(
                    proposal,
                    candidateConfig,
                    candidateBacktest.outOfSampleMetrics.sharpeRatio,
                    candidateBacktest.outOfSampleMetrics.totalReturnPct,
                    candidateBacktest.outOfSampleMetrics.maxDrawdownPct,
                    'Paper'
                  );
                  setDeployBanner(
                    `Deployed ${proposal.proposedVersion} to gated Paper Trading monitor.`
                  );
                  setProposal(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Deploy to Paper Trading
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeployVersion(
                    proposal,
                    candidateConfig,
                    candidateBacktest.outOfSampleMetrics.sharpeRatio,
                    candidateBacktest.outOfSampleMetrics.totalReturnPct,
                    candidateBacktest.outOfSampleMetrics.maxDrawdownPct,
                    'Live'
                  );
                  setDeployBanner(
                    `Promoted ${proposal.proposedVersion} as active Live strategy.`
                  );
                  setProposal(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Promote to Live
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Ready to generate a self-improvement hypothesis
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Click &ldquo;Diagnose Failures &amp; Propose vNext&rdquo; above to let Gemini inspect losing trade patterns and run a candidate out-of-sample comparison.
          </p>
        </div>
      )}

      {/* Version Control + Broker API Layer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Version History */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          <div className="mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Strategy Version Registry & Rollback
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {versions.map((v) => (
              <div
                key={v.version}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {v.version}
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {v.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Return +{v.totalReturnPct}% · Sharpe {v.sharpe} · Max DD{' '}
                    {v.maxDrawdownPct}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-medium ${
                      v.status === 'Live'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : v.status === 'Paper'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {v.status}
                  </span>
                  {v.status !== 'Live' && (
                    <button
                      type="button"
                      onClick={() => onSwitchVersionStatus(v.version, 'Live')}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Activate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broker Execution APIs */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-6">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Broker Execution Adapters ({market.symbol})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unified signal-to-order adapters across Indian, Forex, Crypto, and US brokers
            </p>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(
              [
                'Zerodha Kite',
                'Dhan',
                'MetaTrader 5',
                'Binance',
                'Interactive Brokers',
              ] as BrokerName[]
            ).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBrokerTab(b)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedBrokerTab === b
                    ? 'border-orange-600 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
            {brokerSnippets[selectedBrokerTab]}
          </pre>
        </div>
      </div>
    </div>
  );
};
