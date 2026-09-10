import { useEffect, useState } from 'react';

import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';

// Chain accounts can change while the all-network placeholder stays identical.
export function useAccountAddressRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    appEventBus.on(EAppEventBusNames.AccountUpdate, refresh);
    appEventBus.on(EAppEventBusNames.WalletUpdate, refresh);
    return () => {
      appEventBus.off(EAppEventBusNames.AccountUpdate, refresh);
      appEventBus.off(EAppEventBusNames.WalletUpdate, refresh);
    };
  }, []);
  return revision;
}
