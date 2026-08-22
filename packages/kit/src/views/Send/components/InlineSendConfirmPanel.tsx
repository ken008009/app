import { useCallback, useEffect, useMemo, useRef } from 'react';

import BigNumber from 'bignumber.js';

import { YStack } from '@onekeyhq/components';
import type { IUnsignedTxPro } from '@onekeyhq/core/src/types';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import {
  useSignatureConfirmActions,
  useUnsignedTxsAtom,
} from '@onekeyhq/kit/src/states/jotai/contexts/signatureConfirm';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import type { ITransferPayload } from '@onekeyhq/kit-bg/src/vaults/types';
import { calculateTxExtraFee } from '@onekeyhq/shared/src/utils/feeUtils';
import { ESendFeeStatus } from '@onekeyhq/shared/types/fee';
import type { IGasAccountScenario } from '@onekeyhq/shared/types/fee';
import { ESendPreCheckTimingEnum } from '@onekeyhq/shared/types/send';
import type { ISendTxOnSuccessData } from '@onekeyhq/shared/types/tx';

import { TxConfirmActions } from '../../SignatureConfirm/components/SignatureConfirmActions';
import { TxConfirmAlert } from '../../SignatureConfirm/components/SignatureConfirmAlert';
import { usePreCheckTokenBalance } from '../../SignatureConfirm/hooks/usePreCheckTokenBalance';

type IInlineSendConfirmPanelProps = {
  accountId: string;
  networkId: string;
  unsignedTxs: IUnsignedTxPro[];
  transferPayload?: ITransferPayload;
  onSuccess?: (data: ISendTxOnSuccessData[]) => void;
  onFail?: (error: Error) => void;
  onCancel?: () => void;
  useFeeInTx?: boolean;
  feeInfoEditable?: boolean;
  gasAccountScenario?: IGasAccountScenario;
};

/**
 * Embeds fee estimation + sign/broadcast footer below the Send form so the
 * user stays on TxDataInput instead of navigating to TxConfirm.
 */
