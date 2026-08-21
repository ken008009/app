/**
 * Account selector visual tokens — aligned with Home TokenListBlock cards.
 * All values are Tamagui semantic tokens so light/dark follow system theme.
 */
export const AS_GOLD = '$bgAccent';
export const AS_GOLD_BORDER = '$borderSubdued';
export const AS_PAGE_BG = '$bgApp';
export const AS_CARD_BG = '$bg';
export const AS_SELECTED_BG = '$bgActive';
export const AS_PRESS_BG = '$bgHover';
export const AS_DIVIDER = '$borderSubdued';
export const AS_ICON_BG = '$bgSubdued';

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
