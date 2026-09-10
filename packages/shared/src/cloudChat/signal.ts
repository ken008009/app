import { OneKeyLocalError } from '../errors';

import type { ICloudChatNativeOperations } from '../../types/cloudChat';

export function getCloudChatLocalApiBaseUrl(): string | undefined {
  return undefined;
}

export async function cloudChatNative<
  K extends keyof ICloudChatNativeOperations,
>(
  _scope: string,
  _operation: K,
  _args: ICloudChatNativeOperations[K][0],
): Promise<ICloudChatNativeOperations[K][1]> {
  throw new OneKeyLocalError(
    '当前平台尚未接入云聊加密，请使用新版 Android App',
  );
}
