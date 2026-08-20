import { useCallback, useMemo } from 'react';

import type { IButtonProps } from '@onekeyhq/components';
import {
  IconButton,
  SizableText,
  Stack,
  XStack,
  YStack,
  resetAccountManagerStacksModal,
} from '@onekeyhq/components';
import { AccountAvatar } from '@onekeyhq/kit/src/components/AccountAvatar';
import { AccountSelectorCreateAddressButton } from '@onekeyhq/kit/src/components/AccountSelector/AccountSelectorCreateAddressButton';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { useAccountSelectorActions } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector/actions';
import type {
  IDBAccount,
  IDBDevice,
  IDBIndexedAccount,
  IDBWallet,
} from '@onekeyhq/kit-bg/src/dbs/local/types';
import type {
  IAccountSelectorAccountsListSectionData,
  IAccountSelectorSelectedAccount,
} from '@onekeyhq/kit-bg/src/dbs/simple/entity/SimpleDbEntityAccountSelector';
import {
  useAccountSelectorDeFiMapAtom,
  useAccountSelectorValuesMapAtom,
  useIndexedAccountAddressCreationStateAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import type { INetworkDeriveInfo } from '@onekeyhq/kit-bg/src/vaults/types';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';
import type { IServerNetwork } from '@onekeyhq/shared/types';

import { AccountEditButton } from '../../../components/AccountEdit';
import { useAccountSelectorAvatarNetwork } from '../../../hooks/useAccountSelectorAvatarNetwork';
import { AccountManagerTestIDs } from '../../../testIDs';

import {
  AS_ACCOUNT_AVATAR_RING_PROPS,
  AS_ACCOUNT_CARD_ITEM_PROPS,
  AS_GOLD,
  AS_GOLD_BORDER,
  AS_PRESS_BG,
  AS_SELECTED_BG,
} from '../accountSelectorTheme';
import { AccountAddress } from './AccountAddress';
import { AccountValueWithSpotlight } from './AccountValue';

function PlusButton({ onPress, loading }: IButtonProps) {
  return (
    <IconButton
      testID="account-manager-plus-button-icon-btn"
      borderWidth={0}
      borderRadius="$2"
      variant="tertiary"
      size="medium"
      loading={loading}
      onPress={onPress}
      icon="PlusSmallOutline"
      iconProps={{ color: AS_GOLD }}
    />
  );
}

export function AccountSelectorAccountListItem({
  num,
  linkedNetworkId,
  item,
  section,
  index,
  isOthersUniversal,
  selectedAccount,
  linkNetwork,
  allowSelectEmptyAccount,
  editable,
  accountsCount,
  focusedWalletInfo,
  mergeDeriveAssetsEnabled,
  hideAddress,
  enabledNetworksCompatibleWithWalletId,
  networkInfoMap,
}: {
  num: number;
  linkedNetworkId: string | undefined;
  item: IDBIndexedAccount | IDBAccount;
  section: IAccountSelectorAccountsListSectionData;
  index: number;
  isOthersUniversal: boolean;
  selectedAccount: IAccountSelectorSelectedAccount;
  linkNetwork: boolean | undefined;
  allowSelectEmptyAccount: boolean | undefined;
  editable: boolean;
  accountsCount: number;
  focusedWalletInfo:
    | {
        wallet: IDBWallet;
        device: IDBDevice | undefined;
      }
    | undefined;
  mergeDeriveAssetsEnabled: boolean | undefined;
  hideAddress?: boolean;
  enabledNetworksCompatibleWithWalletId: IServerNetwork[];
  networkInfoMap: Record<string, INetworkDeriveInfo>;
}) {
  const actions = useAccountSelectorActions();
  const {
    activeAccount: { network },
  } = useActiveAccount({
    num,
  });

  const [addressCreationState] = useIndexedAccountAddressCreationStateAtom();
  const [valuesMapAll] = useAccountSelectorValuesMapAtom();
  const [deFiMapAll] = useAccountSelectorDeFiMapAtom();
  const valuesMap = useMemo(() => valuesMapAll[num], [valuesMapAll, num]);
  const deFiMap = useMemo(() => deFiMapAll[num], [deFiMapAll, num]);

  const account = useMemo(
    () => (isOthersUniversal ? (item as IDBAccount) : undefined),
    [isOthersUniversal, item],
  );
  const indexedAccount = useMemo(
    () => (isOthersUniversal ? undefined : (item as IDBIndexedAccount)),
    [isOthersUniversal, item],
  );

  const isCreatingAddress = useMemo(
    () =>
      Boolean(
        addressCreationState?.indexedAccountId === indexedAccount?.id &&
        addressCreationState?.walletId === focusedWalletInfo?.wallet?.id,
      ),
    [
      addressCreationState?.indexedAccountId,
      addressCreationState?.walletId,
      focusedWalletInfo?.wallet?.id,
      indexedAccount?.id,
    ],
  );

  const buildSubTitleInfo = useCallback((): {
    linkedNetworkId: string | undefined;
    address: string;
    isEmptyAddress: boolean;
    hideAddress?: boolean;
  } => {
    let address: string | undefined;
    let allowEmptyAddress = false;
    if (isOthersUniversal) {
      address = account?.address;
    } else {
      const associateAccount = indexedAccount?.associateAccount;
      address = associateAccount?.address;

      if (
        associateAccount?.addressDetail?.isValid &&
        associateAccount?.addressDetail?.normalizedAddress
      ) {
        allowEmptyAddress = true;
      }
    }
    if (
      !address &&
      !isOthersUniversal &&
      linkedNetworkId &&
      !allowEmptyAddress
    ) {
      // TODO custom style
      const r = {
        linkedNetworkId,
        address: '',
        isEmptyAddress: true,
      };
      return r;
    }
    const r = {
      linkedNetworkId: undefined,
      address: address
        ? accountUtils.shortenAddress({
            address,
          })
        : '',
      isEmptyAddress: false,
      hideAddress: isOthersUniversal ? false : hideAddress,
    };
    return r;
  }, [
    account?.address,
    indexedAccount?.associateAccount,
    isOthersUniversal,
    linkedNetworkId,
    hideAddress,
  ]);

  const subTitleInfo = useMemo(() => buildSubTitleInfo(), [buildSubTitleInfo]);

  const accountValue = useMemo(
    () => valuesMap?.[item.id],
    [valuesMap, item.id],
  );

  const accountDeFiOverview = useMemo(
    () => deFiMap?.[item.id],
    [deFiMap, item.id],
  );

  const shouldShowCreateAddressButton = useMemo(
    () => !!(linkNetwork && subTitleInfo.isEmptyAddress),
    [linkNetwork, subTitleInfo.isEmptyAddress],
  );

  const { avatarNetworkId } = useAccountSelectorAvatarNetwork({
    linkedNetworkId,
    selectedAccount,
    isOthersUniversal,
    account,
    indexedAccount,
    linkNetwork,
  });

  const actionButton = useMemo(() => {
    if (isCreatingAddress) {
      return null;
    }
    if (shouldShowCreateAddressButton) {
      return (
        <AccountSelectorCreateAddressButton
          num={num}
          selectAfterCreate
          account={{
            walletId: focusedWalletInfo?.wallet?.id,
            networkId: linkedNetworkId,
            indexedAccountId: indexedAccount?.id,
            deriveType: selectedAccount.deriveType,
          }}
          buttonRender={PlusButton}
        />
      );
    }
    if (editable) {
      return (
        <AccountEditButton
          avatarNetworkId={avatarNetworkId}
          accountsCount={accountsCount}
          indexedAccount={indexedAccount}
          firstIndexedAccount={
            isOthersUniversal
              ? undefined
              : (section?.firstAccount as IDBIndexedAccount)
          }
          account={account}
          firstAccount={
            isOthersUniversal
              ? (section?.firstAccount as IDBAccount)
              : undefined
          }
          wallet={focusedWalletInfo?.wallet}
          networkId={linkedNetworkId ?? network?.id}
        />
      );
    }
    return null;
  }, [
    isCreatingAddress,
    editable,
    shouldShowCreateAddressButton,
    avatarNetworkId,
    accountsCount,
    indexedAccount,
    isOthersUniversal,
    section?.firstAccount,
    account,
    focusedWalletInfo?.wallet,
    linkedNetworkId,
    network?.id,
    num,
    selectedAccount.deriveType,
  ]);

  const isSelected = useMemo(() => {
    if (isOthersUniversal) {
      return selectedAccount.othersWalletAccountId === item.id;
    }
    return selectedAccount.indexedAccountId === item.id;
  }, [
    isOthersUniversal,
    selectedAccount.othersWalletAccountId,
    selectedAccount.indexedAccountId,
    item.id,
  ]);

  const canConfirmAccountSelectPress = useMemo(
    () => allowSelectEmptyAccount || !shouldShowCreateAddressButton,
    [allowSelectEmptyAccount, shouldShowCreateAddressButton],
  );

  const renderAccountValue = useCallback(() => {
    if (
      platformEnv.isWebDappMode ||
      platformEnv.isE2E ||
      (linkNetwork && !subTitleInfo.address)
    )
      return null;

    return (
      <AccountValueWithSpotlight
        walletId={focusedWalletInfo?.wallet?.id ?? ''}
        enabledNetworksCompatibleWithWalletId={
          enabledNetworksCompatibleWithWalletId
        }
        networkInfoMap={networkInfoMap}
        isOthersUniversal={isOthersUniversal}
        index={index}
        accountValue={accountValue}
        accountDeFiOverview={accountDeFiOverview}
        indexedAccountId={indexedAccount?.id}
        linkedAccountId={indexedAccount?.associateAccount?.id ?? item.id}
        linkedNetworkId={avatarNetworkId ?? network?.id}
        mergeDeriveAssetsEnabled={mergeDeriveAssetsEnabled}
        size="$headingMd"
      />
    );
  }, [
    linkNetwork,
    subTitleInfo.address,
    enabledNetworksCompatibleWithWalletId,
    networkInfoMap,
    focusedWalletInfo?.wallet?.id,
    isOthersUniversal,
    index,
    accountValue,
    indexedAccount?.id,
    indexedAccount?.associateAccount?.id,
    item.id,
    avatarNetworkId,
    network?.id,
    mergeDeriveAssetsEnabled,
    accountDeFiOverview,
  ]);

  const renderAccountAddress = useCallback(() => {
    return (
      <AccountAddress
        num={num}
        linkedNetworkId={subTitleInfo.linkedNetworkId}
        address={accountUtils.shortenAddress({
          address: subTitleInfo.address,
          leadingLength: 6,
          trailingLength: 4,
        })}
        isEmptyAddress={subTitleInfo.isEmptyAddress}
        hideAddress={subTitleInfo.hideAddress}
        showSplitter={false}
      />
    );
  }, [
    num,
    subTitleInfo.address,
    subTitleInfo.hideAddress,
    subTitleInfo.isEmptyAddress,
    subTitleInfo.linkedNetworkId,
  ]);

  return (
    <Stack>
      <ListItem
        testID={AccountManagerTestIDs.accountItem(index)}
        key={item.id}
        gap="$3"
        {...AS_ACCOUNT_CARD_ITEM_PROPS}
        borderColor={isSelected ? AS_GOLD : AS_GOLD_BORDER}
        {...(canConfirmAccountSelectPress && {
          onPress: async () => {
            // show CreateAddress Button here, disabled confirmAccountSelect()
            if (!allowSelectEmptyAccount && shouldShowCreateAddressButton) {
              return;
            }
            if (isOthersUniversal) {
              let autoChangeToAccountMatchedNetworkId = avatarNetworkId;
              if (
                selectedAccount?.networkId &&
                networkUtils.isAllNetwork({
                  networkId: selectedAccount?.networkId,
                })
              ) {
                autoChangeToAccountMatchedNetworkId =
                  selectedAccount?.networkId;
              }
              await actions.current.confirmAccountSelect({
                num,
                indexedAccount: undefined,
                othersWalletAccount: account,
                autoChangeToAccountMatchedNetworkId,
              });
            } else if (focusedWalletInfo) {
              await actions.current.confirmAccountSelect({
                num,
                indexedAccount,
                othersWalletAccount: undefined,
                autoChangeToAccountMatchedNetworkId: undefined,
              });
            }
            resetAccountManagerStacksModal();
          },
          isLoading: isCreatingAddress,
          userSelect: 'none',
        })}
        hoverStyle={{
          bg: AS_PRESS_BG,
        }}
        pressStyle={{
          bg: AS_SELECTED_BG,
        }}
      >
        <XStack alignItems="center" gap="$3" flex={1} minWidth={0}>
          <Stack {...AS_ACCOUNT_AVATAR_RING_PROPS}>
            <AccountAvatar
              loading={<AccountAvatar.Loading w="$8" h="$8" />}
              size="medium"
              indexedAccount={indexedAccount}
              account={account as any}
              networkId={avatarNetworkId}
            />
          </Stack>
          <YStack flex={1} minWidth={0} overflow="hidden" pr="$8">
            <SizableText
              size="$bodyLgMedium"
              numberOfLines={1}
              color={isSelected ? AS_GOLD : '#FFFFFF'}
            >
              {item.name}
            </SizableText>
            <XStack
              key={`${focusedWalletInfo?.wallet?.id || ''}-${item.id}-${
                subTitleInfo.address
              }`}
              alignItems="center"
            >
              {renderAccountAddress()}
            </XStack>
          </YStack>
        </XStack>
        <YStack alignItems="flex-end" flexShrink={0} pr="$6">
          {renderAccountValue()}
        </YStack>
      </ListItem>
      {isCreatingAddress ? null : (
        <Stack
          position="absolute"
          right="$5"
          top={0}
          bottom="$2.5"
          justifyContent="center"
          pointerEvents="box-none"
        >
          {actionButton}
        </Stack>
      )}
    </Stack>
  );
}
