import { useState } from 'react';

import { Button, Dialog, Input, Toast, YStack } from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '操作失败';
}

export function showCloudChatAddPeerDialog({
  onAdded,
}: {
  onAdded?: () => void;
}) {
  let draft = '';
  const dialog = Dialog.show({
    title: '添加好友',
    description: '输入对方已注册云聊的钱包地址',
    renderContent: (
      <Input
        autoFocus
        testID="cloud-chat-add-peer-input"
        placeholder="0x..."
        onChangeText={(value) => {
          draft = value;
        }}
      />
    ),
    showCancelButton: true,
    onConfirmText: '添加',
    onConfirm: async ({ close }) => {
      try {
        await backgroundApiProxy.serviceCloudChat.addPeer({
          peerUserId: draft,
        });
        Toast.success({ title: '已添加' });
        onAdded?.();
        await close();
      } catch (error) {
        Toast.error({ title: getErrorMessage(error) });
        throw error;
      }
    },
  });
  return dialog;
}

export function showCloudChatRelayDialog({
  currentUrl,
  onSaved,
}: {
  currentUrl: string;
  onSaved?: () => void;
}) {
  function Content() {
    const [url, setUrl] = useState(currentUrl);
    return (
      <YStack gap="$3">
        <Input
          value={url}
          onChangeText={setUrl}
          autoFocus
          testID="cloud-chat-relay-url-input"
        />
        <Button
          size="small"
          variant="tertiary"
          testID="cloud-chat-relay-emulator"
          onPress={() => setUrl('http://10.0.2.2:8000')}
        >
          模拟器：10.0.2.2:8000
        </Button>
        <Button
          size="small"
          variant="tertiary"
          testID="cloud-chat-relay-usb"
          onPress={() => setUrl('http://127.0.0.1:8000')}
        >
          真机 USB：127.0.0.1:8000（需 adb reverse）
        </Button>
        <Button
          size="small"
          variant="tertiary"
          testID="cloud-chat-relay-lan"
          onPress={() => setUrl('http://192.168.3.44:8000')}
        >
          局域网：192.168.3.44:8000
        </Button>
        <Dialog.Footer
          showCancelButton
          onConfirmText="保存"
          onConfirm={async ({ close }) => {
            try {
              await backgroundApiProxy.serviceCloudChat.setApiBaseUrl({
                apiBaseUrl: url,
              });
              Toast.success({ title: '服务地址已更新' });
              onSaved?.();
              await close();
            } catch (error) {
              Toast.error({ title: getErrorMessage(error) });
              throw error;
            }
          }}
        />
      </YStack>
    );
  }

  return Dialog.show({
    title: '云聊服务地址',
    description:
      '填写 HTTP API 根地址。本机 Web/桌面默认 127.0.0.1:8000，Android 模拟器默认 10.0.2.2:8000；同 Wi-Fi 真机再改局域网 IP。',
    showFooter: false,
    renderContent: <Content />,
  });
}
