import type { ReactNode } from 'react';

import { StyleSheet } from 'react-native';

import {
  Icon,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import type { IKeyOfIcons } from '@onekeyhq/components';

import {
  MINE_CARD_BG,
  MINE_DIVIDER,
  MINE_GOLD,
  MINE_GOLD_BORDER,
  MINE_ICON_BG,
} from '../mineTheme';

export function MineSettingsRow({
  icon,
  title,
  subtitle,
  onPress,
  showDivider = false,
}: {
  icon: IKeyOfIcons;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <>
      <XStack
        px="$4"
        py="$3.5"
        ai="center"
        gap="$3.5"
        onPress={onPress}
        pressStyle={{ opacity: 0.72 }}
      >
        <Stack
          w={40}
          h={40}
          borderRadius="$full"
          bg={MINE_ICON_BG}
          ai="center"
          jc="center"
        >
          <Icon name={icon} size="$6" color={MINE_GOLD} />
        </Stack>
        <YStack flex={1} minWidth={0}>
          <SizableText size="$bodyLgMedium" color="#FFFFFF">
            {title}
          </SizableText>
          {subtitle ? (
            <SizableText size="$bodyMd" color="$textSubdued" mt="$0.5">
              {subtitle}
            </SizableText>
          ) : null}
        </YStack>
        <Icon name="ChevronRightSmallOutline" size="$5" color={MINE_GOLD} />
      </XStack>
      {showDivider ? (
        <Stack
          h={StyleSheet.hairlineWidth}
          bg={MINE_DIVIDER}
          ml={70}
          mr="$4"
        />
      ) : null}
    </>
  );
}

export function MineSettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <YStack mb="$5">
      <SizableText size="$bodyMd" color="$textSubdued" px="$1" mb="$2">
        {title}
      </SizableText>
      <YStack
        bg={MINE_CARD_BG}
        borderRadius="$4"
        borderWidth={StyleSheet.hairlineWidth}
        borderColor={MINE_GOLD_BORDER}
        overflow="hidden"
      >
        {children}
      </YStack>
    </YStack>
  );
}
