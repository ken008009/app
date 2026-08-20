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

const AI_TITLE = 'AI';
const COMING_SOON_DESCRIPTION = '正在加紧开发中';

export function AIPage() {
  const tabBarOffset = useScrollContentTabBarOffset();

  return (
    <Page>
      <TabPageHeader
        sceneName={EAccountSelectorSceneName.home}
        tabRoute={ETabRoutes.AI}
        hideSearch
        customHeaderLeftItems={
          <SizableText size="$headingXl">{AI_TITLE}</SizableText>
        }
      />
      <Page.Body>
        <YStack flex={1} justifyContent="center" pb={tabBarOffset}>
          <Empty
            icon="AiStarOutline"
            title={AI_TITLE}
            description={COMING_SOON_DESCRIPTION}
          />
        </YStack>
      </Page.Body>
    </Page>
  );
}
