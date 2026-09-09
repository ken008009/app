#!/usr/bin/env node

/**
 * Local CloudChat relay for two-device testing (Android emulator + phone).
 *
 *   yarn cloud-chat:relay
 *
 * Bind: 0.0.0.0:8787
 *   - Emulator:  http://10.0.2.2:8787
 *   - USB phone: adb reverse tcp:8787 tcp:8787  then http://127.0.0.1:8787
 *   - Wi-Fi:     http://<Mac-LAN-IP>:8787
 */

const http = require('node:http');
const { Server } = require('socket.io');

const PORT = Number(process.env.CLOUD_CHAT_RELAY_PORT || 8787);

const userSockets = new Map();

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        online: userSockets.size,
        users: [...userSockets.keys()],
      }),
    );
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('ms-wallet CloudChat relay\nGET /health for online users\n');
});

const io = new Server(server, {
  cors: { origin: true },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  let registeredUserId = '';

  socket.on('register', (payload = {}) => {
    const userId = String(payload.userId || '')
      .trim()
      .toLowerCase();
    if (!userId) {
      socket.emit('error', { message: 'userId required' });
      return;
    }
    registeredUserId = userId;
    const prev = userSockets.get(userId);
    if (prev && prev.id !== socket.id) {
      prev.disconnect(true);
    }
    userSockets.set(userId, socket);
    void socket.join(userId);
    console.log(`[cloud-chat-relay] register ${userId} (${socket.id})`);
    socket.emit('registered', {
      userId,
      online: userSockets.size,
    });
  });

  socket.on('send', (payload = {}) => {
    const to = String(payload.to || '')
      .trim()
      .toLowerCase();
    const text = String(payload.text || '');
    const id = String(payload.id || `${Date.now()}-${Math.random()}`);
    if (!registeredUserId) {
      socket.emit('error', { message: 'register first' });
      return;
    }
    if (!to || !text) {
      socket.emit('error', { message: 'to and text required' });
      return;
    }
    const message = {
      id,
      from: registeredUserId,
      to,
      text,
      createdAt: Date.now(),
    };
    console.log(
      `[cloud-chat-relay] ${registeredUserId.slice(0, 10)}… -> ${to.slice(0, 10)}… (${text.length} chars)`,
    );
    io.to(to).emit('message', message);
    socket.emit('sent', { id });
  });

  socket.on('disconnect', () => {
    if (registeredUserId && userSockets.get(registeredUserId) === socket) {
      userSockets.delete(registeredUserId);
      console.log(`[cloud-chat-relay] leave ${registeredUserId}`);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[cloud-chat-relay] listening on 0.0.0.0:${PORT}`);
  console.log('  emulator:  http://10.0.2.2:8787');
  console.log('  USB phone: adb reverse tcp:8787 tcp:8787 then http://127.0.0.1:8787');
  console.log('  Wi-Fi:     http://<this-machine-lan-ip>:8787');
});
