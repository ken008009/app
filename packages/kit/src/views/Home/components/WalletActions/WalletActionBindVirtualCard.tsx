import { useCallback } from 'react';

import { ActionList, Toast } from '@onekeyhq/components';

const BIND_VIRTUAL_CARD_LABEL = '绑定虚拟卡';
const BIND_VIRTUAL_CARD_DEVELOPING_MESSAGE = '正在加紧开发中';

export function WalletActionBindVirtualCard({
  onClose,
}: {
  onClose: () => void;
}) {
  const handlePress = useCallback(() => {
    Toast.message({
      title: BIND_VIRTUAL_CARD_DEVELOPING_MESSAGE,
    });
    onClose();
  }, [onClose]);

  return (
    <ActionList.Item
      testID="home-bind-virtual-card"
      icon="CreditCardPlusOutline"
      label={BIND_VIRTUAL_CARD_LABEL}
      onClose={() => {}}
      onPress={handlePress}
    />
  );
}
