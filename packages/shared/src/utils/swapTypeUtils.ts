import { ESwapTabSwitchType } from '../../types/swap/types';

/**
 * Visible trade-category tab type.
 * Swap and Bridge are separate header tabs; keep them distinct.
 */
export function getVisibleSwapTabSwitchType(type?: ESwapTabSwitchType) {
  return type;
}

export function getSwapSupportCheckType(type?: ESwapTabSwitchType) {
  return type === ESwapTabSwitchType.BRIDGE
    ? ESwapTabSwitchType.BRIDGE
    : getVisibleSwapTabSwitchType(type);
}
