#!/usr/bin/env bash
# Build a user-installable ProdRelease APK that:
#   - does not wait for Metro (no black "dev server" screen)
#   - keeps dual-thread JS in sync with native (no middle black / crash)
#   - is named app-{VERSION}.apk for self-hosted updates under /download/
#
# After JS or image changes: re-run this script. Do NOT inject a single
# .bundle. Do NOT turn off ENABLE_NATIVE_BACKGROUND_THREAD. Do NOT remove
# the SKIP_EXPO_JS_BUNDLE drawable/raw copy in android/app/build.gradle.
# Do NOT delete getAndroidPackedResourceName in assetResolutionPatch.js
# (wallet-card / tab icons go blank).
#
# Usage:
#   bash apps/mobile/scripts/build-user-release-apk.sh
#   bash apps/mobile/scripts/build-user-release-apk.sh --bump-patch
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$MOBILE_DIR/../.." && pwd)"
VERSION_FILE="$ROOT_DIR/.env.version"
DIST_DIR="$MOBILE_DIR/dist/android"
GRADLE_APK="$MOBILE_DIR/android/app/build/outputs/apk/prod/release/app-prod-release.apk"

BUMP_PATCH=0
if [[ "${1:-}" == "--bump-patch" ]]; then
  BUMP_PATCH=1
fi

read_version() {
  grep -E '^VERSION=' "$VERSION_FILE" | tail -1 | cut -d= -f2 | tr -d ' \r'
}

bump_patch() {
  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    const text = fs.readFileSync(file, "utf8");
    const next = text.replace(/^VERSION=(\d+)\.(\d+)\.(\d+)\s*$/m, (_, major, minor, patch) => {
      return "VERSION=" + major + "." + minor + "." + (Number(patch) + 1);
    });
    if (next === text) {
      throw new Error("Could not bump VERSION in " + file);
    }
    fs.writeFileSync(file, next);
  ' "$VERSION_FILE"
}

if ! command -v node >/dev/null 2>&1 && [ -x /opt/homebrew/bin/node ]; then
  export PATH="/opt/homebrew/bin:$PATH"
fi

cd "$ROOT_DIR"

# Dual-thread JS + native. Mismatch => tabs ok, home body black.
export ENABLE_NATIVE_BACKGROUND_THREAD=true
export UNION_BUILD=true
export SPLIT_BUNDLE=1
export SPLIT_BUNDLE_SEGMENTS=true
export SKIP_EXPO_JS_BUNDLE=true
export ANDROID_CHANNEL=direct
export SENTRY_DISABLE_AUTO_UPLOAD=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=8192}"

mkdir -p "$DIST_DIR"
VERSION="$(read_version)"
if [[ -z "$VERSION" ]]; then
  echo "ERROR: VERSION missing in $VERSION_FILE" >&2
  exit 1
fi

DEST="$DIST_DIR/app-${VERSION}.apk"
if [[ -f "$DEST" && "$BUMP_PATCH" != "1" ]]; then
  echo "app-${VERSION}.apk already exists. Re-run with --bump-patch so VERSION and the filename change." >&2
  exit 1
fi
if [[ "$BUMP_PATCH" == "1" ]]; then
  bump_patch
  VERSION="$(read_version)"
  DEST="$DIST_DIR/app-${VERSION}.apk"
  echo "VERSION bumped to ${VERSION}"
fi

echo "==> Union JS bundle"
(
  cd "$MOBILE_DIR"
  node build-bundle.js --platform android
)

echo "==> Verify packed Android resource names match JS assets"
node <<'NODE'
const fs = require('fs');
const path = require('path');
const {
  getAndroidPackedResourceName,
} = require('./packages/shared/src/polyfills/assetResolutionPatch.js');

const keepPath =
  'apps/mobile/out-dir-bundle/android/dist/assets/raw/keep.xml';
