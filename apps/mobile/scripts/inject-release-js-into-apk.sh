#!/usr/bin/env bash
# Fast Release JS iteration: update Hermes bundles inside an existing ProdRelease
# APK in-place (no full unzip — preserves binary AndroidManifest), re-sign, install.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_APP="$ROOT/android/app"
APK_IN="${1:-$ANDROID_APP/build/outputs/apk/prod/release/app-prod-release.apk}"
ASSET_DIR="$ANDROID_APP/build/generated/assets/createBundleProdReleaseJsAndAssets"
OUT_DIR="${OUT_DIR:-/tmp/onekey-js-inject}"
DEVICE="${DEVICE:-}"
DO_INSTALL="${DO_INSTALL:-1}"

BT="$(ls -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools/"* | sort -V | tail -1)"
ZIPALIGN="$BT/zipalign"
APKSIGNER="$BT/apksigner"

if [[ ! -f "$APK_IN" ]]; then
  echo "APK not found: $APK_IN" >&2
  exit 1
fi
if [[ ! -f "$ASSET_DIR/index.android.bundle" ]]; then
  echo "Missing $ASSET_DIR/index.android.bundle" >&2
  exit 1
fi

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR/work/assets"
cp -f "$APK_IN" "$OUT_DIR/work/base.apk"
cd "$OUT_DIR/work"

cp -f "$ASSET_DIR/index.android.bundle" assets/index.android.bundle
[[ -f "$ASSET_DIR/background.bundle" ]] && cp -f "$ASSET_DIR/background.bundle" assets/background.bundle
[[ -f "$ASSET_DIR/common.bundle" ]] && cp -f "$ASSET_DIR/common.bundle" assets/common.bundle
[[ -f "$ASSET_DIR/module-id-map.json" ]] && cp -f "$ASSET_DIR/module-id-map.json" assets/module-id-map.json
if [[ -d "$ASSET_DIR/segments" ]]; then
  rm -rf assets/segments
  cp -R "$ASSET_DIR/segments" assets/segments
fi
if [[ -d "$ASSET_DIR/segments-background" ]]; then
  rm -rf assets/segments-background
  cp -R "$ASSET_DIR/segments-background" assets/segments-background
fi

# Dual-thread union JS is several MB. A ~13KB background.bundle with common.bundle
# means in-process stub JS injected into a dual-thread native APK → tabs + black body.
if [[ -f assets/common.bundle ]]; then
  if [[ ! -f assets/background.bundle ]]; then
    echo "Refusing inject: common.bundle present but background.bundle missing" >&2
    exit 1
  fi
  bg_size="$(wc -c < assets/background.bundle | tr -d ' ')"
  if (( bg_size < 1000000 )); then
    echo "Refusing inject: background.bundle is ${bg_size} bytes (need a real dual-thread bundle, not a stub)" >&2
    exit 1
  fi
fi
if [[ -d assets/segments && ! -d assets/segments-background ]]; then
  echo "Refusing inject: segments/ present but segments-background/ missing" >&2
  exit 1
fi

# Replace entries without extracting the whole APK (keeps binary Manifest / native libs)
zip -q -d base.apk \
  assets/index.android.bundle \
  assets/background.bundle \
  assets/common.bundle \
  assets/module-id-map.json \
  "assets/segments/*" \
  "assets/segments-background/*" \
  2>/dev/null || true
zip -q -0 base.apk \
  assets/index.android.bundle \
  $([ -f assets/background.bundle ] && echo assets/background.bundle) \
  $([ -f assets/common.bundle ] && echo assets/common.bundle) \
  $([ -f assets/module-id-map.json ] && echo assets/module-id-map.json)
if [[ -d assets/segments ]]; then
  zip -q -0 -r base.apk assets/segments
fi
if [[ -d assets/segments-background ]]; then
  zip -q -0 -r base.apk assets/segments-background
fi

# Strip old signatures
zip -q -d base.apk 'META-INF/*.SF' 'META-INF/*.RSA' 'META-INF/*.DSA' 'META-INF/MANIFEST.MF' 2>/dev/null || true

ZIP_ALIGNED="$OUT_DIR/aligned.apk"
ZIP_SIGNED="$OUT_DIR/app-prod-release-jsinject.apk"
rm -f "$ZIP_ALIGNED" "$ZIP_SIGNED"
"$ZIPALIGN" -f -p 4 base.apk "$ZIP_ALIGNED"
"$APKSIGNER" sign \
  --ks "$ANDROID_APP/debug.keystore" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --ks-key-alias androiddebugkey \
  --out "$ZIP_SIGNED" \
  "$ZIP_ALIGNED"

echo "Signed APK: $ZIP_SIGNED"

if [[ "$DO_INSTALL" == "1" ]]; then
  ADB=(adb)
  [[ -n "$DEVICE" ]] && ADB=(adb -s "$DEVICE")
  "${ADB[@]}" push "$ZIP_SIGNED" /data/local/tmp/app-prod-release-jsinject.apk
  "${ADB[@]}" shell pm install -r -t /data/local/tmp/app-prod-release-jsinject.apk
  "${ADB[@]}" shell am force-stop so.onekey.app.wallet || true
  "${ADB[@]}" shell am start -n so.onekey.app.wallet/.MainActivity
  echo "Installed and launched."
fi
