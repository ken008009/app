import { Image } from 'react-native';

import { HOME_GAS_TOKEN_SYMBOL } from '@onekeyhq/shared/src/utils/tokenUtils';
import type { IAccountToken } from '@onekeyhq/shared/types/token';

// Webpack returns a URL string; Metro returns a numeric asset id.
function resolveLocalAssetUri(asset: number | string): string {
  if (typeof asset === 'string') {
    return asset;
  }
  return Image.resolveAssetSource(asset).uri;
}

const MSUSD_LOGO_URI = resolveLocalAssetUri(
  require('@onekeyhq/kit/assets/tokens/mused-icon.png') as number | string,
);

const BTC_LOGO_URI = resolveLocalAssetUri(
  require('@onekeyhq/kit/assets/tokens/Bitcoin.webp') as number | string,
);

const HOME_TOKEN_LOCAL_LOGO_BY_SYMBOL: Readonly<Record<string, string>> = {
  [HOME_GAS_TOKEN_SYMBOL]: MSUSD_LOGO_URI,
  btc: BTC_LOGO_URI,
};

export function getHomeTokenLocalLogoUri(symbol?: string): string | undefined {
  if (!symbol) {
    return undefined;
  }
  return HOME_TOKEN_LOCAL_LOGO_BY_SYMBOL[symbol.toLowerCase()];
}

export function applyHomeTokenLocalLogo(token: IAccountToken): IAccountToken {
  const localLogoUri = getHomeTokenLocalLogoUri(
    token.commonSymbol ?? token.symbol,
  );
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
