import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ETabCloudChatRoutes,
  type ITabCloudChatParamList,
} from '@onekeyhq/shared/src/routes';

import { LazyLoadRootTabPage } from '../../../components/LazyLoadPage';

const CloudChat = LazyLoadRootTabPage(() =>
  import('../../../views/CloudChat/pages/CloudChatPage').then((module) => ({
    default: module.CloudChatPage,
  })),
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
];
