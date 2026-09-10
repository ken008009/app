import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useAccountAddressRefresh } from '@onekeyhq/kit/src/hooks/useAccountAddressRefresh';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { getAccountAddressErrorMessage } from '@onekeyhq/kit/src/utils/accountAddressResult';
import { getNetworkIdsMap } from '@onekeyhq/shared/src/config/networkIds';
import {
  normalizeCloudChatUserId,
  shouldResolveCloudChatEvmAccount,
} from '@onekeyhq/shared/src/utils/cloudChatUtils';
import networkUtils from '@onekeyhq/shared/src/utils/networkUtils';

const CLOUD_CHAT_EVM_IDLE = { status: 'idle' as const };

export type ICloudChatEvmAccountResult =
  | typeof CLOUD_CHAT_EVM_IDLE
  | {
      status: 'ready';
      accountId: string;
      networkId: string;
      address: string;
    }
  | {
      status: 'error';
      message: string;
    };

// Same path Discovery / Perps use: resolve the HD account onto Ethereum so
// All Networks does not surface AllNetworkMockAddress. Uses existing
// serviceAccount/serviceNetwork methods so Debug dual-runtime does not depend
// on a newly added CloudChat background method.
export function useCloudChatEvmAccount({
  accountId,
  networkId,
  address,
  indexedAccountId,
}: {
  accountId: string;
  networkId: string;
  address: string;
  indexedAccountId?: string;
}): ICloudChatEvmAccountResult {
  const revision = useAccountAddressRefresh();
  const { result } = usePromiseResult(
    async (): Promise<ICloudChatEvmAccountResult> => {
      if (!accountId || !networkId || !address) {
        return CLOUD_CHAT_EVM_IDLE;
      }
      try {
        if (
          !shouldResolveCloudChatEvmAccount({
            address,
            networkId,
          })
        ) {
          if (!networkUtils.isEvmNetwork({ networkId })) {
            return {
              status: 'error',
              message: '云聊需要 EVM 钱包账户',
            };
          }
          return {
            status: 'ready',
            accountId,
            networkId,
            address: normalizeCloudChatUserId(address),
          };
        }

        const ethNetworkId = getNetworkIdsMap().eth;
        const deriveType =
          (await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork(
            {
              networkId: ethNetworkId,
            },
          )) || 'default';
        const networkAccount =
          await backgroundApiProxy.serviceAccount.getNetworkAccount({
            accountId: indexedAccountId ? undefined : accountId || undefined,
            indexedAccountId: indexedAccountId || undefined,
            networkId: ethNetworkId,
            deriveType,
          });
        const resolvedAddress = normalizeCloudChatUserId(
          networkAccount.address || '',
        );
        if (!resolvedAddress) {
          return {
            status: 'error',
            message: '账户地址尚未生成，请进入 Ethereum 网络完成地址创建',
          };
        }
        return {
          status: 'ready',
          accountId: networkAccount.id,
          networkId: ethNetworkId,
          address: resolvedAddress,
        };
      } catch (error) {
        return {
          status: 'error',
          message: getAccountAddressErrorMessage(error),
        };
      }
    },
    // Account events must invalidate a lookup even when the placeholder is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accountId, indexedAccountId, networkId, address, revision],
    { initResult: CLOUD_CHAT_EVM_IDLE, revalidateOnFocus: true },
  );

  return result ?? CLOUD_CHAT_EVM_IDLE;
}
