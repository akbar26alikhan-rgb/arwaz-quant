import React, { useState } from 'react';
import {
  CrossMarketResult,
  EngineeredRow,
  EquityPoint,
  SensitivityCell,
  TradeSignal,
} from '../types/trading';
import { formatPrice } from '../engine/marketData';

interface CandlestickChartProps {
  rows: EngineeredRow[];
  decimals: number;
  showMaFast: boolean;
  showMaSlow: boolean;
  signal?: TradeSignal | null;
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  rows,
  decimals,
  showMaFast,
  showMaSlow,
  signal,
  height = 360,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const visible = rows.slice(-72);

  if (visible.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No candle data available after cleaning filters.
      </div>
    );
  }

  const width = 880;
  const padLeft = 16;
  const padRight = 84;
  const padTop = 20;
  const padBottom = 34;
  const volHeight = 46;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom - volHeight - 10;

  let minP = Math.min(...visible.map((r) => r.low));
  let maxP = Math.max(...visible.map((r) => r.high));

  if (signal && signal.action !== 'HOLD') {
    minP = Math.min(minP, signal.stopLoss, signal.entry);
    maxP = Math.max(maxP, signal.target2, signal.target1, signal.entry);
  }

  const rangeP = Math.max(maxP - minP, 1e-6);
  minP -= rangeP * 0.06;
  maxP += rangeP * 0.06;
  const fullRange = maxP - minP;

  const maxVol = Math.max(...visible.map((r) => r.volume), 1);

  const xFor = (i: number) =>
    padLeft + ((i + 0.5) / visible.length) * chartW;
  const yFor = (p: number) =>
    padTop + ((maxP - p) / fullRange) * chartH;

  const candleW = Math.max(3, Math.min(9, (chartW / visible.length) * 0.62));

  const buildMaPath = (key: 'maFast' | 'maSlow') => {
    const pts: string[] = [];
    visible.forEach((r, i) => {
      const val = r[key];
      if (val !== null) {
        pts.push(`${pts.length === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(val).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  };

  const yTicks = Array.from({ length: 5 }, (_, k) => {
    const frac = k / 4;
    const price = maxP - frac * fullRange;
    return { price, y: padTop + frac * chartH };
  });

  const activeRow =
    hoverIdx !== null && visible[hoverIdx]
      ? visible[hoverIdx]
      : visible[visible.length - 1];

  return (
    <div className="relative w-full select-none">
      {/* Live OHLCV inspection bar */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          {activeRow.date}
        </span>
        <span>
          O <strong className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatPrice(activeRow.open, decimals)}</strong>
        </span>
        <span>
          H <strong className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatPrice(activeRow.high, decimals)}</strong>
        </span>
        <span>
          L <strong className="font-mono font-medium text-slate-900 dark:text-slate-100">{formatPrice(activeRow.low, decimals)}</strong>
        </span>
        <span>
          C <strong className={`font-mono font-medium ${activeRow.close >= activeRow.open ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatPrice(activeRow.close, decimals)}</strong>
        </span>
        <span>
          RSI <strong className="font-mono font-medium">{activeRow.rsi ?? '—'}</strong>
        </span>
        <span>
          ATR <strong className="font-mono font-medium">{activeRow.atr !== null ? formatPrice(activeRow.atr, decimals) : '—'}</strong>
        </span>
        <span>
          Regime <strong className="font-medium text-slate-800 dark:text-slate-200">{activeRow.regime}</strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal grid */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={t.y}
              y2={t.y}
              className="stroke-slate-200/80 dark:stroke-slate-800"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={width - padRight + 8}
              y={t.y + 4}
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
            >
              {formatPrice(t.price, decimals)}
            </text>
          </g>
        ))}

        {/* Signal horizontal levels */}
        {signal && signal.action !== 'HOLD' && (
          <g>
            {[
              { label: 'T2', price: signal.target2, color: '#16A34A', dash: '4 3' },
              { label: 'T1', price: signal.target1, color: '#16A34A', dash: '0' },
              { label: 'ENTRY', price: signal.entry, color: '#2563EB', dash: '0' },
              { label: 'SL', price: signal.stopLoss, color: '#DC2626', dash: '4 3' },
            ].map((lvl) => {
              const y = yFor(lvl.price);
              return (
                <g key={lvl.label}>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke={lvl.color}
                    strokeWidth="1.25"
                    strokeDasharray={lvl.dash}
                    opacity={0.9}
                  />
                  <rect
                    x={width - padRight + 4}
                    y={y - 9}
                    width={76}
                    height={18}
                    rx={3}
                    fill={lvl.color}
                  />
                  <text
                    x={width - padRight + 8}
                    y={y + 3}
                    className="fill-white text-[9.5px] font-mono font-semibold tabular-nums"
                  >
                    {lvl.label} {formatPrice(lvl.price, decimals)}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Candles + Volume */}
        {visible.map((c, i) => {
          const x = xFor(i);
          const isUp = c.close >= c.open;
          const color = isUp ? '#16A34A' : '#DC2626';
          const yOpen = yFor(c.open);
          const yClose = yFor(c.close);
          const yHigh = yFor(c.high);
          const yLow = yFor(c.low);
          const bodyTop = Math.min(yOpen, yClose);
          const bodyH = Math.max(2, Math.abs(yClose - yOpen));

          const volTop = padTop + chartH + 10;
          const vH = (c.volume / maxVol) * volHeight;

          return (
            <g
              key={c.timestamp}
              onMouseEnter={() => setHoverIdx(i)}
              className="cursor-crosshair"
            >
              {/* Hover column highlight */}
              {hoverIdx === i && (
                <line
                  x1={x}
                  x2={x}
                  y1={padTop}
                  y2={height - padBottom}
                  className="stroke-slate-400/50 dark:stroke-slate-500/50"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
              {/* Wick */}
              <line
                x1={x}
                x2={x}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth="1.25"
              />
              {/* Candle body */}
              <rect
                x={x - candleW / 2}
                y={bodyTop}
                width={candleW}
                height={bodyH}
                fill={color}
                rx={1}
              />
              {/* Volume bar */}
              <rect
                x={x - candleW / 2}
                y={volTop + (volHeight - vH)}
                width={candleW}
                height={vH}
                fill={color}
                opacity={0.32}
              />
              {/* Invisible wide hit target */}
              <rect
                x={x - chartW / visible.length / 2}
                y={padTop}
                width={chartW / visible.length}
                height={height - padTop - padBottom}
                fill="transparent"
              />
            </g>
          );
        })}

        {/* Moving averages */}
        {showMaFast && (
          <path
            d={buildMaPath('maFast')}
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.6"
          />
        )}
        {showMaSlow && (
          <path
            d={buildMaPath('maSlow')}
            fill="none"
            stroke="#EA580C"
            strokeWidth="1.6"
          />
        )}

        {/* Signal badge at latest bar */}
        {signal && signal.action !== 'HOLD' && (
          <g
            transform={`translate(${xFor(visible.length - 4)}, ${Math.max(
              padTop + 14,
              yFor(visible[visible.length - 4].low) + 18
            )})`}
          >
            <rect
              x={-22}
              y={-11}
              width={44}
              height={18}
              rx={3}
              fill={signal.action === 'BUY' ? '#16A34A' : '#DC2626'}
            />
            <text
              x={0}
              y={2}
              textAnchor="middle"
              className="fill-white text-[10px] font-mono font-semibold"
            >
              {signal.action}
            </text>
          </g>
        )}

        {/* X-axis dates */}
        {[0, Math.floor(visible.length / 3), Math.floor((visible.length * 2) / 3), visible.length - 1].map(
          (idx) =>
            visible[idx] ? (
              <text
                key={idx}
                x={xFor(idx)}
                y={height - 8}
                textAnchor="middle"
                className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {visible[idx].date}
              </text>
            ) : null
        )}
      </svg>
    </div>
  );
};

interface DualEquityChartProps {
  data: EquityPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  height?: number;
}

export const DualEquityChart: React.FC<DualEquityChartProps> = ({
  data,
  primaryLabel,
  secondaryLabel,
  height = 220,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  if (data.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-slate-500">
        Insufficient bars to plot equity curve.
      </div>
    );
  }

  const width = 560;
  const padLeft = 12;
  const padRight = 56;
  const padTop = 14;
  const padBottom = 26;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVals = data.flatMap((d) => [d.strategy, d.benchmark]);
  const minV = Math.min(...allVals) * 0.97;
  const maxV = Math.max(...allVals) * 1.03;
  const rangeV = Math.max(maxV - minV, 1);

  const xFor = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
  const yFor = (v: number) => padTop + ((maxV - v) / rangeV) * chartH;

  const pathPrimary = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(d.strategy).toFixed(1)}`)
    .join(' ');
  const pathSecondary = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(d.benchmark).toFixed(1)}`)
    .join(' ');

  const ticks = [0, 0.5, 1].map((f) => ({
    val: maxV - f * rangeV,
    y: padTop + f * chartH,
  }));

  const active =
    hoverIdx !== null && data[hoverIdx] ? data[hoverIdx] : data[data.length - 1];

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className="inline-block h-2 w-3 rounded-xs bg-blue-600" />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2 w-3 rounded-xs bg-slate-400" />
            {secondaryLabel}
          </span>
        </div>
        <div className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
          {active.label} · ${active.strategy.toLocaleString()} vs $
          {active.benchmark.toLocaleString()}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {ticks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={t.y}
              y2={t.y}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeDasharray="3 3"
            />
            <text
              x={width - padRight + 6}
              y={t.y + 4}
              className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
            >
              {Math.round(t.val / 1000)}k
            </text>
          </g>
        ))}

        <path
          d={pathSecondary}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="1.5"
          strokeDasharray="3 2"
        />
        <path d={pathPrimary} fill="none" stroke="#2563EB" strokeWidth="2.1" />

        {hoverIdx !== null && data[hoverIdx] && (
          <line
            x1={xFor(hoverIdx)}
            x2={xFor(hoverIdx)}
            y1={padTop}
            y2={padTop + chartH}
            className="stroke-slate-400"
            strokeWidth="1"
          />
        )}

        {/* Interactive hover slices */}
        {data.map((d, i) => (
          <rect
            key={d.label + i}
            x={xFor(i) - chartW / data.length / 2}
            y={padTop}
            width={Math.max(4, chartW / data.length)}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => (
          <text
            key={idx}
            x={xFor(idx)}
            y={height - 6}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono tabular-nums"
          >
            {data[idx]?.label.slice(0, 7)}
          </text>
        ))}
      </svg>
    </div>
  );
};

export const DrawdownChart: React.FC<{ data: EquityPoint[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const width = 380;
  const height = 160;
  const padLeft = 10;
  const padRight = 42;
  const padTop = 12;
  const padBottom = 22;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minDD = Math.min(-5, ...data.map((d) => d.drawdownPct));
  const xFor = (i: number) => padLeft + (i / (data.length - 1)) * chartW;
  const yFor = (dd: number) => padTop + (dd / minDD) * chartH;

  const line = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(d.drawdownPct).toFixed(1)}`)
    .join(' ');
  const area = `${line} L${xFor(data.length - 1).toFixed(1)},${padTop} L${padLeft},${padTop} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, minDD / 2, minDD].map((val, idx) => {
        const y = yFor(val);
        return (
          <g key={idx}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeDasharray="2 2"
            />
            <text
              x={width - padRight + 5}
              y={y + 3}
              className="fill-slate-500 dark:fill-slate-400 text-[9.5px] font-mono tabular-nums"
            >
              {val.toFixed(0)}%
            </text>
          </g>
        );
      })}
      <path d={area} fill="#DC2626" opacity={0.16} />
      <path d={line} fill="none" stroke="#DC2626" strokeWidth="1.6" />
    </svg>
  );
};

