import { useCallback, useMemo } from 'react';

import { useIntl } from 'react-intl';

import type { IKeyOfIcons } from '@onekeyhq/components';
import { Toast } from '@onekeyhq/components';
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

export type IMineMenuItemKind =
  | 'default'
  | 'theme'
  | 'language'
  | 'version'
  | 'password';

export interface IMineMenuItem {
  icon: IKeyOfIcons;
  title: string;
  subtitle?: string;
  kind?: IMineMenuItemKind;
  onPress?: () => void;
}

export interface IMineMenuSection {
  key: string;
  title: string;
  items: IMineMenuItem[];
}

const UNDER_DEVELOPMENT_MESSAGE = '正在开发中';
const SHOW_WHATS_NEW_ITEM = false;
/** Temporarily hide referral rewards entry on Mine. */
const SHOW_REFER_FRIENDS_ITEM = false;

export function showUnderDevelopmentToast() {
  Toast.message({
    title: UNDER_DEVELOPMENT_MESSAGE,
  });
}

export function useMineMenuConfig(): IMineMenuSection[] {
  const intl = useIntl();
  const navigation = useAppNavigation();
  const onLock = useOnLock();
  const onPressAddressBook = useShowAddressBook({ useNewModal: true });
  const { toReferFriendsPage } = useReferFriends();
  const [{ isPasswordSet, appLockDuration }] = usePasswordPersistAtom();
  const [{ currencyInfo }] = useSettingsPersistAtom();
  const autoLockOptions = useOptions();
  const autoLockLabel =
    autoLockOptions.find((item) => item.value === String(appLockDuration))
      ?.title ?? '';
  const currencyLabel = (currencyInfo?.id ?? '').toUpperCase();

  const navigateSettingRoute = useCallback(
    (screen: EModalSettingRoutes) => {
      navigation.pushModal(EModalRoutes.SettingModal, {
        screen,
      });
    },
    [navigation],
  );

  return useMemo(() => {
    const accountItems: Array<IMineMenuItem | null> = [
      !platformEnv.isWebDappMode
        ? {
            icon: 'LockOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_lock_now,
            }),
            subtitle: '锁定钱包以保护资产',
            onPress: () => {
              void onLock();
            },
          }
        : null,
      !platformEnv.isWebDappMode
        ? {
            icon: 'ShieldCheckDoneOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_protection,
            }),
            subtitle: '保障您的钱包安全',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingProtectModal);
            },
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
            subtitle: isPasswordSet ? '更改钱包解锁密码' : '设置钱包解锁密码',
            kind: 'password',
          }
        : null,
      isPasswordSet && !platformEnv.isWebDappMode
        ? {
            icon: 'ClockTimeHistoryOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_auto_lock,
            }),
            subtitle: autoLockLabel || '设置自动锁定时间',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingAppAutoLockModal);
            },
          }
        : null,
    ];

    const manageItems: Array<IMineMenuItem | null> = [
      {
        icon: 'MoonOutline',
        title: intl.formatMessage({
          id: ETranslations.settings_theme,
        }),
        subtitle: '设置主题模式',
        kind: 'theme',
      },
      {
        icon: 'TranslateOutline',
        title: intl.formatMessage({
          id: ETranslations.global_language,
        }),
        subtitle: '设置语言',
        kind: 'language',
      },
      {
        icon: 'DollarOutline',
        title: intl.formatMessage({
          id: ETranslations.settings_default_currency,
        }),
        subtitle: currencyLabel || '设置默认法币',
        onPress: () => {
          navigateSettingRoute(EModalSettingRoutes.SettingCurrencyModal);
        },
      },
      !platformEnv.isWebDappMode
        ? {
            icon: 'GlobusOutline',
            title: intl.formatMessage({
              id: ETranslations.custom_network_add_network_action_text,
            }),
            subtitle: '设置节点',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingChainListSearch);
            },
          }
        : null,
      !platformEnv.isWebDappMode
        ? {
            icon: 'BezierNodesOutline',
            title: intl.formatMessage({
              id: ETranslations.custom_rpc_title,
            }),
            subtitle: '自定义节点 RPC',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingCustomRPC);
            },
          }
        : null,
      {
        icon: 'ContactsOutline',
        title: intl.formatMessage({
          id: ETranslations.settings_address_book,
        }),
        subtitle: '管理储存您的钱包地址',
        onPress: () => {
          void onPressAddressBook();
        },
      },
      !platformEnv.isWeb
        ? {
            icon: 'BellOutline',
            title: intl.formatMessage({
              id: ETranslations.global_notifications,
            }),
            subtitle: '系统提供消息提醒',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingNotifications);
            },
          }
        : null,
      !platformEnv.isWebDappMode
        ? {
            icon: 'BranchesOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_account_derivation_path,
            }),
            subtitle: '管理账户派生路径',
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
            subtitle: '自定义交易参数',
            onPress: () => {
              navigateSettingRoute(
                EModalSettingRoutes.SettingCustomTransaction,
              );
            },
          }
        : null,
    ];

    const otherItems: Array<IMineMenuItem | null> = [
      !platformEnv.isWebDappMode
        ? {
            icon: 'LinkOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_connected_sites,
            }),
            subtitle: '查看已连接的 DApp',
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
            subtitle: '查看签名与授权记录',
            onPress: () => {
              navigateSettingRoute(
                EModalSettingRoutes.SettingSignatureRecordModal,
              );
            },
          }
        : null,
      !platformEnv.isWebDappMode
        ? {
            icon: 'FolderDeleteOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_clear_cache_on_app,
            }),
            subtitle: '清理应用缓存数据',
            onPress: () => {
              navigateSettingRoute(EModalSettingRoutes.SettingClearAppCache);
            },
          }
        : null,
      !platformEnv.isWeb
        ? {
            icon: 'RefreshCcwOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_account_sync_modal_title,
            }),
            subtitle: '同步账户信息',
            onPress: () => {
              navigateSettingRoute(
                EModalSettingRoutes.SettingAlignPrimaryAccount,
              );
            },
          }
        : null,
      SHOW_REFER_FRIENDS_ITEM
        ? {
            icon: 'PeopleOutline',
            title: intl.formatMessage({
              id: ETranslations.id_refer_a_friend,
            }),
            subtitle: '邀请好友获得奖励',
            onPress: () => {
              void toReferFriendsPage();
            },
          }
        : null,
      SHOW_WHATS_NEW_ITEM
        ? {
            icon: 'InfoCircleOutline',
            title: intl.formatMessage({
              id: ETranslations.settings_whats_new,
            }),
            subtitle: '查看版本信息',
            kind: 'version',
          }
        : null,
    ];

    return [
      {
        key: 'account',
        title: '账户',
        items: accountItems.filter((item): item is IMineMenuItem =>
          Boolean(item),
        ),
      },
      {
        key: 'manage',
        title: '管理',
        items: manageItems.filter((item): item is IMineMenuItem =>
          Boolean(item),
        ),
      },
      {
        key: 'other',
        title: '其他',
        items: otherItems.filter((item): item is IMineMenuItem =>
          Boolean(item),
        ),
      },
    ].filter((section) => section.items.length > 0);
  }, [
    autoLockLabel,
    currencyLabel,
    intl,
    isPasswordSet,
    navigateSettingRoute,
    navigation,
    onLock,
    onPressAddressBook,
    toReferFriendsPage,
  ]);
}
