import { useCallback, useEffect, useRef } from 'react';

import { useFocusEffect, useIsFocused } from '@react-navigation/core';
import { AppState } from 'react-native';

import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import { useHandleAppStateActive } from '@onekeyhq/kit/src/hooks/useHandleAppStateActive';
import { useCloudChatAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';

export function useCloudChatAutoConnect() {
  const [state] = useCloudChatAtom();
  const focused = useIsFocused();
  const attemptedScope = useRef<string | undefined>(undefined);
  const scope = `${state.apiBaseUrl}\n${state.selfUserId}`;
  useEffect(() => {
    if (state.loggedIn && state.signalReady) attemptedScope.current = undefined;
  }, [state.loggedIn, state.signalReady]);
  const connect = useCallback(() => {
    if (
      !focused ||
      !state.authenticationRequired ||
      attemptedScope.current === scope ||
      AppState.currentState !== 'active'
    )
      return;
    attemptedScope.current = scope;
    // The service clears the request before prompting, so cancellation does not loop.
    void backgroundApiProxy.serviceCloudChat
      .connectCurrentWallet()
      .catch(() => undefined);
  }, [focused, scope, state.authenticationRequired]);
  useFocusEffect(connect);
  useHandleAppStateActive(connect);
}
