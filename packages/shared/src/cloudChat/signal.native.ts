import { NativeModules } from 'react-native';

import { OneKeyLocalError } from '../errors';
import platformEnv from '../platformEnv';
import stringUtils from '../utils/stringUtils';

import type { ICloudChatNativeOperations } from '../../types/cloudChat';

type ICloudChatNativeModule = {
  execute(scope: string, operation: string, args: string): Promise<string>;
};

export async function cloudChatNative<
  K extends keyof ICloudChatNativeOperations,
>(
  scope: string,
  operation: K,
  args: ICloudChatNativeOperations[K][0],
): Promise<ICloudChatNativeOperations[K][1]> {
  const module = NativeModules.CloudChatSignal as
    | ICloudChatNativeModule
    | undefined;
  if (!platformEnv.isNativeAndroid || !module) {
    throw new OneKeyLocalError(
      '当前平台或安装包缺少云聊加密模块，请重新编译 Android App',
    );
  }
  return JSON.parse(
    await module.execute(scope, operation, stringUtils.stableStringify(args)),
  ) as ICloudChatNativeOperations[K][1];
}
