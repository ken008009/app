import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import { Icon, SizableText, Stack } from '@onekeyhq/components';
import { useToOnBoardingPage } from '@onekeyhq/kit/src/views/Onboarding/hooks/useToOnBoardingPage';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { useAccountSelectorRoute } from '../../../router/useAccountSelectorRoute';
import { AccountManagerTestIDs } from '../../../testIDs';
import { AS_GOLD, AS_GOLD_BORDER, AS_ICON_BG } from '../accountSelectorTheme';

export function AccountSelectorCreateWalletButton() {
  const intl = useIntl();

  const route = useAccountSelectorRoute();
  const toOnBoardingPage = useToOnBoardingPage();
  // const linkNetwork = route.params?.linkNetwork;
  const isEditableRouteParams = route.params?.editable;

  if (!isEditableRouteParams) {
    return null;
  }
  return (
    <Stack p="$1" alignItems="center">
      <Stack
        role="button"
        onPress={() => {
          void toOnBoardingPage();
        }}
        testID={AccountManagerTestIDs.addWalletButton}
        w={40}
        h={40}
        borderRadius="$full"
        bg={AS_ICON_BG}
        borderWidth={StyleSheet.hairlineWidth}
        borderColor={AS_GOLD_BORDER}
        alignItems="center"
        justifyContent="center"
        pressStyle={{ opacity: 0.72 }}
      >
        <Icon name="PlusLargeOutline" color={AS_GOLD} size="$6" />
      </Stack>
      <SizableText textAlign="center" size="$bodySm" mt="$1" color={AS_GOLD}>
        {intl.formatMessage({ id: ETranslations.global_wallet })}
      </SizableText>
    </Stack>
  );
}
