// Brand image requires used by splash / QR / account-selector surfaces.

/** Prefer PNG so splash can use resizeMode=contain without SVG square stretch. */
export const BRAND_SPLASH_PNG =
  require('@onekeyhq/kit/assets/logo_round_decorated.png') as number | string;

/** @deprecated Prefer BRAND_SPLASH_PNG — SVG wraps a forced 128×128 square. */
export const BRAND_SPLASH_SVG = BRAND_SPLASH_PNG;

export const BRAND_QRCODE_LOGO =
  require('@onekeyhq/kit/assets/qrcode_logo.png') as number | string;

export const BRAND_QRCODE_LOGO_ALT =
  require('@onekeyhq/kit/assets/qrcode-logo.png') as number | string;

export const BRAND_ACCOUNT_AVATAR =
  require('@onekeyhq/kit/assets/logo_round_decorated.png') as number | string;
