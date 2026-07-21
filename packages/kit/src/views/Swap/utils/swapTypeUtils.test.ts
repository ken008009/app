import { ESwapTabSwitchType } from '@onekeyhq/shared/types/swap/types';

import { getVisibleSwapTabSwitchUpdate } from './swapTypeUtils';

describe('swapTypeUtils', () => {
  it('keeps Bridge as its own visible tab', () => {
    expect(
      getVisibleSwapTabSwitchUpdate({
        currentSwapType: ESwapTabSwitchType.BRIDGE,
        nextSwapType: ESwapTabSwitchType.BRIDGE,
      }),
    ).toEqual({
      nextVisibleSwapType: ESwapTabSwitchType.BRIDGE,
      shouldUpdate: false,
    });
  });

  it('updates when switching between Swap and Bridge', () => {
    expect(
      getVisibleSwapTabSwitchUpdate({
        currentSwapType: ESwapTabSwitchType.BRIDGE,
        nextSwapType: ESwapTabSwitchType.SWAP,
      }),
    ).toEqual({
      nextVisibleSwapType: ESwapTabSwitchType.SWAP,
      shouldUpdate: true,
    });

    expect(
      getVisibleSwapTabSwitchUpdate({
        currentSwapType: ESwapTabSwitchType.SWAP,
        nextSwapType: ESwapTabSwitchType.BRIDGE,
      }),
    ).toEqual({
      nextVisibleSwapType: ESwapTabSwitchType.BRIDGE,
      shouldUpdate: true,
    });
  });

  it('updates when the visible tab changes', () => {
    expect(
      getVisibleSwapTabSwitchUpdate({
        currentSwapType: ESwapTabSwitchType.LIMIT,
        nextSwapType: ESwapTabSwitchType.SWAP,
      }),
    ).toEqual({
      nextVisibleSwapType: ESwapTabSwitchType.SWAP,
      shouldUpdate: true,
    });
  });
});
