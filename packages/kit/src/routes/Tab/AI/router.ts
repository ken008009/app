import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ETabAIRoutes,
  type ITabAIParamList,
} from '@onekeyhq/shared/src/routes';

import { LazyLoadRootTabPage } from '../../../components/LazyLoadPage';

const AI = LazyLoadRootTabPage(() =>
  import('../../../views/AI/pages/AIPage').then((module) => ({
    default: module.AIPage,
  })),
);

export const aiRouters: ITabSubNavigatorConfig<
  ETabAIRoutes,
  ITabAIParamList
>[] = [
  {
    name: ETabAIRoutes.TabAI,
    component: AI,
    rewrite: '/',
    headerShown: !platformEnv.isNative,
  },
];
