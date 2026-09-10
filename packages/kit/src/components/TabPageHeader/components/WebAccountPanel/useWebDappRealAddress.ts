import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useAccountAddressRefresh } from '@onekeyhq/kit/src/hooks/useAccountAddressRefresh';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { getAccountAddressErrorMessage } from '@onekeyhq/kit/src/utils/accountAddressResult';
import { ALL_NETWORK_ACCOUNT_MOCK_ADDRESS } from '@onekeyhq/shared/src/consts/addresses';
import { PERPS_NETWORK_ID } from '@onekeyhq/shared/src/consts/perp';

// Web dapp mode forces the home account to all-networks. For an indexed/HD
// account that makes `activeAccount.account.address` the mock all-networks
// placeholder (ALL_NETWORK_ACCOUNT_MOCK_ADDRESS) instead of a usable address,
// whereas external/keyless accounts already resolve a real address. When we hit
// the mock, resolve the real EVM address from the indexed account so the header
// shows a real address and perps lookups key off a real address. EVM addresses
// are shared across EVM chains, so resolving on any EVM network (PERPS_NETWORK_ID)
// yields the correct address.
export function useWebDappRealAddressResult({
  address,
  indexedAccountId,
}: {
  address?: string;
  indexedAccountId?: string;
}) {
  const revision = useAccountAddressRefresh();
  const { result } = usePromiseResult(
    async () => {
      if (address !== ALL_NETWORK_ACCOUNT_MOCK_ADDRESS || !indexedAccountId) {
        return undefined;
      }
      try {
        const deriveType =
          (await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork(
            {
              networkId: PERPS_NETWORK_ID,
            },
          )) || 'default';
        const networkAccount =
          await backgroundApiProxy.serviceAccount.getNetworkAccount({
            accountId: undefined,
            indexedAccountId,
            networkId: PERPS_NETWORK_ID,
            deriveType,
          });
        return networkAccount?.address
          ? { address: networkAccount.address, error: undefined }
          : {
              address: undefined,
              error: '账户地址尚未生成，请进入对应网络完成地址创建',
            };
      } catch (error) {
        return {
          address: undefined,
          error: getAccountAddressErrorMessage(error),
        };
      }
    },
    // Account events must invalidate a lookup even when the placeholder is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [address, indexedAccountId, revision],
    { initResult: undefined, revalidateOnFocus: true },
  );

  // External/real address: use it directly (no async resolution needed).
  // Mock address: surface the resolved real address (undefined while pending),
  // never the mock placeholder string.
  return address === ALL_NETWORK_ACCOUNT_MOCK_ADDRESS
    ? result
    : { address, error: undefined };
}

export function useWebDappRealAddress(
  params: Parameters<typeof useWebDappRealAddressResult>[0],
): string | undefined {
  return useWebDappRealAddressResult(params)?.address;
}
