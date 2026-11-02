// Who may use the test panel on the live site.
// Start a server with ALLOW_TRIAL=0 ALLOW_GUEST=1 and TEST_WALLETS set to the address of a throwaway key, then:
// TESTER_KEY=0x... node tests/testers.test.js [baseUrl]
const BASE = process.argv[2] || 'http://localhost:3000';
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra ? ' -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
function client() {
  let cookie = '';
  return async (path, body) => {
    const r = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
async function signIn(account) {
  const c = client();
  const n = await c('/api/auth/nonce', { address: account.address });
  await c('/api/auth/verify', { ticket: n.body.ticket, signature: await account.signMessage({ message: n.body.message }) });
  return c;
}
const refused = async c => {
  const before = (await c('/api/me')).body.state.coins;
  const out = [];
  for (const body of [{ op: 'coins' }, { op: 'chests' }, { op: 'food' }, { op: 'pets' }, { op: 'sweep' }, { op: 'jump', n: 50 }, { op: 'wipe' }]) out.push((await c('/api/dev', body)).status);
  const after = (await c('/api/me')).body.state;
  return out.every(s => s === 403) && after.coins === before && after.top === 0;
};
(async () => {
  const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts');
  const tester = privateKeyToAccount(process.env.TESTER_KEY), other = privateKeyToAccount(generatePrivateKey());
  const config = await (await fetch(BASE + '/api/config')).json();
  check('this server gives the panel to nobody by default', !('trial' in config), config);
  const anon = client();
  check('no session cannot use the panel', (await anon('/api/dev', { op: 'coins' })).status === 401);
  const guest = client();await guest('/api/auth/guest', {});
  check('a guest is not told it has the panel', (await guest('/api/me')).body.player.trial === false);
  check('a guest is refused every test action and nothing changes', await refused(guest));
  const stranger = await signIn(other);
  const meOther = await stranger('/api/me');
  check('another wallet is not told it has the panel', meOther.body.player.trial === false && !!meOther.body.player.wallet, meOther.body.player);
  check('another wallet is refused every test action and nothing changes', await refused(stranger));
  const t = await signIn(tester);
  const meT = await t('/api/me');
  check('the test wallet is told it has the panel', meT.body.player.trial === true && meT.body.player.wallet === tester.address.toLowerCase(), meT.body.player);
  const c0 = meT.body.state.coins;
  const added = await t('/api/dev', { op: 'coins' });
  check('the test wallet can add coins', added.status === 200 && added.body.state.coins === c0 + 10000, added.body);
  const jumped = await t('/api/dev', { op: 'jump', n: 20 });
  check('the test wallet can jump floors', jumped.status === 200 && jumped.body.state.top === 20, jumped.body.state && jumped.body.state.top);
  const wiped = await t('/api/dev', { op: 'wipe' });
  check('the test wallet can erase its own data', wiped.status === 200 && wiped.body.state.top === 0 && wiped.body.state.coins === 0);
  check('the other wallet was not touched by any of this', (await stranger('/api/me')).body.state.coins === 0);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Test run failed:', e); process.exit(1); });
