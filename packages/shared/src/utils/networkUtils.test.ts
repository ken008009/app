import {
  MS_NETWORK_ID,
  getDefaultEnabledNetworksInAllNetworks,
} from '../config/presetNetworks';

import { isEnabledNetworksInAllNetworks } from './networkUtils';

describe('isEnabledNetworksInAllNetworks', () => {
  const emptyState = {
    enabledNetworks: {},
    disabledNetworks: {},
    isTestnet: false,
  };

  test('ms is checked by default in All Networks', () => {
    expect(
      isEnabledNetworksInAllNetworks({
        networkId: MS_NETWORK_ID,
        ...emptyState,
      }),
    ).toBe(true);
  });

  test('ms stays checked when All Networks state only lists other chains', () => {
    expect(
      isEnabledNetworksInAllNetworks({
        networkId: MS_NETWORK_ID,
        enabledNetworks: { 'evm--1': true, 'btc--0': true },
        disabledNetworks: {},
        isTestnet: false,
      }),
    ).toBe(true);
  });

  test('only ms plus the screenshot chains are checked by default', () => {
    expect(
      getDefaultEnabledNetworksInAllNetworks().map((network) => network.id),
    ).toEqual([
      MS_NETWORK_ID,
      'btc--0',
      'evm--1',
      'evm--56',
      'tron--0x2b6653dc',
      'sol--101',
      'evm--137',
      'evm--42161',
    ]);
    expect(
      isEnabledNetworksInAllNetworks({
        networkId: 'evm--8453',
        ...emptyState,
      }),
    ).toBe(false);
  });

  test('ms stays off only when the user has disabled it', () => {
    expect(
      isEnabledNetworksInAllNetworks({
        networkId: MS_NETWORK_ID,
        enabledNetworks: {},
        disabledNetworks: { [MS_NETWORK_ID]: true },
        isTestnet: false,
      }),
    ).toBe(false);
  });
});
