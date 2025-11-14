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

/**
 * Gets credentials, decrypting apiSecret.
 * Requires apiKey to decrypt the apiSecret.
 * Returns null if no credentials or error in decryption.
 */
export const getStoredCredentials = async (apiKeyRequired?: string): Promise<StoredCredentials | null> => {
  if (typeof window === 'undefined') return null;
  const apiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  const encryptedSecret = window.localStorage.getItem(API_SECRET_STORAGE_KEY);
  const iv = window.localStorage.getItem('aureon_api_secret_iv');
  if (!apiKey || !encryptedSecret || !iv) return null;
  let apiSecret: string = '';
  try {
    // If apiKeyRequired provided, use that; else fallback on stored key
    const keyToUse = apiKeyRequired || apiKey;
    apiSecret = await decryptSecret(encryptedSecret, iv, keyToUse);
  } catch (e) {
    console.error('Failed to decrypt API Secret', e);
    return null;
  }
  return {
    apiKey,
    apiSecret,
    mode: resolveModeFromStorage(),
  };
};

// Helper for array buffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return window.btoa(binary);
}
// Helper for base64 to array buffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
// Derive a key from API key (as password)
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
// Encrypt the secret using API key; returns base64 encrypted secret and base64 IV
async function encryptSecret(secret: string, apiKey: string): Promise<{ encrypted: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const salt = encoder.encode(apiKey); // simple salt, improve for production usage
  const key = await deriveKeyFromPassword(apiKey, salt);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(secret)
  );
  return {
    encrypted: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv)
  };
}
// Decrypt the secret using API key and stored IV
async function decryptSecret(encrypted: string, ivBase64: string, apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
  const salt = encoder.encode(apiKey);
  const key = await deriveKeyFromPassword(apiKey, salt);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    base64ToArrayBuffer(encrypted)
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Stores credentials, encrypting apiSecret under apiKey before persisting.
 * Requires being called as an async function.
 */
export const storeCredentials = async (params: StoredCredentials): Promise<void> => {
  if (typeof window === 'undefined') return;
  const data = await encryptSecret(params.apiSecret, params.apiKey);
  window.localStorage.setItem(API_KEY_STORAGE_KEY, params.apiKey);
  window.localStorage.setItem(API_SECRET_STORAGE_KEY, data.encrypted);
  window.localStorage.setItem('aureon_api_secret_iv', data.iv);
  window.localStorage.setItem(API_MODE_STORAGE_KEY, params.mode);
};

export const clearStoredCredentials = (): void => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.localStorage.removeItem(API_SECRET_STORAGE_KEY);
  window.localStorage.removeItem(API_MODE_STORAGE_KEY);
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

export const executeMarketTrade = async ({
  pair,
  side,
  quantity,
  mode,
}: TradeRequest): Promise<TradeExecutionResult> => {
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

