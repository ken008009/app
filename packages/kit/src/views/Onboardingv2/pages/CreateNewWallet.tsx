import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import type { IKeyOfIcons } from '@onekeyhq/components';
import {
  Button,
  Icon,
  SizableText,
  XStack,
  YStack,
  useMedia,
} from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { EOnboardingPagesV2 } from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import backgroundApiProxy from '../../../background/instance/backgroundApiProxy';
import { AccountSelectorProviderMirror } from '../../../components/AccountSelector';
import useAppNavigation from '../../../hooks/useAppNavigation';
import {
  OnboardingHeading,
  OnboardingIconBadge,
  OnboardingPage,
  OnboardingSidebar,
} from '../components/Layout';
import { OnboardingTestIDs } from '../testIDs';

const bullets: ReadonlyArray<{
  icon: IKeyOfIcons;
  messageId: ETranslations;
}> = [
  {
    icon: 'LockOutline',
    messageId: ETranslations.onboarding_bullet_recovery_phrase_full_access,
  },
  {
    icon: 'InputOutline',
    messageId: ETranslations.onboarding_bullet_forgot_passcode_use_recovery,
  },
  {
    icon: 'EyeOffOutline',
    messageId: ETranslations.onboarding_bullet_never_share_recovery_phrase,
  },
  {
    icon: 'ShieldCheckDoneOutline',
    messageId: ETranslations.onboarding_bullet_onekey_support_no_recovery_phrase,
  },
];

function CreateNewWallet() {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const { md } = useMedia();

  const handleCreateSeedPhraseWallet = useCallback(async () => {
    const mnemonic = await backgroundApiProxy.serviceAccount.generateMnemonic();
    const encodedMnemonic =
      await backgroundApiProxy.servicePassword.encodeSensitiveText({
        text: mnemonic,
      });
    const hasCachedPassword =
      await backgroundApiProxy.servicePassword.hasCachedPassword();
    if (hasCachedPassword) {
      navigation.push(EOnboardingPagesV2.FinalizeWalletSetup, {
        mnemonic: encodedMnemonic,
        isWalletBackedUp: false,
      });
      defaultLogger.account.wallet.onboard({ onboardMethod: 'createWallet' });
      return;
    }
    navigation.push(EOnboardingPagesV2.CreatePasscode, {
      mnemonic: encodedMnemonic,
      isWalletBackedUp: false,
    });
  }, [navigation]);

  return (
    <OnboardingPage>
      <OnboardingHeading>
        {intl.formatMessage({
          id: ETranslations.onboarding_create_new_wallet,
        })}
      </OnboardingHeading>
      <YStack
        $md={{
          flex: 1,
        }}
        $gtMd={{
          flexDirection: 'row-reverse',
          mt: -40,
        }}
      >
        <OnboardingSidebar $md={{ pt: '$5' }}>
          {md ? null : <OnboardingIconBadge icon="SecretPhraseOutline" />}
          <YStack gap="$6">
            <SizableText size="$headingMd">
              {intl.formatMessage({
                id: ETranslations.onboarding_save_phrase_securely_instruction,
              })}
            </SizableText>
            {bullets.map((item) => (
              <XStack key={item.messageId} gap="$5" alignItems="flex-start">
                <Icon
                  name={item.icon}
                  color="$iconSubdued"
                  size="$6"
                  flexShrink={0}
                />
                <SizableText flex={1} size="$bodyLg" color="$textSubdued">
                  {intl.formatMessage({ id: item.messageId })}
                </SizableText>
              </XStack>
            ))}
          </YStack>
        </OnboardingSidebar>
        <YStack
          gap="$3"
          $md={{
            mt: '$10',
            pb: '$5',
          }}
          $gtMd={{
            flex: 1,
            pt: 88,
            gap: '$5',
          }}
        >
          <Button
            testID={OnboardingTestIDs.createNewWalletSeedPhraseBtn}
            variant="primary"
            size="large"
            alignSelf="stretch"
            childrenAsText={false}
            onPress={handleCreateSeedPhraseWallet}
          >
            <Icon
              name="SecretPhraseOutline"
              position="absolute"
              left="$5"
              size="$5"
              color="$iconInverse"
            />
            <SizableText size="$bodyLgMedium" color="$textInverse">
              {intl.formatMessage({
                id: ETranslations.create_seed_phrase_wallet,
              })}
            </SizableText>
          </Button>
        </YStack>
      </YStack>
    </OnboardingPage>
  );
}

function CreateNewWalletWithContext() {
  return (
    <AccountSelectorProviderMirror
      enabledNum={[0]}
      config={{
        sceneName: EAccountSelectorSceneName.home,
      }}
    >
      <CreateNewWallet />
    </AccountSelectorProviderMirror>
  );
}

export default CreateNewWalletWithContext;
