import { useCallback, useContext, useEffect, useMemo } from 'react';

import { useIntl } from 'react-intl';

import { Dialog, Select } from '@onekeyhq/components';
import type { ISelectItem } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import {
  isShowAppUpdateUIWhenUpdating,
  useAppUpdateInfo,
} from '@onekeyhq/kit/src/components/AppUpdate';
import PasswordUpdateContainer from '@onekeyhq/kit/src/components/Password/container/PasswordUpdateContainer';
import { TabFreezeOnBlurContext } from '@onekeyhq/kit/src/provider/Container/TabFreezeOnBlurContainer';
import {
  usePasswordPersistAtom,
  useSettingsPersistAtom,
} from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { displayAppUpdateVersion } from '@onekeyhq/shared/src/appUpdate';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { EReasonForNeedPassword } from '@onekeyhq/shared/types/setting';

import { useLanguageSelector } from '../../Setting/hooks';

import { MineSettingsRow } from './MineSettingsRow';

import type { IMineMenuItem } from '../hooks/useMineMenuConfig';

export function MineThemeRow({
  item,
  showDivider,
}: {
  item: IMineMenuItem;
  showDivider?: boolean;
}) {
  const [{ theme }] = useSettingsPersistAtom();
  const { setFreezeOnBlur } = useContext(TabFreezeOnBlurContext);
  const intl = useIntl();

  const options = useMemo<ISelectItem[]>(
    () => [
      {
        label: intl.formatMessage({ id: ETranslations.global_auto }),
        description: intl.formatMessage({
          id: ETranslations.global_follow_the_system,
        }),
        value: 'system',
      },
      {
        label: intl.formatMessage({ id: ETranslations.global_light }),
        value: 'light',
      },
      {
        label: intl.formatMessage({ id: ETranslations.global_dark }),
        value: 'dark',
      },
    ],
    [intl],
  );

  const onChange = useCallback(
    async (text: string) => {
      setFreezeOnBlur(false);
      await backgroundApiProxy.serviceSetting.setTheme(
        text as 'light' | 'dark' | 'system',
      );
      setFreezeOnBlur(true);
    },
    [setFreezeOnBlur],
  );

  return (
    <Select
      title={item.title}
      items={options}
      value={theme}
      onChange={onChange}
      placement="bottom-end"
      renderTrigger={({ onPress, label }) => (
        <MineSettingsRow
          icon={item.icon}
          title={item.title}
          subtitle={label || item.subtitle}
          onPress={onPress}
          showDivider={showDivider}
        />
      )}
    />
  );
}

export function MineLanguageRow({
  item,
  showDivider,
}: {
  item: IMineMenuItem;
  showDivider?: boolean;
}) {
  const { options, value, onChange } = useLanguageSelector();

  return (
    <Select
      title={item.title}
      items={options}
      value={value}
      onChange={onChange}
      placement="bottom-end"
      floatingPanelProps={{ maxHeight: 280 }}
      sheetProps={{ snapPoints: [80], snapPointsMode: 'percent' }}
      renderTrigger={({ onPress, label }) => (
        <MineSettingsRow
          icon={item.icon}
          title={item.title}
          subtitle={label || item.subtitle}
          onPress={onPress}
          showDivider={showDivider}
        />
      )}
    />
  );
}

export function MineVersionRow({
  item,
  showDivider,
}: {
  item: IMineMenuItem;
  showDivider?: boolean;
}) {
  const appUpdateInfo = useAppUpdateInfo();
  const isShowAppUpdateUI = isShowAppUpdateUIWhenUpdating({
    updateStrategy: appUpdateInfo.data.updateStrategy,
    updateStatus: appUpdateInfo.data.status,
  });
  const needUpdate = isShowAppUpdateUI && appUpdateInfo.isNeedUpdate;
  const subtitle = needUpdate
    ? displayAppUpdateVersion(appUpdateInfo.data)
    : platformEnv.version;
  const handlePress = useCallback(() => {
    if (needUpdate) {
      appUpdateInfo.toUpdatePreviewPage();
      return;
    }
    appUpdateInfo.onViewReleaseInfo();
  }, [appUpdateInfo, needUpdate]);

  return (
    <MineSettingsRow
      icon={item.icon}
      title={item.title}
      subtitle={subtitle || item.subtitle}
      onPress={handlePress}
      showDivider={showDivider}
    />
  );
}

export function MinePasswordRow({
  item,
  showDivider,
}: {
  item: IMineMenuItem;
  showDivider?: boolean;
}) {
  const intl = useIntl();
  const [{ isPasswordSet }] = usePasswordPersistAtom();

  useEffect(() => {
    void backgroundApiProxy.servicePassword.checkPasswordSet();
  }, []);

  const handlePress = useCallback(async () => {
    if (isPasswordSet) {
      const oldEncodedPassword =
        await backgroundApiProxy.servicePassword.promptPasswordVerify({
          reason: EReasonForNeedPassword.Security,
        });
      const dialog = Dialog.show({
        title: intl.formatMessage({
          id: ETranslations.global_change_passcode,
        }),
        renderContent: (
          <PasswordUpdateContainer
            oldEncodedPassword={oldEncodedPassword.password}
            onUpdateRes={async (data) => {
              if (data) {
                await dialog.close();
              }
            }}
          />
        ),
        showFooter: false,
      });
      return;
    }
    void backgroundApiProxy.servicePassword.promptPasswordVerify();
  }, [intl, isPasswordSet]);

  return (
    <MineSettingsRow
      icon={item.icon}
      title={item.title}
      subtitle={item.subtitle}
      onPress={() => {
        void handlePress();
      }}
      showDivider={showDivider}
    />
  );
}
