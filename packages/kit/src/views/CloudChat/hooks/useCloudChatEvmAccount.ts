import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
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
            message: '云聊需要 EVM 钱包账户',
          };
        }
        return {
          status: 'ready',
          accountId: networkAccount.id,
          networkId: ethNetworkId,
          address: resolvedAddress,
        };
      } catch {
        return {
          status: 'error',
          message: '云聊需要 EVM 钱包账户',
        };
      }
    },
    [accountId, indexedAccountId, networkId, address],
    { initResult: CLOUD_CHAT_EVM_IDLE, checkIsFocused: false },
  );

  return result ?? CLOUD_CHAT_EVM_IDLE;
}
