// Squeek pets against a running local server. Who holds each Squeek comes from a file the test writes, so it can move a Squeek between wallets:
// start the server with SQUEEK_FAKE_OWNERS=@<file> SQUEEK_RECHECK_MS=0 ALLOW_TRIAL=1, then: node tests/squeek.test.js <baseUrl> <file>
// Traits and pictures are still read from the real collection on Sepolia, read only. The two wallets are made from fixed test words and never hold anything.
const fs = require('fs');
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const { keccak256, toHex } = require('viem');
const BASE = process.argv[2] || 'http://localhost:3000', FILE = process.argv[3];
if (!FILE) { console.log('usage: node tests/squeek.test.js <baseUrl> <owners file>'); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
function client() {
  let cookie = '';
  return async function call(path, body) {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);
    const sc = r.headers.get('set-cookie');if (sc) cookie = sc.split(';')[0];
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j, headers: r.headers };
  };
}
const A = privateKeyToAccount(keccak256(toHex('hamster tower squeek test wallet A'))), Bk = privateKeyToAccount(keccak256(toHex('hamster tower squeek test wallet B')));
const a = A.address.toLowerCase(), b = Bk.address.toLowerCase();
const owners = s => fs.writeFileSync(FILE, s);
async function signIn(call, acct) {
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  const signature = await acct.signMessage({ message: n.body.message });
  return call('/api/auth/verify', { ticket: n.body.ticket, signature });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const plainPlan = B => { const p = {}; E.alive(B, 'p').forEach(u => { p[u.id] = { i: 0, target: null }; }); return p; };
(async () => {
  owners(`359:${a}:2,361:${a}:1,363:${b}:2`);
  const g = client(), wa = client(), wb = client();
  console.log('Who can bring Squeeks');
  await g('/api/auth/guest', {});
  check('a guest cannot bring Squeeks', (await g('/api/squeek/sync', { ids: [359] })).status === 403);
  check('wallet A signs in', (await signIn(wa, A)).status === 200);
  check('wallet B signs in', (await signIn(wb, Bk)).status === 200);
  check('a list that is not a list is refused', (await wa('/api/squeek/sync', { ids: 'x' })).status === 400);

  console.log('Checked on the chain, one by one');
  const s1 = await wa('/api/squeek/sync', { ids: [359, 361, 363, 77777, -5, 'x'] });
  check('only the Squeeks wallet A holds are found', s1.status === 200 && JSON.stringify(s1.body.found) === '[359,361]', s1.body);
  const o = s1.body.state && s1.body.state.owned;
  check('each one becomes a pet with its traits and merge level', o && o.sq359 && o.sq359.sq.lv === 2 && o.sq359.star === 2 && o.sq361.star === 1 && o.sq359.sq.t.pal === 'Hot Magenta', o && o.sq359);
  check('a Squeek of another wallet is not added', o && !o.sq363);
  const art = await wa('/api/squeek/art?ids=359,361');
  check('its dots come back for drawing', art.status === 200 && art.body.art[359] && art.body.art[359].parts.head.length > 50 && art.body.art[359].traits.Eyes === 'Vertical Slits', Object.keys(art.body.art || {}));
  check('the CDN may keep them', /s-maxage/.test(art.headers.get('cache-control') || ''));
  const pic = await wa('/api/squeek/pic?id=359');
  check('the real picture comes back as data for an img tag', pic.status === 200 && Buffer.from(pic.body.svg, 'base64').toString('utf8').startsWith('<svg'));
  check('a Squeek nobody brought in has no picture here', (await wa('/api/squeek/pic?id=4321')).status === 404);

  console.log('Teams');
  const two = await wa('/api/action', { type: 'team', team: ['sq359', 'sq361'], requestId: 't1' });
  check('two Squeeks in one team are refused', two.status === 400 && /one Squeek/.test(two.body.error), two.body);
  const one = await wa('/api/action', { type: 'team', team: ['sq359', 'blade'], requestId: 't2' });
  check('one Squeek joins the team', one.status === 200 && one.body.state.team[0] === 'sq359', one.body);
  const notMine = await wa('/api/action', { type: 'team', team: ['sq363', 'blade'], requestId: 't3' });
  check('a Squeek that is not yours cannot join', notMine.status === 400, notMine.body);

  console.log('Battles');
  const f = await wa('/api/fight/start', { floor: 1 });
  check('a battle starts with the Squeek in it', f.status === 200 && f.body.B.units[0].sq && f.body.B.units[0].sq.id === 359, f.body.error);
  await sleep((f.body.minMs || 0) + 50);
  const t = await wa('/api/fight/turn', { token: f.body.token, plan: plainPlan(f.body.B) });
  check('and its turns play on the server', t.status === 200 && Array.isArray(t.body.ev) && t.body.ev.some(e => e.t === 'use' && e.who === 'p0'), t.body.error);

  console.log('A Squeek fights for one player at a time');
  owners(`359:${b}:2,361:${a}:1,363:${b}:2`);
  const sb = await wb('/api/squeek/sync', { ids: [359, 363] });
  check('wallet B brings the Squeek it now holds', sb.status === 200 && JSON.stringify(sb.body.found) === '[359,363]', sb.body);
  const fa = await wa('/api/fight/start', { floor: 1 });
  check('wallet A can no longer fight with it', fa.status === 409 && /no longer in your wallet/.test(fa.body.error), fa.body);
  check('and it left A\'s team at once', fa.body.state && !fa.body.state.team.includes('sq359'), fa.body.state && fa.body.state.team);
  const back = await wa('/api/action', { type: 'team', team: ['sq359'], requestId: 't4' });
  check('it cannot be put back while B holds it', back.status === 400 && /left your wallet/.test(back.body.error), back.body);
  const fa2 = await wa('/api/fight/start', { floor: 1 });
  check('A still plays with the rest of the team', fa2.status === 200, fa2.body.error);

  console.log('Back to wallet A, and a burned Squeek');
  owners(`359:${a}:3,363:${b}:2`);
  const s2 = await wa('/api/squeek/sync', { ids: [359] });
  const o2 = s2.body.state && s2.body.state.owned;
  check('when it comes back it can fight again, with its new merge level', s2.status === 200 && o2.sq359 && !o2.sq359.sq.gone && o2.sq359.sq.lv === 3 && o2.sq359.star === 3, o2 && o2.sq359);
  check('a burned Squeek is marked as gone', o2 && o2.sq361 && o2.sq361.sq.gone === 1, o2 && o2.sq361);
  const sb2 = await wb('/api/squeek/sync', { ids: [] });
  check('B\'s save marks it as gone', sb2.body.state && sb2.body.state.owned.sq359 && sb2.body.state.owned.sq359.sq.gone === 1, sb2.body.state && sb2.body.state.owned.sq359);

  console.log('Arena and public pages');
  await wa('/api/dev', { op: 'jump', n: 12 });
  await wa('/api/action', { type: 'team', team: ['sq359', 'blade'], requestId: 't6' });
  const def = await wa('/api/arena/defense', {});
  check('a defense team keeps the Squeek and its traits', def.status === 200 && def.body.def.team[0].id === 'sq359' && def.body.def.team[0].sq.t.eye === 'Vertical Slits', def.body);
  const ar = await wa('/api/arena/start', { floor: 1 });
  check('an Arena fight starts with the Squeek', ar.status === 200 && ar.body.B.units.some(u => u.sq && u.sq.id === 359), ar.body.error);
  const me = await wa('/api/me');
  const prof = await wa('/api/player?id=' + me.body.player.id);
  check('the public page shows the Squeek with its traits', prof.status === 200 && prof.body.team.some(x => x.id === 'sq359' && x.sq && x.sq.lv === 3), prof.body.team);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
