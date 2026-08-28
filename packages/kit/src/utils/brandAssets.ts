import type { ImageSourcePropType } from 'react-native';

// Brand image requires used by splash / QR / account-selector surfaces.

/** Prefer PNG with transparent corners for white splash backgrounds. */
export const BRAND_SPLASH_PNG =
  require('@onekeyhq/kit/assets/splash_logo.png') as ImageSourcePropType;

/** @deprecated Prefer BRAND_SPLASH_PNG — SVG wraps a forced 128×128 square. */
export const BRAND_SPLASH_SVG = BRAND_SPLASH_PNG;

export const BRAND_QRCODE_LOGO =
  require('@onekeyhq/kit/assets/qrcode_logo.png') as ImageSourcePropType;

export const BRAND_QRCODE_LOGO_ALT =
  require('@onekeyhq/kit/assets/qrcode-logo.png') as ImageSourcePropType;

export const BRAND_ACCOUNT_AVATAR =
  require('@onekeyhq/kit/assets/logo_round_decorated.png') as ImageSourcePropType;
