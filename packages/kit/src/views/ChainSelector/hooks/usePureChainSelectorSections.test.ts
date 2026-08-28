import { NETWORK_SHOW_VALUE_THRESHOLD_USD } from '@onekeyhq/shared/src/consts/networkConsts';

import { buildPureChainSelectorSections } from './usePureChainSelectorSections';

import type { IServerNetworkMatch } from '../types';

function makeNetwork(
  id: string,
  name: string,
  extras: Partial<IServerNetworkMatch> = {},
): IServerNetworkMatch {
  return {
    id,
    name,
    isTestnet: false,
    impl: 'evm',
    symbol: name,
    code: id,
    shortcode: id,
    shortname: name,
    decimals: 18,
    feeMeta: {
      decimals: 9,
      symbol: 'Gwei',
      isEIP1559FeeEnabled: false,
      isWithL1BaseFee: false,
    },
    status: 'listed',
    logoURI: '',
    defaultEnabled: false,
    backendIndex: false,
    ...extras,
  } as IServerNetworkMatch;
}

const titles = {
  foundAssetsTitle: 'Found assets',
  testnetTitle: 'Testnet',
  unavailableTitle: 'Unavailable',
};

describe('buildPureChainSelectorSections', () => {
  test('puts enabled networks in the first section and does not repeat them', () => {
    const ms = makeNetwork('evm--1049763712', 'MS Mainnet');
    const btc = makeNetwork('btc--0', 'Bitcoin');
    const base = makeNetwork('evm--8453', 'Base');
    const sections = buildPureChainSelectorSections({
      networks: [base, btc, ms],
      isNetworkEnabled: (network) =>
        network.id === ms.id || network.id === btc.id,
      getNetworkValue: () => '0',
      ...titles,
    });

    expect(sections[0]?.data.map((network) => network.id)).toEqual([
      ms.id,
      btc.id,
    ]);
    const laterIds = sections
      .slice(1)
      .flatMap((section) => section.data.map((network) => network.id));
    expect(laterIds).toEqual([base.id]);
    expect(laterIds).not.toContain(ms.id);
    expect(laterIds).not.toContain(btc.id);
  });

  test('keeps high-value unchecked networks below the enabled group', () => {
    const enabled = makeNetwork('evm--1', 'Ethereum');
    const rich = makeNetwork('evm--56', 'BNB Chain');
    const richValue = String(NETWORK_SHOW_VALUE_THRESHOLD_USD + 10);
    const sections = buildPureChainSelectorSections({
      networks: [rich, enabled],
      isNetworkEnabled: (network) => network.id === enabled.id,
      getNetworkValue: (networkId) => (networkId === rich.id ? richValue : '0'),
      ...titles,
    });

    expect(sections[0]?.data.map((network) => network.id)).toEqual([
      enabled.id,
    ]);
    expect(sections[1]?.title).toBe('Found assets');
    expect(sections[1]?.data.map((network) => network.id)).toEqual([rich.id]);
  });

  test('pins ms first among enabled networks', () => {
    const eth = makeNetwork('evm--1', 'Ethereum');
    const btc = makeNetwork('btc--0', 'Bitcoin');
    const ms = makeNetwork('evm--1049763712', 'MS Mainnet');
    const sections = buildPureChainSelectorSections({
      networks: [eth, btc, ms],
      isNetworkEnabled: () => true,
      getNetworkValue: () => '0',
      ...titles,
    });

    expect(sections[0]?.data.map((network) => network.id)).toEqual([
      ms.id,
      eth.id,
      btc.id,
    ]);
  });
});
