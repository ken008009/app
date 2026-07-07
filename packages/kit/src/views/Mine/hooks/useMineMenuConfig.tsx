import { useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import { Toast } from '@onekeyhq/components';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useOnLock } from '@onekeyhq/kit/src/hooks/useOnLock';
import { useReferFriends } from '@onekeyhq/kit/src/hooks/useReferFriends';
import { useShowAddressBook } from '@onekeyhq/kit/src/hooks/useShowAddressBook';
import {
  usePasswordPersistAtom,
  useSettingsPersistAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  EDAppConnectionModal,
  EModalRoutes,
  EModalSettingRoutes,
} from '@onekeyhq/shared/src/routes';

import { useOptions } from '../../Setting/pages/AppAutoLock/useOptions';
import {
  ChangeOrSetPasswordListItem,
  LanguageListItem,
  ListVersionItem,
  ThemeListItem,
} from '../../Setting/pages/Tab/CustomElement';
import { TabSettingsListItem } from '../../Setting/pages/Tab/ListItem';

import type { ISubSettingConfig } from '../../Setting/pages/Tab/config';

const UNDER_DEVELOPMENT_MESSAGE = '正在开发中';

export function showUnderDevelopmentToast() {
  Toast.message({
    title: UNDER_DEVELOPMENT_MESSAGE,
  });
}

function MineCurrencyListItem({
  title,
  onNavigate,
}: {
  title: string;
  onNavigate: () => void;
}) {
  const [{ currencyInfo }] = useSettingsPersistAtom();
  const value = (currencyInfo?.id ?? '').toUpperCase();

  return (
    <TabSettingsListItem
      icon="DollarOutline"
      title={title}
      drillIn
      onPress={onNavigate}
    >
      {value ? <ListItem.Text primary={value} align="right" /> : null}
    </TabSettingsListItem>
  );
}

function MineAutoLockListItem({
  title,
  onNavigate,
}: {
  title: string;
  onNavigate: () => void;
}) {
  const [{ appLockDuration }] = usePasswordPersistAtom();
  const autoLockOptions = useOptions();
  const value = useMemo(() => {
    const option = autoLockOptions.find(
      (item) => item.value === String(appLockDuration),
    );
    return option?.title ?? '';
  }, [autoLockOptions, appLockDuration]);

  return (
    <TabSettingsListItem
      icon="ClockTimeHistoryOutline"
      title={title}
      drillIn
      onPress={onNavigate}
    >
      {value ? <ListItem.Text primary={value} align="right" /> : null}
    </TabSettingsListItem>
  );
}

function MineClearDataListItem({
  title,
  onNavigate,
}: {
  title: string;
  onNavigate: () => void;
}) {
  return (
    <TabSettingsListItem
      icon="FolderDeleteOutline"
      title={title}
      drillIn
      onPress={onNavigate}
    />
  );
}

