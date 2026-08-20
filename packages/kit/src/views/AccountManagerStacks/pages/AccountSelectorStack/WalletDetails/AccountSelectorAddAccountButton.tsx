import { useIntl } from 'react-intl';
import { StyleSheet } from 'react-native';

import { Icon, Stack } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import type {
  IDBDevice,
  IDBWallet,
} from '@onekeyhq/kit-bg/src/dbs/local/types';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { AccountManagerTestIDs } from '../../../testIDs';

import { AS_GOLD, AS_GOLD_BORDER, AS_ICON_BG } from '../accountSelectorTheme';
import { useAddAccount } from './hooks/useAddAccount';

export function AccountSelectorAddAccountButton({
  num,
  isOthersUniversal,
  focusedWalletInfo,
}: {
  num: number;
  isOthersUniversal: boolean;
  focusedWalletInfo:
    | {
        wallet: IDBWallet;
        device: IDBDevice | undefined;
      }
    | undefined;
}) {
  const intl = useIntl();
  const { handleAddAccount } = useAddAccount({
    num,
    isOthersUniversal,
    focusedWalletInfo,
  });

  return (
    <ListItem
      testID={AccountManagerTestIDs.accountAddAccount}
      onPress={handleAddAccount}
      mx="$4"
      px="$3.5"
      py="$3.5"
      mb="$2.5"
      borderRadius="$4"
    >
      <Stack
        bg={AS_ICON_BG}
        borderRadius="$full"
        w={40}
        h={40}
        alignItems="center"
        justifyContent="center"
        borderWidth={StyleSheet.hairlineWidth}
        borderColor={AS_GOLD_BORDER}
      >
        <Icon name="PlusSmallOutline" color={AS_GOLD} size="$6" />
      </Stack>
      {/* Add account */}
      <ListItem.Text
        userSelect="none"
        primary={intl.formatMessage({
          id: platformEnv.isWebDappMode
            ? ETranslations.onboarding_connect_external_wallet
            : ETranslations.global_add_account,
        })}
        primaryTextProps={{
          color: AS_GOLD,
        }}
      />
    </ListItem>
  );
}
