import { useIntl } from 'react-intl';

import { SizableText, YStack } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

export function MinePage() {
  const intl = useIntl();

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" bg="$bgApp">
      <SizableText size="$bodyLg" color="$textSubdued">
        {intl.formatMessage({ id: ETranslations.global_mine })}
      </SizableText>
    </YStack>
  );
}
