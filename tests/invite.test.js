// Invites against a running local server and its database: the code, joining once, who may join, nothing paid before the friend has
// climbed, then each side paid once, and the cap on friends paid. Start the server with ALLOW_GUEST=1, RATE_LIMIT_OFF=1 and TEST_WALLETS
// holding wallet D below. Then: node tests/invite.test.js <baseUrl> <databaseUrl>
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const v = require('viem');
const { Client } = require('pg');
const [BASE, DB] = process.argv.slice(2);
if (!BASE || !DB) { console.log('usage: node tests/invite.test.js <baseUrl> <databaseUrl>'); process.exit(2); }
process.env.DATABASE_URL = DB;
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
function client() {
  const jar = new Map();
  return async (path, body) => {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, jar.size ? { cookie: [...jar].map(([k, val]) => k + '=' + val).join('; ') } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'), i = kv.indexOf('='); const k = kv.slice(0, i).trim(), val = kv.slice(i + 1).trim(); if (/max-age=0/i.test(c) || !val) jar.delete(k); else jar.set(k, val); }
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
const word = w => privateKeyToAccount(v.keccak256(v.toHex('hamster tower sqk test ' + w)));
async function wallet(name) {
  const call = client(), acct = word(name);
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  await call('/api/auth/verify', { ticket: n.body.ticket, signature: await acct.signMessage({ message: n.body.message }) });
  const me = (await call('/api/me')).body;
  return { call, id: me.player.id, coins: me.state.coins };
}
(async () => {
  const db = new Client({ connectionString: DB });await db.connect();
  const tag = 'invite ' + Date.now() + ' ';
  const A = await wallet(tag + 'A'), B = await wallet(tag + 'B'), C = await wallet(tag + 'C');
  const a = (await A.call('/api/ref/me')).body;

  console.log('the code');
  check('a wallet has a code and no friends yet', a.wallet === true && /^[0-9a-z]{5,14}$/.test(a.code) && a.friends === 0 && a.paid === 0 && a.cap === E.REF.cap, a);
  const RF = require('../lib/referrals');
  check('the code reads back to the player and a changed one does not', RF.idOf(a.code) === A.id && RF.idOf(a.code.slice(0, -1) + (a.code.endsWith('0') ? '1' : '0')) === null && RF.idOf('zz') === null && RF.idOf(null) === null);

  console.log('joining');
  const g = client();await g('/api/auth/guest', {});
  check('a guest cannot use a code', (await g('/api/ref/use', { code: a.code })).status === 400);
  check('a made up code is refused', (await B.call('/api/ref/use', { code: 'abcdef12' })).status === 400);
  check('nobody can use their own code', (await A.call('/api/ref/use', { code: a.code })).status === 400);
  const dev = await wallet('wallet D');
  const dcode = (await dev.call('/api/ref/me')).body.code;
  check('a dev wallet cannot be invited by and cannot join', (await B.call('/api/ref/use', { code: dcode })).status === 400 && (await dev.call('/api/ref/use', { code: a.code })).status === 400);
  await db.query('UPDATE players SET top = 1 WHERE id = $1', [C.id]);
  check('a player who has already climbed cannot join', (await C.call('/api/ref/use', { code: a.code })).status === 400);
  const u = await B.call('/api/ref/use', { code: a.code });
  check('a new wallet joins', u.status === 200 && u.body.floor === E.REF.floor, u.body);
  check('and only once', (await B.call('/api/ref/use', { code: (await C.call('/api/ref/me')).body.code })).status === 409);

  console.log('nothing before the friend climbs');
  let am = (await A.call('/api/ref/me')).body;
  check('the inviter sees one friend, none climbed', am.friends === 1 && am.reached === 0 && am.claimable === 0, am);
  check('collecting pays nothing yet', (await A.call('/api/ref/claim', {})).body.paid === 0 && (await B.call('/api/ref/claim', {})).body.got === null);
  await db.query('UPDATE players SET top = $2 WHERE id = $1', [B.id, E.REF.floor - 1]);
  check('one floor short still pays nothing', (await A.call('/api/ref/claim', {})).body.paid === 0);

  console.log('both are paid once');
  await db.query('UPDATE players SET top = $2 WHERE id = $1', [B.id, E.REF.floor]);
  am = (await A.call('/api/ref/me')).body;
  check('the inviter has one reward waiting', am.reached === 1 && am.claimable === 1, am);
  const before = (await A.call('/api/me')).body.state;
  const ac = await A.call('/api/ref/claim', {});
  check('the inviter is paid coins and a chest', ac.body.paid === 1 && ac.body.coins === E.REF.referrer.coins && ac.body.state.coins === before.coins + E.REF.referrer.coins && ac.body.state.chests[E.REF.referrer.chest] === before.chests[E.REF.referrer.chest] + E.REF.referrer.n, ac.body);
  check('and not twice', (await A.call('/api/ref/claim', {})).body.paid === 0 && (await A.call('/api/ref/me')).body.claimable === 0);
  const bBefore = (await B.call('/api/me')).body.state;
  const bc = await B.call('/api/ref/claim', {});
  check('the invited player is paid too', bc.body.got && bc.body.got.coins === E.REF.referee.coins && bc.body.state.coins === bBefore.coins + E.REF.referee.coins && bc.body.state.chests[E.REF.referee.chest] === bBefore.chests[E.REF.referee.chest] + E.REF.referee.n, bc.body);
  check('and not twice', (await B.call('/api/ref/claim', {})).body.got === null);
  check('a player who invited nobody gets nothing from collecting', (await C.call('/api/ref/claim', {})).body.paid === 0);

  console.log('the cap');
  const many = [];
  for (let i = 0; i < E.REF.cap + 2; i++) many.push((await wallet(tag + 'friend ' + i)).id);
  for (const id of many) { await db.query('INSERT INTO referrals (referee_id, referrer_id) VALUES ($1, $2)', [id, A.id]);await db.query('UPDATE players SET top = $2 WHERE id = $1', [id, E.REF.floor]); }
  const big = await A.call('/api/ref/claim', {});
  const left = E.REF.cap - 1;
  check('the inviter is paid for friends up to the cap and no further', big.body.paid === left && big.body.state.gifts.refPaid.length === E.REF.cap, { paid: big.body.paid, n: big.body.state.gifts.refPaid && big.body.state.gifts.refPaid.length });
  check('the rest wait forever', (await A.call('/api/ref/claim', {})).body.paid === 0 && (await A.call('/api/ref/me')).body.claimable === 0);
  check('removing a player removes its invite with it', (await db.query('DELETE FROM players WHERE id = $1 RETURNING id', [many[0]])).rowCount === 1 && (await db.query('SELECT 1 FROM referrals WHERE referee_id = $1', [many[0]])).rowCount === 0);

  await db.query('DELETE FROM players WHERE id = ANY($1)', [[A.id, B.id, C.id, ...many]]);
  await db.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 300);
})().catch(e => { console.log('FAIL crashed', e.stack || e.message); process.exit(1); });
