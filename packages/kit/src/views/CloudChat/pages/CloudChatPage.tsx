import {
  Empty,
  Page,
  SizableText,
  YStack,
  useScrollContentTabBarOffset,
} from '@onekeyhq/components';
import { TabPageHeader } from '@onekeyhq/kit/src/components/TabPageHeader';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

const CLOUD_CHAT_TITLE = '云聊';
const COMING_SOON_DESCRIPTION = '正在加紧开发中';

export function CloudChatPage() {
  const tabBarOffset = useScrollContentTabBarOffset();

  return (
    <Page>
      <TabPageHeader
        sceneName={EAccountSelectorSceneName.home}
        tabRoute={ETabRoutes.CloudChat}
        hideSearch
        customHeaderLeftItems={
          <SizableText size="$headingXl">{CLOUD_CHAT_TITLE}</SizableText>
        }
      />
      <Page.Body>
        <YStack flex={1} justifyContent="center" pb={tabBarOffset}>
          <Empty
            icon="ChatOutline"
            title={CLOUD_CHAT_TITLE}
            description={COMING_SOON_DESCRIPTION}
          />
        </YStack>
      </Page.Body>
    </Page>
  );
}
