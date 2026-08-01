import { useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import { useMarketSelectedTabAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import {
  type INativeMarketHomeTab,
  resolveNativeMarketHomeTabs,
} from '../../nativeMarketHomeTabs';
import { EMarketHomeTab } from '../../types';

import type { IMarketCategoryItem, IMarketHomeTabValue } from '../../types';

export type INativeMarketHomeResolvedTab = {
  id: INativeMarketHomeTab['id'];
  tabName: string;
  categoryId?: string;
};

interface IUseNativeMarketHomeTabsLogicOptions {
  spotCategories?: IMarketCategoryItem[];
  selectedSpotCategory?: string;
  onSpotCategoryChange?: (categoryId: string) => void;
}

export function useNativeMarketHomeTabsLogic(
  onTabChange: (tabId: IMarketHomeTabValue) => void,
  options?: IUseNativeMarketHomeTabsLogicOptions,
) {
  const intl = useIntl();
  const [{ tab: selectedTab }, setSelectedTabAtom] = useMarketSelectedTabAtom();
  const { spotCategories, selectedSpotCategory, onSpotCategoryChange } =
    options ?? {};

  const resolvedModules = useMemo(
    () => resolveNativeMarketHomeTabs(spotCategories),
    [spotCategories],
  );

  const tabs = useMemo<INativeMarketHomeResolvedTab[]>(() => {
    return resolvedModules.map((module) => {
      switch (module.id) {
        case 'watchlist':
          return {
            id: module.id,
            tabName: intl.formatMessage({ id: module.tabNameKey }),
          };
        case 'hot':
          return {
            id: module.id,
            tabName: intl.formatMessage({ id: module.tabNameKey }),
            categoryId: module.categoryId,
          };
        case 'stock':
          return {
            id: module.id,
            tabName: module.tabName,
            categoryId: module.categoryId,
          };
        case 'defi':
          return {
            id: module.id,
            tabName: intl.formatMessage({ id: module.tabNameKey }),
          };
        case 'lending':
          return {
            id: module.id,
            tabName: intl.formatMessage({ id: module.tabNameKey }),
          };
        default: {
          const _exhaustive: never = module;
          return _exhaustive;
        }
      }
    });
  }, [intl, resolvedModules]);

  const tabNameToMetaMap = useMemo(() => {
    return tabs.reduce<Record<string, INativeMarketHomeResolvedTab>>(
      (acc, tab) => {
        acc[tab.tabName] = tab;
        return acc;
      },
      {},
    );
  }, [tabs]);

  const watchlistTabName = useMemo(
    () =>
      tabs.find((tab) => tab.id === 'watchlist')?.tabName ??
      intl.formatMessage({ id: ETranslations.global_watchlist }),
    [intl, tabs],
  );

  const getSpotCategoryIdByTabName = useCallback(
    (tabName: string) => {
      const meta = tabNameToMetaMap[tabName];
      if (meta?.id === 'hot' || meta?.id === 'stock') {
        return meta.categoryId;
      }
      return undefined;
    },
    [tabNameToMetaMap],
  );

  const handleTabChange = useCallback(
    (tabName: string) => {
      const meta = tabNameToMetaMap[tabName];
      if (!meta) {
        return;
      }

      let tabValue: IMarketHomeTabValue = EMarketHomeTab.Trending;
      if (meta.id === 'watchlist') {
        tabValue = EMarketHomeTab.Watchlist;
      } else if (meta.id === 'defi') {
        tabValue = EMarketHomeTab.Defi;
      } else if (meta.id === 'lending') {
        tabValue = EMarketHomeTab.Lending;
      }

      const categoryId = meta.categoryId;
      const isSelectionUnchanged =
        tabValue === selectedTab &&
        (!categoryId || categoryId === selectedSpotCategory);

      if (isSelectionUnchanged) {
        return;
      }

      if (categoryId) {
        onSpotCategoryChange?.(categoryId);
      }

      setSelectedTabAtom((prev) => ({
        ...prev,
        tab: tabValue,
        selectedSpotCategory: categoryId ?? prev.selectedSpotCategory,
        spotCategoryToSelect: undefined,
      }));
      onTabChange(tabValue);
    },
    [
      onSpotCategoryChange,
      onTabChange,
      selectedSpotCategory,
      selectedTab,
      setSelectedTabAtom,
      tabNameToMetaMap,
    ],
  );

  const selectedTabName = useMemo(() => {
    if (selectedTab === EMarketHomeTab.Watchlist) {
      return (
        tabs.find((tab) => tab.id === 'watchlist')?.tabName ?? watchlistTabName
      );
    }
    if (selectedTab === EMarketHomeTab.Defi) {
      return tabs.find((tab) => tab.id === 'defi')?.tabName ?? tabs[0]?.tabName;
    }
    if (selectedTab === EMarketHomeTab.Lending) {
      return (
        tabs.find((tab) => tab.id === 'lending')?.tabName ?? tabs[0]?.tabName
      );
    }

    const selectedSpotTab = tabs.find(
      (tab) =>
        (tab.id === 'hot' || tab.id === 'stock') &&
        tab.categoryId === selectedSpotCategory,
    );
    if (selectedSpotTab) {
      return selectedSpotTab.tabName;
    }

    const firstSpotTab = tabs.find(
      (tab) => tab.id === 'hot' || tab.id === 'stock',
    );
    return firstSpotTab?.tabName ?? tabs[0]?.tabName ?? watchlistTabName;
  }, [selectedSpotCategory, selectedTab, tabs, watchlistTabName]);

  const tabNames = useMemo(() => tabs.map((tab) => tab.tabName), [tabs]);

  return {
    tabs,
    tabNames,
    watchlistTabName,
    handleTabChange,
    getSpotCategoryIdByTabName,
    selectedTabName,
  };
}
