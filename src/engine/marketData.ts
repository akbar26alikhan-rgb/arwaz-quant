import {
  Candle,
  CleaningConfig,
  EngineeredRow,
  FeatureConfig,
  MarketCategory,
  MarketMeta,
  MarketSymbol,
  Timeframe,
} from '../types/trading';

export const CATEGORY_LABELS: Record<MarketCategory, string> = {
  indian_stock: 'Indian Stock (NSE Bhavcopy)',
  crypto: 'Bitcoin & Crypto',
  forex: 'Forex',
  others: 'Others',
};

export const MARKETS: Record<string, MarketMeta> = {
  // 1. INDIAN STOCK (NSE BHAVCOPY)
  RELIANCE: {
    symbol: 'RELIANCE',
    label: 'Reliance Industries',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 1342,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  TCS: {
    symbol: 'TCS',
    label: 'Tata Consultancy Services',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 4140,
    lotUnit: 'Shares',
    defaultQty: 5,
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    label: 'HDFC Bank',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 1745,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  INFY: {
    symbol: 'INFY',
    label: 'Infosys',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Dhan',
    currency: 'INR',
    decimals: 2,
    basePrice: 1865,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    label: 'ICICI Bank',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 1280,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  SBIN: {
    symbol: 'SBIN',
    label: 'State Bank of India',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Dhan',
    currency: 'INR',
    decimals: 2,
    basePrice: 825,
    lotUnit: 'Shares',
    defaultQty: 20,
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    label: 'Bharti Airtel',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 1620,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  ITC: {
    symbol: 'ITC',
    label: 'ITC Limited',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 482,
    lotUnit: 'Shares',
    defaultQty: 25,
  },
  LT: {
    symbol: 'LT',
    label: 'Larsen & Toubro',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Dhan',
    currency: 'INR',
    decimals: 2,
    basePrice: 3580,
    lotUnit: 'Shares',
    defaultQty: 5,
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    label: 'Tata Motors',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 810,
    lotUnit: 'Shares',
    defaultQty: 15,
  },
  AXISBANK: {
    symbol: 'AXISBANK',
    label: 'Axis Bank',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Dhan',
    currency: 'INR',
    decimals: 2,
    basePrice: 1165,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  SUNPHARMA: {
    symbol: 'SUNPHARMA',
    label: 'Sun Pharma',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 1790,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  NIFTY50: {
    symbol: 'NIFTY50',
    label: 'NIFTY 50 Index',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Zerodha Kite',
    currency: 'INR',
    decimals: 2,
    basePrice: 25290,
    lotUnit: 'Lot',
    defaultQty: 1,
  },
  BANKNIFTY: {
    symbol: 'BANKNIFTY',
    label: 'BANK NIFTY Index',
    category: 'indian_stock',
    exchange: 'NSE',
    assetClass: 'Indian Equities',
    defaultBroker: 'Dhan',
    currency: 'INR',
    decimals: 2,
    basePrice: 61560,
    lotUnit: 'Lot',
    defaultQty: 1,
  },

  // 2. BITCOIN & CRYPTO (ALL MAIN COINS)
  BTCUSDT: {
    symbol: 'BTCUSDT',
    label: 'Bitcoin (BTC)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 67500,
    lotUnit: 'BTC',
    defaultQty: 0.01,
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    label: 'Ethereum (ETH)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 3180,
    lotUnit: 'ETH',
    defaultQty: 0.2,
  },
  SOLUSDT: {
    symbol: 'SOLUSDT',
    label: 'Solana (SOL)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 185,
    lotUnit: 'SOL',
    defaultQty: 3,
  },
  BNBUSDT: {
    symbol: 'BNBUSDT',
    label: 'BNB (BNB)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 615,
    lotUnit: 'BNB',
    defaultQty: 1,
  },
  XRPUSDT: {
    symbol: 'XRPUSDT',
    label: 'XRP (Ripple)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 4,
    basePrice: 0.725,
    lotUnit: 'XRP',
    defaultQty: 500,
  },
  ADAUSDT: {
    symbol: 'ADAUSDT',
    label: 'Cardano (ADA)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 4,
    basePrice: 0.585,
    lotUnit: 'ADA',
    defaultQty: 500,
  },
  DOGEUSDT: {
    symbol: 'DOGEUSDT',
    label: 'Dogecoin (DOGE)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 5,
    basePrice: 0.245,
    lotUnit: 'DOGE',
    defaultQty: 1500,
  },
  AVAXUSDT: {
    symbol: 'AVAXUSDT',
    label: 'Avalanche (AVAX)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 34.8,
    lotUnit: 'AVAX',
    defaultQty: 15,
  },
  LINKUSDT: {
    symbol: 'LINKUSDT',
    label: 'Chainlink (LINK)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 3,
    basePrice: 14.85,
    lotUnit: 'LINK',
    defaultQty: 30,
  },
  DOTUSDT: {
    symbol: 'DOTUSDT',
    label: 'Polkadot (DOT)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 3,
    basePrice: 5.42,
    lotUnit: 'DOT',
    defaultQty: 80,
  },
  LTCUSDT: {
    symbol: 'LTCUSDT',
    label: 'Litecoin (LTC)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 2,
    basePrice: 84.5,
    lotUnit: 'LTC',
    defaultQty: 5,
  },
  TRXUSDT: {
    symbol: 'TRXUSDT',
    label: 'TRON (TRX)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 4,
    basePrice: 0.184,
    lotUnit: 'TRX',
    defaultQty: 2000,
  },
  SUIUSDT: {
    symbol: 'SUIUSDT',
    label: 'Sui (SUI)',
    category: 'crypto',
    exchange: 'Binance',
    assetClass: 'Crypto',
    defaultBroker: 'Binance',
    currency: 'USD',
    decimals: 4,
    basePrice: 2.85,
    lotUnit: 'SUI',
    defaultQty: 150,
  },

  // 3. FOREX
  EURUSD: {
    symbol: 'EURUSD',
    label: 'EUR / USD',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'USD',
    decimals: 4,
    basePrice: 1.0845,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    label: 'GBP / USD',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'USD',
    decimals: 4,
    basePrice: 1.2815,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  USDJPY: {
    symbol: 'USDJPY',
    label: 'USD / JPY',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'JPY',
    decimals: 2,
    basePrice: 153.45,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  USDINR: {
    symbol: 'USDINR',
    label: 'USD / INR',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'INR',
    decimals: 4,
    basePrice: 84.42,
    lotUnit: 'Lot',
    defaultQty: 1,
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    label: 'AUD / USD',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'USD',
    decimals: 4,
    basePrice: 0.654,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  USDCAD: {
    symbol: 'USDCAD',
    label: 'USD / CAD',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'CAD',
    decimals: 4,
    basePrice: 1.398,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  USDCHF: {
    symbol: 'USDCHF',
    label: 'USD / CHF',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'CHF',
    decimals: 4,
    basePrice: 0.8825,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  EURINR: {
    symbol: 'EURINR',
    label: 'EUR / INR',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'INR',
    decimals: 4,
    basePrice: 91.55,
    lotUnit: 'Lot',
    defaultQty: 1,
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    label: 'GBP / JPY',
    category: 'forex',
    exchange: 'Forex',
    assetClass: 'Forex',
    defaultBroker: 'MetaTrader 5',
    currency: 'JPY',
    decimals: 2,
    basePrice: 196.6,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },

  // 4. OTHERS (Commodities, US Equities & Global Indices)
  XAUUSD: {
    symbol: 'XAUUSD',
    label: 'Gold Spot (XAU/USD)',
    category: 'others',
    exchange: 'MT5',
    assetClass: 'Commodities',
    defaultBroker: 'MetaTrader 5',
    currency: 'USD',
    decimals: 2,
    basePrice: 2650,
    lotUnit: 'Lot',
    defaultQty: 0.1,
  },
  XAGUSD: {
    symbol: 'XAGUSD',
    label: 'Silver Spot (XAG/USD)',
    category: 'others',
    exchange: 'MT5',
    assetClass: 'Commodities',
    defaultBroker: 'MetaTrader 5',
    currency: 'USD',
    decimals: 3,
    basePrice: 31.45,
    lotUnit: 'Lot',
    defaultQty: 0.5,
  },
  WTI: {
    symbol: 'WTI',
    label: 'WTI Crude Oil',
    category: 'others',
    exchange: 'NYMEX',
    assetClass: 'Commodities',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 70.8,
    lotUnit: 'Barrels',
    defaultQty: 10,
  },
  AAPL: {
    symbol: 'AAPL',
    label: 'Apple Inc.',
    category: 'others',
    exchange: 'NASDAQ',
    assetClass: 'US Equities',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 228.4,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  NVDA: {
    symbol: 'NVDA',
    label: 'NVIDIA Corp.',
    category: 'others',
    exchange: 'NASDAQ',
    assetClass: 'US Equities',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 142.5,
    lotUnit: 'Shares',
    defaultQty: 10,
  },
  MSFT: {
    symbol: 'MSFT',
    label: 'Microsoft Corp.',
    category: 'others',
    exchange: 'NASDAQ',
    assetClass: 'US Equities',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 422.1,
    lotUnit: 'Shares',
    defaultQty: 5,
  },
  TSLA: {
    symbol: 'TSLA',
    label: 'Tesla Inc.',
    category: 'others',
    exchange: 'NASDAQ',
    assetClass: 'US Equities',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 318.2,
    lotUnit: 'Shares',
    defaultQty: 5,
  },
  SPX: {
    symbol: 'SPX',
    label: 'S&P 500 Index',
    category: 'others',
    exchange: 'NYSE',
    assetClass: 'Indices',
    defaultBroker: 'Interactive Brokers',
    currency: 'USD',
    decimals: 2,
    basePrice: 5940,
    lotUnit: 'Contracts',
    defaultQty: 1,
  },
};

export const MARKET_LIST: MarketMeta[] = Object.values(MARKETS);

export function getMarketsByCategory(category: MarketCategory): MarketMeta[] {
  return MARKET_LIST.filter((m) => m.category === category);
}

export function getMarketMeta(
  symbol: MarketSymbol,
  customMeta?: Partial<MarketMeta>
): MarketMeta {
  const existing = MARKETS[symbol];
  if (existing) {
    return customMeta ? { ...existing, ...customMeta } : existing;
  }
  return {
    symbol,
    label: customMeta?.label || `${symbol} (NSE)`,
    category: customMeta?.category || 'indian_stock',
    exchange: customMeta?.exchange || 'NSE',
    assetClass: customMeta?.assetClass || 'Indian Equities',
    defaultBroker: customMeta?.defaultBroker || 'Zerodha Kite',
    currency: customMeta?.currency || 'INR',
    decimals: customMeta?.decimals ?? 2,
    basePrice: customMeta?.basePrice ?? 1000,
    lotUnit: customMeta?.lotUnit || 'Shares',
    defaultQty: customMeta?.defaultQty ?? 10,
  };
}

function createPrng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function symbolSeed(symbol: MarketSymbol, extra = 0): number {
  let hash = 2166136261 + extra;
  for (let i = 0; i < symbol.length; i++) {
    hash ^= symbol.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function roundPrice(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function formatPrice(value: number, decimals: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function generateChartCandles(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  count = 140,
  customBasePrice?: number,
  customDecimals?: number
): Candle[] {
  const meta = getMarketMeta(symbol);
  const decimals = customDecimals ?? meta.decimals;
  const targetPrice = customBasePrice ?? meta.basePrice;
  const rand = createPrng(symbolSeed(symbol, timeframe.charCodeAt(0) * 97));
  const candles: Candle[] = [];

  const stepMs =
    timeframe === '15m'
      ? 15 * 60 * 1000
      : timeframe === '1h'
        ? 60 * 60 * 1000
        : timeframe === '4h'
          ? 4 * 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

  const volScale =
    timeframe === '15m'
      ? 0.0028
      : timeframe === '1h'
        ? 0.0046
        : timeframe === '4h'
          ? 0.0082
          : 0.0135;

  const baseDrift =
    meta.category === 'crypto' ? 0.0007 : meta.category === 'forex' ? 0.00015 : 0.00045;

  let price = targetPrice * 0.94;
  const endTs = new Date('2026-11-15T15:30:00Z').getTime();

  for (let i = 0; i < count; i++) {
    const ts = endTs - (count - 1 - i) * stepMs;
    const d = new Date(ts);
    const dateStr =
      timeframe === '1D'
        ? d.toISOString().slice(0, 10)
        : d.toISOString().slice(5, 16).replace('T', ' ');

    const cycle =
      Math.sin(i / 14) * 0.0032 +
      Math.cos(i / 29) * 0.0018 +
      (i > count - 28 ? 0.0014 : 0);

    const shock = (rand() - 0.48) * volScale * 2.1;
    const open = price;
    const close = Math.max(open * 0.7, open * (1 + baseDrift + cycle + shock));
    const wickUp = Math.abs(rand()) * volScale * open * 0.85;
    const wickDown = Math.abs(rand()) * volScale * open * 0.85;
    const high = Math.max(open, close) + wickUp;
    const low = Math.min(open, close) - wickDown;

    const baseVol =
      meta.category === 'indian_stock'
        ? 245000
        : meta.category === 'crypto'
          ? 4800
          : meta.category === 'others'
            ? 320000
            : 16500;
    const volume = Math.round(
      baseVol * (0.65 + rand() * 0.9 + Math.abs(shock / volScale) * 0.35)
    );

    candles.push({
      date: dateStr,
      timestamp: ts,
      open: roundPrice(open, decimals),
      high: roundPrice(high, decimals),
      low: roundPrice(low, decimals),
      close: roundPrice(close, decimals),
      volume,
    });
    price = close;
  }

  return candles;
}

export function generateHistoricalSeries(
  symbol: MarketSymbol,
  bars = 360,
  customBasePrice?: number,
  customDecimals?: number
): Candle[] {
  const meta = getMarketMeta(symbol);
  const decimals = customDecimals ?? meta.decimals;
  const targetPrice = customBasePrice ?? meta.basePrice;
  const rand = createPrng(symbolSeed(symbol, 20202025));
  const candles: Candle[] = [];
  let price = targetPrice * 0.58;
  const startTs = new Date('2020-01-02T09:15:00Z').getTime();
  const stepMs = 6 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < bars; i++) {
    const ts = startTs + i * stepMs;
    const d = new Date(ts);
    const dateStr = d.toISOString().slice(0, 10);

    let regimeDrift = 0.0022;
    let regimeVol = 0.018;
    if (i > 110 && i < 165) {
      regimeDrift = -0.0018;
      regimeVol = 0.025;
    } else if (i >= 165 && i < 235) {
      regimeDrift = 0.0026;
      regimeVol = 0.015;
    } else if (i >= 235) {
      regimeDrift = 0.0024;
      regimeVol = 0.0165;
    }

    if (meta.category === 'forex') {
      regimeDrift *= 0.25;
      regimeVol *= 0.48;
    } else if (meta.category === 'crypto') {
      regimeDrift *= 1.35;
      regimeVol *= 1.65;
    }

    const wave = Math.sin(i / 9) * 0.006;
    const shock = (rand() - 0.485) * regimeVol * 2.0;
    const open = price;
    const close = Math.max(open * 0.55, open * (1 + regimeDrift + wave + shock));
    const high = Math.max(open, close) * (1 + rand() * regimeVol * 0.7);
    const low = Math.min(open, close) * (1 - rand() * regimeVol * 0.7);
    const volume = Math.round(120000 * (0.7 + rand() * 0.9));

    candles.push({
      date: dateStr,
      timestamp: ts,
      open: roundPrice(open, decimals),
      high: roundPrice(high, decimals),
      low: roundPrice(low, decimals),
      close: roundPrice(close, decimals),
      volume,
    });
    price = close;
  }

  return candles;
}

export function cleanCandles(
  rawCandles: Candle[],
  config: CleaningConfig
): {
  cleaned: Candle[];
  droppedMissing: number;
  droppedZeroVol: number;
  droppedOutliers: number;
  alignedCount: number;
} {
  let droppedMissing = 0;
  let droppedZeroVol = 0;
  let droppedOutliers = 0;

  let working = rawCandles.filter((c, idx) => {
    if (
      config.dropMissing &&
      (!Number.isFinite(c.open) ||
        !Number.isFinite(c.high) ||
        !Number.isFinite(c.low) ||
        !Number.isFinite(c.close))
    ) {
      droppedMissing++;
      return false;
    }
    if (config.filterZeroVolume && c.volume <= 0) {
      droppedZeroVol++;
      return false;
    }
    if (config.removeOutliers && idx > 0) {
      const prev = rawCandles[idx - 1];
      const jump = Math.abs(c.close - prev.close) / Math.max(prev.close, 1e-6);
      if (jump > 0.25) {
        droppedOutliers++;
        return false;
      }
    }
    return true;
  });

  if (config.alignTimestamps) {
    working = [...working].sort((a, b) => a.timestamp - b.timestamp);
  }

  return {
    cleaned: working,
    droppedMissing,
    droppedZeroVol,
    droppedOutliers,
    alignedCount: working.length,
  };
}

export function engineerFeatures(
  candles: Candle[],
  featureConfig: FeatureConfig,
  decimals = 2
): EngineeredRow[] {
  const { fastMa, slowMa, rsiLength, atrLength } = featureConfig;
  const rows: EngineeredRow[] = [];

  const trueRanges: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const prev = i > 0 ? candles[i - 1] : c;

    let maFast: number | null = null;
    if (i >= fastMa - 1) {
      let sum = 0;
      for (let j = i - fastMa + 1; j <= i; j++) sum += candles[j].close;
      maFast = roundPrice(sum / fastMa, decimals);
    }

    let maSlow: number | null = null;
    if (i >= slowMa - 1) {
      let sum = 0;
      for (let j = i - slowMa + 1; j <= i; j++) sum += candles[j].close;
      maSlow = roundPrice(sum / slowMa, decimals);
    }

    const delta = i > 0 ? c.close - prev.close : 0;
    gains.push(delta > 0 ? delta : 0);
    losses.push(delta < 0 ? -delta : 0);

    let rsi: number | null = null;
    if (i >= rsiLength) {
      let avgGain = 0;
      let avgLoss = 0;
      for (let j = i - rsiLength + 1; j <= i; j++) {
        avgGain += gains[j];
        avgLoss += losses[j];
      }
      avgGain /= rsiLength;
      avgLoss /= rsiLength;
      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = Math.round((100 - 100 / (1 + rs)) * 10) / 10;
      }
    }

    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - prev.close),
      Math.abs(c.low - prev.close)
    );
    trueRanges.push(tr);

    const upMove = c.high - prev.high;
    const downMove = prev.low - c.low;
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);

    let atr: number | null = null;
    let adx: number | null = null;
    if (i >= atrLength) {
      let trSum = 0;
      let pSum = 0;
      let mSum = 0;
      for (let j = i - atrLength + 1; j <= i; j++) {
        trSum += trueRanges[j];
        pSum += plusDMs[j];
        mSum += minusDMs[j];
      }
      atr = roundPrice(trSum / atrLength, decimals);
      const pdi = trSum > 0 ? (pSum / trSum) * 100 : 0;
      const mdi = trSum > 0 ? (mSum / trSum) * 100 : 0;
      const dx = pdi + mdi > 0 ? (Math.abs(pdi - mdi) / (pdi + mdi)) * 100 : 0;
      adx = Math.round(dx * 10) / 10;
    }

    const atrPct = atr !== null ? atr / Math.max(c.close, 1e-6) : 0;
    const regime: EngineeredRow['regime'] =
      atrPct > 0.022
        ? 'High Volatility'
        : adx !== null && adx >= 20
          ? 'Trending'
          : 'Sideways';

    rows.push({
      ...c,
      maFast,
      maSlow,
      rsi,
      atr,
      adx,
      regime,
    });
  }

  return rows;
}
