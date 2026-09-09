import accountUtils from './accountUtils';
import { CLOUD_CHAT_DEFAULT_API_PORT } from './cloudChatApi';
import networkUtils from './networkUtils';

export const CLOUD_CHAT_DEFAULT_RELAY_PORT = CLOUD_CHAT_DEFAULT_API_PORT;

export function normalizeCloudChatUserId(userId: string): string {
  const trimmed = userId.trim();
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

export function buildCloudChatConversationId({
  selfUserId,
  peerUserId,
}: {
  selfUserId: string;
  peerUserId: string;
}): string {
  const a = normalizeCloudChatUserId(selfUserId);
  const b = normalizeCloudChatUserId(peerUserId);
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

export function previewCloudChatText(text: string, maxLength = 36): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}

export function getDefaultCloudChatApiBaseUrl(options?: {
  isNativeAndroid?: boolean;
}): string {
  // Host loopback for Web/Desktop. Android emulator reaches the host via
  // 10.0.2.2; USB devices can still pick 127.0.0.1 after adb reverse.
  // Saved settings override this; do not hardcode the host in request sites.
  const host = options?.isNativeAndroid ? '10.0.2.2' : '127.0.0.1';
  return `http://${host}:${CLOUD_CHAT_DEFAULT_API_PORT}`;
}

/** @deprecated use getDefaultCloudChatApiBaseUrl */
export function getDefaultCloudChatRelayUrl({
  isNativeAndroid,
}: {
  isNativeAndroid?: boolean;
}): string {
  return getDefaultCloudChatApiBaseUrl({ isNativeAndroid });
}

export function resolveCloudChatApiBaseUrl({
  savedUrl,
  isNativeAndroid,
}: {
  savedUrl?: string;
  isNativeAndroid?: boolean;
}): string {
  if (savedUrl) {
    return savedUrl.replace(/\/+$/, '');
  }
  return getDefaultCloudChatApiBaseUrl({ isNativeAndroid });
}

export function shouldResolveCloudChatEvmAccount({
  address,
  networkId,
}: {
  address?: string;
  networkId?: string;
}): boolean {
  return (
    accountUtils.isAllNetworkMockAddress({ address }) ||
    networkUtils.isAllNetwork({ networkId })
  );
}

export function shouldAutoLoginCloudChat({
  forceLogin,
  autoLogin,
  blockedUntilManual,
  hasResumedSession,
}: {
  forceLogin: boolean;
  autoLogin: boolean;
  blockedUntilManual: boolean;
  hasResumedSession: boolean;
}): boolean {
  if (forceLogin) {
    return true;
  }
  if (hasResumedSession) {
    return false;
  }
  return autoLogin && !blockedUntilManual;
}

export function sanitizeCloudChatErrorMessage(
  message: string | undefined,
  fallback = '登录云聊失败',
): string {
  if (!message) {
    return fallback;
  }
  if (
    message.includes('Background method not support') ||
    message.includes('DApp Provider')
  ) {
    return fallback;
  }
  return message;
}
