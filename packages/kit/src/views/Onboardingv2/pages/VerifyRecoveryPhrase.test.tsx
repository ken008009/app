/** @jest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { EOnboardingPagesV2 } from '@onekeyhq/shared/src/routes/onboardingv2';

import VerifyRecoveryPhrase from './VerifyRecoveryPhrase';

const mockReplace = jest.fn();
const mockPopStack = jest.fn();
const mockUpdateBackup = jest.fn().mockResolvedValue(undefined);
const mockError = jest.fn();
let mockMnemonic = Array.from({ length: 12 }, (_, i) => `word${i}`).join(
  ' ',
);
let mockCreating = true;

jest.mock('@react-navigation/core', () => ({
  useRoute: () => ({
    params: {
      mnemonic: 'encoded-test-fixture',
      walletId: mockCreating ? '' : 'hd-test',
      isCreatingWallet: mockCreating,
    },
  }),
}));
jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
jest.mock('../../../hooks/useAppNavigation', () => ({
  __esModule: true,
  default: () => ({ replace: mockReplace, popStack: mockPopStack }),
}));
jest.mock('../../../hooks/usePromiseResult', () => ({
  usePromiseResult: () => ({ result: mockMnemonic }),
}));
jest.mock(
  '../../../hooks/useRecoveryPhraseProtected/useRecoveryPhraseProtected',
  () => ({
    useRecoveryPhraseProtected: jest.fn(),
  }),
);
jest.mock('../../../background/instance/backgroundApiProxy', () => ({
  __esModule: true,
  default: {
    serviceAccount: {
      updateWalletBackupStatus: async (...args: unknown[]) => {
        await mockUpdateBackup(...args);
      },
    },
  },
}));
jest.mock('../utils', () => ({ shuffleWordsIndices: () => [0, 4, 8] }));
jest.mock('@onekeyhq/components', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return {
    Page: Box,
    SizableText: Box,
    XStack: Box,
    YStack: Box,
    Button: ({
      children,
      onPress,
      disabled,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      disabled?: boolean;
    }) =>
      React.createElement(
        'button',
        { type: 'button', onClick: onPress, disabled },
        children,
      ),
    Toast: {
      success: jest.fn(),
      error: (...args: unknown[]) => {
        mockError(...args);
      },
    },
  };
});
jest.mock('../components/OnboardingLayout', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const Box = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', null, children);
  return { OnboardingLayout: Object.assign(Box, { Header: Box, Body: Box }) };
});

describe('new wallet backup verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreating = true;
    mockMnemonic = Array.from({ length: 12 }, (_, i) => `word${i}`).join(
      ' ',
    );
  });

  test('requires all three correct answers before finalizing the same mnemonic', async () => {
    render(<VerifyRecoveryPhrase />);
    fireEvent.click(screen.getByText('word0'));
    fireEvent.click(screen.getByText('word4'));
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('word8'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        EOnboardingPagesV2.FinalizeWalletSetup,
        { mnemonic: 'encoded-test-fixture', isWalletBackedUp: true },
      ),
    );
    expect(mockUpdateBackup).not.toHaveBeenCalled();
    expect(mockPopStack).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('word8'));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  test('wrong answers cannot finalize or mark a wallet backed up', async () => {
    render(<VerifyRecoveryPhrase />);
    const wrong = screen
      .getAllByRole('button')
      .find((button) => !button.textContent?.startsWith('word'));
    expect(wrong).toBeDefined();
    if (!wrong) return;
    fireEvent.click(wrong);
    fireEvent.click(screen.getByText('word4'));
    fireEvent.click(screen.getByText('word8'));
    await waitFor(() => expect(mockError).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockUpdateBackup).not.toHaveBeenCalled();
  });

  test('missing mnemonic cannot be verified', () => {
    mockMnemonic = '';
    render(<VerifyRecoveryPhrase />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('existing wallet verification retains its backup completion path', async () => {
    mockCreating = false;
    render(<VerifyRecoveryPhrase />);
    for (const index of [0, 4, 8]) {
      fireEvent.click(screen.getByText(`word${index}`));
    }
    await waitFor(() => expect(mockPopStack).toHaveBeenCalled());
    expect(mockUpdateBackup).toHaveBeenCalledWith({
      walletId: 'hd-test',
      isBackedUp: true,
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
