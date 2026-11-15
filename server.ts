import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface BhavcopyItem {
  symbol: string;
  name: string;
  series: string;
  isin: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  last: number;
  prevClose: number;
  changePct: number;
  volume: number;
  turnover: number;
  trades: number;
}

const bhavcopyDayCache = new Map<string, BhavcopyItem[]>();
let latestBhavcopyDate: string | null = null;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseNseBhavcopyCsv(csvText: string): BhavcopyItem[] {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]);
  const idx = (col: string) => header.indexOf(col);

  const iSym = idx('TckrSymb');
  const iSeries = idx('SctySrs');
  const iName = idx('FinInstrmNm');
  const iIsin = idx('ISIN');
  const iDate = idx('TradDt');
  const iOpen = idx('OpnPric');
  const iHigh = idx('HghPric');
  const iLow = idx('LwPric');
  const iClose = idx('ClsPric');
  const iLast = idx('LastPric');
  const iPrev = idx('PrvsClsgPric');
  const iVol = idx('TtlTradgVol');
  const iVal = idx('TtlTrfVal');
  const iTrades = idx('TtlNbOfTxsExctd');

  if (iSym === -1 || iClose === -1) return [];

  const rows: BhavcopyItem[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    if (cols.length < 10) continue;
    const series = cols[iSeries] || '';
    if (series !== 'EQ' && series !== 'BE') continue;

    const close = Number(cols[iClose]);
    const prevClose = Number(cols[iPrev]) || close;
    const open = Number(cols[iOpen]) || close;
    const high = Number(cols[iHigh]) || close;
    const low = Number(cols[iLow]) || close;
    const last = Number(cols[iLast]) || close;
    const volume = Number(cols[iVol]) || 0;
    const turnover = Number(cols[iVal]) || 0;
    const trades = Number(cols[iTrades]) || 0;

    if (!Number.isFinite(close) || close <= 0) continue;

    const changePct =
      prevClose > 0
        ? Math.round(((close - prevClose) / prevClose) * 10000) / 100
        : 0;

    rows.push({
      symbol: cols[iSym],
      name: (cols[iName] || cols[iSym]).replace(/^"|"$/g, ''),
      series,
      isin: cols[iIsin] || '',
      tradeDate: cols[iDate] || '',
      open,
      high,
      low,
      close,
      last,
      prevClose,
      changePct,
      volume,
      turnover,
      trades,
    });
  }

  rows.sort((a, b) => b.turnover - a.turnover);
  return rows;
}

