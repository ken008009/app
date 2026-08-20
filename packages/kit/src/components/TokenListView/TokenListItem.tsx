import { memo, useCallback } from 'react';

import { Spinner, Stack, XStack, YStack } from '@onekeyhq/components';
import type { IListItemProps } from '@onekeyhq/kit/src/components/ListItem';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { getHomeTokenLocalLogoUri } from '@onekeyhq/kit/src/utils/homeTokenLocalLogos';
import { isTokenSelectorDappToken } from '@onekeyhq/shared/src/utils/tokenSelectorFilterUtils';
import type { IAccountToken } from '@onekeyhq/shared/types/token';

import { useProcessingTokenStateAtom } from '../../states/jotai/contexts/tokenList';
import {
  HOME_GOLD,
  HOME_GOLD_BORDER,
  HOME_TOKEN_CARD_BG,
} from '../../views/Home/homeTheme';

import CreateAccountView from './CreateAccountView';
import TokenActionsView from './TokenActionsView';
import TokenBalanceView from './TokenBalanceView';
import TokenIconView from './TokenIconView';
import TokenNameView from './TokenNameView';
import TokenPriceChangeView from './TokenPriceChangeView';
import TokenPriceView from './TokenPriceView';
import TokenValueView from './TokenValueView';

const HOME_TOKEN_CARD_ITEM_PROPS = {
  mx: '$4',
  px: '$3.5',
  py: '$3.5',
  mb: '$2.5',
  bg: HOME_TOKEN_CARD_BG,
  borderWidth: 1,
  borderColor: HOME_GOLD_BORDER,
  borderRadius: '$4',
} as const;

const HOME_TOKEN_ICON_RING_PROPS = {
  borderWidth: 1.5,
  borderColor: HOME_GOLD,
  borderRadius: '$full',
  p: '$0.5',
} as const;

export type ITokenListItemProps = {
  token: IAccountToken;
  onPress?: (token: IAccountToken) => void;
  tableLayout?: boolean;
  withPrice?: boolean;
  withNetwork?: boolean;
  isAllNetworks?: boolean;
  isTokenSelector?: boolean;
  hideValue?: boolean;
  hideBalanceAndValue?: boolean;
  withSwapAction?: boolean;
  showNetworkIcon?: boolean;
  withAggregateBadge?: boolean;
  showProcessingState?: boolean;
  // Caller-supplied scene prefix so this shared component produces unique
  // selectors per scene (Home, AssetList, TokenSelector, ...) instead of
  // always emitting `home-token-item-*` regardless of context.
  testIDPrefix?: string;
  homeCardStyle?: boolean;
} & Omit<IListItemProps, 'onPress'>;

