type INativeLogger = {
  write: (level: number, message: string) => void;
  getLogDirectory: () => string;
  flushPendingRepeat?: () => void;
};

const stubNativeLogger: INativeLogger = {
  write() {},
  getLogDirectory() {
    return '';
  },
  flushPendingRepeat() {},
};

let cachedNativeLogger: INativeLogger | undefined;

function getNativeLogger(): INativeLogger {
  if (cachedNativeLogger) {
    return cachedNativeLogger;
  }
  try {
    // Lazy require so a Nitro boot failure can fall back to the stub without
    // crashing the Release entry graph at import time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
    const mod = require('@onekeyfe/react-native-native-logger') as {
      NativeLogger?: INativeLogger;
    };
    cachedNativeLogger = mod.NativeLogger ?? stubNativeLogger;
  } catch {
    cachedNativeLogger = stubNativeLogger;
  }
  return cachedNativeLogger;
}

export const NativeLogger: INativeLogger = {
  write(level, message) {
    getNativeLogger().write(level, message);
  },
  getLogDirectory() {
    return getNativeLogger().getLogDirectory();
  },
  flushPendingRepeat() {
    getNativeLogger().flushPendingRepeat?.();
  },
};

export const LogLevel = {
  Debug: 0,
  Info: 1,
  Warning: 2,
  Error: 3,
} as const;
