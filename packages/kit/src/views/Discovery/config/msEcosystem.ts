import { Image } from 'react-native';

import type { IDApp } from '@onekeyhq/shared/types/discovery';

// Fork-specific Discovery section title (not in Lokalise).
export const MS_ECOSYSTEM_SECTION_TITLE = 'MS生态系统';

function resolveLocalAssetUri(asset: number | string): string {
  if (typeof asset === 'string') {
    return asset;
  }
  return Image.resolveAssetSource(asset).uri;
}

const MOBLUS_LOGO_URI = resolveLocalAssetUri(
  require('@onekeyhq/kit/assets/discovery/moblus-favicon.png') as
    | number
    | string,
);

export const MS_ECOSYSTEM_DAPPS: IDApp[] = [
  {
    dappId: 'ms-ecosystem-moblus',
    name: 'MOBLUS',
    url: 'https://www.strip.boutique',
    logo: MOBLUS_LOGO_URI,
    description: 'MOBLUS',
    networkIds: [],
    tags: [],
  },
];
