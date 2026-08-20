// Visual tokens aligned with Home TokenListBlock card style (homeTheme).
export const AS_GOLD = '#D5AC4C';
export const AS_GOLD_BORDER = 'rgba(213,172,76,0.45)';
export const AS_PAGE_BG = '#0F0F0F';
export const AS_CARD_BG = '#1C1C1C';
export const AS_SELECTED_BG = 'rgba(213,172,76,0.16)';
export const AS_PRESS_BG = 'rgba(213,172,76,0.10)';
export const AS_DIVIDER = 'rgba(213,172,76,0.16)';
export const AS_ICON_BG = '#0F0F0F';

/** Mirrors TokenListItem HOME_TOKEN_CARD_ITEM_PROPS */
export const AS_ACCOUNT_CARD_ITEM_PROPS = {
  mx: '$4',
  px: '$3.5',
  py: '$3.5',
  mb: '$2.5',
  bg: AS_CARD_BG,
  borderWidth: 1,
  borderColor: AS_GOLD_BORDER,
  borderRadius: '$4',
} as const;

/** Mirrors TokenListItem HOME_TOKEN_ICON_RING_PROPS */
export const AS_ACCOUNT_AVATAR_RING_PROPS = {
  borderWidth: 1.5,
  borderColor: AS_GOLD,
  borderRadius: '$full',
  p: '$0.5',
} as const;

/** Card row + bottom margin; keep in sync with AS_ACCOUNT_CARD_ITEM_PROPS */
export const AS_ACCOUNT_LIST_ITEM_HEIGHT = 80;
