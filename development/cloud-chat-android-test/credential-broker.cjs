// Disposable local-test credentials only. Never logs or writes keys, signatures or JWTs.
/* eslint-disable onekey/no-raw-error -- Standalone Node test runner cannot load the app TypeScript error classes. */
const http = require('node:http');

const { Wallet } = require('ethers');

const base = process.env.CLOUD_CHAT_TEST_API;
if (base !== 'http://192.168.3.44:8000') {
  throw new Error(
    'Explicit LAN test API required; production is not supported',
  );
}
const accounts = new Map();
async function createAccount() {
  const wallet = Wallet.createRandom();
  const address = wallet.address.toLowerCase();
  const request = async (path, body) => {
    const response = await fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    console.log(new Date().toISOString(), 'POST', path, response.status);
    if (!response.ok) throw new Error('Test authentication failed');
    return response.json();
  };
  const challenge = await request('/v1/auth/challenge', {
    address,
    chain_id: 1,
    purpose: 'register',
  });
  const signature = await wallet.signMessage(challenge.message);
  const auth = await request('/v1/auth/register', {
    challenge_id: challenge.challenge_id,
    signature,
  });
  const loginChallenge = await request('/v1/auth/challenge', {
    address,
    chain_id: 1,
    purpose: 'login',
  });
  const login = await request('/v1/auth/login', {
    challenge_id: loginChallenge.challenge_id,
    signature: await wallet.signMessage(loginChallenge.message),
  });
  const me = await fetch(`${base}/v1/users/me`, {
    headers: { Authorization: `Bearer ${login.access_token}` },
    signal: AbortSignal.timeout(20_000),
  });
  console.log(new Date().toISOString(), 'GET', '/v1/users/me', me.status);
  if (!me.ok || (await me.json()).service_id !== auth.user.service_id)
    throw new Error('Test user mismatch');
  const logout = await fetch(`${base}/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.access_token}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!logout.ok) throw new Error('Test logout failed');
  return {
    base,
    address,
    token: login.access_token,
    serviceId: login.user.service_id,
  };
}
http
  .createServer(async (req, res) => {
    if (req.method !== 'GET' || !/^\/(alice|bob)$/.test(req.url)) {
      res.writeHead(404).end();
      return;
    }
    try {
      if (!accounts.has(req.url)) accounts.set(req.url, createAccount());
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(await accounts.get(req.url)));
    } catch {
      res.writeHead(503).end();
    }
  })
  .listen(18_791, '127.0.0.1', () =>
    console.log('Disposable test broker listening on loopback:18791'),
  );
