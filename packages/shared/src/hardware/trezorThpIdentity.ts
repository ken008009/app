import { APP_DISPLAY_NAME } from '../config/appBrand';
import platformEnv from '../platformEnv';

type IPlatformIdentityEnv = {
  isDesktop?: boolean;
  isExtension?: boolean;
  isNative?: boolean;
  isWeb?: boolean;
};

/**
 * Fixed identity for Trezor THP pairing. Must stay stable for a given build
 * channel so devices can recognize the host app.
 */
export const TREZOR_THP_APP_NAME = APP_DISPLAY_NAME;

export function getTrezorThpHostName(
  env: IPlatformIdentityEnv = platformEnv,
): string {
  if (env.isDesktop) return 'Desktop';
  if (env.isExtension) return 'Extension';
  if (env.isNative) return 'Mobile';
  if (env.isWeb) return 'Web';
  return 'Device';
}

export function getTrezorThpIdentity(env: IPlatformIdentityEnv = platformEnv): {
  appName: string;
  hostName: string;
} {
  return {
    appName: TREZOR_THP_APP_NAME,
    hostName: getTrezorThpHostName(env),
  };
}
