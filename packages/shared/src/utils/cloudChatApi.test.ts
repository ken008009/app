import {
  buildCloudChatAccessExpiresAt,
  createCloudChatApiError,
  isCloudChatJwtExpired,
  isCloudChatRetryableStatus,
  mapCloudChatApiError,
  parseCloudChatApiErrorCode,
} from './cloudChatApi';
import {
  getDefaultCloudChatApiBaseUrl,
  getDefaultCloudChatRelayUrl,
  normalizeCloudChatUserId,
} from './cloudChatUtils';

describe('cloudChatApi', () => {
  it('parses the stable error code', () => {
    expect(parseCloudChatApiErrorCode({ error: 'unauthorized' })).toBe(
      'unauthorized',
    );
    expect(parseCloudChatApiErrorCode(null)).toBe('');
    expect(parseCloudChatApiErrorCode({ error: 1 })).toBe('');
  });

  it('maps HTTP statuses to recoverable copy', () => {
    expect(mapCloudChatApiError({ httpStatus: 401 })).toContain('过期');
    expect(mapCloudChatApiError({ httpStatus: 409 })).toContain('登录');
    expect(isCloudChatRetryableStatus(429)).toBe(true);
    expect(isCloudChatRetryableStatus(401)).toBe(false);
    expect(mapCloudChatApiError({ httpStatus: 403 })).toContain('好友');
    expect(
      mapCloudChatApiError({
        httpStatus: 409,
        code: 'recipient_device_changed',
      }),
    ).toContain('设备已更换');
  });

  it('treats JWT as expired with skew', () => {
    expect(isCloudChatJwtExpired(Date.now() + 10_000, Date.now())).toBe(true);
    expect(isCloudChatJwtExpired(Date.now() + 120_000, Date.now())).toBe(false);
  });

  it('builds an absolute expiry from expires_in', () => {
    const now = Date.now();
    const expiresAt = buildCloudChatAccessExpiresAt(900);
    expect(expiresAt).toBeGreaterThanOrEqual(now + 900_000);
    expect(expiresAt).toBeLessThan(now + 900_000 + 50);
  });

  it('creates an error with httpStatusCode', () => {
    const error = createCloudChatApiError({
      httpStatus: 401,
      code: 'unauthorized',
    });
    expect(error.httpStatusCode).toBe(401);
    expect(error.message).toContain('过期');
  });
});

describe('cloudChatUtils', () => {
  it('normalizes EVM addresses case-insensitively', () => {
    expect(normalizeCloudChatUserId('  0xAbC  ')).toBe('0xabc');
  });

  it('defaults to host loopback and the Android cloud API', () => {
    expect(getDefaultCloudChatApiBaseUrl({ isNativeAndroid: true })).toBe(
      'https://api.mschatapp.com',
    );
    expect(getDefaultCloudChatApiBaseUrl({ isNativeAndroid: false })).toBe(
      'http://127.0.0.1:8000',
    );
    expect(getDefaultCloudChatApiBaseUrl()).toBe('http://127.0.0.1:8000');
    expect(getDefaultCloudChatRelayUrl({ isNativeAndroid: true })).toBe(
      'https://api.mschatapp.com',
    );
  });
});
