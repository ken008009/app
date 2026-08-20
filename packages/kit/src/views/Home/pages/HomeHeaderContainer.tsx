import { memo, useCallback, useEffect, useMemo, useRef } from 'react';

import {
  HeaderScrollGestureWrapper,
  Image,
  Stack,
  YStack,
} from '@onekeyhq/components';
import { WALLET_TYPE_HD } from '@onekeyhq/shared/src/consts/dbConsts';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import type { IHomePageViewedState } from '@onekeyhq/shared/src/logger/scopes/account/scenes/wallet';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { useHomeBalanceState } from '../../../hooks/useHomeBalanceState';
// import { useWalletTopBannersAtom } from '../../../states/jotai/contexts/accountOverview';
import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import { HomeTokenListProviderMirror } from '../components/HomeTokenListProvider/HomeTokenListProviderMirror';
import { onHomePageRefresh } from '../components/PullToRefresh';
import { WalletActions } from '../components/WalletActions';
// Operational banner temporarily disabled.
// import WalletBanner from '../components/WalletBanner';
import { HomeTestIDs } from '../testIDs';

import { HomeOverviewContainer } from './HomeOverviewContainer';

import type { LayoutChangeEvent } from 'react-native';

const WALLET_CARD_SOURCE = require('@onekeyhq/kit/assets/home/wallet-card.png');

// Cropped from wallet.png so left/right and top/bottom transparent
// margins are equal (original canvas was L24/R44 and T68/B17).
const WALLET_CARD_ASPECT_RATIO = 1467 / 1007;

// Wallet card (full-width, aspect-ratio) + action row + tight padding.
// Native Tabs.Container still needs an initial headerHeight; actual height is
// measured in onLayout so leftover space under WalletActions does not appear.
export const HOME_HEADER_NATIVE_HEIGHT = 400;
// export const HOME_HEADER_NATIVE_HEIGHT_WITH_BANNER = 562;

function BaseHomeHeaderContainer({
  onNativeLayoutHeight,
}: {
  onNativeLayoutHeight?: (height: number) => void;
}) {
  const {
    activeAccount: { wallet },
  } = useActiveAccount({
    num: 0,
  });

  // Operational WalletBanner temporarily disabled.
  // Mirror WalletBanner's own render condition so the placeholder height
  // matches what the banner will actually display. WalletBanner returns null
  // when there's no banner content (no banners and no Tron-resource card);
  // otherwise the banner band is ~130pt.
  // const [{ banners }] = useWalletTopBannersAtom();
  // const hasTronCard = Boolean(
  //   vaultSettings?.hasResource && account?.id && network?.id,
  // );
  // const hasWalletBannerContent = banners.length > 0 || hasTronCard;

  const isWalletNotBackedUp = useMemo(() => {
    if (wallet && wallet.type === WALLET_TYPE_HD && !wallet.backuped) {
      return true;
    }
    return false;
  }, [wallet]);

  // Banner only renders once we have actual banner content AND the balance is
  // confirmed positive. Treating 'unknown' as hidden avoids the show→hide
  // flicker that previously occurred when the page mounted with the banner
  // visible and then collapsed once the first balance fetch came back zero.
  const homeBalanceState = useHomeBalanceState();
  // const shouldShowBanner =
  //   !isWalletNotBackedUp &&
  //   hasWalletBannerContent &&
  //   homeBalanceState === 'positive';

  const handleNativeLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!platformEnv.isNative) {
        return;
      }
      const height = Math.round(event.nativeEvent.layout.height);
      if (height > 0) {
        onNativeLayoutHeight?.(height);
      }
    },
    [onNativeLayoutHeight],
  );

  // Funnel denominator for backup / receive completion rates: log once per
  // (walletId, state) tuple seen this session. Skip `unknown` so we don't
  // record the loading window as a real impression.
  const homePageViewedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!wallet?.id) return;
    let state: IHomePageViewedState | undefined;
    if (isWalletNotBackedUp) {
      state = 'notBackedUp';
    } else if (homeBalanceState === 'positive') {
      state = 'fundedWallet';
    } else if (homeBalanceState === 'zero') {
      state = 'emptyWallet';
    }
    if (!state) return;
    const key = `${wallet.id}__${state}`;
    if (homePageViewedKeyRef.current === key) return;
    homePageViewedKeyRef.current = key;
    defaultLogger.account.wallet.homePageViewed({
      state,
      walletType: wallet.type,
    });
  }, [wallet?.id, wallet?.type, isWalletNotBackedUp, homeBalanceState]);

  return (
    <YStack
      pb="$2"
      gap="$4"
      onLayout={handleNativeLayout}
      $gtMd={{ gap: '$8' }}
      bg="$bgApp"
      pointerEvents="box-none"
    >
      <Stack
        testID={HomeTestIDs.headerContainer}
        gap="$4"
        pt="$4"
        $gtMd={{
          pt: '$8',
        }}
        bg="$bgApp"
        pointerEvents="box-none"
      >
        <HeaderScrollGestureWrapper onRefresh={onHomePageRefresh}>
          <Stack w="100%" alignItems="center" justifyContent="center">
            <Stack
              w="100%"
              aspectRatio={WALLET_CARD_ASPECT_RATIO}
              alignItems="center"
              justifyContent="center"
              overflow="hidden"
            >
              <Image
                source={WALLET_CARD_SOURCE}
                w="100%"
                h="100%"
                contentFit="contain"
                contentPosition="center"
              />
              <YStack
                position="absolute"
                top="37%"
                bottom="15%"
                left="11%"
                right="41%"
                justifyContent="space-between"
                pointerEvents="box-none"
              >
                <HomeOverviewContainer />
              </YStack>
            </Stack>
          </Stack>
        </HeaderScrollGestureWrapper>
        <HeaderScrollGestureWrapper onRefresh={onHomePageRefresh}>
          <Stack px="$pagePadding">
            <WalletActions />
          </Stack>
        </HeaderScrollGestureWrapper>
      </Stack>
      {/* Operational WalletBanner temporarily disabled.
      Always mount so initLocalBanners + remote fetch effects run.
          Without this, gating on `shouldShowBanner` (which requires
          banners.length > 0) creates a deadlock — banner data is only
          written to the atom from WalletBanner's own useEffect, so the
          atom would stay empty and the banner would never appear after
          a fresh install + first import. The visual hide on
          zero-balance / not-backed-up still works via the `hidden`
          prop.
      <WalletBanner hidden={!shouldShowBanner} />
      */}
    </YStack>
  );
}

// The provider mirror must wrap the component (not live inside its return):
// `useHomeBalanceState` reads tokenList context atoms, so the hook call in
// `BaseHomeHeaderContainer`'s body has to sit inside the provider.
// Note: on the URL-account page (which reuses HomePageView) the token list is
// written to the separate urlAccountHomeTokenList store, not this mirror's
// homeTokenList store — the hook's owner-stamp guard absorbs the mismatch and
// the holdings override simply stays inactive there (worth-only behavior).
export const HomeHeaderContainer = memo(function HomeHeaderContainer({
  onNativeLayoutHeight,
}: {
  onNativeLayoutHeight?: (height: number) => void;
}) {
  return (
    <HomeTokenListProviderMirror>
      <BaseHomeHeaderContainer onNativeLayoutHeight={onNativeLayoutHeight} />
    </HomeTokenListProviderMirror>
  );
});
HomeHeaderContainer.displayName = 'HomeHeaderContainer';
