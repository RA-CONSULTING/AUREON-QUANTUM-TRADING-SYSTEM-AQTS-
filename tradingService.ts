import { MonitoringEvent } from './types';

export const API_KEY_STORAGE_KEY = 'aureon_api_key';
export const API_SECRET_STORAGE_KEY = 'aureon_api_secret';
export const API_MODE_STORAGE_KEY = 'aureon_api_mode';

export type TradeSide = 'BUY' | 'SELL';

export interface StoredCredentials {
  apiKey: string;
  apiSecret: string; // plaintext value, returned by getStoredCredentials after decryption
  mode: 'live' | 'testnet';
}

// Helper interface for encrypted storage
export interface EncryptedCredentials {
  apiKeyEnc: string;
  apiSecretEnc: string;
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

const formatQuantity = (quantity: number): string =>
  quantity
    .toFixed(DEFAULT_TRADE_SIZE_DECIMALS)
    .replace(/\.0+$/, '')
    .replace(/(\.[1-9]*?)0+$/, '$1');

const pairToSymbol = (pair: string): string => {
  const sanitized = pair.replace(/\s+/g, '').toUpperCase();
  if (!sanitized.includes('/')) {
    return sanitized;
  }

  const [baseRaw, quoteRaw] = sanitized.split('/');
  const quote = QUOTE_SYMBOL_MAP[quoteRaw] ?? quoteRaw;
  return `${baseRaw}${quote}`;
};

const getBaseUrlForMode = (mode: 'live' | 'testnet'): string =>
  mode === 'testnet' ? TESTNET_BASE_URL : LIVE_BASE_URL;

export const resolveModeFromStorage = (): 'live' | 'testnet' => {
  if (typeof window === 'undefined') {
    return 'live';
  }

  const storedMode = window.localStorage.getItem(API_MODE_STORAGE_KEY);
  if (storedMode === 'testnet' || storedMode === 'live') {
    return storedMode;
  }

  if (import.meta.env.VITE_BINANCE_USE_TESTNET === 'true') {
    return 'testnet';
  }

  return 'live';
};

export const hasStoredCredentials = (): boolean => {
  if (typeof window === 'undefined') return false;
  const apiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  const apiSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY);
  return Boolean(apiKey && apiSecret);
};









































  const ivArr = ensureWebCrypto().getRandomValues(new Uint8Array(12));







  const crypto = ensureWebCrypto();
  const keyMaterial = await crypto.subtle.importKey(


  return await crypto.subtle.deriveKey(