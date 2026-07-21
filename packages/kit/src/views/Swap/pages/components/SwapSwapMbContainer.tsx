import { useRef } from 'react';

import {
  EPageType,
  KEYBOARD_AWARE_SCROLL_BOTTOM_OFFSET,
  Keyboard,
  YStack,
  useScrollContentTabBarOffset,
} from '@onekeyhq/components';
import { ESwapDirectionType } from '@onekeyhq/shared/types/swap/types';
import type {
  IFetchQuoteResult,
  ISwapAlertState,
  ISwapToken,
} from '@onekeyhq/shared/types/swap/types';

import SwapRecentTokenPairsGroup from '../../components/SwapRecentTokenPairsGroup';

import SwapActionsState from './SwapActionsState';
import SwapAlertContainer from './SwapAlertContainer';
import SwapQuoteInput from './SwapQuoteInput';
import SwapQuoteResult from './SwapQuoteResult';
import SwapTipsContainer from './SwapTipsContainer';

import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';

interface ISwapSwapMbContainerProps {
  pageType: EPageType;
  swapTipsPageType?: EPageType;
  onSelectToken: (type: ESwapDirectionType) => void;
  fetchLoading: boolean;
  onSelectPercentageStage: (stage: number) => void;
  onBalanceMaxPress: () => void;
  onPreSwap: () => void;
  onToAnotherAddressModal: () => void;
  onOpenProviderList: () => void;
  refreshAction: () => void;
  quoteResult?: IFetchQuoteResult;
  quoteLoading: boolean;
  quoteEventFetching: boolean;
  alerts: {
    states: ISwapAlertState[];
    quoteId: string;
  };
  onSelectRecentTokenPairs: ({
    fromToken,
    toToken,
  }: {
    fromToken: ISwapToken;
    toToken: ISwapToken;
  }) => void;
  fromTokenAmountValue: string;
  swapRecentTokenPairs: { fromToken: ISwapToken; toToken: ISwapToken }[];
}

const SwapSwapMbContainer = ({
  pageType,
  swapTipsPageType,
  onSelectToken,
  fetchLoading,
  onSelectPercentageStage,
  onBalanceMaxPress,
  onPreSwap,
  onToAnotherAddressModal,
  onOpenProviderList,
  refreshAction,
  quoteResult,
  quoteLoading,
  quoteEventFetching,
  alerts,
  onSelectRecentTokenPairs,
  fromTokenAmountValue,
  swapRecentTokenPairs,
}: ISwapSwapMbContainerProps) => {
  const tabBarHeight = useScrollContentTabBarOffset();
  const scrollViewRef = useRef<KeyboardAwareScrollViewRef>(null);
  const bottomOffset = KEYBOARD_AWARE_SCROLL_BOTTOM_OFFSET + 60;
  return (
    <Keyboard.AwareScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ref={scrollViewRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: tabBarHeight }}
      bottomOffset={bottomOffset}
    >
      <SwapTipsContainer pageType={swapTipsPageType} />
      <YStack
        pt="$2.5"
        px="$5"
        gap="$5"
        flex={1}
        $gtMd={{
          flex: 'unset',
          pt: pageType === EPageType.modal ? '$2.5' : '$5',
        }}
        pb="$5"
      >
        <SwapQuoteInput
          onSelectToken={onSelectToken}
          selectLoading={fetchLoading}
          onSelectPercentageStage={onSelectPercentageStage}
          onBalanceMaxPress={onBalanceMaxPress}
        />
        <SwapActionsState
          onPreSwap={onPreSwap}
          onOpenRecipientAddress={onToAnotherAddressModal}
          onSelectPercentageStage={onSelectPercentageStage}
        />
        <SwapQuoteResult
          refreshAction={refreshAction}
          onOpenProviderList={onOpenProviderList}
          quoteResult={quoteResult}
        />
        {alerts.states.length > 0 &&
        !quoteLoading &&
        !quoteEventFetching &&
        alerts?.quoteId === (quoteResult?.quoteId ?? '') ? (
          <SwapAlertContainer alerts={alerts.states} />
        ) : null}
        <SwapRecentTokenPairsGroup
          onSelectTokenPairs={onSelectRecentTokenPairs}
          tokenPairs={swapRecentTokenPairs}
          fromTokenAmount={fromTokenAmountValue}
        />
      </YStack>
    </Keyboard.AwareScrollView>
  );
};

export default SwapSwapMbContainer;
