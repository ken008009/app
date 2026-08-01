import {
  APP_BRAND_NAME,
  APP_DISPLAY_NAME,
  applyAppBrandToLocaleMessages,
  replaceAppBrandInText,
} from './appBrand';

describe('appBrand', () => {
  it('exposes MS brand constants', () => {
    expect(APP_BRAND_NAME).toBe('MS');
    expect(APP_DISPLAY_NAME).toBe('MS');
  });

  it('rewrites OneKey Wallet before OneKey', () => {
    expect(replaceAppBrandInText('About OneKey Wallet')).toBe('About MS');
    expect(replaceAppBrandInText('OneKey')).toBe('MS');
    expect(replaceAppBrandInText('ONEKEY')).toBe('MS');
  });

  it('leaves unrelated strings and urls untouched', () => {
    expect(replaceAppBrandInText('hello')).toBe('hello');
    expect(replaceAppBrandInText('https://onekey.so')).toBe(
      'https://onekey.so',
    );
  });

  it('rewrites locale message values containing the brand', () => {
    expect(
      applyAppBrandToLocaleMessages({
        a: 'OneKey Wallet',
        b: 'plain',
        c: 'Use OneKey now',
      }),
    ).toEqual({
      a: 'MS',
      b: 'plain',
      c: 'Use MS now',
    });
  });
});
