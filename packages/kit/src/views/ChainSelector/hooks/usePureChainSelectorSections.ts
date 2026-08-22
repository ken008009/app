import { useCallback, useMemo } from 'react';

import BigNumber from 'bignumber.js';
import { isUndefined } from 'lodash';
import { useIntl } from 'react-intl';

import { NETWORK_SHOW_VALUE_THRESHOLD_USD } from '@onekeyhq/shared/src/consts/networkConsts';
import { MS_NETWORK_ID } from '@onekeyhq/shared/src/config/presetNetworks';
import { ETranslations } from '@onekeyhq/shared/src/locale';
import type { IServerNetwork } from '@onekeyhq/shared/types';

import { useFuseSearch } from './useFuseSearch';

import type {
  IPureChainSelectorSectionListItem,
  IServerNetworkMatch,
} from '../types';

export function buildPureChainSelectorSections({
  networks,
  unavailableNetworks,
  isNetworkEnabled,
  getNetworkValue,
  foundAssetsTitle,
  testnetTitle,
  unavailableTitle,
}: {
  networks: IServerNetworkMatch[];
  unavailableNetworks?: IServerNetwork[];
  isNetworkEnabled?: (network: IServerNetwork) => boolean;
  getNetworkValue: (networkId: string) => string;
  foundAssetsTitle: string;
  testnetTitle: string;
  unavailableTitle: string;
}): IPureChainSelectorSectionListItem[] {
  const enabledItems: IServerNetworkMatch[] = [];
  const testnetItems: IServerNetworkMatch[] = [];
  const mainnetItems: IServerNetworkMatch[] = [];
  for (const item of networks) {
    if (isNetworkEnabled?.(item)) {
      enabledItems.push(item);
    } else if (item.isTestnet) {
      testnetItems.push(item);
    } else {
      mainnetItems.push(item);
    }
  }

  const msEnabledIndex = enabledItems.findIndex(
    (item) => item.id === MS_NETWORK_ID,
  );
  if (msEnabledIndex > 0) {
    const [msNetwork] = enabledItems.splice(msEnabledIndex, 1);
    enabledItems.unshift(msNetwork);
  }

  const networksWithValue: IServerNetworkMatch[] = [];
  const networksWithoutValue: IServerNetworkMatch[] = [];
  let totalValue = new BigNumber(0);

  for (const network of mainnetItems) {
    const value = getNetworkValue(network.id);
    if (new BigNumber(value).gt(NETWORK_SHOW_VALUE_THRESHOLD_USD)) {
      networksWithValue.push(network);
      totalValue = totalValue.plus(value);
    } else {
      networksWithoutValue.push(network);
    }
  }

  networksWithValue.sort((a, b) => {
    const valueA = new BigNumber(getNetworkValue(a.id));
    const valueB = new BigNumber(getNetworkValue(b.id));
    return valueB.minus(valueA).toNumber();
  });

  const data = networksWithoutValue.reduce(
    (result, item) => {
      const char = item.name[0].toUpperCase();
      if (!result[char]) {
        result[char] = [];
      }
      result[char].push(item);
      return result;
    },
    {} as Record<string, IServerNetwork[]>,
  );

  const mainnetSections = Object.entries(data)
    .map(([key, value]) => ({ title: key, data: value }))
    .toSorted((a, b) => a.title.charCodeAt(0) - b.title.charCodeAt(0));

  const sections: IPureChainSelectorSectionListItem[] = [...mainnetSections];

  if (networksWithValue.length > 0) {
    sections.unshift({
      title: foundAssetsTitle,
      data: networksWithValue,
      totalValue: totalValue.toFixed(),
    });
  }

  if (enabledItems.length > 0) {
    sections.unshift({
      data: enabledItems,
    });
  }

  if (testnetItems.length > 0) {
    sections.push({
      title: testnetTitle,
      data: testnetItems,
    });
  }

  if (unavailableNetworks && unavailableNetworks.length > 0) {
    sections.push({
      title: unavailableTitle,
      data: unavailableNetworks,
      isUnavailable: true,
    });
  }

  return sections;
}

export function usePureChainSelectorSections({
  networks,
  searchKey,
  unavailableNetworks,
  accountNetworkValues,
  accountDeFiOverview,
  isNetworkEnabled,
}: {
  networks: IServerNetwork[];
  searchKey: string;
  unavailableNetworks?: IServerNetwork[];
  accountNetworkValues?: Record<string, string>;
  accountDeFiOverview?: Record<string, { netWorth: number }>;
  isNetworkEnabled?: (network: IServerNetwork) => boolean;
}) {
  const intl = useIntl();
  const networkFuseSearch = useFuseSearch(networks);

  const getNetworkValue = useCallback(
    (networkId: string) => {
      if (isUndefined(accountNetworkValues?.[networkId])) {
        return '0';
      }

      const tokenValue = accountNetworkValues?.[networkId] ?? '0';
      const defiValue = accountDeFiOverview?.[networkId]?.netWorth ?? 0;
      return new BigNumber(tokenValue).plus(defiValue).toFixed();
    },
    [accountNetworkValues, accountDeFiOverview],
  );

  const sections = useMemo<IPureChainSelectorSectionListItem[]>(() => {
    if (searchKey) {
      const data = networkFuseSearch(searchKey);
      return data.length === 0
        ? []
        : [
            {
              data,
            },
          ];
    }
    return buildPureChainSelectorSections({
      networks,
      unavailableNetworks,
      isNetworkEnabled,
      getNetworkValue,
      foundAssetsTitle: intl.formatMessage({
        id: ETranslations.network_found_assets_on_networks,
      }),
      testnetTitle: intl.formatMessage({
        id: ETranslations.global_testnet,
      }),
      unavailableTitle: intl.formatMessage({
        id: ETranslations.network_selector_unavailable_networks,
      }),
    });
  }, [
    searchKey,
    networks,
    unavailableNetworks,
    networkFuseSearch,
    intl,
    getNetworkValue,
    isNetworkEnabled,
  ]);

  return {
    sections,
  };
}
