/**
 * Secondary-build product brand shown in UI (launcher name, titles, i18n).
 * Do NOT use for package ids, API hosts, DB verify strings, or npm scopes.
 */
export const APP_BRAND_NAME = 'MS';

/** Longer product label when "OneKey Wallet" appears in copy. */
export const APP_DISPLAY_NAME = 'MS';

/**
 * Rewrite legacy OneKey brand tokens in user-visible strings.
 * Longer phrase first so "OneKey Wallet" does not become "MS Wallet".
 */
export function replaceAppBrandInText(text: string): string {
  if (!text || !/onekey/i.test(text)) {
    return text;
  }
  return text
    .replace(/OneKey Wallet/g, APP_DISPLAY_NAME)
    .replace(/ONEKEY WALLET/g, APP_DISPLAY_NAME)
    .replace(/onekey wallet/gi, APP_DISPLAY_NAME)
    .replace(/OneKey/g, APP_BRAND_NAME)
    .replace(/ONEKEY/g, APP_BRAND_NAME);
}

export function applyAppBrandToLocaleMessages<T extends Record<string, string>>(
  messages: T,
): T {
  const next = { ...messages };
  for (const key of Object.keys(next)) {
    const value = next[key];
    if (typeof value === 'string' && /onekey/i.test(value)) {
      next[key as keyof T] = replaceAppBrandInText(value) as T[keyof T];
    }
  }
  return next;
}
