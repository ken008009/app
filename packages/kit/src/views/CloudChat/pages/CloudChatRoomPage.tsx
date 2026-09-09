import { useCallback, useEffect, useRef, useState } from 'react';

import type { IPageScreenProps, IScrollViewRef } from '@onekeyhq/components';
import {
  Button,
  Dialog,
  Input,
  Page,
  ScrollView,
  SizableText,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useCloudChatAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import type {
  ETabCloudChatRoutes,
  ITabCloudChatParamList,
} from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import type { ICloudChatMessage } from '@onekeyhq/shared/types/cloudChat';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return '发送失败';
}

export function CloudChatRoomPage({
  route,
}: IPageScreenProps<ITabCloudChatParamList, ETabCloudChatRoutes.Conversation>) {
  const { peerUserId } = route.params;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatState] = useCloudChatAtom();
  const scrollRef = useRef<IScrollViewRef | null>(null);
  const scope = `${chatState.apiBaseUrl}\n${chatState.selfUserId}`;

  const { result: response, run } = usePromiseResult(
    async () => {
      if (!chatState.selfUserId) return undefined;
      const conversation =
        await backgroundApiProxy.serviceCloudChat.getConversation({
          peerUserId,
        });
      return { scope, conversation };
    },
    [peerUserId, chatState.selfUserId, scope],
    { checkIsFocused: false },
  );
  const result = response?.scope === scope ? response.conversation : undefined;

  useEffect(() => {
    if (chatState.selfUserId) {
      void backgroundApiProxy.serviceCloudChat
        .markRead({ peerUserId })
        .catch(() => undefined);
    }
  }, [peerUserId, chatState.selfUserId, result?.unreadCount]);

  useEffect(() => {
    const onUpdated = () => {
      void run();
    };
    appEventBus.on(EAppEventBusNames.CloudChatUpdated, onUpdated);
    return () => {
      appEventBus.off(EAppEventBusNames.CloudChatUpdated, onUpdated);
    };
  }, [run]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [result?.messages.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !chatState.signalReady || !chatState.loggedIn) {
      return;
    }
    setSending(true);
    try {
      await backgroundApiProxy.serviceCloudChat.sendMessage({
        peerUserId,
        text,
      });
      setDraft('');
      await run();
    } catch (error) {
      Toast.error({ title: getErrorMessage(error) });
    } finally {
      setSending(false);
    }
  }, [draft, peerUserId, run, chatState.signalReady, chatState.loggedIn]);

  const messages = result?.messages.every(
    (message) =>
      message.from === chatState.selfUserId ||
      message.to === chatState.selfUserId,
  )
    ? result.messages
    : [];

  return (
    <Page>
      <Page.Header
        title={accountUtils.shortenAddress({ address: peerUserId })}
      />
      <Page.Body>
        <YStack px="$4" gap="$2">
          <SizableText size="$bodySm" color="$textSubdued">
            {chatState.signalReady
              ? '端对端加密 · 首次联系请通过其他可信渠道核对安全指纹'
              : '加密未就绪，请返回云聊重新连接'}
          </SizableText>
          {chatState.lastError ? (
            <SizableText size="$bodySm" color="$textCritical">
              {chatState.lastError}
            </SizableText>
          ) : null}
          <Button
            size="small"
            testID="cloud-chat-fingerprints"
            onPress={async () => {
              try {
                const fingerprints =
                  await backgroundApiProxy.serviceCloudChat.getFingerprints({
                    peerUserId,
                  });
                Dialog.show({
                  title: '核对安全指纹',
                  description: `我的：${fingerprints.self}\n对方：${fingerprints.peer || '尚未建立会话'}\n请与对方通过可信渠道逐项核对。`,
                });
              } catch (error) {
                Toast.error({ title: getErrorMessage(error) });
              }
            }}
          >
            安全指纹
          </Button>
          {messages.some((message) => message.status === 'failed') ? (
            <Button
              size="small"
              testID="cloud-chat-retry"
              onPress={async () => {
                try {
                  await backgroundApiProxy.serviceCloudChat.retryMessages({
                    peerUserId,
                  });
                } catch (error) {
                  Toast.error({ title: getErrorMessage(error) });
                }
              }}
            >
              重试失败消息（不会重置密钥）
            </Button>
          ) : null}
        </YStack>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ p: '$4', pb: '$2' }}
        >
          <YStack gap="$2">
            {messages.length === 0 ? (
              <SizableText
                size="$bodyMd"
                color="$textSubdued"
                textAlign="center"
                py="$10"
              >
                还没有消息，发一条试试
              </SizableText>
            ) : (
              messages.map((item: ICloudChatMessage) => {
                const isSelf = item.from === chatState.selfUserId;
                return (
                  <XStack
                    key={item.id}
                    justifyContent={isSelf ? 'flex-end' : 'flex-start'}
                  >
                    <YStack
                      maxWidth="80%"
                      px="$3"
                      py="$2"
                      borderRadius="$3"
                      bg={isSelf ? '$bgAccent' : '$bgSubdued'}
                    >
                      <SizableText
                        size="$bodyMd"
                        color={isSelf ? '$textInverse' : '$text'}
                      >
                        {item.text}
                      </SizableText>
                      {isSelf ? (
                        <SizableText size="$bodySm" color="$textInverse">
                          {
                            {
                              local: '待发送（会自动重试）',
                              failed: '发送被拒绝，请检查后重试',
                              sent: '已提交服务器',
                              received: '已接收',
                            }[item.status]
                          }
                        </SizableText>
                      ) : null}
                    </YStack>
                  </XStack>
                );
              })
            )}
          </YStack>
        </ScrollView>
      </Page.Body>
      <Page.Footer>
        <XStack p="$3" gap="$2" alignItems="center">
          <Input
            flex={1}
            value={draft}
            onChangeText={setDraft}
            placeholder="输入消息"
            testID="cloud-chat-message-input"
            onSubmitEditing={() => {
              void handleSend();
            }}
          />
          <Button
            variant="primary"
            testID="cloud-chat-send-btn"
            disabled={
              sending ||
              !draft.trim() ||
              !chatState.signalReady ||
              !chatState.loggedIn
            }
            onPress={() => {
              void handleSend();
            }}
          >
            发送
          </Button>
        </XStack>
      </Page.Footer>
    </Page>
  );
}

export default CloudChatRoomPage;
