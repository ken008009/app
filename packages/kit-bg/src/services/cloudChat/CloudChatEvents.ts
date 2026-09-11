/** Owned only by bg. Notifications are hints; HTTP and native storage own delivery. */
export class CloudChatEvents {
  private socket: WebSocket | undefined;

  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  private watchdog: ReturnType<typeof setTimeout> | undefined;

  private syncTimer: ReturnType<typeof setTimeout> | undefined;

  private stopped = true;

  private failures = 0;

  constructor(
    private readonly options: {
      baseUrl: string;
      token: string;
      onSync: () => void;
      onUnauthorized: () => void;
      createSocket?: (url: string) => WebSocket;
    },
  ) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.watchdog);
    clearTimeout(this.syncTimer);
    this.reconnectTimer = undefined;
    this.watchdog = undefined;
    this.syncTimer = undefined;
    this.closeSocket();
  }

  private closeSocket() {
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {
        // Some native implementations cannot close an unfinished handshake.
      }
    }
  }

  private reconnect(minimumDelay = 1000) {
    if (this.stopped || this.reconnectTimer) return;
    clearTimeout(this.watchdog);
    this.closeSocket();
    const delay = Math.max(
      minimumDelay,
      Math.min(30_000, 1000 * 2 ** Math.min(this.failures, 5)),
    );
    this.failures += 1;
    this.reconnectTimer = setTimeout(
      () => {
        this.reconnectTimer = undefined;
        this.connect();
      },
      delay + Math.floor(Math.random() * 1000),
    );
  }

  private armWatchdog(delay: number) {
    clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => this.reconnect(), delay);
  }

  private connect() {
    if (this.stopped) return;
    try {
      const url = new URL(this.options.baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        this.stop();
        return;
      }
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/v1/signal/events`;
      url.search = '';
      url.hash = '';
      url.username = '';
      url.password = '';
      const socket = this.options.createSocket
        ? this.options.createSocket(url.toString())
        : new WebSocket(url.toString());
      this.socket = socket;
      this.armWatchdog(10_000);
      socket.onopen = () => {
        if (this.stopped || this.socket !== socket) return;
        try {
          socket.send(
            JSON.stringify({ type: 'auth', token: this.options.token }),
          );
        } catch {
          this.reconnect();
        }
      };
      socket.onmessage = (event) => {
        if (this.stopped || this.socket !== socket) return;
        if (typeof event.data !== 'string' || event.data.length > 1024) return;
        let type: unknown;
        try {
          const data: unknown = JSON.parse(event.data);
          if (data && typeof data === 'object' && 'type' in data) {
            type = data.type;
          }
        } catch {
          return;
        }
        if (
          typeof type !== 'string' ||
          !['ready', 'inbox_changed', 'sync_required'].includes(type)
        )
          return;
        this.failures = 0;
        // The server sends sync_required every 20 seconds, including when idle.
        this.armWatchdog(60_000);
        if (!this.syncTimer) {
          this.syncTimer = setTimeout(() => {
            this.syncTimer = undefined;
            if (!this.stopped) this.options.onSync();
          }, 250);
        }
      };
      socket.onerror = () => {
        if (this.socket === socket) this.reconnect();
      };
      socket.onclose = (event) => {
        if (this.stopped || this.socket !== socket) return;
        if (event.code === 4401) {
          this.stop();
          this.options.onUnauthorized();
        } else {
          this.reconnect(event.code === 4429 ? 30_000 : 1000);
        }
      };
    } catch {
      // HTTP polling stays available if WebSocket setup fails.
      this.reconnect();
    }
  }
}
