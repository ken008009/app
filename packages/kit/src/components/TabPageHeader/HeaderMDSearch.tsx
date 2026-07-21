import { useIntl } from 'react-intl';

import { ETranslations } from '@onekeyhq/shared/src/locale';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';

import { MDUniversalSearchInput } from './LegacyUniversalSearchInput';

import type { ITabPageHeaderProp } from './type';

export function HeaderMDSearch({
  sceneName: _sceneName,
  tabRoute,
}: ITabPageHeaderProp) {
  const intl = useIntl();

  if (tabRoute === ETabRoutes.Market) {
    return (
      <MDUniversalSearchInput
        placeholder={intl.formatMessage({
          id: ETranslations.global_search_tokens,
        })}
      />
    );
  }

  if (tabRoute === ETabRoutes.Home) {
    return <MDUniversalSearchInput />;
  }

  return null;
}
