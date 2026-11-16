import React, { useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Loader2,
  Play,
  Plug,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import {
  McpConnectionState,
  McpToolExecutionResult,
  McpTransportMode,
  NseSnapshot,
} from '../types/trading';

interface NseMcpPanelProps {
  connection: McpConnectionState | null;
  snapshot: NseSnapshot | null;
  loading: boolean;
  onRefresh: () => void;
  onConnect: (mode: McpTransportMode, url?: string) => Promise<void>;
  onSelectIndexSymbol?: (symbol: string) => void;
}

const PRESET_CALLS: Array<{
  label: string;
  toolName: string;
  args: Record<string, unknown>;
}> = [
  { label: 'Market Status', toolName: 'nse_get_market_status', args: {} },
  { label: 'Live Indices', toolName: 'nse_list_indices', args: { max_items: 12 } },
  {
    label: 'NIFTY Option Chain',
    toolName: 'nse_filtered_option_chain',
    args: { symbol: 'NIFTY', strike_range: 4 },
  },
  { label: 'NSE ETFs', toolName: 'nse_list_etf', args: { max_items: 10 } },
  {
    label: 'Corporate Announcements',
    toolName: 'nse_corporate_announcements',
    args: { symbol: 'RELIANCE', max_items: 5 },
  },
  { label: 'Current IPOs', toolName: 'nse_current_ipos', args: {} },
  { label: 'Block Deals', toolName: 'nse_block_deals', args: { max_items: 10 } },
  { label: 'BSE Quote (RELIANCE)', toolName: 'bse_quote', args: { scripcode: '500325' } },
];

export const NseMcpPanel: React.FC<NseMcpPanelProps> = ({
  connection,
  snapshot,
  loading,
  onRefresh,
  onConnect,
  onSelectIndexSymbol,
}) => {
  const [modeInput, setModeInput] = useState<McpTransportMode>(
    connection?.mode || 'stdio'
  );
  const [urlInput, setUrlInput] = useState(
    connection?.remoteUrl || 'http://localhost:3001/mcp'
  );
  const [connecting, setConnecting] = useState(false);

  const [selectedTool, setSelectedTool] = useState('nse_get_market_status');
  const [argsText, setArgsText] = useState('{}');
  const [runningTool, setRunningTool] = useState(false);
  const [toolResult, setToolResult] = useState<McpToolExecutionResult | null>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const capitalMarket = useMemo(() => {
    return snapshot?.marketStatus?.find(
      (m) => String(m.market || '').toLowerCase() === 'capital market'
    );
  }, [snapshot]);

  const keyIndices = useMemo(() => {
    const wanted = [
      'NIFTY 50',
      'NIFTY BANK',
      'INDIA VIX',
      'NIFTY IT',
      'NIFTY FIN SERVICE',
      'NIFTY NEXT 50',
    ];
    const rows = snapshot?.indices || [];
    const matched = wanted
      .map((name) =>
        rows.find(
          (r) => String(r.indexSymbol || r.index || '').toUpperCase() === name
        )
      )
      .filter((r): r is Record<string, unknown> => Boolean(r));
    return matched.length > 0 ? matched : rows.slice(0, 6);
  }, [snapshot]);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    try {
      await onConnect(modeInput, modeInput === 'stdio' ? undefined : urlInput);
    } finally {
      setConnecting(false);
    }
  };

  const executeTool = async (toolName: string, parsedArgs: Record<string, unknown>) => {
    setRunningTool(true);
    setToolError(null);
    try {
      const resp = await fetch('/api/mcp/nse/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, args: parsedArgs }),
      });
      const json = await resp.json();
      if (!resp.ok && !json.rawText) {
        throw new Error(json.error || 'MCP tool call failed.');
      }
      setToolResult(json);
    } catch (err) {
      setToolError(
        err instanceof Error ? err.message : 'Unable to execute MCP tool.'
      );
    } finally {
      setRunningTool(false);
    }
  };

  const handleRunSelectedTool = async () => {
    try {
      const parsed = argsText.trim() ? JSON.parse(argsText) : {};
      await executeTool(selectedTool, parsed);
    } catch {
      setToolError('Arguments must be valid JSON (for example: {"symbol": "NIFTY"}).');
    }
  };

  const isConnected = connection?.status === 'connected';

  return (
    <div className="space-y-5">
      {/* Connection Status & Server Selector */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                NSE MCP Server Connection (Model Context Protocol)
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                {isConnected
                  ? `Connected · ${connection?.toolCount ?? 0} Tools`
                  : connection?.status || 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {connection?.targetLabel || 'Built-in nse-bse-mcp (Stdio)'}
              {capitalMarket
                ? ` · NSE Capital Market: ${String(capitalMarket.marketStatus)} (${String(
                    capitalMarket.tradeDate || ''
                  )})`
                : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Live Snapshot
          </button>
        </div>

        {/* Transport Configurator */}
        <form
          onSubmit={handleConnectSubmit}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              MCP Transport
            </label>
            <select
              value={modeInput}
              onChange={(e) => setModeInput(e.target.value as McpTransportMode)}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="stdio">Built-in nse-bse-mcp (Stdio · 59 Tools)</option>
              <option value="streamable-http">Remote NSE MCP (Streamable HTTP)</option>
              <option value="sse">Remote NSE MCP (SSE)</option>
            </select>
          </div>

          {modeInput !== 'stdio' && (
            <div className="min-w-[260px] flex-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                NSE MCP Server Endpoint URL
              </label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="http://localhost:3001/mcp"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={connecting}
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-60 whitespace-nowrap"
          >
            {connecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            {connecting ? 'Connecting...' : 'Connect / Reconnect'}
          </button>
        </form>

        {connection?.lastError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            MCP Error: {connection.lastError}
          </div>
        )}

        {/* Live NSE Indices Grid from MCP */}
        {keyIndices.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Activity className="h-3.5 w-3.5 text-emerald-600" />
                Live NSE Indices via MCP (`nse_list_indices`)
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Updated {snapshot?.fetchedAt ? new Date(snapshot.fetchedAt).toLocaleTimeString() : 'Live'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 tabular-nums">
              {keyIndices.map((idx) => {
                const name = String(idx.indexSymbol || idx.index || 'INDEX');
                const last = Number(idx.last) || 0;
                const pct = Number(idx.percentChange) || 0;
                const clickableSymbol =
                  name === 'NIFTY 50'
                    ? 'NIFTY50'
                    : name === 'NIFTY BANK'
                      ? 'BANKNIFTY'
                      : null;
                return (
                  <div
                    key={name}
                    onClick={() =>
                      clickableSymbol && onSelectIndexSymbol?.(clickableSymbol)
                    }
                    className={`rounded-md border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-950/60 ${
                      clickableSymbol
                        ? 'cursor-pointer hover:border-orange-400 transition-colors'
                        : ''
                    }`}
                  >
                    <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {name}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {last.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p
                      className={`font-mono text-[11px] font-medium ${
                        pct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {pct >= 0 ? '+' : ''}
                      {pct.toFixed(2)}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive MCP Tool Runner */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live NSE MCP Tool Runner ({connection?.tools.length ?? 0} Available Tools)
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Query live NSE quotes, option chains, ETFs, corporate filings, IPOs, or block deals directly over MCP
            </p>
          </div>
          {toolResult && (
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {toolResult.toolName} · {toolResult.durationMs}ms
            </span>
          )}
        </div>

        {/* Preset Quick Calls */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {PRESET_CALLS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setSelectedTool(p.toolName);
                setArgsText(JSON.stringify(p.args));
                executeTool(p.toolName, p.args);
              }}
              className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-orange-400 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Tool Selector + Args */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              MCP Tool
            </label>
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              {(connection?.tools.length
                ? connection.tools
                : [{ name: 'nse_get_market_status', description: '' }]
              ).map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-5">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              JSON Arguments
            </label>
            <input
              type="text"
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder='{"symbol": "NIFTY", "strike_range": 4}'
              className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="button"
              onClick={handleRunSelectedTool}
              disabled={runningTool || !isConnected}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-700"
            >
              {runningTool ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Run Tool
            </button>
          </div>
        </div>

        {toolError && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {toolError}
          </div>
        )}

        {toolResult && (
          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
            {typeof toolResult.data === 'string'
              ? toolResult.data
              : JSON.stringify(toolResult.data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
