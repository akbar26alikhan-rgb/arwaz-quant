import React, { useMemo, useState } from 'react';
import { ArrowRight, Code2, Database, Filter, Layers } from 'lucide-react';
import {
  BhavcopyRow,
  Candle,
  CleaningConfig,
  EngineeredRow,
  FeatureConfig,
  MarketMeta,
  Timeframe,
} from '../types/trading';
import { formatPrice } from '../engine/marketData';
import { NseBhavcopyPanel } from './NseBhavcopyPanel';

interface DataPipelineViewProps {
  market: MarketMeta;
  timeframe: Timeframe;
  rawCandles: Candle[];
  cleaningConfig: CleaningConfig;
  onUpdateCleaning: (next: CleaningConfig) => void;
  cleaningStats: {
    droppedMissing: number;
    droppedZeroVol: number;
    droppedOutliers: number;
    alignedCount: number;
  };
  featureConfig: FeatureConfig;
  onUpdateFeatures: (next: FeatureConfig) => void;
  engineeredRows: EngineeredRow[];
  onSendToAgent: () => void;
  onSelectBhavcopyStock: (row: BhavcopyRow) => void;
}

export const DataPipelineView: React.FC<DataPipelineViewProps> = ({
  market,
  timeframe,
  rawCandles,
  cleaningConfig,
  onUpdateCleaning,
  cleaningStats,
  featureConfig,
  onUpdateFeatures,
  engineeredRows,
  onSendToAgent,
  onSelectBhavcopyStock,
}) => {
  const [selectedSource, setSelectedSource] = useState<
    'Zerodha' | 'Dhan' | 'MT5' | 'Binance'
  >('Zerodha');
  const [showCode, setShowCode] = useState(false);

  const previewRows = useMemo(() => engineeredRows.slice(-8).reverse(), [engineeredRows]);

  const connectorSnippets: Record<string, string> = {
    Zerodha: `from kiteconnect import KiteConnect
kite = KiteConnect(api_key=API_KEY)
data = kite.historical_data(
    instrument_token=260105, # ${market.symbol}
    from_date="2024-01-01",
    to_date="2026-11-15",
    interval="${timeframe}"
)`,
    Dhan: `from dhanhq import dhanhq
dhan = dhanhq(CLIENT_ID, ACCESS_TOKEN)
data = dhan.historical_daily_data(
    symbol="${market.symbol}",
    exchange_segment="NSE_FNO",
    instrument_type="INDEX"
)`,
    MT5: `import MetaTrader5 as mt5
mt5.initialize()
rates = mt5.copy_rates_from_pos(
    "${market.symbol}", mt5.TIMEFRAME_H1, 0, 500
)`,
    Binance: `from binance.client import Client
client = Client(API_KEY, API_SECRET)
klines = client.get_historical_klines(
    "${market.symbol}", Client.KLINE_INTERVAL_1HOUR, "90 days ago UTC"
)`,
  };

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            03. Market Data to AI Agent Pipeline
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Clean, normalize, and engineer technical features from multi-market feeds before feeding structured context to the Trading Agent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Code2 className="h-3.5 w-3.5" />
            {showCode ? 'Hide Python Snippets' : 'View Python Pipeline'}
          </button>
          <button
            type="button"
            onClick={onSendToAgent}
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-4 py-2 text-xs font-medium text-white hover:bg-orange-700 whitespace-nowrap shrink-0"
          >
            Feed to AI Agent
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Live NSE Bhavcopy Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <NseBhavcopyPanel
          activeSymbol={market.symbol}
          onSelectStock={onSelectBhavcopyStock}
          compact
        />
      </div>

      {/* Stage 1 & 2: Sources + Cleaning */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-5">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              1. Multi-Market Data Connectors
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'Zerodha', label: 'NSE / BSE · Zerodha' },
                { id: 'Dhan', label: 'NSE F&O · Dhan API' },
                { id: 'MT5', label: 'Forex / Gold · MT5' },
                { id: 'Binance', label: 'Crypto · Binance REST' },
              ] as const
            ).map((src) => (
              <button
                key={src.id}
                type="button"
                onClick={() => setSelectedSource(src.id)}
                className={`rounded-md border px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                  selectedSource === src.id
                    ? 'border-orange-600 bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {src.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800 tabular-nums">
            <div className="flex justify-between">
              <span className="text-slate-500">Active Symbol</span>
              <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                {market.symbol} ({market.exchange})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Raw Records Ingested</span>
              <span className="font-mono font-medium">{rawCandles.length} bars</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Unified Storage Format</span>
              <span className="font-mono font-medium">Parquet / Snappy</span>
            </div>
          </div>

          {showCode && (
            <pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
              {connectorSnippets[selectedSource]}
            </pre>
          )}
        </div>

        {/* Stage 2: Cleaning & Normalization */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                2. Data Cleaning & Feature Engineering
              </h3>
            </div>
            <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
              {cleaningStats.alignedCount} clean bars ready
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Cleaning Toggles */}
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Data Hygiene Rules
              </p>
              {(
                [
                  {
                    key: 'dropMissing',
                    label: 'Drop Missing OHLC Bars',
                    stat: `${cleaningStats.droppedMissing} removed`,
                  },
                  {
                    key: 'filterZeroVolume',
                    label: 'Filter Zero-Volume Ticks',
                    stat: `${cleaningStats.droppedZeroVol} removed`,
                  },
                  {
                    key: 'removeOutliers',
                    label: 'Reject >18% Spike Outliers',
                    stat: `${cleaningStats.droppedOutliers} removed`,
                  },
                  {
                    key: 'alignTimestamps',
                    label: 'UTC Timestamp Alignment',
                    stat: 'Sorted ascending',
                  },
                ] as const
              ).map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={cleaningConfig[item.key]}
                      onChange={(e) =>
                        onUpdateCleaning({
                          ...cleaningConfig,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                    {item.label}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {item.stat}
                  </span>
                </label>
              ))}
            </div>

            {/* Feature Engineering Sliders */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Technical Indicator Parameters
              </p>
              {[
                {
                  key: 'fastMa' as const,
                  label: 'Fast Moving Average (MA)',
                  min: 5,
                  max: 35,
                  val: featureConfig.fastMa,
                },
                {
                  key: 'slowMa' as const,
                  label: 'Slow Moving Average (MA)',
                  min: 25,
                  max: 100,
                  val: featureConfig.slowMa,
                },
                {
                  key: 'rsiLength' as const,
                  label: 'RSI Momentum Period',
                  min: 7,
                  max: 28,
                  val: featureConfig.rsiLength,
                },
                {
                  key: 'atrLength' as const,
                  label: 'ATR Volatility Period',
                  min: 7,
                  max: 28,
                  val: featureConfig.atrLength,
                },
              ].map((ctrl) => (
                <div key={ctrl.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300">
                      {ctrl.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {ctrl.val}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    value={ctrl.val}
                    onChange={(e) =>
                      onUpdateFeatures({
                        ...featureConfig,
                        [ctrl.key]: Number(e.target.value),
                      })
                    }
                    className="w-full accent-orange-600"
                  />
                </div>
              ))}
            </div>
          </div>

          {showCode && (
            <pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
              {`df["ma${featureConfig.fastMa}"] = df["close"].rolling(${featureConfig.fastMa}).mean()
df["ma${featureConfig.slowMa}"] = df["close"].rolling(${featureConfig.slowMa}).mean()
df["rsi"] = ta.rsi(df["close"], length=${featureConfig.rsiLength})
df["atr"] = ta.atr(df["high"], df["low"], df["close"], length=${featureConfig.atrLength})`}
            </pre>
          )}
        </div>
      </div>

      {/* Stage 4: Structured Agent Input Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              3. Structured Agent Input Preview (Latest 8 Bars)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Exact schema passed to the Gemini Trading Agent
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 text-right font-medium">Open</th>
                <th className="py-2 text-right font-medium">High</th>
                <th className="py-2 text-right font-medium">Low</th>
                <th className="py-2 text-right font-medium">Close</th>
                <th className="py-2 text-right font-medium">Volume</th>
                <th className="py-2 text-right font-medium">MA {featureConfig.fastMa}</th>
                <th className="py-2 text-right font-medium">MA {featureConfig.slowMa}</th>
                <th className="py-2 text-right font-medium">RSI</th>
                <th className="py-2 text-right font-medium">ATR</th>
                <th className="py-2 text-right font-medium">Regime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono dark:divide-slate-800 tabular-nums">
              {previewRows.map((r) => (
                <tr
                  key={r.timestamp}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="py-2 text-slate-700 dark:text-slate-300">
                    {r.date}
                  </td>
                  <td className="py-2 text-right">
                    {formatPrice(r.open, market.decimals)}
                  </td>
                  <td className="py-2 text-right">
                    {formatPrice(r.high, market.decimals)}
                  </td>
                  <td className="py-2 text-right">
                    {formatPrice(r.low, market.decimals)}
                  </td>
                  <td className="py-2 text-right font-semibold text-slate-900 dark:text-slate-100">
                    {formatPrice(r.close, market.decimals)}
                  </td>
                  <td className="py-2 text-right text-slate-500">
                    {r.volume.toLocaleString()}
                  </td>
                  <td className="py-2 text-right text-blue-600 dark:text-blue-400">
                    {r.maFast !== null ? formatPrice(r.maFast, market.decimals) : '—'}
                  </td>
                  <td className="py-2 text-right text-orange-600 dark:text-orange-400">
                    {r.maSlow !== null ? formatPrice(r.maSlow, market.decimals) : '—'}
                  </td>
                  <td className="py-2 text-right">{r.rsi ?? '—'}</td>
                  <td className="py-2 text-right">
                    {r.atr !== null ? formatPrice(r.atr, market.decimals) : '—'}
                  </td>
                  <td className="py-2 text-right font-sans text-slate-600 dark:text-slate-300">
                    {r.regime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
