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

# Replace entries without extracting the whole APK
zip -q -d base.apk \
  assets/index.android.bundle \
  assets/background.bundle \
  assets/common.bundle \
  2>/dev/null || true
zip -q -0 base.apk \
  assets/index.android.bundle \
  $([ -f assets/background.bundle ] && echo assets/background.bundle) \
  $([ -f assets/common.bundle ] && echo assets/common.bundle)

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
