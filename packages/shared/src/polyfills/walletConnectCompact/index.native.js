/* eslint-disable unicorn/prefer-global-this, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, no-undef */
/**
 * Safe WalletConnect Application polyfill for RN bridgeless / New Architecture.
 *
 * Upstream `@walletconnect/react-native-compat/module` does:
 *   NativeModules.RNWalletConnectModule
 * at module top-level. In Release + bridgeless, `NativeModules` can be
 * undefined when polyfills evaluate → TypeError and a white-screen crash.
 *
 * Resolve TurboModule / NativeModules / expo-application defensively instead.
 */
import { NativeModules, TurboModuleRegistry } from 'react-native';

function getApplicationModuleSafe() {
  try {
    const turbo = TurboModuleRegistry.get('RNWalletConnectModule');
    if (turbo) {
      return turbo;
    }
  } catch {
    // TurboModule not ready / not linked.
  }

  try {
    const legacy = NativeModules?.RNWalletConnectModule;
    if (legacy) {
      return legacy;
    }
  } catch {
    // NativeModules unavailable in bridgeless early boot.
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return require('expo-application');
  } catch {
    return undefined;
  }
}

if (typeof global?.Application === 'undefined') {
  try {
    const module = getApplicationModuleSafe();
    if (!module) {
      // eslint-disable-next-line no-console
      console.error('react-native-compat: Application module is not available');
    } else if (typeof module.getConstants === 'function') {
      global.Application = {
        ...module.getConstants(),
        isAppInstalled: module.isAppInstalled,
      };
    } else {
      global.Application = module;
    }
  } catch (_e) {
    // eslint-disable-next-line no-console
    console.error('react-native-compat: Application module is not available');
  }
}
