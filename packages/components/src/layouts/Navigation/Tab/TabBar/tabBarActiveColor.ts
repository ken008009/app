import {
  brand,
  brandA,
  brandDark,
  brandDarkA,
} from '../../../../../colors/primitive/brand';

/**
 * Bottom-tab active tint — sourced from `brand.ts` so secondary branding
 * stays in one place.
 *
 * Keep aligned with `tamagui.config.ts` `$bgAccent`:
 *   light → brand.brand10
 *   dark  → brandDark.brand9
 *
 * Android native BottomNavigation also uses the indicator / ripple colors
 * (Material 3 pill behind the selected icon). Do not reuse the solid
 * active tint there — icon and pill would collide.
 */
export const TAB_BAR_ACTIVE_COLOR = brand.brand10;

export const TAB_BAR_ACTIVE_COLOR_DARK = brandDark.brand9;

export const TAB_BAR_ACTIVE_INDICATOR_COLOR = brandA.brandA4;

export const TAB_BAR_ACTIVE_INDICATOR_COLOR_DARK = brandDarkA.brandA4;

export const TAB_BAR_RIPPLE_COLOR = brandA.brandA5;

export const TAB_BAR_RIPPLE_COLOR_DARK = brandDarkA.brandA5;

export function getTabBarActiveColor(themeName: string | undefined): string {
  return themeName === 'dark'
    ? TAB_BAR_ACTIVE_COLOR_DARK
    : TAB_BAR_ACTIVE_COLOR;
}

export function getTabBarActiveIndicatorColor(
  themeName: string | undefined,
): string {
  return themeName === 'dark'
    ? TAB_BAR_ACTIVE_INDICATOR_COLOR_DARK
    : TAB_BAR_ACTIVE_INDICATOR_COLOR;
}

export function getTabBarRippleColor(themeName: string | undefined): string {
  return themeName === 'dark'
    ? TAB_BAR_RIPPLE_COLOR_DARK
    : TAB_BAR_RIPPLE_COLOR;
}
