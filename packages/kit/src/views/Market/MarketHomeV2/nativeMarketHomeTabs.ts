import { ETranslations } from '@onekeyhq/shared/src/locale';

import { isMarketStockCategory } from './utils';

import type { IMarketCategoryItem } from './types';

/**
 * Desired native Market home primary tabs (display order).
 * A tab is shown only when its backing module exists in the app —
 * this is module resolution, not API name filtering.
 */
export const MARKET_HOME_NATIVE_TAB_WHITELIST = [
  'watchlist',
  'hot',
  'marketCap',
  'stock',
  'latest',
  'topGainers',
  'meme',
  'gameFi',
  'defi',
  'lending',
  'topLosers',
] as const;

export type IMarketHomeNativeTabId =
  (typeof MARKET_HOME_NATIVE_TAB_WHITELIST)[number];

export type INativeMarketHomeTab =
  | {
      id: 'watchlist';
      tabNameKey: typeof ETranslations.global_watchlist;
    }
  | {
      id: 'hot';
      tabNameKey: typeof ETranslations.dexmarket_trending;
      categoryId: string;
    }
  | {
      id: 'stock';
      /** Prefer product label 币股; fall back to API name when needed. */
      tabName: string;
      categoryId: string;
    }
  | {
      id: 'defi';
      tabNameKey: typeof ETranslations.global_earn;
    }
  | {
      id: 'lending';
      tabNameKey: typeof ETranslations.earn_lending;
    };

function findHotSpotCategory(categories: IMarketCategoryItem[] | undefined) {
  if (!categories?.length) {
    return { id: 'trending', name: '' };
  }
  const byId = categories.find(
    (item) => item.id.trim().toLowerCase() === 'trending',
  );
  if (byId) {
    return byId;
  }
  const byName = categories.find((item) => {
    const name = item.name.trim().toLowerCase();
    return name === '热门' || name === 'trending' || name === 'hot';
  });
  return byName ?? { id: 'trending', name: '' };
}

function findStockSpotCategory(categories: IMarketCategoryItem[] | undefined) {
  return categories?.find((item) => isMarketStockCategory(item));
}

/**
 * Resolve Market home primary tabs from the product whitelist.
 * Only modules that exist in this repo are included.
 */
export function resolveNativeMarketHomeTabs(
  categories: IMarketCategoryItem[] | undefined,
): INativeMarketHomeTab[] {
  const tabs: INativeMarketHomeTab[] = [];

  for (const tabId of MARKET_HOME_NATIVE_TAB_WHITELIST) {
    switch (tabId) {
      case 'watchlist':
        // MobileMarketWatchlistFlatList
        tabs.push({
          id: 'watchlist',
          tabNameKey: ETranslations.global_watchlist,
        });
        break;
      case 'hot': {
        // MobileMarketTokenFlatList (trending / hot spot list)
        const hot = findHotSpotCategory(categories);
        tabs.push({
          id: 'hot',
          tabNameKey: ETranslations.dexmarket_trending,
          categoryId: hot.id || 'trending',
        });
        break;
      }
      case 'stock': {
        // Stock-like spot list module (币股)
        const stock = findStockSpotCategory(categories);
        if (stock) {
          tabs.push({
            id: 'stock',
            tabName: '币股',
            categoryId: stock.id,
          });
        }
        break;
      }
      case 'defi':
        // Discovery's DeFi segment = EarnHome module
        tabs.push({
          id: 'defi',
          tabNameKey: ETranslations.global_earn,
        });
        break;
      case 'lending':
        // Earn/Borrow lending module
        tabs.push({
          id: 'lending',
          tabNameKey: ETranslations.earn_lending,
        });
        break;
      case 'marketCap':
      case 'latest':
      case 'topGainers':
      case 'meme':
      case 'gameFi':
      case 'topLosers':
        // No dedicated in-app module yet — keep hidden.
        break;
      default:
        break;
    }
  }

  return tabs;
}
