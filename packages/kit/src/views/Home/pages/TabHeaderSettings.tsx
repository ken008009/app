import { memo, useCallback, useContext, useMemo } from 'react';

import { useIntl } from 'react-intl';

import {
  ActionList,
  ESwitchSize,
  Popover,
  Stack,
  Switch,
  XStack,
  useMedia,
} from '@onekeyhq/components';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { getNetworksSupportFilterScamHistory } from '@onekeyhq/shared/src/config/presetNetworks';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { ETokenListSortType } from '@onekeyhq/shared/types/token';

import { ListItem } from '../../../components/ListItem';
import { useManageToken } from '../../../hooks/useManageToken';
import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import {
  useTokenListActions,
  useTokenListSortAtom,
} from '../../../states/jotai/contexts/tokenList';
import { HomeCircleIconButton } from '../components/HomeInnerTabBar';
import { HomeTokenListProviderMirrorWrapper } from '../components/HomeTokenListProvider';
import { HomeStickyHeaderContext } from '../components/HomeStickyHeaderContext';

function TokenListSettings() {
  const intl = useIntl();
  const { gtMd } = useMedia();
  const stickyHeaderCtx = useContext(HomeStickyHeaderContext);
  const {
    activeAccount: {
      account,
      network,
      wallet,
      indexedAccount,
      isOthersWallet,
      deriveType,
    },
  } = useActiveAccount({ num: 0 });
  const { handleOnManageToken, manageTokenEnabled } = useManageToken({
    accountId: account?.id ?? '',
    networkId: network?.id ?? '',
    walletId: wallet?.id ?? '',
    deriveType,
    indexedAccountId: indexedAccount?.id,
    isOthersWallet:
      isOthersWallet ??
      accountUtils.isOthersWallet({ walletId: wallet?.id ?? '' }),
  });
  const [{ sortType, sortDirection }] = useTokenListSortAtom();
  const { updateTokenListSort } = useTokenListActions().current;

  const handleToggleSearch = useCallback(() => {
    stickyHeaderCtx?.setTokenSearchVisible(!stickyHeaderCtx.tokenSearchVisible);
  }, [stickyHeaderCtx]);

  const handleSortBy = useCallback(
    (type: ETokenListSortType) => {
      const nextDirection =
        sortType === type && sortDirection === 'desc' ? 'asc' : 'desc';
      updateTokenListSort({
        sortType: type,
        sortDirection: nextDirection,
      });
    },
    [sortDirection, sortType, updateTokenListSort],
  );

  if (gtMd) {
    return null;
  }

  return (
    <XStack alignItems="center" gap="$2.5">
      <HomeCircleIconButton
        testID="home-tab-search-btn"
        icon="SearchOutline"
        onPress={handleToggleSearch}
      />
      {manageTokenEnabled ? (
        <HomeCircleIconButton
          testID="home-tab-add-token-btn"
          icon="PlusLargeOutline"
          onPress={handleOnManageToken}
        />
      ) : null}
      <ActionList
        title={intl.formatMessage({ id: ETranslations.market_sort_by })}
        renderTrigger={
          <HomeCircleIconButton
            testID="home-tab-sort-btn"
            icon="SliderHorOutline"
          />
        }
        items={[
          {
            label: intl.formatMessage({ id: ETranslations.global_balance }),
            onPress: (close) => {
              handleSortBy(ETokenListSortType.Value);
              close();
            },
          },
          {
            label: intl.formatMessage({ id: ETranslations.global_price }),
            onPress: (close) => {
              handleSortBy(ETokenListSortType.Price);
              close();
            },
          },
          {
            label: intl.formatMessage({ id: ETranslations.global_name }),
            onPress: (close) => {
              handleSortBy(ETokenListSortType.Name);
              close();
            },
          },
        ]}
      />
    </XStack>
  );
}

const filterScamHistorySupportedNetworks =
  getNetworksSupportFilterScamHistory();
const filterScamHistorySupportedNetworkIds = new Set(
  filterScamHistorySupportedNetworks.map((n) => n.id),
);