export function InlineSendConfirmPanel(props: IInlineSendConfirmPanelProps) {
  const {
    accountId,
    networkId,
    unsignedTxs,
    transferPayload,
    onSuccess,
    onFail,
    onCancel,
    useFeeInTx,
    feeInfoEditable,
    gasAccountScenario,
  } = props;

  const [settings] = useSettingsPersistAtom();
  const {
    updateUnsignedTxs,
    updateDecodedTxs,
    updateDecodedTxsInit,
    updateExtraFeeInfo,
    updateSendFeeStatus,
    updateSendTxStatus,
    updateNativeTokenInfo,
    updatePreCheckTxStatus,
  } = useSignatureConfirmActions().current;
  const [reactiveUnsignedTxs] = useUnsignedTxsAtom();
  const paramsInitRef = useRef(false);

  const unsignedTxUuid = unsignedTxs?.[0]?.uuid;

  useEffect(() => {
    updateUnsignedTxs(unsignedTxs);
  }, [unsignedTxs, updateUnsignedTxs]);

  useEffect(() => {
    if (!accountId || !networkId || !unsignedTxUuid) {
      return;
    }
    paramsInitRef.current = false;
    updateDecodedTxs({
      decodedTxs: [],
      isBuildingDecodedTxs: false,
    });
    updateDecodedTxsInit(false);
    updateSendTxStatus({
      isInsufficientNativeBalance: false,
      isInsufficientTokenBalance: false,
      fillUpNativeBalance: '0',
      isBaseOnEstimateMaxFee: false,
      maxFeeNative: '0',
    });
    updateSendFeeStatus({
      status: ESendFeeStatus.Idle,
      errMessage: '',
      discountPercent: 0,
    });
  }, [
    accountId,
    networkId,
    unsignedTxUuid,
    updateDecodedTxs,
    updateDecodedTxsInit,
    updateSendFeeStatus,
    updateSendTxStatus,
  ]);

  const fetchNativeTokenInfo = useCallback(async () => {
    const nativeTokenAddress =
      await backgroundApiProxy.serviceToken.getNativeTokenAddress({
        networkId,
      });
    const checkInscriptionProtectionEnabled =
      await backgroundApiProxy.serviceSetting.checkInscriptionProtectionEnabled(
        {
          networkId,
          accountId,
        },
      );
    const withCheckInscription =
      checkInscriptionProtectionEnabled && settings.inscriptionProtection;
    const tokenResp = await backgroundApiProxy.serviceToken.fetchTokensDetails({
      networkId,
      accountId,
      contractList: [nativeTokenAddress],
      withFrozenBalance: true,
      withCheckInscription,
    });
    const balance =
      transferPayload?.selectedUtxoTotalAmount ?? tokenResp?.[0]?.balanceParsed;
    updateNativeTokenInfo({
      isLoading: false,
      balance,
      logoURI: tokenResp?.[0]?.info.logoURI ?? '',
      info: tokenResp?.[0]?.info,
    });
  }, [
    accountId,
    networkId,
    settings.inscriptionProtection,
    transferPayload?.selectedUtxoTotalAmount,
    updateNativeTokenInfo,
  ]);

  useEffect(() => {
    const initParams = async () => {
      if (paramsInitRef.current) return;
      updateNativeTokenInfo({
        isLoading: true,
        balance: '0',
        logoURI: '',
        info: undefined,
      });
      try {
        await backgroundApiProxy.serviceSend.precheckUnsignedTxs({
          networkId,
          accountId,
          unsignedTxs,
          precheckTiming: ESendPreCheckTimingEnum.BeforeTransaction,
        });
      } catch (e: unknown) {
        updatePreCheckTxStatus((e as Error).message);
      }
      await fetchNativeTokenInfo();
      paramsInitRef.current = true;
    };
    void initParams();
  }, [
    accountId,
    fetchNativeTokenInfo,
    networkId,
    unsignedTxs,
    updateNativeTokenInfo,
    updatePreCheckTxStatus,
  ]);

  usePromiseResult(
    async () => {
      updateDecodedTxs({
        isBuildingDecodedTxs: true,
      });

      const txs = reactiveUnsignedTxs?.length
        ? reactiveUnsignedTxs
        : unsignedTxs;
      if (!txs || txs.length === 0) {
        updateDecodedTxs({
          decodedTxs: [],
          isBuildingDecodedTxs: false,
        });
        return [];
      }

      const r =
        await backgroundApiProxy.serviceSignatureConfirm.buildDecodedTxs({
          accountId,
          networkId,
          unsignedTxs: txs,
          transferPayload,
        });

      let extraFeeNativeTotal = new BigNumber(0);
      for (const decodedTx of r) {
        const extraFeeNative = calculateTxExtraFee({ decodedTx });
        extraFeeNativeTotal = extraFeeNativeTotal.plus(extraFeeNative);
      }

      updateExtraFeeInfo({ feeNative: extraFeeNativeTotal.toFixed() });
      updateDecodedTxs({
        decodedTxs: r,
        isBuildingDecodedTxs: false,
      });
      updateDecodedTxsInit(true);
      return r;
    },
    [
      accountId,
      networkId,
      reactiveUnsignedTxs,
      transferPayload,
      unsignedTxs,
      updateDecodedTxs,
      updateDecodedTxsInit,
      updateExtraFeeInfo,
    ],
    {
      watchLoading: true,
    },
  );

  usePreCheckTokenBalance({
    networkId,
    transferPayload,
  });

  const alertAccountId = useMemo(
    () => reactiveUnsignedTxs?.[0]?.accountId ?? accountId,
    [accountId, reactiveUnsignedTxs],
  );
  const alertNetworkId = useMemo(
    () => reactiveUnsignedTxs?.[0]?.networkId ?? networkId,
    [networkId, reactiveUnsignedTxs],
  );

  return (
    <YStack width="100%" gap="$3" mt="$2" testID="inline-send-confirm-panel">
      <TxConfirmAlert
        networkId={alertNetworkId}
        accountId={alertAccountId}
        transferPayload={transferPayload}
      />
      <TxConfirmActions
        accountId={alertAccountId}
        networkId={alertNetworkId}
        transferPayload={transferPayload}
        onSuccess={onSuccess}
        onFail={onFail}
        onCancel={onCancel}
        useFeeInTx={useFeeInTx}
        feeInfoEditable={feeInfoEditable}
        gasAccountScenario={gasAccountScenario}
        popStack
      />
    </YStack>
  );
}
