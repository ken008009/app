import { useMemo } from 'react';

import {
  useCollapsibleStyle,
  useTabsContext,
} from 'react-native-collapsible-tab-view';

/**
 * Collapsible-tab ScrollView contentContainerStyle for Home Portfolio.
 *
 * Library default (allowHeaderOverscroll):
 *   minHeight = containerHeightWithMinHeader + headerHeight
 * That extra `headerHeight` leaves a large empty region under short lists
 * (tokens limit=6 +「显示更多」). Override minHeight to drop the extra
 * headerHeight. Library merges `[libStyle, userStyle]`, so this wins.
 */
export function usePortfolioTabScrollContentStyle(paddingBottom?: number) {
  const { allowHeaderOverscroll, headerHeight } = useTabsContext();
  const { contentContainerStyle: collapsibleStyle } = useCollapsibleStyle();

  return useMemo(() => {
    const libMinHeight = (
      collapsibleStyle as { minHeight?: number } | undefined
    )?.minHeight;
    const minHeight =
      allowHeaderOverscroll &&
      typeof libMinHeight === 'number' &&
      typeof headerHeight === 'number'
        ? Math.max(0, libMinHeight - headerHeight)
        : libMinHeight;

    return {
      paddingBottom: paddingBottom ?? 0,
      ...(typeof minHeight === 'number' ? { minHeight } : null),
    };
  }, [allowHeaderOverscroll, collapsibleStyle, headerHeight, paddingBottom]);
}
