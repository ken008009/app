import {
  brand,
  brandA,
  brandDark,
  brandDarkA,
} from '../../../../../colors/primitive/brand';

import {
  getTabBarActiveColor,
  getTabBarActiveIndicatorColor,
  getTabBarRippleColor,
} from './tabBarActiveColor';

describe('tabBarActiveColor', () => {
  it('uses brand gold for the selected native-tab tint', () => {
    expect(getTabBarActiveColor('light')).toBe(brand.brand10);
    expect(getTabBarActiveColor(undefined)).toBe(brand.brand10);
    expect(getTabBarActiveColor('dark')).toBe(brandDark.brand9);
  });

  it('uses a translucent gold pill so the icon stays readable', () => {
    expect(getTabBarActiveIndicatorColor('light')).toBe(brandA.brandA4);
    expect(getTabBarActiveIndicatorColor('dark')).toBe(brandDarkA.brandA4);
    expect(getTabBarActiveIndicatorColor('light')).not.toBe(
      getTabBarActiveColor('light'),
    );
  });

  it('uses a translucent gold ripple on Android native tabs', () => {
    expect(getTabBarRippleColor('light')).toBe(brandA.brandA5);
    expect(getTabBarRippleColor('dark')).toBe(brandDarkA.brandA5);
  });
});
