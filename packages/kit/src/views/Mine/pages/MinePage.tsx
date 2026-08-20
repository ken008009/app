import {
  Page,
  ScrollView,
  YStack,
  useSafeAreaInsets,
  useScrollContentTabBarOffset,
} from '@onekeyhq/components';

import { MineMenuItemView } from '../components/MineMenuItemView';
import { MineProfileHeader } from '../components/MineProfileHeader';
import { MineSettingsSection } from '../components/MineSettingsRow';
import { useMineMenuConfig } from '../hooks/useMineMenuConfig';

export function MinePage() {
  const sections = useMineMenuConfig();
  const tabBarOffset = useScrollContentTabBarOffset();
  const { top } = useSafeAreaInsets();

  return (
    <Page>
      <Page.Header headerShown={false} />
      <Page.Body>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            pb: tabBarOffset + 16,
            pt: top + 8,
          }}
        >
          <YStack px="$5">
            <MineProfileHeader />
            {sections.map((section) => (
              <MineSettingsSection key={section.key} title={section.title}>
                {section.items.map((item, itemIdx) => (
                  <MineMenuItemView
                    key={`${section.key}-${item.title}`}
                    item={item}
                    showDivider={itemIdx !== section.items.length - 1}
                  />
                ))}
              </MineSettingsSection>
            ))}
          </YStack>
        </ScrollView>
      </Page.Body>
    </Page>
  );
}
