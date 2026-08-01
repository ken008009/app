import { Fragment, useMemo } from 'react';

import { useIntl } from 'react-intl';

import {
  Divider,
  Page,
  ScrollView,
  SizableText,
  XStack,
  YStack,
  useScrollContentTabBarOffset,
} from '@onekeyhq/components';
import { TabPageHeader } from '@onekeyhq/kit/src/components/TabPageHeader';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import type { ISubSettingConfig } from '../../Setting/pages/Tab/config';
import { TabSettingsListGrid } from '../../Setting/pages/Tab/ListItem';
import {
  showUnderDevelopmentToast,
  useMineMenuConfig,
} from '../hooks/useMineMenuConfig';

function MineMenuListGrid({ item }: { item: ISubSettingConfig }) {
  const resolvedItem = useMemo(() => {
    if (item.renderElement || item.onPress) {
      return item;
    }
    return {
      ...item,
      onPress: () => {
        showUnderDevelopmentToast();
      },
    };
  }, [item]);

  return <TabSettingsListGrid item={resolvedItem} />;
}

export function MinePage() {
  const intl = useIntl();
  const menuItems = useMineMenuConfig();
  const tabBarOffset = useScrollContentTabBarOffset();

  return (
    <Page>
      {platformEnv.isNative ? (
        <TabPageHeader
          sceneName={EAccountSelectorSceneName.home}
          tabRoute={ETabRoutes.Mine}
          customHeaderLeftItems={
            <SizableText size="$headingXl">
              {intl.formatMessage({ id: ETranslations.global_mine })}
            </SizableText>
          }
        />
      ) : (
        <Page.Header
          title={intl.formatMessage({ id: ETranslations.global_mine })}
        />
      )}
      <Page.Body>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            pb: tabBarOffset,
            pt: '$2',
          }}
        >
          <YStack>
            {menuItems.map((item, itemIdx) => (
              <Fragment key={`${item.title}-${itemIdx}`}>
                <MineMenuListGrid item={item} />
                {itemIdx !== menuItems.length - 1 ? (
                  <XStack mx="$5">
                    <Divider borderColor="$neutral3" />
                  </XStack>
                ) : null}
              </Fragment>
            ))}
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
