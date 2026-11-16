import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Search, Upload } from 'lucide-react';
import { BhavcopyRow } from '../types/trading';

interface NseBhavcopyPanelProps {
  activeSymbol: string;
  onSelectStock: (row: BhavcopyRow) => void;
  compact?: boolean;
}

function splitCsvLineClient(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

export const NseBhavcopyPanel: React.FC<NseBhavcopyPanelProps> = ({
  activeSymbol,
  onSelectStock,
  compact = false,
}) => {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<BhavcopyRow[]>([]);
  const [tradeDate, setTradeDate] = useState<string>('');
  const [totalStocks, setTotalStocks] = useState<number>(0);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customCsvInfo, setCustomCsvInfo] = useState<string | null>(null);

  const fetchBhavcopy = async (query: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(
        `/api/market/nse-bhavcopy?search=${encodeURIComponent(query)}&limit=80`
      );
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Failed to fetch NSE Bhavcopy.');
      }
      setRows(data.rows || []);
      setTradeDate(data.tradeDate || '');
      setTotalStocks(data.totalStocks || 0);
      setSourceUrl(data.sourceUrl || '');
      setCustomCsvInfo(null);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to fetch NSE Bhavcopy.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBhavcopy(search);
    }, 220);
    return () => clearTimeout(timer);
  }, [search]);

  const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return;

    const header = splitCsvLineClient(lines[0]);
    const idx = (names: string[]) => {
      for (const n of names) {
        const i = header.indexOf(n);
        if (i !== -1) return i;
      }
      return -1;
    };

    const iSym = idx(['TckrSymb', 'SYMBOL']);
    const iSeries = idx(['SctySrs', 'SERIES']);
    const iName = idx(['FinInstrmNm', 'SYMBOL']);
    const iIsin = idx(['ISIN']);
    const iDate = idx(['TradDt', 'TIMESTAMP']);
    const iOpen = idx(['OpnPric', 'OPEN']);
    const iHigh = idx(['HghPric', 'HIGH']);
    const iLow = idx(['LwPric', 'LOW']);
    const iClose = idx(['ClsPric', 'CLOSE']);
    const iLast = idx(['LastPric', 'LAST']);
    const iPrev = idx(['PrvsClsgPric', 'PREVCLOSE']);
    const iVol = idx(['TtlTradgVol', 'TOTTRDQTY']);
    const iVal = idx(['TtlTrfVal', 'TOTTRDVAL']);
    const iTrades = idx(['TtlNbOfTxsExctd', 'TOTALTRADES']);

    if (iSym === -1 || iClose === -1) {
      setErrorMsg(
        'Unrecognized CSV format. Please upload an official NSE Bhavcopy CSV (UDiFF or legacy format).'
      );
      return;
    }

    const parsed: BhavcopyRow[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = splitCsvLineClient(lines[r]);
      const series = iSeries !== -1 ? cols[iSeries] : 'EQ';
      if (series && series !== 'EQ' && series !== 'BE') continue;
      const close = Number(cols[iClose]);
      if (!Number.isFinite(close) || close <= 0) continue;
      const prevClose = iPrev !== -1 ? Number(cols[iPrev]) || close : close;
      parsed.push({
        symbol: cols[iSym],
        name: (iName !== -1 ? cols[iName] : cols[iSym]).replace(/^"|"$/g, ''),
        series: series || 'EQ',
        isin: iIsin !== -1 ? cols[iIsin] : '',
        tradeDate: iDate !== -1 ? cols[iDate] : file.name,
        open: iOpen !== -1 ? Number(cols[iOpen]) || close : close,
        high: iHigh !== -1 ? Number(cols[iHigh]) || close : close,
        low: iLow !== -1 ? Number(cols[iLow]) || close : close,
        close,
        last: iLast !== -1 ? Number(cols[iLast]) || close : close,
        prevClose,
        changePct:
          prevClose > 0
            ? Math.round(((close - prevClose) / prevClose) * 10000) / 100
            : 0,
        volume: iVol !== -1 ? Number(cols[iVol]) || 0 : 0,
        turnover: iVal !== -1 ? Number(cols[iVal]) || 0 : 0,
        trades: iTrades !== -1 ? Number(cols[iTrades]) || 0 : 0,
      });
    }
    parsed.sort((a, b) => b.turnover - a.turnover);
    setRows(parsed.slice(0, 120));
    setTotalStocks(parsed.length);
    setTradeDate(parsed[0]?.tradeDate || 'Uploaded CSV');
    setCustomCsvInfo(`Loaded ${parsed.length} NSE EQ rows from ${file.name}`);
    setErrorMsg(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            NSE Bhavcopy Equity Feed
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {customCsvInfo
              ? customCsvInfo
              : tradeDate
                ? `Official NSE CM Bhavcopy · Trade Date ${tradeDate} · ${totalStocks.toLocaleString()} EQ stocks`
                : 'Select any NSE stock from the official Bhavcopy archive'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sourceUrl || 'https://www.nseindia.com/all-reports'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            NSE Bhavcopy Site
            <ExternalLink className="h-3 w-3" />
          </a>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleUploadCsv}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => fetchBhavcopy(search)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search any NSE stock symbol or company name (e.g., RELIANCE, ZOMATO, HAL, TRENT, TATASTEEL)..."
          className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      {errorMsg && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          {errorMsg}
        </div>
      )}

      <div
        className={`overflow-x-auto overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800 ${
          compact ? 'max-h-64' : 'max-h-80'
        }`}
      >
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
            <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <th className="px-3 py-2 font-medium">Symbol</th>
              <th className="px-3 py-2 font-medium">Company</th>
              <th className="px-3 py-2 text-right font-medium">Open</th>
              <th className="px-3 py-2 text-right font-medium">High</th>
              <th className="px-3 py-2 text-right font-medium">Low</th>
              <th className="px-3 py-2 text-right font-medium">Close (₹ INR)</th>
              <th className="px-3 py-2 text-right font-medium">Change</th>
              <th className="px-3 py-2 text-right font-medium">Volume</th>
              <th className="px-3 py-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Loading official NSE Bhavcopy equities...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No NSE stocks matched &ldquo;{search}&rdquo;.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const isSelected = r.symbol === activeSymbol;
                return (
                  <tr
                    key={`${r.symbol}-${r.series}`}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isSelected ? 'bg-orange-50/70 dark:bg-orange-950/30' : ''
                    }`}
                  >
                    <td className="px-3 py-2 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {r.symbol}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-slate-600 dark:text-slate-300">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ₹{r.open.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ₹{r.high.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ₹{r.low.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      ₹{r.close.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono font-medium ${
                        r.changePct >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {r.changePct >= 0 ? '+' : ''}
                      {r.changePct.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500">
                      {r.volume.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectStock(r)}
                        className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                          isSelected
                            ? 'bg-orange-600 text-white'
                            : 'border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Load Chart'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
