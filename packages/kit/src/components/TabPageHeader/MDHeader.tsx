import { type ReactNode, memo, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  GlassButtonCapsule,
  Page,
  SizableText,
  Spinner,
  View,
  XStack,
  YStack,
  isLiquidGlassAvailable,
  useSafeAreaInsets,
} from '@onekeyhq/components';
import { AccountSelectorTriggerHome } from '@onekeyhq/kit/src/components/AccountSelector';
import { useSpotlight } from '@onekeyhq/kit/src/components/Spotlight';
import useListenTabFocusState from '@onekeyhq/kit/src/hooks/useListenTabFocusState';
import { useAppIsLockedAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';
import { ESpotlightTour } from '@onekeyhq/shared/src/spotlight';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import {
  useActiveAccount,
  useIsAccountSelectorSyncLoading,
} from '../../states/jotai/contexts/accountSelector';
import { HomeTokenListProviderMirror } from '../../views/Home/components/HomeTokenListProvider/HomeTokenListProviderMirror';

import { HeaderNotificationIconButton } from './components/HeaderNotificationIconButton';
import { HeaderScanIconButton } from './components/HeaderScanIconButton';
import { HeaderUpdateButton } from './components/HeaderUpdateButton';
import { HeaderLeft } from './HeaderLeft';
import { HeaderMDSearch } from './HeaderMDSearch';
import { HeaderRight, SelectorTrigger } from './HeaderRight';
import { HeaderTitle } from './HeaderTitle';

import type { SharedValue } from 'react-native-reanimated';

function HomeAccountSelectorTrigger() {
  const intl = useIntl();
  const { tourTimes, tourVisited } = useSpotlight(
    ESpotlightTour.switchDappAccount,
  );
  const [isLocked] = useAppIsLockedAtom();
  const [isFocus, setIsFocus] = useState(false);

  useListenTabFocusState(
    ETabRoutes.Home,
    async (focus: boolean, hideByModal: boolean) => {
      setIsFocus(!hideByModal && focus);
    },
  );

  const spotlightVisible = useMemo(
    () => tourTimes === 1 && isFocus && !isLocked,
    [isFocus, isLocked, tourTimes],
  );

  return (
    <AccountSelectorTriggerHome
      num={0}
      avatarSize="medium"
      spotlightProps={{
        visible: spotlightVisible,
        content: (
          <SizableText size="$bodyMd">
            {intl.formatMessage({
              id: ETranslations.spotlight_account_alignment_desc,
            })}
          </SizableText>
        ),
        onConfirm: () => {
          void tourVisited(2);
        },
        childrenPaddingVertical: 0,
      }}
    />
  );
}

const MemoizedHomeAccountSelectorTrigger = memo(HomeAccountSelectorTrigger);

function HomeMDHeaderRows({ headerPx }: { headerPx: string }) {
  const { top } = useSafeAreaInsets();
  const headerGlassActive = isLiquidGlassAvailable();
  const {
    activeAccount: { wallet, account },
  } = useActiveAccount({ num: 0 });
  const isSyncLoading = useIsAccountSelectorSyncLoading(0);
  const hasNoUsableWallet = accountUtils.hasNoUsableWallet({
    wallet,
    account,
  });

  if (hasNoUsableWallet && !isSyncLoading) {
    return (
      <XStack
        h={top || '$2'}
        {...(top || platformEnv.isNativeAndroid ? { mt: top || '$2' } : {})}
      />
    );
  }

  const rightIconGroup = headerGlassActive ? (
    <GlassButtonCapsule>
      <HeaderNotificationIconButton testID="header-right-notification" />
      <HeaderScanIconButton testID="header-right-scan" />
      {/* MoreActionButton temporarily hidden on Home. */}
    </GlassButtonCapsule>
  ) : (
    <XStack alignItems="center" gap="$3">
      <HeaderNotificationIconButton testID="header-right-notification" />
      <HeaderScanIconButton testID="header-right-scan" />
      {/* MoreActionButton temporarily hidden on Home. */}
    </XStack>
  );

  return (
    <YStack
      px={headerPx}
      pb="$2"
      {...(top || platformEnv.isNativeAndroid ? { mt: top || '$2' } : {})}
    >
      {/* Account selector | notification + scan + more */}
      <XStack
        alignItems="center"
        justifyContent="space-between"
        minHeight={44}
        gap={headerGlassActive ? '$3' : '$4'}
      >
        <XStack flex={1} flexShrink={1} minWidth={0} alignItems="center">
          {isSyncLoading && hasNoUsableWallet ? (
            <Spinner size="small" />
          ) : (
            <MemoizedHomeAccountSelectorTrigger />
          )}
        </XStack>
        <XStack alignItems="center" flexShrink={0} gap="$1">
          <HeaderUpdateButton />
          {rightIconGroup}
        </XStack>
      </XStack>
    </YStack>
  );
}

export function MDHeader({
  tabRoute,
  sceneName,
  hideSearch,
  selectedHeaderTab,
  customHeaderLeftItems,
  customHeaderRightItems,
  renderCustomHeaderRightItems,
  headerPx = '$5',
  pageScrollPosition,
}: {
  tabRoute: ETabRoutes;
  sceneName: EAccountSelectorSceneName;
  hideSearch: boolean;
  selectedHeaderTab?: ETranslations;
  customHeaderLeftItems?: ReactNode;
  customHeaderRightItems?: ReactNode;
  renderCustomHeaderRightItems?: ({
    fixedItems,
  }: {
    fixedItems: ReactNode;
  }) => ReactNode;
  headerPx?: string;
  pageScrollPosition?: SharedValue<number>;
}) {
  const { top } = useSafeAreaInsets();

  const rightActions = useMemo(() => {
    return sceneName === EAccountSelectorSceneName.homeUrlAccount ? (
      <XStack flexShrink={1}>
        <HomeTokenListProviderMirror>
          <SelectorTrigger />
        </HomeTokenListProviderMirror>
      </XStack>
    ) : (
      <HeaderRight
        selectedHeaderTab={selectedHeaderTab}
        sceneName={sceneName}
        tabRoute={tabRoute}
        customHeaderRightItems={customHeaderRightItems}
        renderCustomHeaderRightItems={renderCustomHeaderRightItems}
      />
    );
  }, [
    customHeaderRightItems,
    renderCustomHeaderRightItems,
    sceneName,
    selectedHeaderTab,
    tabRoute,
  ]);
  const showBaseHeader = useMemo(() => {
    return (
      tabRoute === ETabRoutes.Home ||
      tabRoute === ETabRoutes.Swap ||
      tabRoute === ETabRoutes.Market ||
      tabRoute === ETabRoutes.Discovery ||
      tabRoute === ETabRoutes.Earn ||
      tabRoute === ETabRoutes.Perp ||
      tabRoute === ETabRoutes.DeviceManagement ||
      tabRoute === ETabRoutes.Mine ||
      tabRoute === ETabRoutes.CloudChat ||
      tabRoute === ETabRoutes.AI
    );
  }, [tabRoute]);
  const isHomeTab =
    tabRoute === ETabRoutes.Home &&
    sceneName !== EAccountSelectorSceneName.homeUrlAccount;
  const intl = useIntl();
  const marketTitle = useMemo(
    () => (
      <SizableText size="$headingXl">
        {intl.formatMessage({ id: ETranslations.global_market })}
      </SizableText>
    ),
    [intl],
  );

  return (
    <>
      <Page.Header headerShown={false} />
      {showBaseHeader ? (
        <>
          {isHomeTab ? (
            <HomeMDHeaderRows headerPx={headerPx} />
          ) : (
            <>
              <XStack
                alignItems="center"
                justifyContent="space-between"
                px={headerPx}
                h={44}
                {...(top || platformEnv.isNativeAndroid
                  ? { mt: top || '$2' }
                  : {})}
              >
                <View>
                  {customHeaderLeftItems ??
                    (tabRoute === ETabRoutes.Market ? (
                      marketTitle
                    ) : (
                      <HeaderLeft
                        selectedHeaderTab={selectedHeaderTab}
                        sceneName={sceneName}
                        tabRoute={tabRoute}
                        pageScrollPosition={pageScrollPosition}
                      />
                    ))}
                </View>
                <View>
                  <HeaderTitle sceneName={sceneName} />
                </View>
                {rightActions}
              </XStack>

              {!hideSearch ? (
                <HeaderMDSearch tabRoute={tabRoute} sceneName={sceneName} />
              ) : null}
            </>
          )}
        </>
      ) : (
        <XStack h={top || '$2'} bg="$bgApp" />
      )}
    </>
  );
}
