/* eslint-disable prefer-template */

/**
 * Asset resolution patch for native hot-updated JS bundles.
 *
 * Extracted from polyfillsPlatform.js so the logic is independently testable.
 */

/**
 * Whether SourceCode.scriptURL should be used to rewrite Image URIs.
 *
 * OTA (`useJsBundle`) already points at the downloaded bundle's assets/.
 * Android APK images live in res/drawable and res/raw — do not rewrite.
 */
function shouldRewriteAssetsFromScriptUrl({
  isNativeAndroid,
  isNativeIOS,
  useJsBundle,
}) {
  if (useJsBundle) {
    return false;
  }
  if (isNativeAndroid) {
    return false;
  }
  return Boolean(isNativeIOS);
}

/**
 * Collapse `/assets/../../packages/...` to `/packages/...`.
 *
 * Union Metro records monorepo assets with `..` in httpServerLocation.
 * saveAssets / aapt names are computed from the collapsed path, so runtime
 * lookup must collapse too or Image/tab URIs miss packed `res/` entries.
 */
function collapseHttpServerLocation(location) {
  const parts = [];
  const segments = String(location || '').split('/');
  for (let i = 0; i < segments.length; i += 1) {
    const part = segments[i];
    if (!part || part === '.') {
      continue;
    }
    if (part === '..') {
      if (parts.length > 0) {
        parts.pop();
      }
      continue;
    }
    parts.push(part);
  }
  return `/${parts.join('/')}`;
}

/**
 * Android resource name that matches files written by Metro saveAssets.
 *
 * Do not remove this helper or skip it on Android APK builds. Without it,
 * Home wallet-card and native tab SVGs stay blank even when `res/` is packed.
 *
 * RN `getAndroidResourceIdentifier` does not collapse `..`, so
 * `/assets/../../packages/kit/assets/home/wallet-card` becomes
 * `__packages_kit_assets_home_walletcard`. Packed files are
 * `packages_kit_assets_home_walletcard`. Official OTA patch only
 * rewrites the `__packages` prefix on file:// URIs — APK resource
 * identifiers need the same mapping.
 */
function getAndroidPackedResourceName(asset) {
  const location = collapseHttpServerLocation(asset.httpServerLocation);
  const basePath = location.startsWith('/') ? location.slice(1) : location;
  const combined = basePath
    ? `${basePath}/${asset.name}`
    : String(asset.name || '');
  return combined
    .toLowerCase()
    .replace(/\//g, '_')
    .replace(/([^a-z0-9_])/g, '')
    .replace(/^(?:assets|assetsunstable_path)_/, '')
    .replace('__packages', 'packages')
    .replace('__node_modules', 'node_modules');
}

function applyAndroidPackedAsset(resolver) {
  if (resolver.isLoadedFromServer()) {
    return resolver.assetServerURL();
  }
  const { Platform } = require('react-native');
  if (Platform.OS !== 'android' || typeof resolver.fromSource !== 'function') {
    return null;
  }
  return resolver.fromSource(getAndroidPackedResourceName(resolver.asset));
}

/**
 * Force Android APK images to resolve as packed resource names.
 *
 * RN `defaultAsset()` uses `drawableFolderInBundle()` whenever
 * `SourceCode.scriptURL` starts with `file://`. Bridgeless Hermes extracts
 * JS to a cache file:// path with no sibling drawables, so wallet-card PNGs
 * and tab SVGs stay blank even when `res/` is packed.
 */
function patchAndroidApkResourceIdentifierResolution() {
  const AssetSourceResolver =
    require('react-native/Libraries/Image/AssetSourceResolver').default;
  const wrap = require('lodash/wrap');

  try {
    const resolveAssetSource = require(
      'react-native/Libraries/Image/resolveAssetSource',
    );
    const ras = resolveAssetSource.default || resolveAssetSource;
    if (typeof ras.addCustomSourceTransformer === 'function') {
      ras.addCustomSourceTransformer(applyAndroidPackedAsset);
    }
  } catch {
    // Unit tests may not load resolveAssetSource; defaultAsset wrap still runs.
  }

  AssetSourceResolver.prototype.defaultAsset = wrap(
    AssetSourceResolver.prototype.defaultAsset,
    function (_func, ..._args) {
      const patched = applyAndroidPackedAsset(this);
      if (patched != null) {
        return patched;
      }
      return _func.apply(this, _args);
    },
  );
}

function patchNativeAssetResolution(assetsPath) {
  const { Platform, PixelRatio } = require('react-native');
  const AssetSourceResolver =
    require('react-native/Libraries/Image/AssetSourceResolver').default;
  const wrap = require('lodash/wrap');
  const { pickScale } = require('react-native/Libraries/Image/AssetUtils');

  let getAndroidResourceFolderName;
  if (Platform.OS === 'android') {
    const pathSupport = require('@react-native/assets-registry/path-support');
    getAndroidResourceFolderName = pathSupport.getAndroidResourceFolderName;
  }

  function getAssetPathInDrawableFolder(asset) {
    const scale = pickScale(asset.scales, PixelRatio.get());
    const drawableFolder = getAndroidResourceFolderName(asset, scale);
    const fileName = getAndroidPackedResourceName(asset);
    return drawableFolder + '/' + fileName + '.' + asset.type;
  }

  AssetSourceResolver.prototype.defaultAsset = wrap(
    AssetSourceResolver.prototype.defaultAsset,
    function (_func, ..._args) {
      const isLoadedFromServer = this.isLoadedFromServer();
      if (isLoadedFromServer) {
        const serverUrl = this.assetServerURL();
        return serverUrl;
      }
      if (Platform.OS === 'android') {
        return this.fromSource(
          assetsPath + getAssetPathInDrawableFolder(this.asset),
        );
      }
      if (Platform.OS === 'ios') {
        const iOSAsset = this.scaledAssetURLNearBundle();
        iOSAsset.uri = iOSAsset.uri
          .replace(this.jsbundleUrl, assetsPath)
          .replace('__packages', 'packages')
          .replace('__node_modules', 'node_modules');
        return iOSAsset;
      }
    },
  );
}

module.exports = {
  patchNativeAssetResolution,
  patchAndroidApkResourceIdentifierResolution,
  shouldRewriteAssetsFromScriptUrl,
  collapseHttpServerLocation,
  getAndroidPackedResourceName,
};