export const MonteCarloChart: React.FC<{
  paths: number[][];
  median: number[];
}> = ({ paths, median }) => {
  if (paths.length === 0) return null;
  const width = 380;
  const height = 160;
  const padLeft = 10;
  const padRight = 48;
  const padTop = 12;
  const padBottom = 22;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVals = paths.flat();
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.03;
  const rangeV = Math.max(maxV - minV, 1);
  const steps = median.length;

  const xFor = (i: number) => padLeft + (i / (steps - 1)) * chartW;
  const yFor = (v: number) => padTop + ((maxV - v) / rangeV) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {[0, 0.5, 1].map((f, idx) => {
        const v = maxV - f * rangeV;
        const y = padTop + f * chartH;
        return (
          <g key={idx}>
            <line
              x1={padLeft}
              x2={width - padRight}
              y1={y}
              y2={y}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeDasharray="2 2"
            />
            <text
              x={width - padRight + 5}
              y={y + 3}
              className="fill-slate-500 dark:fill-slate-400 text-[9.5px] font-mono tabular-nums"
            >
              ${Math.round(v / 1000)}k
            </text>
          </g>
        );
      })}
      {paths.map((path, pIdx) => (
        <path
          key={pIdx}
          d={path
            .map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
            .join(' ')}
          fill="none"
          className="stroke-slate-400/35 dark:stroke-slate-600/45"
          strokeWidth="1"
        />
      ))}
      <path
        d={median
          .map((v, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`)
          .join(' ')}
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.2"
      />
    </svg>
  );
};

export const SensitivityHeatmap: React.FC<{ cells: SensitivityCell[] }> = ({
  cells,
}) => {
  const fasts = [10, 20, 30, 40, 50];
  const slows = [100, 80, 60, 40, 20];

  const colorFor = (sharpe: number) => {
    if (sharpe >= 1.1) return 'bg-emerald-600 text-white';
    if (sharpe >= 0.7) return 'bg-emerald-500/80 text-white';
    if (sharpe >= 0.35) return 'bg-amber-400/85 text-slate-950';
    if (sharpe >= 0) return 'bg-orange-400/80 text-slate-950';
    return 'bg-red-500/80 text-white';
  };

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-6 gap-1 text-[10px] font-mono tabular-nums">
        <div className="text-slate-400 flex items-center justify-end pr-1">
          Slow\Fast
        </div>
        {fasts.map((f) => (
          <div
            key={f}
            className="text-center font-medium text-slate-500 dark:text-slate-400"
          >
            {f}
          </div>
        ))}
        {slows.map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center justify-end pr-1 font-medium text-slate-500 dark:text-slate-400">
              {s}
            </div>
            {fasts.map((f) => {
              const cell = cells.find((c) => c.fastMa === f && c.slowMa === s);
              const val = cell ? cell.sharpe : 0;
              return (
                <div
                  key={`${f}-${s}`}
                  title={`Fast MA ${f} / Slow MA ${s}: Sharpe ${val}, Return ${cell?.returnPct ?? 0}%`}
                  className={`flex h-7 items-center justify-center rounded-sm text-[10px] font-medium ${colorFor(
                    val
                  )}`}
                >
                  {f >= s ? '—' : val.toFixed(2)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const CrossMarketBarChart: React.FC<{ data: CrossMarketResult[] }> = ({
  data,
}) => {
  const maxAbs = Math.max(
    40,
    ...data.flatMap((d) => [
      Math.abs(d.strategyReturnPct),
      Math.abs(d.buyHoldReturnPct),
    ])
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px] text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-blue-600" />
          Strategy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-xs bg-slate-300 dark:bg-slate-600" />
          Buy & Hold
        </span>
      </div>
      <div className="space-y-2.5">
        {data.map((item) => {
          const stratW = Math.min(100, Math.max(4, (Math.max(0, item.strategyReturnPct) / maxAbs) * 100));
          const bhW = Math.min(100, Math.max(4, (Math.max(0, item.buyHoldReturnPct) / maxAbs) * 100));
          return (
            <div key={item.symbol} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {item.marketLabel}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300">
                  {item.strategyReturnPct >= 0 ? '+' : ''}
                  {item.strategyReturnPct}% vs {item.buyHoldReturnPct >= 0 ? '+' : ''}
                  {item.buyHoldReturnPct}%
                </span>
              </div>
              <div className="space-y-1">
                <div className="h-2 w-full rounded-xs bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-xs bg-blue-600"
                    style={{ width: `${stratW}%` }}
                  />
                </div>
                <div className="h-2 w-full rounded-xs bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-xs bg-slate-400 dark:bg-slate-500"
                    style={{ width: `${bhW}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
