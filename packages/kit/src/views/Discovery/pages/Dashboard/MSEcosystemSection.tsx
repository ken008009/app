import { useCallback } from 'react';

import { Stack } from '@onekeyhq/components';
import { EEnterMethod } from '@onekeyhq/shared/src/logger/scopes/discovery/scenes/dapp';

import {
  MS_ECOSYSTEM_DAPPS,
  MS_ECOSYSTEM_SECTION_TITLE,
} from '../../config/msEcosystem';
import { useWebSiteHandler } from '../../hooks/useWebSiteHandler';
import { DiscoveryTestIDs } from '../../testIDs';

import { DashboardSectionHeader } from './DashboardSectionHeader';
import { TrendingSectionItems } from './TrendingSectionItems';

import type { IMatchDAppItemType } from '../../types';

export function MSEcosystemSection() {
  const handleWebSite = useWebSiteHandler();

  const handleOpenWebSite = useCallback(
    ({ dApp, webSite }: IMatchDAppItemType) => {
      handleWebSite({
        webSite,
        dApp,
        enterMethod: EEnterMethod.dashboard,
      });
    },
    [handleWebSite],
  );

  return (
    <Stack minHeight="$40" testID={DiscoveryTestIDs.msEcosystemSection}>
      <DashboardSectionHeader>
        <DashboardSectionHeader.Heading selected>
          {MS_ECOSYSTEM_SECTION_TITLE}
        </DashboardSectionHeader.Heading>
      </DashboardSectionHeader>

      <TrendingSectionItems
        isLoading={false}
        dataSource={MS_ECOSYSTEM_DAPPS}
        handleOpenWebSite={handleOpenWebSite}
      />
    </Stack>
  );
}
