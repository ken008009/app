/**
 * Web: collapsible-tab minHeight override is native-only.
 */
export function usePortfolioTabScrollContentStyle(paddingBottom?: number) {
  return {
    paddingBottom: paddingBottom ?? 0,
  };
}
