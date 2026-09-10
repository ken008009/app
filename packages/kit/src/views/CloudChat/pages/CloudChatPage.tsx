import { useCallback, useEffect, useState } from 'react';

import { useFocusEffect } from '@react-navigation/core';

import {
  Button,
  Empty,
  Icon,
  IconButton,
  Input,
  ListView,
  Page,
  SizableText,
  Toast,
  XStack,
  YStack,
  useClipboard,
  useScrollContentTabBarOffset,
} from '@onekeyhq/components';
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { AccountSelectorProviderMirror } from '@onekeyhq/kit/src/components/AccountSelector';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { TabPageHeader } from '@onekeyhq/kit/src/components/TabPageHeader';
import useAppNavigation from '@onekeyhq/kit/src/hooks/useAppNavigation';
import { useHandleAppStateActive } from '@onekeyhq/kit/src/hooks/useHandleAppStateActive';
import { useNetworkRestore } from '@onekeyhq/kit/src/hooks/useNetworkRestore';
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';
import { useActiveAccount } from '@onekeyhq/kit/src/states/jotai/contexts/accountSelector';
import useScanQrCodeLazy from '@onekeyhq/kit/src/views/ScanQrCode/hooks/useScanQrCodeLazy';
import { useCloudChatAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { OneKeyErrorScanQrCodeCancel } from '@onekeyhq/shared/src/errors';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { ETabCloudChatRoutes, ETabRoutes } from '@onekeyhq/shared/src/routes';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { sanitizeCloudChatErrorMessage } from '@onekeyhq/shared/src/utils/cloudChatUtils';
import { formatTime } from '@onekeyhq/shared/src/utils/dateUtils';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';
import type { ICloudChatConversation } from '@onekeyhq/shared/types/cloudChat';

import { CloudChatActionsMenu } from '../components/CloudChatActionsMenu';
import {
  showCloudChatAddPeerDialog,
  showCloudChatRelayDialog,
} from '../components/cloudChatDialogs';
import { useCloudChatAutoConnect } from '../hooks/useCloudChatAutoConnect';
import { useCloudChatEvmAccount } from '../hooks/useCloudChatEvmAccount';

const CLOUD_CHAT_TITLE = '云聊';
const EMPTY_CONVERSATIONS: ICloudChatConversation[] = [];
const CLOUD_CHAT_ACCOUNT_SELECTOR_ENABLED_NUM = [0];
const CLOUD_CHAT_ACCOUNT_SELECTOR_CONFIG = {
  sceneName: EAccountSelectorSceneName.home,
  sceneUrl: '',
};

function formatMessageTime(timestamp: number): string {
  if (!timestamp) {
    return '';
  }
  return formatTime(new Date(timestamp), { hideSeconds: true });
}

function getStatusLabel(params: {
  connecting: boolean;
  loggedIn: boolean;
  connected: boolean;
  signalReady: boolean;
  lastError?: string;
}): string {
  if (params.connecting) {
    return '连接中';
  }
  if (params.lastError) {
    return sanitizeCloudChatErrorMessage(params.lastError, '未连接');
  }
  if (params.loggedIn && params.connected) {
    return params.signalReady ? '加密已就绪' : '已登录，准备加密中';
  }
  return '未连接';
}

function getCloudChatAddressLabel({
  hasAccount,
  resolving,
  address,
  error,
}: {
  hasAccount: boolean;
  resolving: boolean;
  address: string;
  error?: string;
}): string {
  if (!hasAccount) {
    return '未选择账户';
  }
  if (resolving) {
    return '正在获取 EVM 地址';
  }
  if (address) {
    return accountUtils.shortenAddress({ address });
  }
  return error || '请切换到 Ethereum 或 BSC 账户';
}

function getCloudChatEmptyCopy({
  hasAccount,
  resolving,
  hasEvmAddress,
  loggedIn,
  connecting,
  error,
}: {
  hasAccount: boolean;
  resolving: boolean;
  hasEvmAddress: boolean;
  loggedIn: boolean;
  connecting: boolean;
  error?: string;
}): { title: string; description: string } {
  if (!hasAccount) {
    return {
      title: '请先创建钱包',
      description: '云聊使用当前钱包的 Ethereum 地址作为身份',
    };
  }
  if (resolving) {
    return {
      title: '正在获取 EVM 地址',
      description: '首页默认是全部网络，正在解析真实 EVM 地址',
    };
  }
  if (!hasEvmAddress) {
    return {
      title: error || '需要 EVM 账户',
      description: error || '请切换到 Ethereum 或 BSC 账户',
    };
  }
  if (loggedIn) {
    return {
      title: '还没有会话',
      description: '添加对方已注册的钱包地址开始聊天',
    };
  }
  if (connecting) {
    return {
      title: '正在连接钱包',
      description: '正在使用当前钱包连接，请完成必要的钱包授权',
    };
  }
  return {
    title: '尚未连接',
    description: error || '将自动使用当前钱包连接云聊',
  };
}

function getCloudChatEmptyButtonProps({
  hasEvmAddress,
  loggedIn,
  connecting,
  onReconnect,
  onAddPeer,
}: {
  hasEvmAddress: boolean;
  loggedIn: boolean;
  connecting: boolean;
  onReconnect: () => void | Promise<void>;
  onAddPeer: () => void;
}): { children: string; onPress: () => void } | undefined {
  if (!hasEvmAddress) {
    return undefined;
  }
  if (loggedIn) {
    return {
      children: '添加好友',
      onPress: onAddPeer,
    };
  }
  if (connecting) {
    return undefined;
  }
  return {
    children: '连接云聊',
    onPress: () => {
      void onReconnect();
    },
  };
}

function CloudChatPageContent() {
  useCloudChatAutoConnect();
  const tabBarOffset = useScrollContentTabBarOffset();
  const navigation = useAppNavigation();
  const { copyText } = useClipboard();
  const {
    activeAccount: { account, network, indexedAccount },
  } = useActiveAccount({ num: 0 });
  const [chatState] = useCloudChatAtom();
  const { restoreNonce } = useNetworkRestore();
  const refreshTransport = useCallback(() => {
    void backgroundApiProxy.serviceCloudChat.refresh().catch(() => undefined);
  }, []);
  useHandleAppStateActive(refreshTransport);
  useEffect(() => {
    if (restoreNonce > 0) refreshTransport();
  }, [restoreNonce, refreshTransport]);
  const accountId = account?.id ?? '';
  const networkId = network?.id ?? '';
  const indexedAccountId = indexedAccount?.id;
  const rawAddress = account?.address ?? '';

  const { result, run } = usePromiseResult(
    async () => backgroundApiProxy.serviceCloudChat.getSnapshot(),
    [],
    { initResult: undefined, checkIsFocused: false },
  );

  const evmAuthResult = useCloudChatEvmAccount({
    accountId,
    networkId,
    address: rawAddress,
    indexedAccountId,
  });

  const evmAccountId =
    evmAuthResult.status === 'ready' ? evmAuthResult.accountId : '';
  const evmNetworkId =
    evmAuthResult.status === 'ready' ? evmAuthResult.networkId : '';
  const selfAddress =
    evmAuthResult.status === 'ready' ? evmAuthResult.address : '';
  const resolvingEvmAddress =
    Boolean(accountId) &&
    evmAuthResult.status !== 'ready' &&
    evmAuthResult.status !== 'error';
  const evmAddressError =
    evmAuthResult.status === 'error'
      ? sanitizeCloudChatErrorMessage(
          evmAuthResult.message,
          '请切换到 Ethereum 或 BSC 账户',
        )
      : undefined;
  const addressLabel = getCloudChatAddressLabel({
    hasAccount: Boolean(accountId),
    resolving: resolvingEvmAddress,
    address: selfAddress,
    error: evmAddressError,
  });

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
    if (!selfAddress || !evmAccountId || !evmNetworkId) {
      return;
    }
    void backgroundApiProxy.serviceCloudChat
      .resumeSession({
        accountId: evmAccountId,
        networkId: evmNetworkId,
        address: selfAddress,
        indexedAccountId,
        autoLogin: true,
      })
      .catch((error) => {
        const message = sanitizeCloudChatErrorMessage(
          error instanceof Error ? error.message : undefined,
        );
        Toast.error({ title: message });
      });
  }, [evmAccountId, evmNetworkId, indexedAccountId, selfAddress]);

  useFocusEffect(
    useCallback(() => {
      void backgroundApiProxy.serviceCloudChat.refresh().catch(() => undefined);
      void run();
    }, [run]),
  );

  const handleCopyId = useCallback(() => {
    if (!selfAddress) {
      Toast.error({
        title: evmAddressError || '请先创建或导入 EVM 钱包',
      });
      return;
    }
    copyText(selfAddress);
  }, [copyText, evmAddressError, selfAddress]);

  const handleReconnect = useCallback(async () => {
    if (!selfAddress || !evmAccountId || !evmNetworkId) {
      Toast.error({
        title: evmAddressError || '请先选择一个 EVM 钱包账户',
      });
      return;
    }
    try {
      await backgroundApiProxy.serviceCloudChat.login({
        accountId: evmAccountId,
        networkId: evmNetworkId,
        address: selfAddress,
        indexedAccountId,
      });
      await run();
    } catch (error) {
      const message = sanitizeCloudChatErrorMessage(
        error instanceof Error ? error.message : undefined,
      );
      Toast.error({ title: message });
    }
  }, [
    evmAccountId,
    evmAddressError,
    evmNetworkId,
    indexedAccountId,
    run,
    selfAddress,
  ]);

  const handleLogout = useCallback(async () => {
    try {
      await backgroundApiProxy.serviceCloudChat.disconnect();
      await run();
    } catch (error) {
      const message = sanitizeCloudChatErrorMessage(
        error instanceof Error ? error.message : undefined,
        '退出失败',
      );
      Toast.error({ title: message });
    }
  }, [run]);

  const handleAddPeer = useCallback(() => {
    showCloudChatAddPeerDialog({
      onAdded: () => {
        void run();
      },
    });
  }, [run]);

  const [activeFilter, setActiveFilter] = useState<'all' | 'private'>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const scanQrCode = useScanQrCodeLazy();
  const handleScan = useCallback(async () => {
    try {
      const scanned = await scanQrCode.start({
        handlers: [],
        autoExecuteParsedAction: false,
      });
      if (scanned?.raw) {
        showCloudChatAddPeerDialog({
          initialAddress: scanned.raw.trim(),
          onAdded: () => {
            void run();
          },
        });
      }
    } catch (error) {
      if (error instanceof OneKeyErrorScanQrCodeCancel) {
        return;
      }
      Toast.error({ title: '未完成扫码，请重试或手动输入地址' });
    }
  }, [run, scanQrCode]);

  const handleRelay = useCallback(() => {
    showCloudChatRelayDialog({
      currentUrl: result?.apiBaseUrl || chatState.apiBaseUrl,
      onSaved: () => {
        void run();
      },
    });
  }, [chatState.apiBaseUrl, result?.apiBaseUrl, run]);

  const handleOpenConversation = useCallback(
    (item: ICloudChatConversation) => {
      navigation.push(ETabCloudChatRoutes.Conversation, {
        peerUserId: item.peerUserId,
      });
    },
    [navigation],
  );

  const conversations =
    result?.selfUserId === chatState.selfUserId &&
    result?.apiBaseUrl === chatState.apiBaseUrl
      ? result.conversations
      : EMPTY_CONVERSATIONS;
  const { connected, connecting, loggedIn, lastError } = chatState;
  const apiBaseUrl = result?.apiBaseUrl || chatState.apiBaseUrl;
  const statusLabel = getStatusLabel({
    connecting,
    loggedIn,
    connected,
    signalReady: chatState.signalReady,
    lastError,
  });
  const emptyCopy = getCloudChatEmptyCopy({
    hasAccount: Boolean(accountId),
    resolving: resolvingEvmAddress,
    hasEvmAddress: Boolean(selfAddress),
    loggedIn,
    connecting,
    error: evmAddressError,
  });
  const emptyButtonProps = getCloudChatEmptyButtonProps({
    hasEvmAddress: Boolean(selfAddress),
    loggedIn,
    connecting,
    onReconnect: handleReconnect,
    onAddPeer: handleAddPeer,
  });

  return (
    <Page>
      <TabPageHeader
        sceneName={EAccountSelectorSceneName.home}
        tabRoute={ETabRoutes.CloudChat}
        hideSearch
        customHeaderLeftItems={
          <SizableText size="$headingXl">{CLOUD_CHAT_TITLE}</SizableText>
        }
        customHeaderRightItems={
          <XStack gap="$2">
            <IconButton
              variant="tertiary"
              icon="SearchOutline"
              title="搜索会话"
              testID="cloud-chat-search-btn"
              onPress={() => {
                setShowSearch((value) => !value);
                setSearch('');
              }}
            />
            <CloudChatActionsMenu
              items={[
                {
                  label: '发起群聊 · 即将开放',
                  icon: 'ChatOutline',
                  onPress: (close) => {
                    close();
                    Toast.message({ title: '群聊功能即将开放' });
                  },
                },
                {
                  label: '发起直播 · 即将开放',
                  icon: 'MicOutline',
                  onPress: (close) => {
                    close();
                    Toast.message({ title: '直播功能即将开放' });
                  },
                },
                {
                  label: '添加朋友',
                  icon: 'PeopleOutline',
                  testID: 'cloud-chat-add-peer-btn',
                  onPress: (close) => {
                    close();
                    handleAddPeer();
                  },
                },
                {
                  label: '扫一扫',
                  icon: 'ScanOutline',
                  testID: 'cloud-chat-scan-btn',
                  onPress: (close) => {
                    close();
                    void handleScan();
                  },
                },
              ]}
            />
          </XStack>
        }
      />
      <Page.Body>
        <YStack flex={1} pb={tabBarOffset}>
          <XStack
            px="$5"
            py="$3"
            gap="$3"
            alignItems="center"
            borderBottomWidth="$px"
            borderColor="$borderSubdued"
          >
            <IconButton
              icon="SettingsOutline"
              variant="tertiary"
              title="账户与连接详情"
              testID="cloud-chat-details-btn"
              onPress={() => setShowDetails((value) => !value)}
            />
            {(['all', 'private'] as const).map((filter) => (
              <Button
                key={filter}
                size="small"
                borderRadius="$full"
                minWidth="$20"
                variant={activeFilter === filter ? 'primary' : 'secondary'}
                testID={`cloud-chat-filter-${filter}`}
                onPress={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? '全部' : '私信'}
              </Button>
            ))}
          </XStack>
          {showSearch ? (
            <YStack px="$5" py="$3">
              <Input
                autoFocus
                value={search}
                onChangeText={setSearch}
                placeholder="搜索钱包地址或消息"
                testID="cloud-chat-search-input"
              />
            </YStack>
          ) : null}
          {!showDetails && (!loggedIn || lastError) ? (
            <SizableText px="$5" py="$2" size="$bodySm" color="$textSubdued">
              {statusLabel}
            </SizableText>
          ) : null}
          {!loggedIn ? (
            <Button
              mx="$5"
              mb="$2"
              size="small"
              testID="cloud-chat-connect-btn"
              loading={connecting}
              disabled={connecting || !selfAddress}
              onPress={() => {
                void handleReconnect();
              }}
            >
              {connecting ? '正在连接云聊' : '连接云聊'}
            </Button>
          ) : null}
          {showDetails ? (
            <YStack px="$5" py="$3" gap="$2" bg="$bgSubdued">
              <XStack justifyContent="space-between" alignItems="center">
                <SizableText size="$bodyMd" color="$textSubdued">
                  {statusLabel}
                </SizableText>
                {loggedIn ? (
                  <Button
                    size="small"
                    variant="tertiary"
                    testID="cloud-chat-logout-btn"
                    onPress={() => {
                      void handleLogout();
                    }}
                  >
                    退出
                  </Button>
                ) : null}
              </XStack>
              <Button
                size="small"
                variant="tertiary"
                testID="cloud-chat-relay-url"
                onPress={handleRelay}
              >
                {apiBaseUrl || '未设置服务地址'}
              </Button>
              <XStack alignItems="center" gap="$2">
                <SizableText size="$bodyMd" flex={1} numberOfLines={1}>
                  我的地址：{addressLabel}
                </SizableText>
                <Button
                  size="small"
                  variant="tertiary"
                  testID="cloud-chat-copy-id"
                  disabled={!selfAddress}
                  onPress={handleCopyId}
                >
                  复制
                </Button>
              </XStack>
              {loggedIn ? (
                <SizableText size="$bodySm" color="$textSubdued">
                  {chatState.signalReady
                    ? '加密私聊已就绪。首次联系请在会话中核对安全指纹。消息保存在本机，清除应用数据后无法恢复。'
                    : '钱包已登录，正在准备加密设备；如遇错误请检查提示并重新连接。'}
                </SizableText>
              ) : (
                <SizableText size="$bodySm" color="$textSubdued">
                  自动使用当前钱包连接，必要时请完成钱包授权。
                </SizableText>
              )}
            </YStack>
          ) : null}
          <ListView
            data={conversations.filter(
              (item) =>
                !search.trim() ||
                `${item.peerUserId} ${item.lastMessagePreview}`
                  .toLowerCase()
                  .includes(search.trim().toLowerCase()),
            )}
            estimatedItemSize={72}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ pb: '$6' }}
            ListEmptyComponent={
              <Empty
                icon="ChatOutline"
                title={search.trim() ? '没有找到会话' : emptyCopy.title}
                description={
                  search.trim()
                    ? '试试其他地址或消息关键词'
                    : emptyCopy.description
                }
                buttonProps={search.trim() ? undefined : emptyButtonProps}
              />
            }
            renderItem={({ item }) => (
              <ListItem
                minHeight="$20"
                renderAvatar={
                  <YStack
                    width="$12"
                    height="$12"
                    borderRadius="$3"
                    bg="$bgStrong"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Icon name="ChatOutline" size="$6" color="$iconActive" />
                  </YStack>
                }
                title={accountUtils.shortenAddress({
                  address: item.peerUserId,
                })}
                subtitle={item.lastMessagePreview || '端对端加密私聊'}
                onPress={() => handleOpenConversation(item)}
              >
                <YStack alignItems="flex-end" gap="$1">
                  <SizableText size="$bodySm" color="$textSubdued">
                    {formatMessageTime(item.lastMessageAt)}
                  </SizableText>
                  {item.unreadCount > 0 ? (
                    <SizableText
                      size="$bodySmMedium"
                      color="$textOnColor"
                      bg="$bgCriticalStrong"
                      px="$1.5"
                      borderRadius="$full"
                    >
                      {item.unreadCount > 99 ? '99+' : item.unreadCount}
                    </SizableText>
                  ) : null}
                </YStack>
              </ListItem>
            )}
          />
        </YStack>
      </Page.Body>
    </Page>
  );
}

export function CloudChatPage() {
  return (
    <AccountSelectorProviderMirror
      config={CLOUD_CHAT_ACCOUNT_SELECTOR_CONFIG}
      enabledNum={CLOUD_CHAT_ACCOUNT_SELECTOR_ENABLED_NUM}
    >
      <CloudChatPageContent />
    </AccountSelectorProviderMirror>
  );
}
