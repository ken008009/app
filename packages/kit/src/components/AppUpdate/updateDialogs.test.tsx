/**
 * @jest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, import/first */
// Fork: showUpdateDialogUI is a no-op (skip "MS 再升级" prompt).
// yarn jest packages/kit/src/components/AppUpdate/updateDialogs.test.tsx

jest.mock('@onekeyhq/components', () => ({
  Dialog: { show: jest.fn() },
  LottieView: () => null,
  YStack: ({ children }: { children: unknown }) => children as JSX.Element,
  useInTabDialog: () => ({ show: jest.fn() }),
}));

jest.mock(
  '@onekeyhq/kit/assets/animations/update-notification-dark.json',
  () => ({}),
);
jest.mock(
  '@onekeyhq/kit/assets/animations/update-notification-light.json',
  () => ({}),
);

jest.mock('@onekeyhq/shared/src/utils/timerUtils', () => ({
  __esModule: true,
  default: {
    getTimeDurationMs: ({ seconds, minute, hour, day }: any = {}) => {
      if (day) return day * 86_400_000;
      if (hour) return hour * 3_600_000;
      if (minute) return minute * 60_000;
      if (seconds) return seconds * 1000;
      return 0;
    },
  },
}));

jest.mock('@onekeyhq/shared/src/logger/logger', () => ({
  defaultLogger: {
    app: { component: { closedInUpdateDialog: jest.fn() } },
  },
}));

jest.mock('@onekeyhq/shared/src/platformEnv', () => ({
  __esModule: true,
  default: { isNativeAndroid: false },
}));

jest.mock('../../background/instance/backgroundApiProxy', () => ({
  __esModule: true,
  default: { serviceAppUpdate: { updateLastDialogShownAt: jest.fn() } },
}));

jest.mock('react-intl', () => ({}));

import { Dialog } from '@onekeyhq/components';

import { UPDATE_DIALOG_INTERVAL, showUpdateDialogUI } from './updateDialogs';

const intl = {
  formatMessage: ({ id }: { id: string }) => id,
} as any;

describe('UPDATE_DIALOG_INTERVAL', () => {
  test('is exactly 24 hours (1 day) — change requires explicit UX review', () => {
    expect(UPDATE_DIALOG_INTERVAL).toBe(86_400_000);
  });
});

describe('showUpdateDialogUI', () => {
  test('is a no-op — never shows the update notification dialog', () => {
    const dialogShow = jest.fn();
    showUpdateDialogUI({
      dialog: { show: dialogShow } as any,
      intl,
      themeVariant: 'light',
      summary: 'release notes',
      onConfirm: jest.fn(),
    });
    expect(dialogShow).not.toHaveBeenCalled();
    expect(Dialog.show).not.toHaveBeenCalled();
  });
});
