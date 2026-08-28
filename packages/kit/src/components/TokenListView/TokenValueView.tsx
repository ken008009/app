import { memo } from 'react';

import {
  type ISizableTextProps,
  SizableText,
  XStack,
} from '@onekeyhq/components';
import { MS_NETWORK_ID } from '@onekeyhq/shared/src/config/presetNetworks';
import { displayFiatValueOrUnavailable } from '@onekeyhq/shared/src/utils/tokenValueUtils';

import { Currency } from '../Currency';

import { useTokenValueSlice } from './useTokenFiatField';

type IProps = {
  $key: string;
  hideValue?: boolean;
  showApproxPrefix?: boolean;
} & ISizableTextProps;

function TokenValueView(props: IProps) {
  const { $key, showApproxPrefix, ...rest } = props;
  const { has, fiatValue, balanceParsed, price, currency } =
    useTokenValueSlice($key);

  if (!has) {
    return <SizableText {...rest}>-</SizableText>;
  }

  // MS Mainnet currently has no fiat quote. Keep the native balance visible
  // and reserve the value-row layout space without painting a fiat value.
  const isMsFiatQuoteUnavailable =
    $key.startsWith(`${MS_NETWORK_ID}_`) &&
    (price === undefined || price === 0);

  const value = (
    <Currency
      formatter="value"
      sourceCurrency={currency}
      {...(rest as React.ComponentProps<typeof Currency>)}
    >
      {displayFiatValueOrUnavailable(fiatValue, balanceParsed)}
    </Currency>
  );

  if (isMsFiatQuoteUnavailable) {
    return <XStack opacity={0}>{value}</XStack>;
  }

  if (!showApproxPrefix) {
    return value;
  }

  return (
    <XStack alignItems="center" gap="$0.5">
      <SizableText size={rest.size} color={rest.color}>
        ≈
      </SizableText>
      {value}
    </XStack>
  );
}

export default memo(TokenValueView);
