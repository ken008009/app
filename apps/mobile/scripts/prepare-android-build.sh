#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ensure_node_on_path() {
  if command -v node >/dev/null 2>&1; then
    return 0
  fi
  if [ -x "/opt/homebrew/bin/node" ]; then
    export PATH="/opt/homebrew/bin:$PATH"
    return 0
  fi
  if [ -x "/usr/local/bin/node" ]; then
    export PATH="/usr/local/bin:$PATH"
    return 0
  fi
  if [ -n "${NVM_DIR:-}" ] && [ -s "${NVM_DIR}/nvm.sh" ]; then
    # shellcheck source=/dev/null
    source "${NVM_DIR}/nvm.sh" --no-use
    return 0
  fi
  local nvm_bin
  nvm_bin="$(ls -d "${HOME}/.nvm/versions/node/"*/bin 2>/dev/null | tail -1 || true)"
  if [ -n "$nvm_bin" ] && [ -x "${nvm_bin}/node" ]; then
    export PATH="${nvm_bin}:$PATH"
  fi
}

ensure_node_on_path

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found. Install Node.js >= 22 (nvm or Homebrew)." >&2
  exit 1
fi

if [ -z "${ANDROID_HOME:-}" ] && [ -d "${HOME}/Library/Android/sdk" ]; then
  export ANDROID_HOME="${HOME}/Library/Android/sdk"
  export PATH="${ANDROID_HOME}/platform-tools:${ANDROID_HOME}/emulator:$PATH"
fi

if [ ! -f "android/local.properties" ] && [ -n "${ANDROID_HOME:-}" ]; then
  printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
fi

# Gradle daemon may have been started by Android Studio without node on PATH.
if [ -f "android/gradlew" ]; then
  (cd android && ./gradlew --stop) >/dev/null 2>&1 || true
fi
