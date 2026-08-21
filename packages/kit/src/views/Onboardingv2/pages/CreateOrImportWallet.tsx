import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import {
  Button,
  Icon,
  SizableText,
  YStack,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { EOnboardingPagesV2 } from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { AccountSelectorProviderMirror } from '../../../components/AccountSelector';
import useAppNavigation from '../../../hooks/useAppNavigation';
import { useUserWalletProfile } from '../../../hooks/useUserWalletProfile';
import { OnboardingHeading, OnboardingPage } from '../components/Layout';
import { OnboardingTestIDs } from '../testIDs';

function CreateOrImportWallet() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { isSoftwareWalletOnlyUser } = useUserWalletProfile();

  const handleImportPhraseOrPrivateKey = useCallback(() => {
    navigation.push(EOnboardingPagesV2.ImportPhraseOrPrivateKey);
    defaultLogger.account.wallet.addWalletStarted({
      addMethod: 'ImportWallet',
      details: { importType: 'importPhraseOrPrivateKey' },
      isSoftwareWalletOnlyUser,
    });
  }, [navigation, isSoftwareWalletOnlyUser]);

  return (
    <OnboardingPage scrollable>
      <YStack gap="$8" $gtMd={{ flex: 1, gap: '$12' }}>
        <OnboardingHeading>
          {intl.formatMessage({ id: ETranslations.add_existing_wallet })}
        </OnboardingHeading>
        <YStack
          gap="$3"
          $gtMd={{
            gap: '$5',
          }}
        >
          <Button
            testID={OnboardingTestIDs.createOrImportWalletOptionBtn(
              'phraseOrPrivateKey',
            )}
            variant="secondary"
            size="large"
            alignSelf="stretch"
            childrenAsText={false}
            onPress={handleImportPhraseOrPrivateKey}
          >
            <YStack position="absolute" left="$5">
              <Icon
                name="SecretPhraseOutline"
                size="$6"
                color="$icon"
                $gtMd={{
                  size: '$5',
                }}
              />
            </YStack>
            <SizableText size="$bodyLgMedium" color="$text">
              {intl.formatMessage({
                id: ETranslations.import_phrase_or_private_key,
              })}
            </SizableText>
          </Button>
        </YStack>
      </YStack>
    </OnboardingPage>
  );
}

function CreateOrImportWalletWithContext() {
  return (
    <AccountSelectorProviderMirror
      enabledNum={[0]}
      config={{
        sceneName: EAccountSelectorSceneName.home,
      }}
    >
      <CreateOrImportWallet />
    </AccountSelectorProviderMirror>
  );
}

export default CreateOrImportWalletWithContext;
