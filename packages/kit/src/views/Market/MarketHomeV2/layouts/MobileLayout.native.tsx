import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RefObject } from 'react';

import { Tabs, YStack } from '@onekeyhq/components';
import type { ITabContainerRef } from '@onekeyhq/components';
import { useTabBarHeight } from '@onekeyhq/components/src/layouts/Page/hooks';
import { useTabContainerWidth } from '@onekeyhq/kit/src/hooks/useTabContainerWidth';
import { useMarketWatchListV2Atom } from '@onekeyhq/kit/src/states/jotai/contexts/marketV2';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { EarnHomeWithProvider } from '../../../Earn/EarnHome';
import { MarketFilterBarSmall } from '../components/MarketFilterBarSmall';
import {
  type IMarketMobileSortOption,
  type IMarketMobileSortValue,
  MarketMobileSortSelect,
} from '../components/MarketMobileSortSelect';
import { MobileMarketTokenFlatList } from '../components/MarketTokenList/MobileMarketTokenFlatList';
import { MobileMarketWatchlistFlatList } from '../components/MarketTokenList/MobileMarketWatchlistFlatList';
import { isMarketStockCategoryById } from '../utils';

import { useNativeMarketHomeTabsLogic, useSyncedMarketTab } from './hooks';

import type {
  ILiquidityFilter,
  IMarketFilterBarProps,
  IMarketHomeTabValue,
} from '../types';
import type { TabBarProps } from 'react-native-collapsible-tab-view';
import type {
  PageScrollStateChangedNativeEvent,
  PagerViewOnPageSelectedEvent,
  PagerViewProps,
} from 'react-native-pager-view';

interface IMobileLayoutProps {
  filterBarProps: IMarketFilterBarProps;
  selectedNetworkId: string;
  liquidityFilter?: ILiquidityFilter;
  onTabChange: (tabId: IMarketHomeTabValue) => void;
  tabsRef?: RefObject<ITabContainerRef | null>;
  isFocused?: boolean;
  nestedPager?: boolean;
}

// Context for dynamic tab bar values so renderTabBar stays stable.
interface ITabBarDynamicContext {
  filterBarProps: IMobileLayoutProps['filterBarProps'];
  isWatchlistEmpty: boolean;
  getSpotCategoryIdByTabName: (tabName: string) => string | undefined;
  stockDataCategoryMap: Record<string, boolean>;
  activeTabName: string;
  spotSortValue: IMarketMobileSortValue;
  onSpotSortChange: (
    value: IMarketMobileSortValue,
    options?: IMarketMobileSortOption,
  ) => void;
  watchlistSortValue: IMarketMobileSortValue;
  onWatchlistSortChange: (
    value: IMarketMobileSortValue,
    options?: IMarketMobileSortOption,
  ) => void;
}

const TabBarDynamicContext = createContext<ITabBarDynamicContext | null>(null);

interface IMarketHomeTabBarProps extends TabBarProps<string> {
  watchlistTabName: string;
}

const MARKET_ANDROID_SECONDARY_HEADER_HEIGHT = 76;
const MARKET_ANDROID_COLUMN_HEADER_HEIGHT = 44;
const MARKET_TAB_CHANGE_TARGET_GUARD_MS = platformEnv.isNativeIOS ? 1000 : 350;
const MARKET_TAB_SYNC_JUMP_DEFER_MS = platformEnv.isNativeIOS ? 180 : 0;
const MARKET_TAB_USER_DRAG_ACCEPT_MS = platformEnv.isNativeIOS ? 700 : 350;
const MARKET_TAB_SYNC_USER_DRAG_DEFER_MS = platformEnv.isNativeIOS ? 1200 : 500;
const MARKET_TAB_ITEM_PRESS_GUARD_MS = MARKET_TAB_USER_DRAG_ACCEPT_MS;
const MARKET_TAB_ITEM_PRESS_IDLE_GUARD_MS = platformEnv.isNativeIOS ? 180 : 120;
const MARKET_TAB_PROGRAMMATIC_SETTLE_GUARD_MS = platformEnv.isNativeAndroid
  ? 500
  : 0;
type IMarketPagerProps = Omit<PagerViewProps, 'onPageScroll' | 'initialPage'>;

