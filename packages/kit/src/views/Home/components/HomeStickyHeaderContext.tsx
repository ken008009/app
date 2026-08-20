import { createContext } from 'react';

import type { EHomeWalletTab } from '@onekeyhq/shared/types/wallet';

export interface IHomeStickyHeaderContext {
  portalTarget: HTMLElement | null;
  stickyHost: HTMLElement | null;
  activeTabName: string;
  activeTabId: EHomeWalletTab | undefined;
  tokenSearchVisible: boolean;
  setTokenSearchVisible: (visible: boolean) => void;
}

export const HomeStickyHeaderContext =
  createContext<IHomeStickyHeaderContext | null>(null);
