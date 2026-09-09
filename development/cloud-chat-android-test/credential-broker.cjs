// Disposable local-test credentials only. Never logs or writes keys, signatures or JWTs.
const http = require('node:http');
const { Wallet } = require('ethers');

const base = process.env.CLOUD_CHAT_TEST_API;
if (!base || !/^http:\/\/192\.168\./.test(base)) {
  throw new Error('Explicit LAN test API required; production is not supported');
}
const accounts = new Map();
async function createAccount() {
  const wallet = Wallet.createRandom();
  const address = wallet.address.toLowerCase();
  const request = async (path, body) => {
    const response = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Test authentication failed');
    return response.json();
  };
  const challenge = await request('/v1/auth/challenge', { address, chain_id: 1, purpose: 'register' });
  const signature = await wallet.signMessage(challenge.message);
  const auth = await request('/v1/auth/register', { challenge_id: challenge.challenge_id, signature });
  return { base, address, token: auth.access_token, serviceId: auth.user.service_id };
}
http.createServer(async (req, res) => {
  if (req.method !== 'GET' || !/^\/(alice|bob)$/.test(req.url)) { res.writeHead(404).end(); return; }
  try {
    if (!accounts.has(req.url)) accounts.set(req.url, createAccount());
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(await accounts.get(req.url)));
  } catch { res.writeHead(503).end(); }
}).listen(18791, '127.0.0.1', () => console.log('Disposable test broker listening on loopback:18791'));