function BasicTokenListItem(props: ITokenListItemProps) {
  const {
    token,
    onPress,
    tableLayout,
    withPrice,
    isAllNetworks,
    withNetwork,
    isTokenSelector,
    hideValue,
    hideBalanceAndValue,
    withSwapAction,
    showNetworkIcon,
    withAggregateBadge,
    showProcessingState,
    testIDPrefix,
    homeCardStyle,
    ...rest
  } = props;

  // Use networkId + symbol so multi-network duplicates (e.g. USDC on Ethereum
  // vs Polygon) get distinct selectors. Fall back to `$key` when either
  // component is missing — `$key` is the canonical unique token identifier.
  const resolvedTestIDPrefix = testIDPrefix ?? 'home-token-item';
  const networkIdPart = token.networkId ?? 'any';
  const symbolPart = token.symbol ?? token.$key ?? 'unknown';
  const resolvedTestID = `${resolvedTestIDPrefix}-${networkIdPart}-${symbolPart}`;

  const [processingTokenState] = useProcessingTokenStateAtom();

  const isCurrentTokenProcessing =
    showProcessingState &&
    processingTokenState.isProcessing &&
    processingTokenState.token?.$key === token.$key;

  const isOtherTokenProcessing =
    showProcessingState &&
    processingTokenState.isProcessing &&
    processingTokenState.token?.$key !== token.$key;

  const showDeFiReceiptTokenBadge = isTokenSelectorDappToken(token);
  const tokenLogoUri =
    getHomeTokenLocalLogoUri(token.commonSymbol ?? token.symbol) ??
    token.logoURI;

  const renderFirstColumn = useCallback(() => {
    if (!tableLayout && !isTokenSelector) {
      return (
        <XStack alignItems="center" gap="$3" flex={1}>
          <Stack {...(homeCardStyle ? HOME_TOKEN_ICON_RING_PROPS : undefined)}>
            <TokenIconView
              $key={token.$key}
              isAggregateToken={token.isAggregateToken}
              networkId={token.networkId}
              icon={tokenLogoUri}
              isAllNetworks={isAllNetworks}
              showNetworkIcon={showNetworkIcon}
            />
          </Stack>
          <YStack flex={1}>
            <TokenNameView
              withAggregateBadge={withAggregateBadge}
              $key={token.$key}
              name={
                token.isAggregateToken
                  ? (token.commonSymbol ?? token.symbol)
                  : token.symbol
              }
              symbol={
                token.isAggregateToken
                  ? (token.commonSymbol ?? token.symbol)
                  : token.symbol
              }
              isAggregateToken={token.isAggregateToken}
              isNative={token.isNative}
              isAllNetworks={isAllNetworks}
              networkId={token.networkId}
              withNetwork={withNetwork}
              showDeFiReceiptTokenBadge={showDeFiReceiptTokenBadge}
              textProps={{
                size: '$bodyLgMedium',
                flexShrink: 0,
              }}
            />
            <XStack alignItems="center" gap="$1.5">
              <TokenPriceView
                $key={token.$key ?? ''}
                size="$bodyMd"
                color="$textSubdued"
                numberOfLines={1}
              />
              <TokenPriceChangeView
                $key={token.$key ?? ''}
                size="$bodyMd"
                numberOfLines={1}
                badge={homeCardStyle}
              />
            </XStack>
          </YStack>
        </XStack>
      );
    }

    return (
      <XStack alignItems="center" gap="$3" flexGrow={1} flexBasis={0}>
        <TokenIconView
          $key={token.$key}
          isAggregateToken={token.isAggregateToken}
          networkId={token.networkId}
          icon={tokenLogoUri}
          showNetworkIcon={showNetworkIcon}
          isAllNetworks={isAllNetworks}
        />
        <YStack flex={1}>
          <TokenNameView
            $key={token.$key}
            withAggregateBadge={withAggregateBadge ?? isTokenSelector}
            name={
              token.isAggregateToken
                ? (token.commonSymbol ?? token.symbol)
                : token.symbol
            }
            symbol={
              token.isAggregateToken
                ? (token.commonSymbol ?? token.symbol)
                : token.symbol
            }
            isAggregateToken={token.isAggregateToken}
            isNative={token.isNative}
            isAllNetworks={isAllNetworks}
            networkId={token.networkId}
            withNetwork={withNetwork}
            showDeFiReceiptTokenBadge={showDeFiReceiptTokenBadge}
            textProps={{
              size: '$bodyLgMedium',
              flexShrink: 0,
            }}
          />
          <TokenNameView
            $key={token.$key}
            name={token.name}
            // name={token.accountId || ''}
            symbol={token.symbol}
            networkId={token.networkId}
            textProps={{
              size: '$bodyMd',
              color: '$textSubdued',
            }}
            isNative={token.isNative}
            isAllNetworks={isAllNetworks}
            isAggregateToken={token.isAggregateToken}
            showNetworkName
          />
        </YStack>
      </XStack>
    );
  }, [
    token,
    tokenLogoUri,
    isAllNetworks,
    withNetwork,
    tableLayout,
    isTokenSelector,
    showNetworkIcon,
    withAggregateBadge,
    showDeFiReceiptTokenBadge,
    homeCardStyle,
  ]);

  const renderSecondColumn = useCallback(() => {
    if (hideBalanceAndValue) {
      return null;
    }

    if (isTokenSelector) {
      return (
        <YStack
          alignItems="flex-end"
          {...(tableLayout && {
            flexGrow: 1,
            flexBasis: 0,
          })}
        >
          <TokenBalanceView
            hideValue={hideValue}
            numberOfLines={1}
            textAlign="right"
            size="$bodyLgMedium"
            $key={token.$key ?? ''}
            symbol=""
          />
          <TokenValueView
            hideValue={hideValue}
            numberOfLines={1}
            size="$bodyMd"
            color="$textSubdued"
            $key={token.$key ?? ''}
          />
        </YStack>
      );
    }

    return (
      <YStack
        alignItems="flex-end"
        {...(tableLayout
          ? {
              flexGrow: 1,
              flexBasis: 0,
            }
          : { flex: 1 })}
      >
        <TokenBalanceView
          hideValue={hideValue}
          numberOfLines={1}
          size={homeCardStyle ? '$headingMd' : '$bodyLgMedium'}
          $key={token.$key ?? ''}
          symbol=""
        />
        <TokenValueView
          hideValue={hideValue}
          numberOfLines={1}
          size="$bodyMd"
          color="$textSubdued"
          $key={token.$key ?? ''}
          showApproxPrefix={homeCardStyle}
        />
      </YStack>
    );
  }, [
    hideValue,
    hideBalanceAndValue,
    tableLayout,
    token.$key,
    isTokenSelector,
    homeCardStyle,
  ]);

  const renderThirdColumn = useCallback(() => {
    if (isTokenSelector || !tableLayout) {
      return null;
    }

    return (
      <YStack alignItems="flex-end" flexGrow={1} flexBasis={0}>
        <TokenPriceView
          $key={token.$key ?? ''}
          size="$bodyLgMedium"
          numberOfLines={1}
        />
        <TokenPriceChangeView
          $key={token.$key ?? ''}
          size="$bodyMd"
          numberOfLines={1}
        />
      </YStack>
    );
  }, [isTokenSelector, tableLayout, token.$key]);

  const renderFourthColumn = useCallback(() => {
    if (withSwapAction && tableLayout) {
      return (
        <Stack
          alignItems="flex-end"
          {...(tableLayout && {
            flexGrow: 1,
            flexBasis: 0,
          })}
        >
          <TokenActionsView token={token} />
        </Stack>
      );
    }
    return null;
  }, [withSwapAction, tableLayout, token]);

  return (
    <ListItem
      key={token.name}
      testID={resolvedTestID}
      userSelect="none"
      onPress={() => {
        onPress?.(token);
      }}
      gap={tableLayout ? '$3' : '$1'}
      disabled={isOtherTokenProcessing}
      opacity={isOtherTokenProcessing ? 0.5 : 1}
      {...(homeCardStyle ? HOME_TOKEN_CARD_ITEM_PROPS : undefined)}
      {...rest}
    >
      {renderFirstColumn()}
      {renderSecondColumn()}
      <CreateAccountView
        networkId={token.networkId ?? ''}
        $key={token.$key ?? ''}
      />
      {isCurrentTokenProcessing ? <Spinner size="small" /> : null}
      {renderThirdColumn()}
      {renderFourthColumn()}
    </ListItem>
  );
}

export const TokenListItem = memo(BasicTokenListItem);
