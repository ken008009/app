# Bug Fix Case Studies

Cases are appended by AI after each bug fix. Do NOT reorder or delete entries — the `1k-retrospective` skill reads this file to analyze patterns and propose rule updates.

---

<!-- New cases are appended below this line -->

## Case: iOS OneKey ID logout dialog stuck with loading spinner
**Date**: 2026-02-26 | **Platforms**: iOS (native)
**Symptom**: After clicking logout in OneKey ID page, the confirmation dialog showed a permanent loading spinner and never closed, even after the modal behind it was dismissed.
**Root Cause**: Race condition between explicit logout (Dialog onConfirm) and automatic `handleLoggedOutWhileFocused` effect. When `apiLogout()` updated `primePersistAtom`, the effect fired and called `popModalPagesOnNative()` while the dialog's `onConfirm` was still executing, orphaning the dialog.
**Fix**: Added `isExplicitLogoutRef` flag set via `onBeforeLogout` callback before `logout()` starts, preventing `handleLoggedOutWhileFocused` from interfering with user-initiated logout.
**Catchable by**: Section 5: No race conditions in async operations

## Case: Web header settings dropdown overlap
**Date**: 2026-02-26 | **Platforms**: Web
**Symptom**: In the web header settings dropdown, clicking currency then language (or vice versa) caused both Select floating panels to appear simultaneously, overlapping.
**Root Cause**: Two `Select` components inside a `Popover` managed their own `isOpen` state independently. Opening one did not close the other.
**Fix**: Extracted popover content into `MoreDappActionContent` with key-based mutual exclusion. When one Select opens, the other is force-remounted (closed) by incrementing its key.
**Catchable by**: NEW — not covered (UI component interaction within shared container)

## Case: Perps history tab title highlighted when share dialog opens
**Date**: 2026-02-26 | **Platforms**: iOS, Android (native)
**Symptom**: When opening the share position dialog from the history page, the tab header text got visually highlighted/selected.
**Root Cause**: Tab header `SizableText` and `XStack` elements lacked `userSelect="none"`, allowing text selection when focus shifted to the dialog.
**Fix**: Added `userSelect="none"` to `XStack` and `SizableText` in both `PerpTradersHistoryListModal` TabHeader and `PerpOrderInfoPanel` TabBarItem.
**Catchable by**: Section 1: Code Quality — UI interactive elements should have userSelect="none"

## Case: Web language dropdown stays open when clicking Settings
**Date**: 2026-02-28 | **Platforms**: Web
**Symptom**: In the DappHeader MoreDappAction popover, opening the language Select dropdown then clicking "Settings" left the dropdown visible while the Settings modal opened.
**Root Cause**: `SettingListItem` only called `closePopover()` to close the parent Popover, but due to `keepChildrenMounted`, the child `LanguageListItem`'s Select stayed mounted with `isOpen=true`.
**Fix**: Added `closeAllDropdowns` callback in `MoreDappActionContent` that bumps keys for both Language and Currency Selects (forcing remount and state reset), called via `onBeforeNavigate` prop before `closePopover()`.
**Catchable by**: Section 5: No stale state after parent container dismissal (related to existing case "Web header settings dropdown overlap")

## Case: Keyless avatar provider fallback
**Date**: 2026-03-12 | **Platforms**: mobile, desktop, web, extension
**Symptom**: Keyless wallet avatar badge could show the original login provider instead of the provider parsed for avatar display.
**Root Cause**: Wallet avatar rendering only read `keylessProvider`, while the refreshed avatar-specific provider was not persisted or prioritized.
**Fix**: Stored `avatarProvider` in `keylessDetails` during avatar repair and updated avatar rendering to prefer `avatarProvider` before falling back to `keylessProvider`.
**Catchable by**: Section 4: Type definitions changed -> all consumers updated