const jsPath = 'apps/mobile/out-dir-bundle/android/main.jsbundle';
if (!fs.existsSync(keepPath) || !fs.existsSync(jsPath)) {
  throw new Error('union output missing keep.xml or main.jsbundle');
}
const keep = fs.readFileSync(keepPath, 'utf8');
const js = fs.readFileSync(jsPath, 'utf8');
const samples = [
  ['/assets/../../packages/kit/assets/home', 'wallet-card', 'png'],
  ['/assets/../../packages/components/svg/solid', 'wallet-4', 'svg'],
];
for (const [httpServerLocation, name, type] of samples) {
  if (!js.includes(`"name": "${name}"`)) {
    throw new Error(`JS bundle missing asset ${name}`);
  }
  const packed = getAndroidPackedResourceName({ httpServerLocation, name });
  const prefix = type === 'svg' ? '@raw/' : '@drawable/';
  if (!keep.includes(prefix + packed)) {
    throw new Error(
      `keep.xml missing ${prefix}${packed} (JS would look up the wrong name)`,
    );
  }
  const folder = type === 'svg' ? 'raw' : 'drawable-mdpi';
  const file = path.join(
    'apps/mobile/out-dir-bundle/android/dist/assets',
    folder,
    `${packed}.${type}`,
  );
  if (!fs.existsSync(file)) {
    throw new Error(`packed file missing: ${file}`);
  }
  console.log(`OK ${packed}`);
}
NODE

echo "==> assembleProdRelease"
(
  cd "$MOBILE_DIR/android"
  if [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@17 ]]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@17
    export PATH="$JAVA_HOME/bin:$PATH"
  fi
  GRADLE_INIT_ARGS=()
  if [[ -f /tmp/ms-wallet-aliyun-init.gradle ]]; then
    GRADLE_INIT_ARGS=(-I /tmp/ms-wallet-aliyun-init.gradle)
  fi
  ./gradlew --stop >/dev/null 2>&1 || true
  ./gradlew "${GRADLE_INIT_ARGS[@]}" :app:assembleProdRelease -x lint -x test
)

if [[ ! -f "$GRADLE_APK" ]]; then
  echo "ERROR: missing $GRADLE_APK" >&2
  exit 1
fi

python3 - "$GRADLE_APK" <<'PY'
import sys, zipfile
apk = sys.argv[1]
with zipfile.ZipFile(apk) as z:
    names = set(z.namelist())
    required = [
        "assets/index.android.bundle",
        "assets/common.bundle",
        "assets/background.bundle",
    ]
    missing = [n for n in required if n not in names]
    if missing:
        raise SystemExit("APK missing JS: " + ", ".join(missing))
    bg = z.getinfo("assets/background.bundle").file_size
    if bg < 1_000_000:
        raise SystemExit(f"APK background.bundle too small: {bg} bytes")
    segs = [n for n in names if n.startswith("assets/segments/")]
    segs_bg = [n for n in names if n.startswith("assets/segments-background/")]
    if segs and not segs_bg:
        raise SystemExit("APK has segments/ but no segments-background/")
    # AGP shortens packed paths (res/-A.png); do not look for Metro filenames.
    res_png = [n for n in names if n.startswith("res/") and n.endswith(".png")]
    res_svg = [n for n in names if n.startswith("res/") and n.endswith(".svg")]
    if len(res_png) < 100:
        raise SystemExit(
            f"APK too few res pngs: {len(res_png)} (SKIP_EXPO_JS_BUNDLE skipped Metro assets)"
        )
    if len(res_svg) < 10:
        raise SystemExit(
            f"APK too few res svgs: {len(res_svg)} (tab icons not packaged)"
        )
print("JS payload OK")
print(f"Android assets OK ({len(res_png)} png, {len(res_svg)} svg)")
PY

cp -f "$GRADLE_APK" "$DEST"
node -e '
  const fs = require("fs");
  const path = require("path");
  const apk = process.argv[1];
  const version = process.argv[2];
  const manifest = {
    version,
    apk: path.basename(apk),
    fileSize: fs.statSync(apk).size,
  };
  fs.writeFileSync(
    path.join(path.dirname(apk), "latest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
' "$DEST" "$VERSION"
echo
echo "Built: $DEST"
echo "Built: $DIST_DIR/latest.json"
echo "Upload to: https://www.moblus.net/download/app-${VERSION}.apk"
echo "Update:   https://www.moblus.net/download/latest.json"
echo "Phones on a lower VERSION will download this file. Same signing key required."
echo "Do not ship ProdDebug or yarn app:android output."
