import type { ReactNode } from 'react';
import { useCallback } from 'react';

import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import {
  useAccountSelectorSceneInfo,
  useActiveAccount,
} from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';

import { HomeTestIDs } from '../../testIDs';
import { HomeTokenListProviderMirrorWrapper } from '../HomeTokenListProvider';

import { RawActions } from './RawActions';
import { useWalletActionConfig } from './useWalletActionConfig';
import { WalletActionBindVirtualCard } from './WalletActionBindVirtualCard';
import { WalletActionCopy } from './WalletActionCopy';
import { WalletActionSell } from './WalletActionSell';
import { WalletActionViewInExplorer } from './WalletActionViewInExplorer';

export function WalletActionMore({ iconOnly }: { iconOnly?: boolean } = {}) {
  const { activeAccount } = useActiveAccount({ num: 0 });
  const { sceneName, sceneUrl } = useAccountSelectorSceneInfo();
  const { config, getMoreActionGroups, vaultSettings } =
    useWalletActionConfig();
  const isAllNetworks = Boolean(activeAccount.network?.isAllNetworks);

  const renderItemsAsync = useCallback(
    async ({
      handleActionListClose,
    }: {
      handleActionListClose: () => void;
    }) => {
      const groups = getMoreActionGroups();
      const actions = groups.flatMap((group) =>
        group.actions.filter((action) => {
          if (!config.moreActions.includes(action)) {
            return false;
          }
          if (action === 'explorer') {
            // All-networks has no single explorer URL to open.
            if (isAllNetworks) {
              return false;
            }
            return !vaultSettings?.hideBlockExplorer;
          }
          return true;
        }),
      );

      const elements: ReactNode[] = actions.map((action) => {
        switch (action) {
          case 'bindVirtualCard':
            return (
              <WalletActionBindVirtualCard
                key="bindVirtualCard"
                onClose={handleActionListClose}
              />
            );
          case 'sell':
            return (
              <WalletActionSell key="sell" onClose={handleActionListClose} />
            );
          case 'copy':
            return (
              <WalletActionCopy key="copy" onClose={handleActionListClose} />
            );
          case 'explorer':
            return (
              <WalletActionViewInExplorer
                key="explorer"
                onClose={handleActionListClose}
              />
            );
          default:
            return null;
        }
      });

      return (
        <AccountSelectorProviderMirror
          config={{
            sceneName,
            sceneUrl,
          }}
          enabledNum={[0]}
        >
          <HomeTokenListProviderMirrorWrapper
            accountId={activeAccount?.account?.id ?? ''}
          >
            {elements}
          </HomeTokenListProviderMirrorWrapper>
        </AccountSelectorProviderMirror>
      );
    },
    [
      getMoreActionGroups,
      config.moreActions,
      vaultSettings?.hideBlockExplorer,
      isAllNetworks,
      activeAccount?.account?.id,
      sceneName,
      sceneUrl,
    ],
  );

  return (
    <RawActions.More
      renderItemsAsync={renderItemsAsync}
      testID={HomeTestIDs.moreButton}
      iconOnly={iconOnly}
    />
  );
}
