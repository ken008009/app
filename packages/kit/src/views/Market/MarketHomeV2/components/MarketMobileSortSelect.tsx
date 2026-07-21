import { memo, useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import { Icon, Select, SizableText, XStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

export type IMarketMobileSortValue =
  | 'Default'
  | 'Last price'
  | 'Most 24h volume'
  | 'Most market cap'
  | 'Price change up'
  | 'Price change down';

export type IMarketMobileSortOption = {
  sortBy?: string;
  sortType?: 'asc' | 'desc';
};

type IMarketMobileSortSelectProps = {
  value: IMarketMobileSortValue;
  onChange: (
    value: IMarketMobileSortValue,
    options?: IMarketMobileSortOption,
  ) => void;
  /** Watchlist default keeps manual order (undefined sort). Spot default uses volume. */
  mode?: 'spot' | 'watchlist';
};

function MarketMobileSortSelectBase({
  value,
  onChange,
  mode = 'spot',
}: IMarketMobileSortSelectProps) {
  const intl = useIntl();

  const selectOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({ id: ETranslations.global_default }),
        value: 'Default' as const,
        options:
          mode === 'watchlist'
            ? undefined
            : ({ sortBy: 'v24hUSD', sortType: 'desc' } as const),
      },
      {
        label: intl.formatMessage({ id: ETranslations.market_last_price }),
        value: 'Last price' as const,
        options: { sortBy: 'price', sortType: 'desc' as const },
      },
      {
        label: intl.formatMessage({
          id: ETranslations.market_most_24h_volume,
        }),
        value: 'Most 24h volume' as const,
        options: { sortBy: 'v24hUSD', sortType: 'desc' as const },
      },
      {
        label: intl.formatMessage({
          id: ETranslations.market_most_market_cap,
        }),
        value: 'Most market cap' as const,
        options: { sortBy: 'mc', sortType: 'desc' as const },
      },
      {
        label: intl.formatMessage({
          id: ETranslations.market_price_change_up,
        }),
        value: 'Price change up' as const,
        options: { sortBy: 'change24h', sortType: 'desc' as const },
      },
      {
        label: intl.formatMessage({
          id: ETranslations.market_price_change_down,
        }),
        value: 'Price change down' as const,
        options: { sortBy: 'change24h', sortType: 'asc' as const },
      },
    ],
    [intl, mode],
  );

  const renderTrigger = useCallback(
    ({ label }: { label?: string }) => (
      <XStack ai="center" gap="$2" py="$2">
        <Icon name="FilterSortOutline" color="$iconSubdued" size="$5" />
        <XStack ai="center" gap="$1">
          <SizableText size="$bodyMd" color="$textSubdued">
            {label}
          </SizableText>
          <Icon name="ChevronDownSmallSolid" size="$4" color="$iconSubdued" />
        </XStack>
      </XStack>
    ),
    [],
  );

  return (
    <XStack px="$5" borderBottomWidth="$px" borderBottomColor="$borderSubdued">
      <Select
        testID="market-mobile-sort-select"
        items={selectOptions}
        title={intl.formatMessage({ id: ETranslations.market_sort_by })}
        value={value}
        onChange={(nextValue) => {
          const item = selectOptions.find((option) => option.value === nextValue);
          onChange(
            nextValue as IMarketMobileSortValue,
            item?.options as IMarketMobileSortOption | undefined,
          );
        }}
        renderTrigger={renderTrigger}
      />
    </XStack>
  );
}

export const MarketMobileSortSelect = memo(MarketMobileSortSelectBase);
