import { cloudChatNative } from '@onekeyhq/shared/src/cloudChat/signal';

import { cloudChatAtom } from '../../states/jotai/atoms/cloudChat';
import ServiceCloudChat from '../ServiceCloudChat';

import { CloudChatHttpClient } from './CloudChatHttpClient';

jest.mock('@onekeyhq/shared/src/background/backgroundDecorators', () => ({
  backgroundClass: () => (target: unknown) => target,
  backgroundMethod: () => () => undefined,
}));
jest.mock('../ServiceBase', () => ({
  __esModule: true,
  default: class {
    backgroundApi: unknown;
    constructor({ backgroundApi }: { backgroundApi: unknown }) {
      this.backgroundApi = backgroundApi;
    }
  },
}));
jest.mock('@onekeyhq/shared/src/cloudChat/signal', () => ({
  cloudChatNative: jest.fn(),
}));
jest.mock('@onekeyhq/shared/src/utils/networkUtils', () => ({
  __esModule: true,
  default: { isEvmNetwork: () => true, isAllNetwork: () => false },
}));
jest.mock('@onekeyhq/shared/src/eventBus/appEventBus', () => ({
  EAppEventBusNames: { CloudChatUpdated: 'update' },
  appEventBus: { emit: jest.fn() },
}));
jest.mock('../../states/jotai/atoms/cloudChat', () => ({
  cloudChatAtom: { get: jest.fn(), set: jest.fn() },
}));

describe('CloudChat account isolation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (cloudChatAtom.get as jest.Mock).mockResolvedValue({});
    (cloudChatAtom.set as jest.Mock).mockResolvedValue(undefined);
    (cloudChatNative as jest.Mock).mockImplementation(
      async (_scope: string, operation: string) =>
        operation === 'registration' ? 123 : null,
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('discards an old signature result before submitting auth after switching wallets', async () => {
    const a = {
      accountId: 'wallet-a',
      networkId: 'evm--1',
      address: `0x${'1'.repeat(40)}`,
    };
    const b = {
      accountId: 'wallet-b',
      networkId: 'evm--1',
      address: `0x${'2'.repeat(40)}`,
    };
    let release: (value: string) => void = () => undefined;
    const signature = new Promise<string>((resolve) => {
      release = resolve;
    });
    let began: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    const signMessage = jest
      .fn()
      .mockImplementationOnce(async () => {
        began();
        return signature;
      })
      .mockResolvedValue('ab');
    jest.spyOn(CloudChatHttpClient.prototype, 'challenge').mockResolvedValue({
      challenge_id: 'test',
      message: 'Original challenge',
      expires_at: '',
    });
    const register = jest
      .spyOn(CloudChatHttpClient.prototype, 'register')
      .mockResolvedValue({
        user: { id: '2', address: b.address, service_id: 'b-service' },
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 900,
      });
    jest.spyOn(CloudChatHttpClient.prototype, 'me').mockResolvedValue({
      id: '2',
      address: b.address,
      service_id: 'b-service',
    });
    jest.spyOn(CloudChatHttpClient.prototype, 'keyCounts').mockResolvedValue({
      device_id: 1,
      registration_id: 123,
      pre_keys: 100,
      pq_pre_keys: 50,
    });
    const service = new ServiceCloudChat({
      backgroundApi: {
        serviceSend: { signMessage },
        simpleDb: {
          cloudChat: { getApiBaseUrl: async () => 'https://chat.example' },
        },
      },
    });
    const first = service.login(a).catch((error: Error) => error.message);
    await started;
    const second = service.login(b);
    release('ab');
    await expect(first).resolves.toContain('切换');
    await second;
    expect(register).toHaveBeenCalledTimes(1);
    expect(
      signMessage.mock.calls.map(
        ([request]) => (request as { accountId: string }).accountId,
      ),
    ).toEqual(['wallet-a', 'wallet-b']);
    const savedScopes = (cloudChatNative as jest.Mock).mock.calls
      .filter(([, operation]) => operation === 'setAuth')
      .map(([scope]) => scope as string);
    expect(savedScopes).toEqual([`https://chat.example\n${b.address}`]);
    const updates = (cloudChatAtom.set as jest.Mock).mock.calls.map(
      ([value]) => value as { loggedIn: boolean; serviceId: string },
    );
    expect(
      updates
        .filter((value) => value.loggedIn)
        .every((value) => value.serviceId === 'b-service'),
    ).toBe(true);
  });
});
