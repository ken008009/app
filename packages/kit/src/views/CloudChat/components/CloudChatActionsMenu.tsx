import { useRef, useState } from 'react';

import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Icon, IconButton, SizableText, XStack } from '@onekeyhq/components';
import type { IActionListItemProps } from '@onekeyhq/components/src/actions/ActionList';

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    right: 16,
    width: 220,
    borderRadius: 12,
    backgroundColor: '#292929',
    paddingHorizontal: 16,
  },
});

export function CloudChatActionsMenu({
  items,
}: {
  items: IActionListItemProps[];
}) {
  const [menuTop, setMenuTop] = useState<number>();
  const triggerRef = useRef<View>(null);
  const close = () => setMenuTop(undefined);
  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <IconButton
          variant="tertiary"
          icon="PlusCircleOutline"
          title="更多操作"
          testID="cloud-chat-actions-btn"
          onPress={() =>
            triggerRef.current?.measureInWindow((_x, y, _width, height) =>
              setMenuTop(y + height + 8),
            )
          }
        />
      </View>
      <Modal
        visible={menuTop !== undefined}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityLabel="关闭菜单"
            testID="cloud-chat-menu-dismiss"
          />
          <View style={[styles.menu, { top: menuTop }]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                testID={item.testID}
                onPress={() => {
                  void item.onPress?.(close);
                }}
              >
                <XStack
                  py="$4"
                  gap="$3"
                  alignItems="center"
                  borderBottomWidth={1}
                  borderColor="#444444"
                >
                  {item.icon ? (
                    <Icon name={item.icon} color="white" size="$5" />
                  ) : null}
                  <SizableText color="white" size="$bodyLg">
                    {item.label}
                  </SizableText>
                </XStack>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
