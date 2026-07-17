import { useCallback } from 'react';

import { rootNavigationRef } from '@onekeyhq/components';
import {
  type IMarketSelectedTab,
  useMarketSelectedTabAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ERootRoutes,
  ETabMarketRoutes,
  ETabRoutes,
} from '@onekeyhq/shared/src/routes';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';

interface INavigateToMarketTabOptions {
  tabToSelect?: IMarketSelectedTab;
  spotCategoryToSelect?: string;
  perpsCategoryToSelect?: string;
}

export function useNavigateToMarketTab() {
  const [, setMarketSelectedTab] = useMarketSelectedTabAtom();

  const navigateToMarketTab = useCallback(
    (options?: INavigateToMarketTabOptions) => {
      const { tabToSelect, spotCategoryToSelect, perpsCategoryToSelect } =
        options ?? {};
      let targetTab = tabToSelect;
      if (spotCategoryToSelect) {
        targetTab = 'trending';
      }
      if (perpsCategoryToSelect) {
        targetTab = 'perps';
      }

      // Switch to specific tab inside Market (watchlist or trending)
      if (targetTab || spotCategoryToSelect || perpsCategoryToSelect) {
        setMarketSelectedTab((prev) => ({
          ...prev,
          tab: targetTab ?? prev.tab,
          selectedSpotCategory:
            spotCategoryToSelect ?? prev.selectedSpotCategory,
          spotCategoryToSelect,
          selectedPerpsCategory:
            perpsCategoryToSelect ?? prev.selectedPerpsCategory,
          perpsCategoryToSelect,
        }));
      }

      if (
        platformEnv.isExtensionUiPopup ||
        platformEnv.isExtensionUiSidePanel
      ) {
        void backgroundApiProxy.serviceApp.openExtensionExpandTab({
          path: '/market',
        });
        return;
      }

      rootNavigationRef.current?.navigate(ERootRoutes.Main, {
        screen: ETabRoutes.Market,
        params: {
          screen: ETabMarketRoutes.TabMarket,
        },
      });
    },
    [setMarketSelectedTab],
  );

  return navigateToMarketTab;
}
