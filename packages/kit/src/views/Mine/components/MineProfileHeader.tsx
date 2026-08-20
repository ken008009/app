import { SizableText, YStack } from '@onekeyhq/components';

const PAGE_TITLE = '个人中心';

export function MineProfileHeader() {
  return (
    <YStack ai="center" pt="$1" pb="$4">
      <SizableText size="$headingXl" color="#FFFFFF">
        {PAGE_TITLE}
      </SizableText>
    </YStack>
  );
}
