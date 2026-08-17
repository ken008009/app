import { brand, brandDark } from '../../../../../colors/primitive/brand';

/**
 * Bottom-tab active tint — sourced from `brand.ts` so secondary branding
 * stays in one place.
 *
 * Keep aligned with `tamagui.config.ts` `$bgAccent`:
 *   light → brand.brand10
 *   dark  → brandDark.brand9
 */
export const TAB_BAR_ACTIVE_COLOR = brand.brand10;

export const TAB_BAR_ACTIVE_COLOR_DARK = brandDark.brand9;

export function getTabBarActiveColor(themeName: string | undefined): string {
  return themeName === 'dark' ? TAB_BAR_ACTIVE_COLOR_DARK : TAB_BAR_ACTIVE_COLOR;
}