## Case: MSUSD pin bound to catalog token instead of MS native
**Date**: 2026-08-19 | **Platforms**: Android, iOS, Web, Desktop, Extension
**Symptom**: Selecting the MS chain still showed a wrong MSUSD balance in TokenListBlock.
**Root Cause**: Home pin list matched ticker `MSUSD` against catalog Metronome MSUSD, while this chain's native coin was still labeled ISPAY. The pin row was a zero stub, not `eth_getBalance` on `evm--1944873742`.
**Fix**: Treat ISPAY as an MSUSD alias, bind the MSUSD pin to the MS chain native token, skip other-chain catalog MSUSD, and show the MSUSD icon for the MS chain.
**Catchable by**: Section 4: Shared hook/utility modified → checked all consumers

## Case: Receive 选择币种 stuck on skeleton
**Date**: 2026-08-21 | **Platforms**: Android, iOS (native token selector)
**Symptom**: 接收 → 接收转账 → 选择币种 stayed on loading/skeleton forever.
**Root Cause**: TokenSelector self-fetch called a single `fetchAccountTokens` against All Networks (`onekeyall` + mock address) instead of fan-out via `fetchFilteredTokenSelectorTokens`; failures also never set `tokenSelectorInitialized`, and home `ownerMismatch` could keep the skeleton after init.
**Fix**: Fan-out with `fetchFilteredTokenSelectorTokens`, always clear skeleton in `finally`, and skip `ownerMismatch` when `isTokenSelector`.
**Catchable by**: Section 5: No infinite loops / stuck loading — async fetch must clear loading in finally; Section 4: Shared component gates must distinguish home vs selector data path

## Case: Suppress MS upgrade notification dialog on Assets
**Date**: 2026-08-21 | **Platforms**: Android, iOS, Web, Desktop, Extension
**Symptom**: Opening wallet / Assets showed a "MS 再升级" update prompt dialog.
**Root Cause**: AppUpdateForeground called showUpdateDialogUI when a non-force update was available; brand replace turned "OneKey 再升级" into "MS 再升级".
**Fix**: Made showUpdateDialogUI a no-op so the prompt is never shown.
**Catchable by**: NEW — product-gated update dialog should be skippable for white-label forks

## Case: Enumerable Array.prototype.toSorted breaks Assets IPC
**Date**: 2026-08-22 | **Platforms**: Android (native dual runtime; also iOS Release risk)
**Symptom**: Assets / Portfolio page never loaded data (IPC keep failing).
**Root Cause**: Inline `Array.prototype.toSorted = fn` made the method enumerable; `assertUtils.isSerializable` walks `for...in` on arrays and rejected payloads with keyPath `["toSorted"]`.
**Fix**: Install via `Object.defineProperty(..., { enumerable: false })`, and reinstall when an existing descriptor is enumerable.
**Catchable by**: Section 1: No extend-native via plain assignment — prototype methods must be non-enumerable; Section 5: background API serialization failures surface as stuck loading

## Case: Release APK white screen — BlobModule of undefined
**Date**: 2026-08-22 | **Platforms**: Android Release (bridgeless)
**Symptom**: Fresh install of ProdRelease APK shows white screen then exits to launcher
**Root Cause**: `react-native-url-polyfill/js/URL.js` did `const {BlobModule} = NativeModules` at module load. On Android Release bridgeless early boot, `NativeModules` can be undefined → TypeError → SIGABRT. Prior WalletConnect / toSorted fixes were insufficient because this path still ran via `polyfillsPlatform.js` → `react-native-url-polyfill/auto`.
**Fix**: Patch URL.js to resolve BlobModule via TurboModuleRegistry then `NativeModules?.BlobModule`, and read BLOB_URI_* from getConstants when needed. Regenerated `patches/react-native-url-polyfill+1.3.0.patch`.
**Catchable by**: Section 5 Potential Bugs (startup crash / dual-runtime early native access) — NEW: polyfill must not assume NativeModules exists during bridgeless Release boot

