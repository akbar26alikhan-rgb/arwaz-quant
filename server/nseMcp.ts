import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type McpTransportMode = 'stdio' | 'streamable-http' | 'sse';

export interface McpToolSummary {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  mode: McpTransportMode;
  targetLabel: string;
  remoteUrl: string;
  serverName: string;
  serverVersion: string;
  toolCount: number;
  tools: McpToolSummary[];
  lastError: string | null;
  connectedAt: string | null;
}

export interface McpToolExecutionResult {
  ok: boolean;
  toolName: string;
  durationMs: number;
  isError: boolean;
  data: unknown;
  rawText: string;
}

export interface NseLiveCandle {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NseSnapshot {
  fetchedAt: string;
  marketStatus: Array<Record<string, unknown>>;
  indices: Array<Record<string, unknown>>;
}

let activeClient: Client | null = null;
let activeTransport:
  | StdioClientTransport
  | StreamableHTTPClientTransport
  | SSEClientTransport
  | null = null;
let connectPromise: Promise<McpConnectionState> | null = null;

let state: McpConnectionState = {
  status: 'disconnected',
  mode: 'stdio',
  targetLabel: 'Built-in nse-bse-mcp (Stdio)',
  remoteUrl: '',
  serverName: 'nse-bse-mcp-server',
  serverVersion: '1.0.0',
  toolCount: 0,
  tools: [],
  lastError: null,
  connectedAt: null,
};

let snapshotCache: { ts: number; data: NseSnapshot } | null = null;
const quoteCache = new Map<string, { ts: number; data: Record<string, unknown> }>();

export function parseMcpTextToJson(rawText: string): unknown {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // nse-bse-mcp prepends a warning line (e.g. "⚠️ Large arrays truncated...") before JSON
    const objIdx = trimmed.indexOf('{');
    const arrIdx = trimmed.indexOf('[');
    let startIdx = -1;
    if (objIdx !== -1 && arrIdx !== -1) {
      startIdx = Math.min(objIdx, arrIdx);
    } else {
      startIdx = Math.max(objIdx, arrIdx);
    }
    if (startIdx >= 0) {
      try {
        return JSON.parse(trimmed.slice(startIdx));
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
}

async function teardownActiveConnection() {
  if (activeClient) {
    try {
      await activeClient.close();
    } catch {
      // ignore close errors
    }
    activeClient = null;
  }
  if (activeTransport) {
    try {
      await activeTransport.close();
    } catch {
      // ignore close errors
    }
    activeTransport = null;
  }
}

export async function connectNseMcp(options?: {
  mode?: McpTransportMode;
  url?: string;
}): Promise<McpConnectionState> {
  if (connectPromise) {
    return connectPromise;
  }

  const mode: McpTransportMode = options?.mode ?? 'stdio';
  const remoteUrl = (options?.url ?? '').trim();

  connectPromise = (async () => {
    await teardownActiveConnection();
    snapshotCache = null;

    state = {
      ...state,
      status: 'connecting',
      mode,
      remoteUrl,
      targetLabel:
        mode === 'stdio'
          ? 'Built-in nse-bse-mcp (Stdio)'
          : `${mode === 'streamable-http' ? 'Streamable HTTP' : 'SSE'} · ${remoteUrl}`,
      lastError: null,
    };

    try {
      const client = new Client(
        { name: 'arwaz-quant-nse-client', version: '1.0.0' },
        { capabilities: {} }
      );

      let transport:
        | StdioClientTransport
        | StreamableHTTPClientTransport
        | SSEClientTransport;

      if (mode === 'stdio') {
        const stdioEntry = path.resolve(
          __dirname,
          '..',
          'node_modules',
          'nse-bse-mcp',
          'dist',
          'stdio-server.js'
        );
        transport = new StdioClientTransport({
          command: process.execPath,
          args: [stdioEntry],
          stderr: 'pipe',
        });
      } else {
        if (!remoteUrl) {
          throw new Error('Remote NSE MCP server URL is required.');
        }
        const parsedUrl = new URL(remoteUrl);
        transport =
          mode === 'streamable-http'
            ? new StreamableHTTPClientTransport(parsedUrl)
            : new SSEClientTransport(parsedUrl);
      }

      transport.onerror = (err) => {
        state = {
          ...state,
          lastError: err.message,
        };
      };

      transport.onclose = () => {
        if (activeTransport === transport) {
          activeClient = null;
          activeTransport = null;
          state = {
            ...state,
            status: 'disconnected',
          };
        }
      };

      await client.connect(transport);
      const listResp = await client.listTools();
      const serverVersion = client.getServerVersion();

      const tools: McpToolSummary[] = (listResp.tools || []).map((t) => ({
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      }));

      activeClient = client;
      activeTransport = transport;

      state = {
        status: 'connected',
        mode,
        targetLabel:
          mode === 'stdio'
            ? 'Built-in nse-bse-mcp (Stdio)'
            : `${mode === 'streamable-http' ? 'Streamable HTTP' : 'SSE'} · ${remoteUrl}`,
        remoteUrl,
        serverName: serverVersion?.name || 'nse-bse-mcp-server',
        serverVersion: serverVersion?.version || '1.0.0',
        toolCount: tools.length,
        tools,
        lastError: null,
        connectedAt: new Date().toISOString(),
      };

      return state;
    } catch (err) {
      await teardownActiveConnection();
      const message = err instanceof Error ? err.message : String(err);
      state = {
        ...state,
        status: 'error',
        toolCount: 0,
        tools: [],
        lastError: message,
      };
      return state;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

export async function ensureNseMcpConnected(): Promise<McpConnectionState> {
  if (activeClient && state.status === 'connected') {
    return state;
  }
  return connectNseMcp({
    mode: state.mode,
    url: state.remoteUrl || undefined,
  });
}

export function getNseMcpState(): McpConnectionState {
  return state;
}

export async function callNseMcpTool(
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<McpToolExecutionResult> {
  const started = Date.now();
  const conn = await ensureNseMcpConnected();
  if (!activeClient || conn.status !== 'connected') {
    throw new Error(conn.lastError || 'NSE MCP server is not connected.');
  }

  const response = await activeClient.callTool({
    name: toolName,
    arguments: args,
  });

  const textParts = Array.isArray(response.content)
    ? response.content
        .filter(
          (item): item is { type: 'text'; text: string } =>
            Boolean(item) && item.type === 'text' && typeof item.text === 'string'
        )
        .map((item) => item.text)
    : [];

  const rawText = textParts.join('\n').trim();
  const data = parseMcpTextToJson(rawText);
  const isError = Boolean(response.isError);

  return {
    ok: !isError,
    toolName,
    durationMs: Date.now() - started,
    isError,
    data,
    rawText,
  };
}

export async function getLiveNseSnapshot(force = false): Promise<NseSnapshot | null> {
  if (!force && snapshotCache && Date.now() - snapshotCache.ts < 12_000) {
    return snapshotCache.data;
  }

  try {
    const [statusRes, indicesRes] = await Promise.all([
      callNseMcpTool('nse_get_market_status', {}),
      callNseMcpTool('nse_list_indices', {
        max_items: 40,
        fields: [
          'index',
          'indexSymbol',
          'last',
          'variation',
          'percentChange',
          'open',
          'high',
          'low',
          'previousClose',
        ],
      }),
    ]);

    const marketStatus = Array.isArray(statusRes.data)
      ? (statusRes.data as Array<Record<string, unknown>>)
      : [];

    const indicesPayload = indicesRes.data as { data?: unknown } | unknown[];
    const indices = Array.isArray(indicesPayload)
      ? (indicesPayload as Array<Record<string, unknown>>)
      : Array.isArray((indicesPayload as { data?: unknown })?.data)
        ? ((indicesPayload as { data: Array<Record<string, unknown>> }).data)
        : [];

    const snapshot: NseSnapshot = {
      fetchedAt: new Date().toISOString(),
      marketStatus,
      indices,
    };
    snapshotCache = { ts: Date.now(), data: snapshot };
    return snapshot;
  } catch {
    return snapshotCache?.data ?? null;
  }
}

function toYahooNseTicker(symbol: string): string {
  const clean = symbol.trim().toUpperCase();
  if (clean === 'NIFTY50' || clean === 'NIFTY 50' || clean === 'NIFTY') {
    return '^NSEI';
  }
  if (clean === 'BANKNIFTY' || clean === 'NIFTY BANK') {
    return '^NSEBANK';
  }
  if (clean === 'FINNIFTY' || clean === 'NIFTY FIN SERVICE') {
    return '^CNXFIN';
  }
  if (clean === 'INDIAVIX' || clean === 'INDIA VIX') {
    return '^INDIAVIX';
  }
  return clean.endsWith('.NS') ? clean : `${clean}.NS`;
}

function aggregate4hCandles(hourly: NseLiveCandle[]): NseLiveCandle[] {
  const grouped: NseLiveCandle[] = [];
  for (let i = 0; i < hourly.length; i += 4) {
    const slice = hourly.slice(i, i + 4);
    if (slice.length === 0) continue;
    grouped.push({
      date: slice[slice.length - 1].date,
      timestamp: slice[slice.length - 1].timestamp,
      open: slice[0].open,
      high: Math.max(...slice.map((c) => c.high)),
      low: Math.min(...slice.map((c) => c.low)),
      close: slice[slice.length - 1].close,
      volume: slice.reduce((s, c) => s + c.volume, 0),
    });
  }
  return grouped;
}

async function fetchYahooNseChart(
  symbol: string,
  timeframe: string
): Promise<{
  candles: NseLiveCandle[];
  latestPrice: number | null;
  prevClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  dayOpen: number | null;
  volume: number | null;
} | null> {
  const ticker = toYahooNseTicker(symbol);
  const paramsByTf: Record<string, { interval: string; range: string }> = {
    '15m': { interval: '15m', range: '5d' },
    '1h': { interval: '60m', range: '1mo' },
    '4h': { interval: '60m', range: '3mo' },
    '1D': { interval: '1d', range: '6mo' },
  };
  const cfg = paramsByTf[timeframe] || paramsByTf['1D'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=${cfg.interval}&range=${cfg.range}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            regularMarketPrice?: number;
            chartPreviousClose?: number;
            previousClose?: number;
            regularMarketDayHigh?: number;
            regularMarketDayLow?: number;
            regularMarketVolume?: number;
          };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: Array<number | null>;
              high?: Array<number | null>;
              low?: Array<number | null>;
              close?: Array<number | null>;
              volume?: Array<number | null>;
            }>;
          };
        }>;
      };
    };

    const result = json.chart?.result?.[0];
    if (!result || !Array.isArray(result.timestamp)) return null;
    const quote = result.indicators?.quote?.[0];
    if (!quote) return null;

    const rawCandles: NseLiveCandle[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const tsSec = result.timestamp[i];
      const o = quote.open?.[i];
      const h = quote.high?.[i];
      const l = quote.low?.[i];
      const c = quote.close?.[i];
      const v = quote.volume?.[i];

      if (
        o == null ||
        h == null ||
        l == null ||
        c == null ||
        !Number.isFinite(o) ||
        !Number.isFinite(c) ||
        c <= 0
      ) {
        continue;
      }

      const d = new Date(tsSec * 1000);
      // Format in IST (+05:30) cleanly
      const ist = new Date(d.getTime() + 330 * 60 * 1000);
      const dateStr =
        timeframe === '1D'
          ? ist.toISOString().slice(0, 10)
          : ist.toISOString().slice(5, 16).replace('T', ' ');

      rawCandles.push({
        date: dateStr,
        timestamp: tsSec * 1000,
        open: Math.round(o * 100) / 100,
        high: Math.round(h * 100) / 100,
        low: Math.round(l * 100) / 100,
        close: Math.round(c * 100) / 100,
        volume: Math.max(1, Math.round(v ?? (ticker.startsWith('^') ? 250000 : 120000))),
      });
    }

    const candles =
      timeframe === '4h' ? aggregate4hCandles(rawCandles).slice(-120) : rawCandles.slice(-120);

    const meta = result.meta;
    const lastCandle = candles[candles.length - 1];
    return {
      candles,
      latestPrice:
        typeof meta?.regularMarketPrice === 'number'
          ? Math.round(meta.regularMarketPrice * 100) / 100
          : lastCandle?.close ?? null,
      prevClose:
        typeof meta?.previousClose === 'number'
          ? Math.round(meta.previousClose * 100) / 100
          : typeof meta?.chartPreviousClose === 'number'
            ? Math.round(meta.chartPreviousClose * 100) / 100
            : null,
      dayHigh:
        typeof meta?.regularMarketDayHigh === 'number'
          ? Math.round(meta.regularMarketDayHigh * 100) / 100
          : lastCandle?.high ?? null,
      dayLow:
        typeof meta?.regularMarketDayLow === 'number'
          ? Math.round(meta.regularMarketDayLow * 100) / 100
          : lastCandle?.low ?? null,
      dayOpen: lastCandle?.open ?? null,
      volume:
        typeof meta?.regularMarketVolume === 'number'
          ? Math.round(meta.regularMarketVolume)
          : lastCandle?.volume ?? null,
    };
  } catch {
    return null;
  }
}

export async function getLiveIndianMarketData(
  symbol: string,
  timeframe: string
): Promise<{
  source: string;
  sourceLabel: string;
  latestPrice: number | null;
  prevClose: number | null;
  changePct: number | null;
  marketState: string;
  tradeDate: string;
  candles: NseLiveCandle[];
  mcpQuote: Record<string, unknown> | null;
}> {
  const cleanSym = symbol.trim().toUpperCase();
  const [snapshot, chartData] = await Promise.all([
    getLiveNseSnapshot(false),
    fetchYahooNseChart(cleanSym, timeframe),
  ]);

  let mcpQuote: Record<string, unknown> | null = null;
  let mcpPrice: number | null = null;
  let mcpPrevClose: number | null = null;
  let mcpChangePct: number | null = null;

  const capStatus = snapshot?.marketStatus?.find(
    (m) => String(m.market || '').toLowerCase() === 'capital market'
  );
  const marketState = capStatus
    ? String(capStatus.marketStatus || 'Connected')
    : state.status === 'connected'
      ? 'Connected'
      : 'Standby';
  const tradeDate = capStatus ? String(capStatus.tradeDate || '') : '';

  if (snapshot?.indices?.length) {
    const indexNameMap: Record<string, string> = {
      NIFTY50: 'NIFTY 50',
      BANKNIFTY: 'NIFTY BANK',
      FINNIFTY: 'NIFTY FIN SERVICE',
      INDIAVIX: 'INDIA VIX',
    };
    const targetIdxName = indexNameMap[cleanSym];
    if (targetIdxName) {
      const idxRow = snapshot.indices.find(
        (r) => String(r.indexSymbol || r.index || '').toUpperCase() === targetIdxName
      );
      if (idxRow) {
        mcpQuote = idxRow;
        mcpPrice = Number(idxRow.last) || null;
        mcpPrevClose = Number(idxRow.previousClose) || null;
        mcpChangePct = Number(idxRow.percentChange) ?? null;
      }
    }
  }

  // Try direct MCP equity quote if available (some remote NSE MCP servers expose it cleanly)
  if (!mcpQuote && cleanSym !== 'NIFTY50' && cleanSym !== 'BANKNIFTY') {
    const cachedQ = quoteCache.get(cleanSym);
    if (cachedQ && Date.now() - cachedQ.ts < 8_000) {
      mcpQuote = cachedQ.data;
    } else if (state.status === 'connected') {
      try {
        const eqRes = await callNseMcpTool('nse_equity_quote', { symbol: cleanSym });
        if (eqRes.ok && eqRes.data && typeof eqRes.data === 'object') {
          const obj = eqRes.data as Record<string, unknown>;
          const priceInfo = obj.priceInfo as Record<string, unknown> | undefined;
          if (priceInfo && Number(priceInfo.lastPrice) > 0) {
            mcpQuote = obj;
            mcpPrice = Number(priceInfo.lastPrice);
            mcpPrevClose = Number(priceInfo.previousClose) || null;
            mcpChangePct = Number(priceInfo.pChange) ?? null;
            quoteCache.set(cleanSym, { ts: Date.now(), data: obj });
          }
        }
      } catch {
        // NSE equity quote blocked or unavailable; fallback to MCP market status + Yahoo NSE feed below
      }
    }
  }

  const latestPrice = mcpPrice ?? chartData?.latestPrice ?? null;
  const prevClose = mcpPrevClose ?? chartData?.prevClose ?? null;
  const changePct =
    mcpChangePct ??
    (latestPrice && prevClose && prevClose > 0
      ? Math.round(((latestPrice - prevClose) / prevClose) * 10000) / 100
      : null);

  const candles = chartData?.candles ? [...chartData.candles] : [];
  if (candles.length > 0 && mcpPrice && mcpPrice > 0) {
    const last = candles[candles.length - 1];
    candles[candles.length - 1] = {
      ...last,
      close: mcpPrice,
      high: Math.max(last.high, mcpPrice),
      low: Math.min(last.low, mcpPrice),
    };
  }

  const sourceLabel =
    state.status === 'connected'
      ? `NSE MCP Live · ${cleanSym} · ${marketState}${tradeDate ? ` (${tradeDate})` : ''}`
      : `NSE Live Feed · ${cleanSym} · ${timeframe}`;

  return {
    source: state.status === 'connected' ? 'nse-mcp' : 'nse-live',
    sourceLabel,
    latestPrice,
    prevClose,
    changePct,
    marketState,
    tradeDate,
    candles,
    mcpQuote,
  };
}
