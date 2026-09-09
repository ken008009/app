import { getNetworkIdsMap } from '../config/networkIds';
import { ALL_NETWORK_ACCOUNT_MOCK_ADDRESS } from '../consts/addresses';

import {
  buildCloudChatConversationId,
  previewCloudChatText,
  resolveCloudChatApiBaseUrl,
  sanitizeCloudChatErrorMessage,
  shouldAutoLoginCloudChat,
  shouldResolveCloudChatEvmAccount,
} from './cloudChatUtils';

describe('cloudChatUtils conversation helpers', () => {
  it('builds a stable conversation id regardless of order', () => {
    const a = buildCloudChatConversationId({
      selfUserId: '0xAAA',
      peerUserId: '0xbbb',
    });
    const b = buildCloudChatConversationId({
      selfUserId: '0xBBB',
      peerUserId: '0xaaa',
    });
    expect(a).toBe(b);
    expect(a).toBe('0xaaa::0xbbb');
  });

  it('previews long messages', () => {
    expect(previewCloudChatText('hello')).toBe('hello');
    expect(previewCloudChatText('a'.repeat(40)).endsWith('…')).toBe(true);
  });

  it('resolves a saved URL before the default', () => {
    expect(
      resolveCloudChatApiBaseUrl({ savedUrl: 'http://example.com/' }),
    ).toBe('http://example.com');
  });

  it('defaults to loopback on desktop and the emulator alias on Android', () => {
    expect(resolveCloudChatApiBaseUrl({ isNativeAndroid: false })).toBe(
      'http://127.0.0.1:8000',
    );
    expect(resolveCloudChatApiBaseUrl({ isNativeAndroid: true })).toBe(
      'http://10.0.2.2:8000',
    );
  });

  it('auto-logs in only when resume failed and logout did not block it', () => {
    expect(
      shouldAutoLoginCloudChat({
        forceLogin: false,
        autoLogin: true,
        blockedUntilManual: false,
        hasResumedSession: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoLoginCloudChat({
        forceLogin: false,
        autoLogin: true,
        blockedUntilManual: false,
        hasResumedSession: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoLoginCloudChat({
        forceLogin: false,
        autoLogin: true,
        blockedUntilManual: true,
        hasResumedSession: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoLoginCloudChat({
        forceLogin: true,
        autoLogin: false,
        blockedUntilManual: true,
        hasResumedSession: false,
      }),
    ).toBe(true);
  });

  it('resolves All Networks mock identity to a real EVM account', () => {
    expect(
      shouldResolveCloudChatEvmAccount({
        address: ALL_NETWORK_ACCOUNT_MOCK_ADDRESS,
        networkId: 'evm--1',
      }),
    ).toBe(true);
    expect(
      shouldResolveCloudChatEvmAccount({
        address: '0xabc',
        networkId: getNetworkIdsMap().onekeyall,
      }),
    ).toBe(true);
    expect(
      shouldResolveCloudChatEvmAccount({
        address: '0xabc',
        networkId: 'evm--1',
      }),
    ).toBe(false);
  });

  it('hides background-bridge errors from the chat UI', () => {
    expect(
      sanitizeCloudChatErrorMessage(
        'DApp Provider or Background method not support (method=serviceCloudChat.INTERNAL_resolveEvmAuthAccount), try to add method decorators @backgroundMethod() or @providerApiMethod()',
      ),
    ).toBe('登录云聊失败');
    expect(sanitizeCloudChatErrorMessage('云聊需要 EVM 钱包账户')).toBe(
      '云聊需要 EVM 钱包账户',
    );
  });
});