function MarketHomeTabBar({
  watchlistTabName,
  ...tabBarProps
}: IMarketHomeTabBarProps) {
  const ctx = useContext(TabBarDynamicContext)!;
  const { activeTabName } = ctx;
  const currentFocusedTabName = activeTabName || tabBarProps.tabNames[0] || '';
  const showWatchlistSubHeader = currentFocusedTabName === watchlistTabName;
  const currentSpotCategoryId = ctx.getSpotCategoryIdByTabName(
    currentFocusedTabName,
  );
  const showSpotSubHeader = Boolean(currentSpotCategoryId);
  const currentSpotCategoryHasStockData = Boolean(
    currentSpotCategoryId &&
    (isMarketStockCategoryById(
      ctx.filterBarProps.categories,
      currentSpotCategoryId,
    ) ||
      ctx.stockDataCategoryMap[currentSpotCategoryId]),
  );
  const showSpotFilterBar = Boolean(
    currentSpotCategoryId && !currentSpotCategoryHasStockData,
  );
  const fixedSecondaryHeaderHeight = useMemo(() => {
    if (!platformEnv.isNativeAndroid) {
      return undefined;
    }

    if (showWatchlistSubHeader && ctx.isWatchlistEmpty) {
      return 0;
    }

    // Watchlist only shows the sort bar now.
    if (showWatchlistSubHeader) {
      return MARKET_ANDROID_COLUMN_HEADER_HEIGHT;
    }

    if (showSpotSubHeader && !showSpotFilterBar) {
      return MARKET_ANDROID_COLUMN_HEADER_HEIGHT;
    }

    if (showSpotSubHeader) {
      return MARKET_ANDROID_SECONDARY_HEADER_HEIGHT;
    }

    // DeFi / Lending tabs have no secondary header.
    return 0;
  }, [
    ctx.isWatchlistEmpty,
    showSpotFilterBar,
    showSpotSubHeader,
    showWatchlistSubHeader,
  ]);

  const renderWatchlistSubHeaderContent = useCallback(
    () => (
      <MarketMobileSortSelect
        mode="watchlist"
        value={ctx.watchlistSortValue}
        onChange={ctx.onWatchlistSortChange}
      />
    ),
    [ctx.onWatchlistSortChange, ctx.watchlistSortValue],
  );

  const renderSpotSubHeaderContent = useCallback(
    () => (
      <>
        {showSpotFilterBar ? (
          <MarketFilterBarSmall
            selectedNetworkId={ctx.filterBarProps.selectedNetworkId}
            timeRange={ctx.filterBarProps.timeRange}
            onNetworkIdChange={ctx.filterBarProps.onNetworkIdChange}
            onTimeRangeChange={ctx.filterBarProps.onTimeRangeChange}
          />
        ) : null}
        <MarketMobileSortSelect
          mode="spot"
          value={ctx.spotSortValue}
          onChange={ctx.onSpotSortChange}
        />
      </>
    ),
    [
      ctx.filterBarProps,
      ctx.onSpotSortChange,
      ctx.spotSortValue,
      showSpotFilterBar,
    ],
  );

  return (
    <YStack bg="$bgApp">
      <YStack>
        <Tabs.TabBar
          {...tabBarProps}
          directTabPressAnimation
          directTabPressAnimationMode="instant"
        />
      </YStack>
      <YStack
        height={fixedSecondaryHeaderHeight}
        overflow={platformEnv.isNativeAndroid ? 'hidden' : undefined}
        position="relative"
      >
        <YStack
          display={
            showWatchlistSubHeader && !ctx.isWatchlistEmpty ? 'flex' : 'none'
          }
          position={
            showWatchlistSubHeader && !ctx.isWatchlistEmpty
              ? 'relative'
              : 'absolute'
          }
          top={0}
          left={0}
          right={0}
          pointerEvents={showWatchlistSubHeader ? 'auto' : 'none'}
        >
          {renderWatchlistSubHeaderContent()}
        </YStack>
        <YStack
          display={showSpotSubHeader ? 'flex' : 'none'}
          position={showSpotSubHeader ? 'relative' : 'absolute'}
          top={0}
          left={0}
          right={0}
          opacity={showSpotSubHeader ? 1 : 0}
          pointerEvents={showSpotSubHeader ? 'auto' : 'none'}
        >
          {renderSpotSubHeaderContent()}
        </YStack>
      </YStack>
    </YStack>
  );
}

