import { useCallback, useMemo } from 'react';

import { ActionList } from '@onekeyhq/components';
import { useBotWalletDeactivatedStatus } from '@onekeyhq/kit/src/hooks/useBotWalletDeactivatedStatus';
import { useUserWalletProfile } from '@onekeyhq/kit/src/hooks/useUserWalletProfile';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import { showBotWalletDisabledToast } from '@onekeyhq/kit/src/utils/botWalletDisabledToast';
import { useFiatCrypto } from '@onekeyhq/kit/src/views/FiatCrypto/hooks';
import { WALLET_TYPE_WATCHING } from '@onekeyhq/shared/src/consts/dbConsts';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

export function WalletActionSell({ onClose }: { onClose: () => void }) {
  const {
    activeAccount: { network, account, wallet },
  } = useActiveAccount({ num: 0 });

  const {
    isSupported: isSellSupported,
    handleFiatCrypto: handleSellFiatCrypto,
  } = useFiatCrypto({
    networkId: network?.id ?? '',
    accountId: account?.id ?? '',
    fiatCryptoType: 'sell',
  });

  const { isBotWallet, isBotWalletDeactivated } = useBotWalletDeactivatedStatus(
    {
      walletId: wallet?.id,
    },
  );
  const isSellBlockedByBotWallet = isBotWallet && isBotWalletDeactivated;

  const isSellDisabled = useMemo(() => {
    if (wallet?.type === WALLET_TYPE_WATCHING && !platformEnv.isDev) {
      return true;
    }
    if (!isSellSupported) {
      return true;
    }
    if (isSellBlockedByBotWallet) {
      return true;
    }
    return false;
  }, [wallet?.type, isSellSupported, isSellBlockedByBotWallet]);

  const { isSoftwareWalletOnlyUser } = useUserWalletProfile();

  const handleSell = useCallback(async () => {
    if (isSellBlockedByBotWallet) {
      showBotWalletDisabledToast('addMoney');
      return;
    }
    if (isSellDisabled) {
      return;
    }

    defaultLogger.wallet.walletActions.actionBuy({
      walletType: wallet?.type ?? '',
      networkId: network?.id ?? '',
      source: 'homePage',
      isSoftwareWalletOnlyUser,
    });

    handleSellFiatCrypto({});
    onClose();
  }, [
    isSellBlockedByBotWallet,
    isSellDisabled,
    handleSellFiatCrypto,
    network?.id,
    wallet?.type,
    isSoftwareWalletOnlyUser,
    onClose,
  ]);

  return (
    <ActionList.Item
      trackID="wallet-sell"
      icon="MinusLargeOutline"
      // Secondary-dev product copy; locale JSON is auto-generated and not edited.
      label="提现"
      onClose={() => {}}
      onPress={handleSell}
      disabled={isSellDisabled}
      allowPressWhenDisabled={isSellBlockedByBotWallet}
    />
  );
}
