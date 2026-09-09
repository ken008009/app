import type { ICloudChatAtomState } from '@onekeyhq/shared/types/cloudChat';

import { EAtomNames } from '../atomNames';
import { globalAtom } from '../utils';

export const cloudChatAtomInitialValue: ICloudChatAtomState = {
  connected: false,
  connecting: false,
  loggedIn: false,
  signalReady: false,
  apiBaseUrl: '',
  relayUrl: '',
  selfUserId: '',
  serviceId: '',
};

export const { target: cloudChatAtom, use: useCloudChatAtom } =
  globalAtom<ICloudChatAtomState>({
    name: EAtomNames.cloudChatAtom,
    initialValue: cloudChatAtomInitialValue,
  });
