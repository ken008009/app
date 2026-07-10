import { useCallback } from 'react';

import { useIntl } from 'react-intl';

import type { IIconButtonProps } from '@onekeyhq/components';
import { HeaderIconButton } from '@onekeyhq/components/src/layouts/Navigation/Header';
import { ETranslations } from '@onekeyhq/shared/src/locale';

import { useActiveAccount } from '../../../states/jotai/contexts/accountSelector';
import { useHomeTokenListSnapshot } from '../../../states/jotai/contexts/tokenList/cells';
import { HomeTokenListProviderMirror } from '../../../views/Home/components/HomeTokenListProvider/HomeTokenListProviderMirror';
import useScanQrCodeLazy from '../../../views/ScanQrCode/hooks/useScanQrCodeLazy';

export interface IHeaderScanIconButtonProps {
  size?: IIconButtonProps['size'];
  iconSize?: IIconButtonProps['iconSize'];
  testID?: string;
}

function HeaderScanIconButtonInner({
  size,
  iconSize,
  testID = 'header-right-scan',
}: IHeaderScanIconButtonProps) {
  const intl = useIntl();
  const scanQrCode = useScanQrCodeLazy();
  const {
    activeAccount: { account, network },
  } = useActiveAccount({ num: 0 });
  const { tokens, keys, map } = useHomeTokenListSnapshot();

  const handleScan = useCallback(async () => {
    await scanQrCode.start({
      handlers: scanQrCode.PARSE_HANDLER_NAMES.all,
      autoExecuteParsedAction: true,
      account,
      network,
      tokens: {
        data: tokens,
        keys,
        map,
      },
    });
  }, [scanQrCode, account, network, tokens, keys, map]);

  return (
    <HeaderIconButton
      testID={testID}
      title={intl.formatMessage({ id: ETranslations.scan_scan_qr_code })}
      icon="ScanOutline"
      size={size}
      iconSize={iconSize}
      onPress={() => {
        void handleScan();
      }}
    />
  );
}

export function HeaderScanIconButton(props: IHeaderScanIconButtonProps) {
  return (
    <HomeTokenListProviderMirror>
      <HeaderScanIconButtonInner {...props} />
    </HomeTokenListProviderMirror>
  );
}
