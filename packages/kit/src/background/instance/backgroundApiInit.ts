import { ensureLocalDbNotOnNativeMainThread } from '@onekeyhq/shared/src/utils/assertUtils';

function backgroundApiInit() {
  // Importing Realm initializes native bindings and clears process-wide caches,
  // even without opening a database. Keep this dependency out of the UI runtime.
  ensureLocalDbNotOnNativeMainThread();
  globalThis.$onekeyIsInBackground = true;
  const { default: BackgroundApi } =
    require('@onekeyhq/kit-bg/src/apis/BackgroundApi') as typeof import('@onekeyhq/kit-bg/src/apis/BackgroundApi');
  const backgroundApi = new BackgroundApi();
  return backgroundApi;
}
export default backgroundApiInit;
