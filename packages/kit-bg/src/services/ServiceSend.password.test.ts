jest.mock('p-limit', () => ({
  __esModule: true,
  default: () => (fn: () => unknown) => fn(),
}));
jest.mock('p-retry', () => ({
  __esModule: true,
  default: (fn: () => unknown) => fn(),
}));
jest.mock('@onekeyhq/shared/src/background/backgroundDecorators', () => ({
  backgroundClass: () => () => undefined,
  backgroundMethod: () => (_t: unknown, _k: unknown, d: PropertyDescriptor) =>
    d,
  toastIfError: () => (_t: unknown, _k: unknown, d: PropertyDescriptor) => d,
}));
jest.mock('./ServiceBase', () => ({
  __esModule: true,
  default: class {
    backgroundApi: unknown;

    constructor({ backgroundApi }: { backgroundApi: unknown }) {
      this.backgroundApi = backgroundApi;
    }
  },
}));
jest.mock('../vaults/factory', () => ({
  vaultFactory: { getVault: jest.fn() },
}));
jest.mock('@onekeyhq/shared/src/locale/appLocale', () => ({
  appLocale: {
    intl: { formatMessage: ({ id }: { id: string }) => id },
    onLocaleChange: () => undefined,
  },
}));
jest.mock('@onekeyhq/shared/src/platformEnv', () => ({
  __esModule: true,
  default: { isNativeAndroid: true },
}));

// eslint-disable-next-line import/first, import-js/order
import platformEnv from '@onekeyhq/shared/src/platformEnv';
// eslint-disable-next-line import/first, import-js/order
import { EReasonForNeedPassword } from '@onekeyhq/shared/types/setting';
// eslint-disable-next-line import/first, import-js/order
import { vaultFactory } from '../vaults/factory';
// eslint-disable-next-line import/first, import-js/order
import ServiceSend from './ServiceSend';

describe('transaction password authorization', () => {
  const params: Parameters<ServiceSend['signTransaction']>[0] = {
    accountId: 'hd-1--evm--0',
    networkId: 'evm--1',
    signOnly: false,
    unsignedTx: { encodedTx: {} },
  };

  function setup() {
    const prompt = jest.fn().mockResolvedValue({ password: 'test-only' });
    const sign = jest.fn().mockResolvedValue({});
    jest.mocked(vaultFactory.getVault).mockResolvedValue({
      signTransaction: sign,
    } as unknown as Awaited<ReturnType<typeof vaultFactory.getVault>>);
    const Constructor = ServiceSend as unknown as new (args: {
      backgroundApi: unknown;
    }) => ServiceSend;
    const service = new Constructor({
      backgroundApi: {
        servicePassword: { promptPasswordVerifyByAccount: prompt },
        serviceHardwareUI: {
          withHardwareProcessing: (run: () => Promise<unknown>) => run(),
        },
      },
    });
    return { service, prompt, sign };
  }

  afterEach(() => {
    jest.replaceProperty(platformEnv, 'isNativeAndroid', true);
  });

  test('Android requires a new password prompt for every transaction', async () => {
    const { service, prompt, sign } = setup();
    await service.signTransaction(params);
    await service.signTransaction(params);
    expect(prompt).toHaveBeenCalledTimes(2);
    expect(prompt).toHaveBeenCalledWith({
      accountId: params.accountId,
      reason: EReasonForNeedPassword.Security,
      passwordOnly: true,
    });
    expect(prompt.mock.invocationCallOrder[0]).toBeLessThan(
      sign.mock.invocationCallOrder[0],
    );
  });

  test.each(['cancelled', 'incorrect password'])(
    '%s prevents signing',
    async (message) => {
      const { service, prompt, sign } = setup();
      prompt.mockRejectedValue(new Error(message));
      await expect(service.signTransaction(params)).rejects.toThrow(message);
      expect(sign).not.toHaveBeenCalled();
    },
  );

  test('other platforms retain the existing authorization policy', async () => {
    jest.replaceProperty(platformEnv, 'isNativeAndroid', false);
    const { service, prompt } = setup();
    await service.signTransaction(params);
    expect(prompt).toHaveBeenCalledWith({
      accountId: params.accountId,
      reason: EReasonForNeedPassword.CreateTransaction,
      passwordOnly: false,
    });
  });
});