export function useMineMenuConfig(): ISubSettingConfig[] {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const onLock = useOnLock();
  const onPressAddressBook = useShowAddressBook({ useNewModal: true });
  const { toReferFriendsPage } = useReferFriends();
  const [{ isPasswordSet }] = usePasswordPersistAtom();

  const navigateSettingRoute = useCallback(
    (screen: EModalSettingRoutes) => {
      navigation.pushModal(EModalRoutes.SettingModal, {
        screen,
      });
    },
    [navigation],
  );

  return useMemo(
    () =>
      [
        !platformEnv.isWebDappMode
          ? {
              icon: 'LockOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_lock_now,
              }),
              onPress: () => {
                void onLock();
              },
            }
          : null,
        {
          icon: 'ContactsOutline',
          title: intl.formatMessage({
            id: ETranslations.settings_address_book,
          }),
          onPress: (nav) => {
            if (nav) {
              void onPressAddressBook(nav);
              return;
            }
            showUnderDevelopmentToast();
          },
        },
        {
          icon: 'DollarOutline',
          title: intl.formatMessage({
            id: ETranslations.settings_default_currency,
          }),
          renderElement: (
            <MineCurrencyListItem
              title={intl.formatMessage({
                id: ETranslations.settings_default_currency,
              })}
              onNavigate={() => {
                navigateSettingRoute(EModalSettingRoutes.SettingCurrencyModal);
              }}
            />
          ),
        },
        {
          icon: 'TranslateOutline',
          title: intl.formatMessage({
            id: ETranslations.global_language,
          }),
          renderElement: <LanguageListItem />,
        },
        {
          icon: 'PaletteOutline',
          title: intl.formatMessage({
            id: ETranslations.settings_theme,
          }),
          renderElement: <ThemeListItem />,
        },
        !platformEnv.isWeb
          ? {
              icon: 'BellOutline',
              title: intl.formatMessage({
                id: ETranslations.global_notifications,
              }),
              onPress: () => {
                navigateSettingRoute(EModalSettingRoutes.SettingNotifications);
              },
            }
          : null,
        isPasswordSet && !platformEnv.isWebDappMode
          ? {
              icon: 'ClockTimeHistoryOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_auto_lock,
              }),
              renderElement: (
                <MineAutoLockListItem
                  title={intl.formatMessage({
                    id: ETranslations.settings_auto_lock,
                  })}
                  onNavigate={() => {
                    navigateSettingRoute(
                      EModalSettingRoutes.SettingAppAutoLockModal,
                    );
                  }}
                />
              ),
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'KeyOutline',
              title: intl.formatMessage({
                id: isPasswordSet
                  ? ETranslations.global_change_passcode
                  : ETranslations.global_set_passcode,
              }),
              renderElement: <ChangeOrSetPasswordListItem />,
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'LinkOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_connected_sites,
              }),
              onPress: () => {
                navigation.pushModal(EModalRoutes.DAppConnectionModal, {
                  screen: EDAppConnectionModal.ConnectionList,
                });
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'NoteOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_signature_record,
              }),
              onPress: () => {
                navigateSettingRoute(
                  EModalSettingRoutes.SettingSignatureRecordModal,
                );
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'ShieldCheckDoneOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_protection,
              }),
              onPress: () => {
                navigateSettingRoute(EModalSettingRoutes.SettingProtectModal);
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'FolderDeleteOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_clear_cache_on_app,
              }),
              renderElement: (
                <MineClearDataListItem
                  title={intl.formatMessage({
                    id: ETranslations.settings_clear_cache_on_app,
                  })}
                  onNavigate={() => {
                    navigateSettingRoute(
                      EModalSettingRoutes.SettingClearAppCache,
                    );
                  }}
                />
              ),
            }
          : null,
        !platformEnv.isWeb
          ? {
              icon: 'RefreshCcwOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_account_sync_modal_title,
              }),
              onPress: () => {
                navigateSettingRoute(
                  EModalSettingRoutes.SettingAlignPrimaryAccount,
                );
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'GlobusOutline',
              title: intl.formatMessage({
                id: ETranslations.custom_network_add_network_action_text,
              }),
              onPress: () => {
                navigateSettingRoute(
                  EModalSettingRoutes.SettingChainListSearch,
                );
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'BezierNodesOutline',
              title: intl.formatMessage({
                id: ETranslations.custom_rpc_title,
              }),
              onPress: () => {
                navigateSettingRoute(EModalSettingRoutes.SettingCustomRPC);
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'BranchesOutline',
              title: intl.formatMessage({
                id: ETranslations.settings_account_derivation_path,
              }),
              onPress: () => {
                navigateSettingRoute(
                  EModalSettingRoutes.SettingAccountDerivationModal,
                );
              },
            }
          : null,
        !platformEnv.isWebDappMode
          ? {
              icon: 'LabOutline',
              title: intl.formatMessage({
                id: ETranslations.global_customize_transaction,
              }),
              onPress: () => {
                navigateSettingRoute(
                  EModalSettingRoutes.SettingCustomTransaction,
                );
              },
            }
          : null,
        {
          icon: 'PeopleOutline',
          title: intl.formatMessage({
            id: ETranslations.id_refer_a_friend,
          }),
          onPress: () => {
            void toReferFriendsPage();
          },
        },
        {
          icon: 'InfoCircleOutline',
          title: intl.formatMessage({
            id: ETranslations.settings_whats_new,
          }),
          renderElement: <ListVersionItem />,
        },
      ].filter((item): item is ISubSettingConfig => Boolean(item)),
    [
      intl,
      isPasswordSet,
      navigateSettingRoute,
      navigation,
      onLock,
      onPressAddressBook,
      toReferFriendsPage,
    ],
  );
}
