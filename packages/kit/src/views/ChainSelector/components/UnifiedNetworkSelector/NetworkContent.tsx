import type { Dispatch, SetStateAction } from 'react';

import type { IServerNetwork } from '@onekeyhq/shared/types';

import { EditableChainSelectorContent } from '../EditableChainSelector/ChainSelectorContent';

export const defaultChainSelectorNetworks: {
  mainnetItems: IServerNetwork[];
  testnetItems: IServerNetwork[];
  unavailableItems: IServerNetwork[];
  frequentlyUsedItems: IServerNetwork[];
  allNetworkItem?: IServerNetwork;
} = {
  mainnetItems: [],
  testnetItems: [],
  unavailableItems: [],
  frequentlyUsedItems: [],
};

type INetworkContentProps = {
  walletId?: string;
  accountId?: string;
  indexedAccountId?: string;
  networkId?: string;
  onPressItem?: (network: IServerNetwork) => void;
  onEditCustomNetwork?: (network: IServerNetwork) => void;
  searchText?: string;
  setSearchText?: Dispatch<SetStateAction<string>>;
  /** Preloaded by UnifiedNetworkSelector — avoids a second bg fetch. */
  chainSelectorNetworks: typeof defaultChainSelectorNetworks;
  accountNetworkValues: Record<string, string>;
  accountNetworkValueCurrency?: string;
  accountDeFiOverview: Record<string, { netWorth: number }>;
  zeroValue: boolean;
};

export function NetworkContent({
  walletId,
  accountId,
  indexedAccountId,
  networkId,
  onPressItem,
  onEditCustomNetwork,
  searchText,
  setSearchText,
  chainSelectorNetworks,
  accountNetworkValues,
  accountNetworkValueCurrency,
  accountDeFiOverview,
  zeroValue,
}: INetworkContentProps) {
  return (
    <EditableChainSelectorContent
      recentNetworksEnabled
      showAllNetworkInRecentNetworks
      walletId={walletId}
      networkId={networkId}
      accountId={accountId}
      indexedAccountId={indexedAccountId}
      zeroValue={zeroValue}
      mainnetItems={chainSelectorNetworks.mainnetItems}
      testnetItems={chainSelectorNetworks.testnetItems}
      unavailableItems={chainSelectorNetworks.unavailableItems}
      frequentlyUsedItems={chainSelectorNetworks.frequentlyUsedItems}
      accountDeFiOverview={accountDeFiOverview}
      accountNetworkValues={accountNetworkValues}
      accountNetworkValueCurrency={accountNetworkValueCurrency}
      onPressItem={onPressItem}
      onEditCustomNetwork={onEditCustomNetwork}
      searchText={searchText}
      setSearchText={setSearchText}
    />
  );
}
