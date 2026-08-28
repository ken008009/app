import { Image } from 'react-native';

// cspell:ignore msworldpay

import { MS_NETWORK_ID } from '@onekeyhq/shared/src/config/presetNetworks';
import {
  HOME_GAS_TOKEN_SYMBOL,
  isHomeGasTokenDisplayAlias,
} from '@onekeyhq/shared/src/utils/tokenUtils';
import type { IAccountToken } from '@onekeyhq/shared/types/token';

// Webpack returns a URL string; Metro returns a numeric asset id.
function resolveLocalAssetUri(asset: number | string): string {
  if (typeof asset === 'string') {
    return asset;
  }
  return Image.resolveAssetSource(asset).uri;
}

const MS_LOGO_URI = resolveLocalAssetUri(
  require('@onekeyhq/kit/assets/tokens/ms-icon.png') as number | string,
);

const BTC_LOGO_URI = resolveLocalAssetUri(
  require('@onekeyhq/kit/assets/tokens/Bitcoin.webp') as number | string,
);

const HOME_TOKEN_LOCAL_LOGO_BY_SYMBOL: Readonly<Record<string, string>> = {
  [HOME_GAS_TOKEN_SYMBOL]: MS_LOGO_URI,
  btc: BTC_LOGO_URI,
};

export function getHomeTokenLocalLogoUri(symbol?: string): string | undefined {
  if (!symbol) {
    return undefined;
  }
  if (isHomeGasTokenDisplayAlias(symbol)) {
    return MS_LOGO_URI;
  }
  return HOME_TOKEN_LOCAL_LOGO_BY_SYMBOL[symbol.toLowerCase()];
}

export function getDisplayNetworkLogoURI(
  networkId?: string,
  logoURI?: string,
): string | undefined {
  if (networkId === MS_NETWORK_ID) {
    return MS_LOGO_URI;
  }
  return logoURI || undefined;
}

export function applyHomeTokenLocalLogo(token: IAccountToken): IAccountToken {
  const localLogoUri =
    token.networkId === MS_NETWORK_ID && token.isNative
      ? MS_LOGO_URI
      : getHomeTokenLocalLogoUri(token.commonSymbol ?? token.symbol);
  if (!localLogoUri || token.logoURI === localLogoUri) {
    return token;
  }
  return {
    ...token,
    logoURI: localLogoUri,
  };
}

export function applyHomeTokenLocalLogos(
  tokens: IAccountToken[],
): IAccountToken[] {
  return tokens.map(applyHomeTokenLocalLogo);
}
