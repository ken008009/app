import { Icon, SizableText, Stack, YStack } from '@onekeyhq/components';
import type { IKeyOfIcons } from '@onekeyhq/components';
import type { ITabBarItemProps } from '@onekeyhq/components/src/composite/Tabs/TabBar';

import {
  HOME_CIRCLE_BUTTON_SIZE,
  HOME_GOLD,
  HOME_TAB_ACTIVE_TEXT,
  HOME_TAB_INACTIVE_TEXT,
} from '../homeTheme';

export function HomeInnerTabBarItem({
  name,
  isFocused,
  onPress,
  testID,
}: ITabBarItemProps) {
  return (
    <YStack
      testID={testID}
      ai="center"
      jc="center"
      px="$3.5"
      py="$1.5"
      borderRadius="$full"
      bg={isFocused ? HOME_GOLD : 'transparent'}
      onPress={() => onPress(name)}
      cursor="default"
      zIndex={1}
    >
      <SizableText
        size="$bodyLgMedium"
        color={isFocused ? HOME_TAB_ACTIVE_TEXT : HOME_TAB_INACTIVE_TEXT}
        userSelect="none"
      >
        {name}
      </SizableText>
    </YStack>
  );
}

export function HomeCircleIconButton({
  icon,
  onPress,
  testID,
}: {
  icon: IKeyOfIcons;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Stack
      testID={testID}
      onPress={onPress}
      width={HOME_CIRCLE_BUTTON_SIZE}
      height={HOME_CIRCLE_BUTTON_SIZE}
      borderRadius="$full"
      borderWidth={1}
      borderColor={HOME_GOLD}
      alignItems="center"
      justifyContent="center"
      pressStyle={{ opacity: 0.7 }}
      cursor="pointer"
    >
      <Icon name={icon} size="$5" color={HOME_GOLD} />
    </Stack>
  );
}
