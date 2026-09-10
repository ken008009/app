import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ETabCloudChatRoutes,
  type ITabCloudChatParamList,
} from '@onekeyhq/shared/src/routes';

import {
  LazyLoadPage,
  LazyLoadRootTabPage,
} from '../../../components/LazyLoadPage';

const CloudChat = LazyLoadRootTabPage(() =>
  import('../../../views/CloudChat/pages/CloudChatPage').then((module) => ({
    default: module.CloudChatPage,
  })),
);

const CloudChatRoom = LazyLoadPage(
  () => import('../../../views/CloudChat/pages/CloudChatRoomPage'),
);

export const cloudChatRouters: ITabSubNavigatorConfig<
  ETabCloudChatRoutes,
  ITabCloudChatParamList
>[] = [
  {
    name: ETabCloudChatRoutes.TabCloudChat,
    component: CloudChat,
    rewrite: '/',
    headerShown: !platformEnv.isNative,
  },
  {
    name: ETabCloudChatRoutes.Conversation,
    component: CloudChatRoom,
    headerShown: !platformEnv.isNative,
  },
  {
    name: ETabCloudChatRoutes.ChatSettings,
    component: LazyLoadPage(
      () => import('../../../views/CloudChat/pages/CloudChatSettingsPage'),
    ),
    headerShown: !platformEnv.isNative,
  },
];
