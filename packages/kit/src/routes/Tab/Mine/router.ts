import type { ITabSubNavigatorConfig } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import {
  ETabMineRoutes,
  type ITabMineParamList,
} from '@onekeyhq/shared/src/routes';

import { LazyLoadRootTabPage } from '../../../components/LazyLoadPage';

const Mine = LazyLoadRootTabPage(() =>
  import('../../../views/Mine/pages/MinePage').then((module) => ({
    default: module.MinePage,
  })),
);

export const mineRouters: ITabSubNavigatorConfig<
  ETabMineRoutes,
  ITabMineParamList
>[] = [
  {
    name: ETabMineRoutes.TabMine,
    component: Mine,
    rewrite: '/',
    headerShown: !platformEnv.isNative,
  },
];