async function fetchNseBhavcopyForDate(yyyymmdd: string): Promise<BhavcopyItem[] | null> {
  if (bhavcopyDayCache.has(yyyymmdd)) {
    return bhavcopyDayCache.get(yyyymmdd)!;
  }
  const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${yyyymmdd}_F_0000.csv.zip`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: 'https://www.nseindia.com/',
      },
      signal: AbortSignal.timeout(7000),
    });
    if (!resp.ok) return null;
    const arrayBuf = await resp.arrayBuffer();
    const zip = new AdmZip(Buffer.from(arrayBuf));
    const entry = zip.getEntries().find((e) => e.entryName.endsWith('.csv'));
    if (!entry) return null;
    const csvText = entry.getData().toString('utf8');
    const parsed = parseNseBhavcopyCsv(csvText);
    if (parsed.length === 0) return null;
    bhavcopyDayCache.set(yyyymmdd, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function getLatestNseBhavcopy(): Promise<{
  dateCode: string;
  tradeDate: string;
  sourceUrl: string;
  rows: BhavcopyItem[];
} | null> {
  if (latestBhavcopyDate && bhavcopyDayCache.has(latestBhavcopyDate)) {
    const rows = bhavcopyDayCache.get(latestBhavcopyDate)!;
    return {
      dateCode: latestBhavcopyDate,
      tradeDate: rows[0]?.tradeDate || latestBhavcopyDate,
      sourceUrl: `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${latestBhavcopyDate}_F_0000.csv.zip`,
      rows,
    };
  }

  const now = new Date();
  for (let offset = 0; offset <= 10; offset++) {
    const d = new Date(now.getTime() - offset * 86400000);
    const day = d.getUTCDay();
    if (day === 0 || day === 6) continue;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const code = `${yyyy}${mm}${dd}`;
    const rows = await fetchNseBhavcopyForDate(code);
    if (rows && rows.length > 0) {
      latestBhavcopyDate = code;
      return {
        dateCode: code,
        tradeDate: rows[0].tradeDate || `${yyyy}-${mm}-${dd}`,
        sourceUrl: `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${code}_F_0000.csv.zip`,
        rows,
      };
    }
  }
  return null;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please check Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED')
  );
}

function formatFriendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
  } catch {
    // not JSON
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE')) {
    return 'The AI model is temporarily busy due to high demand. Please try again in a few seconds.';
  }
  return raw || fallback;
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
    thinkingLevel: ThinkingLevel;
  }
) {
  const attempts: Array<{ model: string; useThinking: boolean; delayMs: number }> = [
    { model: 'gemini-4-hydrogen', useThinking: true, delayMs: 0 },
    { model: 'gemini-4-hydrogen', useThinking: true, delayMs: 700 },
    { model: 'gemini-3.1-flash-lite', useThinking: false, delayMs: 500 },
    { model: 'gemini-3.1-flash-lite', useThinking: false, delayMs: 1200 },
  ];

  let lastError: unknown;
  for (const step of attempts) {
    if (step.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, step.delayMs));
    }
    try {
      const config: Record<string, unknown> = {
        systemInstruction: params.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: params.responseSchema,
      };
      if (step.useThinking) {
        config.thinkingConfig = { thinkingLevel: params.thinkingLevel };
      }
      return await ai.models.generateContent({
        model: step.model,
        contents: params.contents,
        config,
      });
    } catch (err) {
      lastError = err;
      if (!isTransientError(err)) {
        throw err;
      }
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  app.post('/api/agent/analyze', async (req, res) => {
    try {
      const {
        symbol,
        exchange,
        timeframe,
        riskPerTradePct,
        strategyMode,
        macroContext,
        recentCandles,
      } = req.body ?? {};

      if (!symbol || !Array.isArray(recentCandles) || recentCandles.length === 0) {
        res.status(400).json({
          error: 'Missing symbol or recent market candle data.',
        });
        return;
      }

      const ai = getGeminiClient();
      const lastCandle = recentCandles[recentCandles.length - 1];
      const condensedRows = recentCandles.slice(-15).map((row: Record<string, unknown>) => ({
        date: row.date,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
        ma20: row.maFast,
        ma50: row.maSlow,
        rsi: row.rsi,
        atr: row.atr,
        adx: row.adx,
        regime: row.regime,
      }));

      const prompt = `You are an institutional quantitative trading agent analyzing ${symbol} (${exchange}) on the ${timeframe} timeframe.
Strategy Mode: ${strategyMode || 'Trend + Momentum'}
Target Risk Per Trade: ${riskPerTradePct || 1}%
Macro & News Context: ${macroContext || 'Normal market conditions, no high-impact surprise events.'}
Latest Close Price: ${lastCandle.close}
Latest ATR(14): ${lastCandle.atr ?? 'N/A'}

Recent engineered market context (last 15 bars):
${JSON.stringify(condensedRows)}

Instructions:
1. Evaluate trend (price vs ma20 & ma50), momentum (rsi), trend strength (adx), volatility (atr), and macro context.
2. Decide action: "BUY", "SELL", or "HOLD".
3. Calculate realistic, strictly ordered price levels relative to the latest close (${lastCandle.close}):
   - For BUY: stopLoss < entry < target1 < target2, with risk/reward >= 2.0 where possible using ATR multiples.
   - For SELL: target2 < target1 < entry < stopLoss.
   - For HOLD: set entry = ${lastCandle.close}, and conservative nearby reference levels.
4. Provide a concise, clear reasoning string and a 5-item checklist covering Higher Timeframe Trend, Momentum (RSI), Moving Average Alignment, Risk/Reward Quality, and News/Event Filter.`;

      const response = await generateWithRetry(ai, {
        contents: prompt,
        systemInstruction:
          'You are a disciplined algorithmic trading analyst. Return precise numeric levels grounded strictly in the provided OHLCV and indicator values.',
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              description: 'Must be BUY, SELL, or HOLD',
            },
            entry: { type: Type.NUMBER },
            stopLoss: { type: Type.NUMBER },
            target1: { type: Type.NUMBER },
            target2: { type: Type.NUMBER },
            confidence: {
              type: Type.NUMBER,
              description: 'Confidence percentage from 0 to 100',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Concise 2-sentence explanation of the setup.',
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  passed: { type: Type.BOOLEAN },
                  detail: { type: Type.STRING },
                },
                required: ['label', 'passed', 'detail'],
              },
            },
          },
          required: [
            'action',
            'entry',
            'stopLoss',
            'target1',
            'target2',
            'confidence',
            'reasoning',
            'checklist',
          ],
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response received from Gemini trading agent.');
      }

      const parsed = JSON.parse(rawText);
      res.json({ signal: parsed });
    } catch (error) {
      const message = formatFriendlyError(
        error,
        'Failed to generate AI trading signal.'
      );
      console.error('[/api/agent/analyze] Error:', message);
      res.status(503).json({ error: message });
    }
  });

  app.post('/api/agent/improve', async (req, res) => {
    try {
      const { currentVersion, currentConfig, failurePatterns, losingSample } =
        req.body ?? {};

      if (!currentConfig || !failurePatterns) {
        res.status(400).json({
          error: 'Missing current strategy configuration or failure patterns.',
        });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `You are the Self-Improvement Reasoning Engine of an algorithmic trading system.
Current Strategy Version: ${currentVersion || 'v2.1'}
Current Strategy Parameters:
${JSON.stringify(currentConfig)}

Detected Failure Patterns across ${failurePatterns.losingTradeCount} losing trades (out of ${failurePatterns.totalTradeCount} total logged trades):
${JSON.stringify(failurePatterns)}

Sample of recent losing trades:
${JSON.stringify(losingSample ?? [])}

Instructions:
Analyze why the strategy lost money and propose concrete, testable parameter adjustments to improve out-of-sample Sharpe Ratio and reduce Max Drawdown without overfitting.
Allowed parameter keys for suggestedConfigPatch:
- adxMin (integer between 10 and 30)
- atrStopMult (number between 1.0 and 3.0)
- fastMa (integer between 10 and 30)
- slowMa (integer between 35 and 80)
- rsiBuyMax (integer between 55 and 75)
- avoidChopHours (boolean)

Return a structured proposal with proposedVersion (increment minor version), summary, rootCauseFindings (3-4 crisp bullets), proposedChanges (3-4 items mapping directly to parameterKey), suggestedConfigPatch, and safetyGateNotes (3 items).`;

      const response = await generateWithRetry(ai, {
        contents: prompt,
        systemInstruction:
          'You are a quantitative risk and strategy optimization researcher. Prioritize drawdown reduction and regime filtering over curve fitting.',
        thinkingLevel: ThinkingLevel.MEDIUM,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proposedVersion: { type: Type.STRING },
            summary: { type: Type.STRING },
            rootCauseFindings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            proposedChanges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  parameterKey: { type: Type.STRING },
                  currentValue: { type: Type.STRING },
                  proposedValue: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                },
                required: [
                  'title',
                  'parameterKey',
                  'currentValue',
                  'proposedValue',
                  'rationale',
                ],
              },
            },
            suggestedConfigPatch: {
              type: Type.OBJECT,
              properties: {
                adxMin: { type: Type.NUMBER },
                atrStopMult: { type: Type.NUMBER },
                fastMa: { type: Type.NUMBER },
                slowMa: { type: Type.NUMBER },
                rsiBuyMax: { type: Type.NUMBER },
                avoidChopHours: { type: Type.BOOLEAN },
              },
            },
            safetyGateNotes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            'proposedVersion',
            'summary',
            'rootCauseFindings',
            'proposedChanges',
            'suggestedConfigPatch',
            'safetyGateNotes',
          ],
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('Empty response received from Gemini reasoning engine.');
      }

      const parsed = JSON.parse(rawText);
      res.json({ proposal: parsed });
    } catch (error) {
      const message = formatFriendlyError(
        error,
        'Failed to generate self-improvement proposal.'
      );
      console.error('[/api/agent/improve] Error:', message);
      res.status(503).json({ error: message });
    }
  });

  app.get('/api/market/nse-bhavcopy', async (req, res) => {
    try {
      const search = String(req.query.search || '').trim().toUpperCase();
      const limit = Math.min(250, Math.max(10, Number(req.query.limit) || 60));

      const data = await getLatestNseBhavcopy();
      if (!data) {
        res.status(502).json({
          error:
            'Unable to reach NSE Bhavcopy archive right now. You can still import a downloaded NSE Bhavcopy CSV manually.',
        });
        return;
      }

      const filtered = search
        ? data.rows.filter(
            (r) =>
              r.symbol.toUpperCase().includes(search) ||
              r.name.toUpperCase().includes(search)
          )
        : data.rows;

      res.json({
        tradeDate: data.tradeDate,
        dateCode: data.dateCode,
        sourceUrl: data.sourceUrl,
        totalStocks: data.rows.length,
        rows: filtered.slice(0, limit),
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load NSE Bhavcopy.',
      });
    }
  });

  app.get('/api/market/candles', async (req, res) => {
    const category = String(req.query.category || '');
    const symbol = String(req.query.symbol || '').toUpperCase();
    const timeframe = String(req.query.timeframe || '1h');

    try {
      if (category === 'crypto' && symbol) {
        const intervalMap: Record<string, string> = {
          '15m': '15m',
          '1h': '1h',
          '4h': '4h',
          '1D': '1d',
        };
        const interval = intervalMap[timeframe] || '1h';
        const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(
          symbol
        )}&interval=${interval}&limit=120`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const raw = (await resp.json()) as Array<Array<number | string>>;
          const candles = raw.map((k) => {
            const ts = Number(k[0]);
            const d = new Date(ts);
            return {
              date:
                timeframe === '1D'
                  ? d.toISOString().slice(0, 10)
                  : d.toISOString().slice(5, 16).replace('T', ' '),
              timestamp: ts,
              open: Number(k[1]),
              high: Number(k[2]),
              low: Number(k[3]),
              close: Number(k[4]),
              volume: Math.round(Number(k[5])),
            };
          });
          if (candles.length > 0) {
            res.json({
              source: 'live-binance',
              sourceLabel: `Live Binance · ${symbol} · ${interval}`,
              candles,
            });
            return;
          }
        }
      }

      if (category === 'forex' && symbol.length === 6) {
        const base = symbol.slice(0, 3);
        const quote = symbol.slice(3, 6);
        const end = new Date();
        const start = new Date(end.getTime() - 160 * 86400000);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        const url = `https://api.frankfurter.dev/v1/${startStr}..${endStr}?base=${base}&symbols=${quote}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const data = (await resp.json()) as {
            rates?: Record<string, Record<string, number>>;
          };
          const entries = Object.entries(data.rates || {}).sort(([a], [b]) =>
            a.localeCompare(b)
          );
          if (entries.length > 10) {
            const candles = entries.map(([dateStr, rateObj], idx) => {
              const close = Number(rateObj[quote]);
              const prevClose =
                idx > 0 ? Number(entries[idx - 1][1][quote]) : close;
              const open = prevClose;
              const spread = Math.abs(close - open) * 0.45 + close * 0.0022;
              return {
                date: dateStr,
                timestamp: new Date(`${dateStr}T00:00:00Z`).getTime(),
                open,
                high: Math.max(open, close) + spread,
                low: Math.min(open, close) - spread,
                close,
                volume: 14000 + (idx % 7) * 1800,
              };
            });
            res.json({
              source: 'live-frankfurter',
              sourceLabel: `Live FX Spot · ${base}/${quote}`,
              latestPrice: candles[candles.length - 1].close,
              candles: timeframe === '1D' ? candles : [],
            });
            return;
          }
        }
      }

      if (category === 'indian_stock' && symbol) {
        const latest = await getLatestNseBhavcopy();
        if (latest) {
          const match = latest.rows.find((r) => r.symbol === symbol);
          if (match) {
            res.json({
              source: 'nse-bhavcopy',
              sourceLabel: `NSE Bhavcopy · ${latest.tradeDate}`,
              latestBhavcopyRow: match,
              latestPrice: match.close,
              candles: [],
            });
            return;
          }
        }
      }

      res.json({
        source: 'calibrated-model',
        sourceLabel: 'Calibrated Market Feed',
        candles: [],
      });
    } catch {
      res.json({
        source: 'calibrated-model',
        sourceLabel: 'Calibrated Market Feed',
        candles: [],
      });
    }
  });

  if (isProduction) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arwaz Quant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