function MobileLayoutComponent({
  filterBarProps,
  selectedNetworkId,
  onTabChange,
  tabsRef,
  isFocused = true,
  nestedPager = false,
}: IMobileLayoutProps) {
  const {
    tabs: marketHomeTabs,
    tabNames,
    watchlistTabName,
    handleTabChange,
    getSpotCategoryIdByTabName,
    selectedTabName,
  } = useNativeMarketHomeTabsLogic(onTabChange, {
    spotCategories: filterBarProps.categories,
    selectedSpotCategory: filterBarProps.selectedCategory,
    onSpotCategoryChange: filterBarProps.onCategoryChange,
  });

  const tabBarHeight = useTabBarHeight();
  const tabContainerWidth = useTabContainerWidth() as number | undefined;

  // Watchlist tab only shows perps favorites on native Market home.
  const [watchlistState] = useMarketWatchListV2Atom();
  const isWatchlistEmpty = !watchlistState.data?.some(
    (item) => !!item.perpsCoin,
  );

  const [spotSortValue, setSpotSortValue] =
    useState<IMarketMobileSortValue>('Default');
  const [spotSortBy, setSpotSortBy] = useState<string | undefined>('v24hUSD');
  const [spotSortType, setSpotSortType] = useState<'asc' | 'desc' | undefined>(
    'desc',
  );
  const [watchlistSortValue, setWatchlistSortValue] =
    useState<IMarketMobileSortValue>('Default');
  const [watchlistSortBy, setWatchlistSortBy] = useState<string | undefined>();
  const [watchlistSortType, setWatchlistSortType] = useState<
    'asc' | 'desc' | undefined
  >();
  const handleSpotSortChange = useCallback(
    (value: IMarketMobileSortValue, options?: IMarketMobileSortOption) => {
      setSpotSortValue(value);
      setSpotSortBy(options?.sortBy ?? 'v24hUSD');
      setSpotSortType(options?.sortType ?? 'desc');
    },
    [],
  );
  const handleWatchlistSortChange = useCallback(
    (value: IMarketMobileSortValue, options?: IMarketMobileSortOption) => {
      setWatchlistSortValue(value);
      setWatchlistSortBy(options?.sortBy);
      setWatchlistSortType(options?.sortType);
    },
    [],
  );
  const [stockDataCategoryMap, setStockDataCategoryMap] = useState<
    Record<string, boolean>
  >({});
  const handleStockDataChange = useCallback(
    (categoryId: string, isStockData: boolean) => {
      setStockDataCategoryMap((prev) => {
        if (prev[categoryId] === isStockData) {
          return prev;
        }
        return {
          ...prev,
          [categoryId]: isStockData,
        };
      });
    },
    [],
  );

  const expectedTabChangeTargetRef = useRef<string | undefined>(undefined);
  const expectedTabChangeTargetStartedAtRef = useRef(0);
  const lastPagerDraggingAtRef = useRef(0);
  const isPagerUserDraggingRef = useRef(false);
  const lastPagerUserDragEndedAtRef = useRef(0);
  const lastAcceptedTabChangeNameRef = useRef<string | undefined>(undefined);
  const lastProgrammaticAcceptedTabRef = useRef<
    | {
        tabName: string;
        acceptedAt: number;
      }
    | undefined
  >(undefined);
  const expectedTabChangeTargetTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const clearExpectedTabChangeTargetTimer = useCallback(() => {
    if (expectedTabChangeTargetTimerRef.current) {
      clearTimeout(expectedTabChangeTargetTimerRef.current);
      expectedTabChangeTargetTimerRef.current = undefined;
    }
  }, []);
  const clearExpectedTabChangeTarget = useCallback(() => {
    clearExpectedTabChangeTargetTimer();
    expectedTabChangeTargetRef.current = undefined;
    expectedTabChangeTargetStartedAtRef.current = 0;
  }, [clearExpectedTabChangeTargetTimer]);
  const scheduleExpectedTabChangeTargetClear = useCallback(
    (tabName: string, delayMs: number) => {
      clearExpectedTabChangeTargetTimer();
      expectedTabChangeTargetTimerRef.current = setTimeout(() => {
        if (expectedTabChangeTargetRef.current === tabName) {
          expectedTabChangeTargetRef.current = undefined;
          expectedTabChangeTargetStartedAtRef.current = 0;
        }
        expectedTabChangeTargetTimerRef.current = undefined;
      }, delayMs);
    },
    [clearExpectedTabChangeTargetTimer],
  );
  const markExpectedTabChangeTarget = useCallback(
    (tabName: string) => {
      clearExpectedTabChangeTarget();
      expectedTabChangeTargetRef.current = tabName;
      expectedTabChangeTargetStartedAtRef.current = Date.now();
      lastAcceptedTabChangeNameRef.current = undefined;
      lastProgrammaticAcceptedTabRef.current = undefined;
      scheduleExpectedTabChangeTargetClear(
        tabName,
        MARKET_TAB_CHANGE_TARGET_GUARD_MS,
      );
    },
    [clearExpectedTabChangeTarget, scheduleExpectedTabChangeTargetClear],
  );
  const shouldDeferJumpToTab = useCallback(
    ({ targetTabName }: { targetTabName: string; currentTabName: string }) => {
      const now = Date.now();
      const lastPagerDraggingAt = lastPagerDraggingAtRef.current;
      const pagerDragElapsedMs =
        lastPagerDraggingAt > 0 ? now - lastPagerDraggingAt : undefined;
      const isRecentPagerDrag =
        pagerDragElapsedMs !== undefined &&
        pagerDragElapsedMs < MARKET_TAB_SYNC_USER_DRAG_DEFER_MS;
      const shouldDeferForUserPager =
        isPagerUserDraggingRef.current || isRecentPagerDrag;

      if (shouldDeferForUserPager) {
        return true;
      }

      if (expectedTabChangeTargetRef.current !== targetTabName) {
        return false;
      }

      const startedAt = expectedTabChangeTargetStartedAtRef.current;
      return (
        startedAt > 0 && Date.now() - startedAt < MARKET_TAB_SYNC_JUMP_DEFER_MS
      );
    },
    [],
  );

  useEffect(
    () => () => {
      clearExpectedTabChangeTarget();
    },
    [clearExpectedTabChangeTarget],
  );

  const {
    activeTabName,
    setActiveTabName,
    tabsRef: currentTabsRef,
  } = useSyncedMarketTab(selectedTabName, tabsRef, isFocused, {
    onBeforeJumpToTab: markExpectedTabChangeTarget,
    shouldDeferJumpToTab,
  });
  const setActiveTabNameRef = useRef(setActiveTabName);
  setActiveTabNameRef.current = setActiveTabName;
  const handleTabChangeRef = useRef(handleTabChange);
  handleTabChangeRef.current = handleTabChange;
  const latestTabStateRef = useRef({
    activeTabName,
  });
  latestTabStateRef.current = {
    activeTabName,
  };
  const useNativeHeaderAnimation = platformEnv.isNativeAndroid
    ? !nestedPager
    : false;

  const containerProps = useMemo(
    () => ({
      allowHeaderOverscroll: true,
      // Banner temporarily hidden — omit renderHeader so no 1px stub line
      // appears above the category TabBar.
    }),
    [],
  );

  const listContainerProps = useMemo(() => {
    const getPaddingBottom = () => {
      if (platformEnv.isNativeIOS) {
        return 125;
      }
      if (platformEnv.isNativeAndroid) {
        return tabBarHeight + 40;
      }
      return 0;
    };

    return {
      paddingBottom: getPaddingBottom(),
    };
  }, [tabBarHeight]);

  // Stable renderTabBar — reads dynamic values from context, not props.
  const renderTabBar = useCallback(
    (tabBarProps: TabBarProps<string>) => {
      const handleTabPress = (name: string) => {
        markExpectedTabChangeTarget(name);
        tabBarProps.onTabPress?.(name);
      };

      return (
        <MarketHomeTabBar
          {...tabBarProps}
          onTabPress={handleTabPress}
          watchlistTabName={watchlistTabName}
        />
      );
    },
    [markExpectedTabChangeTarget, watchlistTabName],
  );

  const onTabChangeHandler = useCallback(
    ({ tabName }: { tabName: string }) => {
      const latestTabState = latestTabStateRef.current;
      const focusedTab = currentTabsRef.current?.getFocusedTab();
      const expectedTabName = expectedTabChangeTargetRef.current;
      const expectedTabNameStartedAt =
        expectedTabChangeTargetStartedAtRef.current;
      const lastPagerDraggingAt = lastPagerDraggingAtRef.current;
      const pagerDragElapsedMs =
        lastPagerDraggingAt > 0 ? Date.now() - lastPagerDraggingAt : undefined;
      const isRecentPagerDrag =
        pagerDragElapsedMs !== undefined &&
        pagerDragElapsedMs < MARKET_TAB_USER_DRAG_ACCEPT_MS;
      const wasDraggedAfterExpectedTab =
        expectedTabNameStartedAt > 0 &&
        lastPagerDraggingAt > expectedTabNameStartedAt;

      const lastProgrammaticAcceptedTab =
        lastProgrammaticAcceptedTabRef.current;
      const programmaticAcceptedElapsedMs = lastProgrammaticAcceptedTab
        ? Date.now() - lastProgrammaticAcceptedTab.acceptedAt
        : undefined;
      const shouldIgnoreProgrammaticSettlingTab = Boolean(
        !expectedTabName &&
        MARKET_TAB_PROGRAMMATIC_SETTLE_GUARD_MS > 0 &&
        lastProgrammaticAcceptedTab &&
        tabName !== lastProgrammaticAcceptedTab.tabName &&
        programmaticAcceptedElapsedMs !== undefined &&
        programmaticAcceptedElapsedMs <
          MARKET_TAB_PROGRAMMATIC_SETTLE_GUARD_MS &&
        !isRecentPagerDrag &&
        !wasDraggedAfterExpectedTab,
      );

      if (shouldIgnoreProgrammaticSettlingTab && lastProgrammaticAcceptedTab) {
        const acceptedTabName = lastProgrammaticAcceptedTab.tabName;
        if (focusedTab !== acceptedTabName) {
          markExpectedTabChangeTarget(acceptedTabName);
          currentTabsRef.current?.jumpToTab(acceptedTabName);
        }
        return;
      }

      if (expectedTabName && tabName !== expectedTabName) {
        if (
          focusedTab === tabName &&
          (isRecentPagerDrag || wasDraggedAfterExpectedTab)
        ) {
          clearExpectedTabChangeTarget();
        } else {
          return;
        }
      }

      if (!expectedTabName && focusedTab && focusedTab !== tabName) {
        return;
      }

      if (
        tabName === lastAcceptedTabChangeNameRef.current &&
        latestTabState.activeTabName === tabName
      ) {
        if (expectedTabName && tabName === expectedTabName) {
          clearExpectedTabChangeTarget();
        }
        return;
      }

      if (expectedTabName && tabName === expectedTabName) {
        lastProgrammaticAcceptedTabRef.current = {
          tabName,
          acceptedAt: Date.now(),
        };
        clearExpectedTabChangeTarget();
      }
      lastAcceptedTabChangeNameRef.current = tabName;
      setActiveTabNameRef.current(tabName);
      handleTabChangeRef.current(tabName);
    },
    [clearExpectedTabChangeTarget, currentTabsRef, markExpectedTabChangeTarget],
  );

  const handlePagerScrollStateChanged = useCallback(
    (event: PageScrollStateChangedNativeEvent) => {
      const { pageScrollState } = event.nativeEvent;
      if (pageScrollState !== 'dragging') {
        if (pageScrollState === 'idle' && isPagerUserDraggingRef.current) {
          isPagerUserDraggingRef.current = false;
          lastPagerUserDragEndedAtRef.current = Date.now();
        }
        return;
      }

      isPagerUserDraggingRef.current = true;
      lastProgrammaticAcceptedTabRef.current = undefined;
      lastPagerDraggingAtRef.current = Date.now();
    },
    [],
  );

  const handlePagerPageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const { position } = event.nativeEvent;
      const positionTabName = tabNames[position];
      const focusedTab = currentTabsRef.current?.getFocusedTab();
      const expectedTabName = expectedTabChangeTargetRef.current;
      const expectedTabNameStartedAt =
        expectedTabChangeTargetStartedAtRef.current;
      const lastPagerDraggingAt = lastPagerDraggingAtRef.current;
      const wasDraggedAfterExpectedTab =
        expectedTabNameStartedAt > 0 &&
        lastPagerDraggingAt > expectedTabNameStartedAt;

      const selectedTabNameFromPage = positionTabName || focusedTab;
      if (
        expectedTabName &&
        selectedTabNameFromPage &&
        selectedTabNameFromPage !== expectedTabName &&
        wasDraggedAfterExpectedTab
      ) {
        clearExpectedTabChangeTarget();
      }
    },
    [clearExpectedTabChangeTarget, currentTabsRef, tabNames],
  );
  const shouldSuppressItemPress = useCallback(() => {
    const now = Date.now();
    const pagerDragElapsedMs =
      lastPagerDraggingAtRef.current > 0
        ? now - lastPagerDraggingAtRef.current
        : undefined;
    const pagerIdleElapsedMs =
      lastPagerUserDragEndedAtRef.current > 0
        ? now - lastPagerUserDragEndedAtRef.current
        : undefined;

    if (isPagerUserDraggingRef.current) {
      return true;
    }

    if (
      pagerIdleElapsedMs !== undefined &&
      pagerIdleElapsedMs < MARKET_TAB_ITEM_PRESS_IDLE_GUARD_MS
    ) {
      return true;
    }

    if (
      pagerDragElapsedMs !== undefined &&
      pagerDragElapsedMs < MARKET_TAB_ITEM_PRESS_GUARD_MS
    ) {
      return true;
    }

    return false;
  }, []);
  const pagerProps = useMemo<IMarketPagerProps>(
    () => ({
      ...(nestedPager ? { nestedScrollEnabled: true } : {}),
      onPageScrollStateChanged: handlePagerScrollStateChanged,
      onPageSelected: handlePagerPageSelected,
    }),
    [handlePagerPageSelected, handlePagerScrollStateChanged, nestedPager],
  );
  const dynamicCtx = useMemo<ITabBarDynamicContext>(
    () => ({
      filterBarProps,
      isWatchlistEmpty,
      getSpotCategoryIdByTabName,
      stockDataCategoryMap,
      activeTabName,
      spotSortValue,
      onSpotSortChange: handleSpotSortChange,
      watchlistSortValue,
      onWatchlistSortChange: handleWatchlistSortChange,
    }),
    [
      filterBarProps,
      isWatchlistEmpty,
      getSpotCategoryIdByTabName,
      stockDataCategoryMap,
      activeTabName,
      spotSortValue,
      handleSpotSortChange,
      watchlistSortValue,
      handleWatchlistSortChange,
    ],
  );

  const tabElements = marketHomeTabs.map((tab) => {
    switch (tab.id) {
      case 'watchlist':
        return (
          <Tabs.Tab key={tab.id} name={tab.tabName}>
            <MobileMarketWatchlistFlatList
              selectedFilter="perps"
              listContainerProps={listContainerProps}
              shouldSuppressItemPress={shouldSuppressItemPress}
              sortBy={watchlistSortBy}
              sortType={watchlistSortType}
            />
          </Tabs.Tab>
        );
      case 'hot':
      case 'stock':
        return (
          <Tabs.Tab key={tab.categoryId ?? tab.id} name={tab.tabName}>
            <MobileMarketTokenFlatList
              networkId={selectedNetworkId}
              selectedCategory={tab.categoryId ?? ''}
              timeRange={filterBarProps.timeRange}
              listContainerProps={listContainerProps}
              onStockDataChange={handleStockDataChange}
              shouldSuppressItemPress={shouldSuppressItemPress}
              sortBy={spotSortBy}
              sortType={spotSortType}
            />
          </Tabs.Tab>
        );
      case 'defi':
        return (
          <Tabs.Tab key={tab.id} name={tab.tabName}>
            <YStack flex={1}>
              <EarnHomeWithProvider
                showHeader={false}
                showContent={
                  isFocused
                    ? activeTabName === tab.tabName || !activeTabName
                    : false
                }
                lockedMode="earn"
              />
            </YStack>
          </Tabs.Tab>
        );
      case 'lending':
        return (
          <Tabs.Tab key={tab.id} name={tab.tabName}>
            <YStack flex={1}>
              <EarnHomeWithProvider
                showHeader={false}
                showContent={
                  isFocused
                    ? activeTabName === tab.tabName || !activeTabName
                    : false
                }
                lockedMode="borrow"
              />
            </YStack>
          </Tabs.Tab>
        );
      default: {
        const _exhaustive: never = tab;
        return _exhaustive;
      }
    }
  });

  return (
    <TabBarDynamicContext.Provider value={dynamicCtx}>
      <Tabs.Container
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={currentTabsRef as any}
        width={platformEnv.isNative ? tabContainerWidth : undefined}
        renderTabBar={renderTabBar}
        initialTabName={selectedTabName}
        onTabChange={onTabChangeHandler}
        useNativeHeaderAnimation={useNativeHeaderAnimation}
        pagerProps={pagerProps}
        {...containerProps}
      >
        {tabElements}
      </Tabs.Container>
    </TabBarDynamicContext.Provider>
  );
}

export const MobileLayout = memo(MobileLayoutComponent);
