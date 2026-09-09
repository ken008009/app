import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';

export const CLOUD_CHAT_AUTH_CHAIN_ID = 1;
export const CLOUD_CHAT_DEFAULT_API_PORT = 8000;
export const CLOUD_CHAT_JWT_SKEW_MS = 30_000;
export const CLOUD_CHAT_POLL_INTERVAL_MS = 3000;
export const CLOUD_CHAT_POLL_JITTER_MS = 500;
export const CLOUD_CHAT_DEVICE_ID = 1;
export const CLOUD_CHAT_INBOX_LIMIT = 50;

export type ICloudChatApiErrorBody = {
  error?: string;
};

export function parseCloudChatApiErrorCode(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  const error = (data as ICloudChatApiErrorBody).error;
  if (typeof error !== 'string') {
    return '';
  }
  return error;
}

export function mapCloudChatApiError(params: {
  httpStatus: number;
  code?: string;
}): string {
  const { httpStatus, code } = params;
  if (httpStatus === 401) {
    return '登录已过期，请重新签名登录';
  }
  if (httpStatus === 404) {
    return '账号或会话不存在';
  }
  if (httpStatus === 409) {
    return '设备身份或请求内容冲突，请检查账号登录与密钥状态，勿重置密钥';
  }
  if (httpStatus === 429) {
    return '请求过于频繁，请稍后再试';
  }
  if (httpStatus === 503) {
    return '云聊服务暂时不可用';
  }
  if (code) {
    return `云聊请求失败（${code}）`;
  }
  return `云聊请求失败（${httpStatus}）`;
}

export function isCloudChatRetryableStatus(httpStatus: number): boolean {
  return httpStatus === 429 || httpStatus === 503;
}

export function isCloudChatJwtExpired(
  expiresAt: number,
  now: number = Date.now(),
): boolean {
  return now + CLOUD_CHAT_JWT_SKEW_MS >= expiresAt;
}

export function buildCloudChatAccessExpiresAt(
  expiresInSeconds: number,
): number {
  return Date.now() + Math.max(0, expiresInSeconds) * 1000;
}

export function normalizeCloudChatApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function createCloudChatUuid(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    throw new OneKeyLocalError('安全随机数不可用');
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createCloudChatApiError(params: {
  httpStatus: number;
  code?: string;
  message?: string;
}): OneKeyLocalError {
  return new OneKeyLocalError({
    message:
      params.message ||
      mapCloudChatApiError({
        httpStatus: params.httpStatus,
        code: params.code,
      }),
    httpStatusCode: params.httpStatus,
  });
}