## Case: Release APK white screen — NitroModules.createHybridObject undefined
**Date**: 2026-08-22 | **Platforms**: Android Release (bridgeless)
**Symptom**: After BlobModule fix, Release APK still white-screens; log shows TypeError: Cannot read property 'createHybridObject' of undefined
**Root Cause**: Multiple `@onekeyfe/*` Nitro hybrids call `NitroModules.createHybridObject(...)` at module top-level while `NativeNitroModules` export can still be undefined during circular/early init on bridgeless Release boot.
**Fix**: Patch `react-native-nitro-modules` so `NitroModules` is a forwarding Proxy that `ensureInstalled()` before use; harden native-logger / file-logger. Do NOT return fake HybridObject stubs.
**Catchable by**: Section 5 — NEW: Nitro/HybridObject modules must not assume NitroModules is ready at import time during bridgeless Release boot

## Case: Release APK white screen — Nitro box() SIGSEGV from JS Proxy stub
**Date**: 2026-08-22 | **Platforms**: Android Release (bridgeless)
**Symptom**: After masking createHybridObject undefined with a JS Proxy stub, app still crashes; tombstone shows SIGSEGV in libNitroModules / hermes during HybridFunction / box.
**Root Cause**: `installWorkletsSupport` called `NitroModules.box(NitroModules)` on the JS forwarding Proxy (or early stub). Native `box()` requires a real HybridObject pointer; boxing a plain JS Proxy causes SIGSEGV.
**Fix**: `ensureInstalled()` then forward to `global.NitroModulesProxy`; `installWorkletsSupport` boxes `global.NitroModulesProxy` only. Verify main `index.android.bundle` was rebuilt (avoid Gradle UP-TO-DATE skipping Nitro patches). Fast iterate via `apps/mobile/scripts/inject-release-js-into-apk.sh`.
**Catchable by**: Section 5 — NEW: never pass JS Proxy/stub into Nitro native box()/HybridFunction; Section 7 — Release JS changes must force recreate `createBundle*JsAndAssets` / confirm strings in index.android.bundle

## Case: Home All Networks MSUSD not showing ms balance
**Date**: 2026-08-22 | **Platforms**: All (Home All Networks)
**Symptom**: Assets → All Networks token list MSUSD was not the ms-chain native balance; All Networks manager left ms unchecked
**Root Cause**: `getDefaultEnabledNetworksInAllNetworks()` omitted `ms`, so `isEnabledNetworksInAllNetworks` treated ms as opt-in and skipped RPC fetch. The MSUSD pin already binds to `evm--1944873742` native, but received a zero stub without that fetch.
**Fix**: Add `ms` to the default-enabled All Networks list and set `ms.defaultEnabled = true`.
**Catchable by**: Section 4 Business Logic — Home pin token vs All Networks enabled-network list must stay aligned

## Case: Disabled ms still pinned MSUSD on All Networks
**Date**: 2026-08-22 | **Platforms**: All (Home All Networks)
**Symptom**: Unchecking ms in All Networks still left a pinned MSUSD row (zero stub)
**Root Cause**: `ensureHomePinnedSymbolTokens` always injected the MSUSD pin, independent of `isEnabledNetworksInAllNetworks(ms)`
**Fix**: Pass `includeMsGasToken` from All Networks enabled state; when false, skip the pin and drop MSUSD / ms-chain rows
**Catchable by**: Section 4 — pin-list stubs must honor the same enabled-network gate as the fetch

## Case: Native tabs visible but Home/Discover content black on Release APK
**Date**: 2026-08-23 | **Platforms**: Android Release (injected union JS)
**Symptom**: Bottom 5 tabs render; the tab scene body is solid black (assets / discovery).
**Root Cause**: Release JS was built with `ENABLE_NATIVE_BACKGROUND_THREAD=true`, so Home waits on bg IPC (`activeAccount.ready`). The injected APK never started a second JS runtime; `ready` stayed false and Home returned only the header / empty Stack. AndroidScrollContainer also hid children while measured height was 0.
**Fix**: Keep a spinner in `Page.Body` until account selector/wallet list settle; always mount the Android home ScrollView (`flexGrow: 1` until height is known). Dual-thread inject APKs must include a working background.bundle load, or bundle JS with in-process bg.
**Catchable by**: Section 4 — "not loaded" vs empty; Section 5 — dual JS runtimes (main/bg); Section 8 — Release APK without Metro is not the same as Debug+Metro

