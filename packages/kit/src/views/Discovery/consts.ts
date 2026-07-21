import platformEnv from '@onekeyhq/shared/src/platformEnv';

/**
 * Temporarily hide Market / DeFi segments in native Discovery header.
 * Set to false to restore 市场 | DeFi | 浏览器.
 */
export const DISCOVERY_NATIVE_HIDE_MARKET_EARN_TABS = platformEnv.isNative;