function TxHistorySettings() {
  const intl = useIntl();
  const [settings, setSettings] = useSettingsPersistAtom();

  const handleFilterScamHistoryOnChange = useCallback(
    (value: boolean) => {
      setSettings((v) => ({
        ...v,
        isFilterScamHistoryEnabled: !!value,
      }));
      appEventBus.emit(EAppEventBusNames.RefreshHistoryList, undefined);
    },
    [setSettings],
  );

  const handleFilterLowValueHistoryOnChange = useCallback(
    (value: boolean) => {
      setSettings((v) => ({
        ...v,
        isFilterLowValueHistoryEnabled: !!value,
      }));
      appEventBus.emit(EAppEventBusNames.RefreshHistoryList, undefined);
    },
    [setSettings],
  );

  const {
    activeAccount: { network },
  } = useActiveAccount({ num: 0 });

  const filterScamHistorySupported = useMemo(
    () =>
      network?.isAllNetworks ||
      filterScamHistorySupportedNetworkIds.has(network?.id ?? ''),
    [network],
  );

  return (
    <Stack>
      <Popover
        title={intl.formatMessage({ id: ETranslations.global_filter })}
        renderTrigger={
          <HomeCircleIconButton
            testID="home-filter-scam-history-supported-icon-btn"
            icon="Filter1Outline"
          />
        }
        renderContent={
          <Stack py="$2">
            <ListItem
              title={intl.formatMessage({
                id: ETranslations.wallet_history_settings_hide_risk_transaction_title,
              })}
              subtitle={
                filterScamHistorySupported
                  ? intl.formatMessage({
                      id: ETranslations.wallet_history_settings_hide_risk_transaction_desc,
                    })
                  : intl.formatMessage(
                      {
                        id: ETranslations.wallet_history_settings_hide_risk_transaction_desc_unsupported,
                      },
                      {
                        networkName: network?.name ?? '',
                      },
                    )
              }
            >
              <Switch
                testID="home-switch"
                isUncontrolled
                disabled={!filterScamHistorySupported}
                size={ESwitchSize.small}
                onChange={handleFilterScamHistoryOnChange}
                defaultChecked={
                  filterScamHistorySupported
                    ? settings.isFilterScamHistoryEnabled
                    : false
                }
              />
            </ListItem>
            <ListItem
              title={intl.formatMessage({
                id: ETranslations.wallet_history_settings_hide_small_transaction_title,
              })}
              subtitle={intl.formatMessage({
                id: ETranslations.wallet_history_settings_hide_small_transaction_desc,
              })}
            >
              <Switch
                testID="home-switch"
                isUncontrolled
                size={ESwitchSize.small}
                onChange={handleFilterLowValueHistoryOnChange}
                defaultChecked={settings.isFilterLowValueHistoryEnabled}
              />
            </ListItem>
          </Stack>
        }
      />
    </Stack>
  );
}

function BasicTabHeaderSettings({ focusedTab }: { focusedTab: string }) {
  const intl = useIntl();
  const {
    activeAccount: { account },
  } = useActiveAccount({ num: 0 });
  const historyName = useMemo(
    () =>
      intl.formatMessage({
        id: ETranslations.global_history,
      }),
    [intl],
  );
  const portfolioName = useMemo(
    () =>
      intl.formatMessage({
        id: ETranslations.global_universal_search_tabs_tokens,
      }),
    [intl],
  );

  const content = useMemo(() => {
    switch (focusedTab) {
      case portfolioName:
        return (
          <HomeTokenListProviderMirrorWrapper accountId={account?.id ?? ''}>
            <TokenListSettings />
          </HomeTokenListProviderMirrorWrapper>
        );
      case historyName:
        return <TxHistorySettings />;
      default:
        return null;
    }
  }, [account?.id, portfolioName, focusedTab, historyName]);
  return (
    <XStack pr="$pagePadding" alignItems="center">
      {content}
    </XStack>
  );
}

export const TabHeaderSettings = memo(BasicTabHeaderSettings);
