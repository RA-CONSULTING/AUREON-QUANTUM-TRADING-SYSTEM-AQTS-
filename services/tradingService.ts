import { MonitoringEvent } from '../types';

export const API_KEY_STORAGE_KEY = 'aureon_api_key';
export const API_SECRET_STORAGE_KEY = 'aureon_api_secret';
export const API_MODE_STORAGE_KEY = 'aureon_api_mode';

export type TradeSide = 'BUY' | 'SELL';

interface StoredCredentials {
  apiKey: string;
  apiSecret: string;
  mode: 'live' | 'testnet';
}

export interface TradeRequest {
  pair: string;
  side: TradeSide;
  quantity: number;
  mode?: 'live' | 'testnet';
}

export interface TradeExecutionResult {
  success: boolean;
  message: string;
  orderId?: string | number;
  response?: unknown;
  errorCode?: number;
}

const DEFAULT_TRADE_SIZE_DECIMALS = 6;
const QUOTE_SYMBOL_MAP: Record<string, string> = {
  USD: 'USDT',
  USDT: 'USDT',
  USDC: 'USDC',
  BUSD: 'BUSD',
  BTC: 'BTC',
  ETH: 'ETH',
};

const LIVE_BASE_URL = 'https://api.binance.com';
const TESTNET_BASE_URL = 'https://testnet.binance.vision';

const resolveModeFromStorage = (): 'live' | 'testnet' => {
  if (typeof window === 'undefined') {
    return 'live';
  }
  const storedMode = window.localStorage.getItem(API_MODE_STORAGE_KEY);
  if (storedMode === 'testnet') return 'testnet';
  if (storedMode === 'live') return 'live';
  if (import.meta.env.VITE_BINANCE_USE_TESTNET === 'true') {
    return 'testnet';
  }
  return 'live';
};

const getBaseUrlForMode = (mode: 'live' | 'testnet'): string =>
  mode === 'testnet' ? TESTNET_BASE_URL : LIVE_BASE_URL;

const ensureWebCrypto = () => {
  const globalCrypto = typeof globalThis !== 'undefined' && 'crypto' in globalThis
    ? (globalThis.crypto as Crypto | undefined)
    : undefined;
  const cryptoObj = (typeof window !== 'undefined' ? window.crypto : undefined) ?? globalCrypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API not available in this environment.');
  }
  return cryptoObj;
};

const encodeHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const getQueryString = (params: Record<string, string | number | undefined>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

const formatQuantity = (quantity: number): string => {
  return quantity
    .toFixed(DEFAULT_TRADE_SIZE_DECIMALS)
    .replace(/\.0+$/, '')
    .replace(/(\.[1-9]*?)0+$/, '$1');
};

const pairToSymbol = (pair: string): string => {
  const sanitized = pair.replace(/\s+/g, '').toUpperCase();
  if (!sanitized.includes('/')) {
    return sanitized;
  }
  const [baseRaw, quoteRaw] = sanitized.split('/');
  const quote = QUOTE_SYMBOL_MAP[quoteRaw] ?? quoteRaw;
  return `${baseRaw}${quote}`;
};

export const hasStoredCredentials = (): boolean => {
  if (typeof window === 'undefined') return false;
  const apiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  const apiSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY);
  return Boolean(apiKey && apiSecret);
};

export const getStoredCredentials = (): StoredCredentials | null => {
  if (typeof window === 'undefined') return null;
  const apiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  const apiSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY);
  if (!apiKey || !apiSecret) return null;
  return {
    apiKey,
    apiSecret,
    mode: resolveModeFromStorage(),
  };
};

const signPayload = async (payload: string, secret: string): Promise<string> => {
  const cryptoObj = ensureWebCrypto();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await cryptoObj.subtle.sign('HMAC', cryptoKey, payloadData);
  return encodeHex(signatureBuffer);
};

export const executeMarketTrade = async ({ pair, side, quantity, mode }: TradeRequest): Promise<TradeExecutionResult> => {
  const credentials = getStoredCredentials();
  if (!credentials) {
    return {
      success: false,
      message: 'API credentials not configured.',
    };
  }

  const executionMode = mode ?? credentials.mode;
  const baseUrl = getBaseUrlForMode(executionMode);
  const symbol = pairToSymbol(pair);
  const formattedQuantity = formatQuantity(quantity);
  const timestamp = Date.now();
  const params = {
    symbol,
    side,
    type: 'MARKET',
    quantity: formattedQuantity,
    recvWindow: 5000,
    timestamp,
  } as const;

  const queryString = getQueryString(params);
  const signature = await signPayload(queryString, credentials.apiSecret);
  const body = `${queryString}&signature=${signature}`;

  const response = await fetch(`${baseUrl}/api/v3/order`, {
    method: 'POST',
    headers: {
      'X-MBX-APIKEY': credentials.apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseBody?.msg || `Binance API error (${response.status})`;
    return {
      success: false,
      message,
      errorCode: responseBody?.code,
      response: responseBody,
    };
  }

  return {
    success: true,
    message: `Order executed (${side}) ${formattedQuantity} ${symbol}.`,
    orderId: responseBody?.orderId,
    response: responseBody,
  };
};

export const annotateTradeEventWithExecution = (
  event: MonitoringEvent,
  execution: TradeExecutionResult
): MonitoringEvent => ({
  ...event,
  executionStatus: execution.success ? 'FILLED' : 'FAILED',
  executionMessage: execution.message,
  orderId: execution.orderId,
  executionResponse: execution.response,
  errorCode: execution.errorCode,
});

