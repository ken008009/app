import { memo } from 'react';

import type { ISizableTextProps } from '@onekeyhq/components';
import { NumberSizeableText, Stack } from '@onekeyhq/components';
import { getTokenPriceChangeStyle } from '@onekeyhq/shared/src/utils/tokenUtils';
import {
  UNAVAILABLE_DISPLAY,
  isValidNumberValue,
} from '@onekeyhq/shared/src/utils/tokenValueUtils';

import { useTokenPrice24h } from './useTokenFiatField';

type IProps = {
  $key: string;
  badge?: boolean;
} & ISizableTextProps;

function TokenPriceChangeView(props: IProps) {
  const { $key, badge, ...rest } = props;
  const price24h = useTokenPrice24h($key);

  if (!isValidNumberValue(price24h)) {
    return (
      <NumberSizeableText
        formatter="priceChange"
        color="$textSubdued"
        {...rest}
      >
        {UNAVAILABLE_DISPLAY}
      </NumberSizeableText>
    );
  }

  const { changeColor, showPlusMinusSigns } = getTokenPriceChangeStyle({
    priceChange: price24h,
  });

  const text = (
    <NumberSizeableText
      formatter="priceChange"
      formatterOptions={{ showPlusMinusSigns }}
      color={changeColor}
      {...rest}
    >
      {price24h}
    </NumberSizeableText>
  );

  if (!badge) {
    return text;
  }

  let badgeBg = '$bgSubdued';
  if (price24h > 0) {
    badgeBg = 'rgba(52,199,123,0.16)';
  } else if (price24h < 0) {
    badgeBg = 'rgba(255,99,132,0.16)';
  }

  return (
    <Stack px="$1.5" py="$0.5" borderRadius="$1.5" bg={badgeBg}>
      {text}
    </Stack>
  );
}

export default memo(TokenPriceChangeView);
