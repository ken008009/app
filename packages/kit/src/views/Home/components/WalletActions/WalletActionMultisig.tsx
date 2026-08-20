import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import { Toast } from '@onekeyhq/components';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { HomeTestIDs } from '../../testIDs';

import { RawActions } from './RawActions';

import type { IActionCustomization } from './types';

function WalletActionMultisig({
  customization,
  showButtonStyle,
}: {
  customization?: IActionCustomization;
  showButtonStyle?: boolean;
}) {
  const intl = useIntl();

  const handlePress = useCallback(() => {
    if (customization?.onPress) {
      void customization.onPress();
      return;
    }
    Toast.message({
      title: intl.formatMessage({
        id: ETranslations.wallet_feature_coming_soon,
      }),
    });
  }, [customization, intl]);

  return (
    <RawActions.Multisig
      onPress={handlePress}
      label={
        customization?.labelId
          ? intl.formatMessage({ id: customization.labelId })
          : '多签'
      }
      icon={customization?.icon}
      showButtonStyle={showButtonStyle}
      disabled={customization?.disabled}
      testID={HomeTestIDs.multisigButton}
    />
  );
}

export { WalletActionMultisig };
