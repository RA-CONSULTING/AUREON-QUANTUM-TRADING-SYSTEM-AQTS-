import { MonitoringEvent } from './types';

export const API_KEY_STORAGE_KEY = 'aureon_api_key';
export const API_SECRET_STORAGE_KEY = 'aureon_api_secret';
export const API_MODE_STORAGE_KEY = 'aureon_api_mode';

export type TradeSide = 'BUY' | 'SELL';

export interface StoredCredentials {
  apiKey: string;
  apiSecret: string;
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

export const getStoredCredentials = async (password: string): Promise<StoredCredentials | null> => {
  if (typeof window === 'undefined') return null;

  const apiKeyEnc = window.localStorage.getItem(API_KEY_STORAGE_KEY);
  const apiSecretEnc = window.localStorage.getItem(API_SECRET_STORAGE_KEY);
  if (!apiKeyEnc || !apiSecretEnc) {
    return null;
  }
  // Decrypt
  try {
    const apiKey = await decryptString(apiKeyEnc, password);
    const apiSecret = await decryptString(apiSecretEnc, password);
    return {
      apiKey,
      apiSecret,
      mode: resolveModeFromStorage(),
    };
  } catch (e) {
    // Failed decryption, probably bad password
    return null;
  }
};


// --- AES-GCM helpers ---
const ENCRYPTION_SALT_KEY = 'aureon_encryption_salt';
const ENCRYPTION_IV_KEY = 'aureon_encryption_iv';

// Get or create a random salt for key derivation
const getEncryptionSalt = (): Uint8Array => {
  let salt = window.localStorage.getItem(ENCRYPTION_SALT_KEY);
  if (salt) return new Uint8Array(JSON.parse(salt));
  const saltArr = window.crypto.getRandomValues(new Uint8Array(16));
  window.localStorage.setItem(ENCRYPTION_SALT_KEY, JSON.stringify(Array.from(saltArr)));
  return saltArr;
};

const getIV = (): Uint8Array => {
  let iv = window.localStorage.getItem(ENCRYPTION_IV_KEY);
  if (iv) return new Uint8Array(JSON.parse(iv));
  const ivArr = window.crypto.getRandomValues(new Uint8Array(12));
  window.localStorage.setItem(ENCRYPTION_IV_KEY, JSON.stringify(Array.from(ivArr)));
  return ivArr;
};

// Derive an AES-GCM CryptoKey from the password
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]
  );
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

const encryptString = async (plain: string, password: string): Promise<string> => {
  const salt = getEncryptionSalt();
  const iv = getIV();
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plain)
  );
  return Buffer.from(encrypted).toString('base64');
};

const decryptString = async (cipherText: string, password: string): Promise<string> => {
  const salt = getEncryptionSalt();
  const iv = getIV();
  const key = await deriveKey(password, salt);
  const encryptedBytes = Buffer.from(cipherText, 'base64');
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
};

// --- Secure credential store ---
export const storeCredentials = async (params: StoredCredentials, password: string): Promise<void> => {
  if (typeof window === 'undefined') return;
  // Encrypt values
  const apiKeyEnc = await encryptString(params.apiKey, password);
  const apiSecretEnc = await encryptString(params.apiSecret, password);

  window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKeyEnc);
  window.localStorage.setItem(API_SECRET_STORAGE_KEY, apiSecretEnc);
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

