import { CloudChatEvents } from './CloudChatEvents';

class TestSocket {
  onopen: (() => void) | null = null;

  onmessage: ((event: { data: unknown }) => void) | null = null;

  onclose: ((event: { code: number }) => void) | null = null;

  onerror: (() => void) | null = null;

  send = jest.fn();

  close = jest.fn();
}

describe('CloudChatEvents lifecycle', () => {
  let sockets: TestSocket[];
  let createSocket: jest.Mock;
  let onSync: jest.Mock;
  let onUnauthorized: jest.Mock;
  let events: CloudChatEvents;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
    sockets = [];
    createSocket = jest.fn(() => {
      const socket = new TestSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    });
    onSync = jest.fn();
    onUnauthorized = jest.fn();
    events = new CloudChatEvents({
      baseUrl: 'https://chat.example',
      token: 'test-token',
      onSync,
      onUnauthorized,
      createSocket,
    });
  });

  afterEach(() => {
    events.stop();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('authenticates in the first frame and coalesces repeated hints', () => {
    events.start();
    events.start();
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(createSocket).toHaveBeenCalledWith(
      'wss://chat.example/v1/signal/events',
    );
    sockets[0].onopen?.();
    expect(sockets[0].send).toHaveBeenCalledWith(
      '{"type":"auth","token":"test-token"}',
    );
    for (const type of ['ready', 'inbox_changed', 'sync_required']) {
      sockets[0].onmessage?.({ data: JSON.stringify({ type }) });
    }
    jest.advanceTimersByTime(250);
    expect(onSync).toHaveBeenCalledTimes(1);
    expect(sockets[0].send).toHaveBeenCalledTimes(1);
  });

  it('does not treat malformed or unknown frames as delivery hints', () => {
    events.start();
    for (const data of [
      'null',
      '{',
      '{}',
      '{"type":"message"}',
      'x'.repeat(1025),
      123,
    ]) {
      sockets[0].onmessage?.({ data });
    }
    jest.advanceTimersByTime(250);
    expect(onSync).not.toHaveBeenCalled();
  });

  it('backs off repeated failures and resynchronizes after reconnect', () => {
    events.start();
    sockets[0].onclose?.({ code: 1006 });
    jest.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
    sockets[1].onclose?.({ code: 1006 });
    jest.advanceTimersByTime(1999);
    expect(sockets).toHaveLength(2);
    jest.advanceTimersByTime(1);
    sockets[2].onmessage?.({ data: '{"type":"ready"}' });
    jest.advanceTimersByTime(250);
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('stops on revoked authentication instead of reconnecting indefinitely', () => {
    events.start();
    sockets[0].onclose?.({ code: 4401 });
    jest.advanceTimersByTime(120_000);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(1);
  });

  it('cancels pending hints and ignores stale callbacks after wallet switching', () => {
    events.start();
    const staleMessage = sockets[0].onmessage;
    sockets[0].onmessage?.({ data: '{"type":"ready"}' });
    events.stop();
    staleMessage?.({ data: '{"type":"inbox_changed"}' });
    jest.advanceTimersByTime(120_000);
    expect(onSync).not.toHaveBeenCalled();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });

  it('waits at least 30 seconds after connection limit rejection', () => {
    events.start();
    sockets[0].onclose?.({ code: 4429 });
    jest.advanceTimersByTime(29_999);
    expect(sockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2);
  });

  it('recovers a silent connection without relying on native ping APIs', () => {
    events.start();
    sockets[0].onmessage?.({ data: '{"type":"ready"}' });
    jest.advanceTimersByTime(60_000);
    expect(sockets[0].close).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });
});
