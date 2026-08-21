import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { MS_NETWORK_ID } from '@onekeyhq/shared/src/config/presetNetworks';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import type { IToken } from '@onekeyhq/shared/types/token';

export type IResolvedSendNetworkTarget = {
  networkId: string;
  accountId: string;
  token: IToken | undefined;
};

/**
 * Resolve account + native token for a send form network.
 * Defaults to MS when the caller does not pass a networkId.
 */
export async function resolveSendNetworkTarget({
  networkId = MS_NETWORK_ID,
  walletId,
  indexedAccountId,
  fallbackAccountId,
}: {
  networkId?: string;
  walletId?: string;
  indexedAccountId?: string;
  fallbackAccountId?: string;
}): Promise<IResolvedSendNetworkTarget> {
  let accountId = fallbackAccountId ?? '';

  if (
    indexedAccountId &&
    walletId &&
    !accountUtils.isOthersWallet({ walletId })
  ) {
    try {
      const defaultDeriveType =
        await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
          networkId,
        });
      const { accounts } =
        await backgroundApiProxy.serviceAccount.getAccountsByIndexedAccounts({
          indexedAccountIds: [indexedAccountId],
          networkId,
          deriveType: defaultDeriveType,
        });
      if (accounts?.[0]?.id) {
        accountId = accounts[0].id;
      }
    } catch {
      // Keep fallbackAccountId when derive lookup fails.
    }
  }

  if (!accountId && fallbackAccountId) {
    accountId = fallbackAccountId;
  }

  let token: IToken | undefined;
  try {
    token =
      (await backgroundApiProxy.serviceToken.getNativeToken({
        networkId,
        accountId,
      })) ?? undefined;
  } catch {
    token = undefined;
  }

  return {
    networkId,
    accountId,
    token,
  };
}
