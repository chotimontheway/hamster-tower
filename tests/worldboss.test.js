// The World Boss against two running local servers on one database: one where the Arena window is open (the hamster is running) and one where
// it is shut. A boss is fought through the same turns as any battle, its damage counts once and adds to one total, three fights are the most,
// and a finished run pays everyone who fought, more if the boss fell, and a prize to the top 10 wallets. Start the open server with
// ARENA_WINDOW_MIN=100000000 and the closed one with ARENA_WINDOW_MIN=-100000000, both with ALLOW_GUEST=1, MIN_MS_PER_ROUND=0, RATE_LIMIT_OFF=1
// and TEST_WALLETS holding wallet D below. Then: node tests/worldboss.test.js <openBase> <closedBase> <databaseUrl>
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const v = require('viem');
const { Client } = require('pg');
const [OPEN, CLOSED, DB] = process.argv.slice(2);
if (!OPEN || !CLOSED || !DB) { console.log('usage: node tests/worldboss.test.js <openBase> <closedBase> <databaseUrl>'); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
function client(base) {
  const jar = new Map();
  return async (path, body) => {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, jar.size ? { cookie: [...jar].map(([k, val]) => k + '=' + val).join('; ') } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch((base || OPEN) + path, init);
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'), i = kv.indexOf('='); const k = kv.slice(0, i).trim(), val = kv.slice(i + 1).trim(); if (/max-age=0/i.test(c) || !val) jar.delete(k); else jar.set(k, val); }
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
const word = w => privateKeyToAccount(v.keccak256(v.toHex('hamster tower sqk test ' + w)));
async function wallet(name, base) {
  const call = client(base), acct = word(name);
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  await call('/api/auth/verify', { ticket: n.body.ticket, signature: await acct.signMessage({ message: n.body.message }) });
  const me = (await call('/api/me')).body;
  return { call, id: me.player.id };
}
const plan = Bt => { const p = {}; E.alive(Bt, 'p').forEach(u => { p[u.id] = { i: E.canPick(Bt, u.id, 2) ? 2 : E.canPick(Bt, u.id, 1) ? 1 : 0, target: null }; }); return p; };
/* one whole fight: starts it and plays every turn. Gives the last answer and the plan and token of the last turn, to ask it again */
async function fight(call) {
  const s = await call('/api/wb/start', {});
  if (s.status !== 200) return { start: s };
  let token = s.body.token, Bt = s.body.B, r = null, last = null;
  for (let g = 0; g < 120; g++) {
    const p = plan(Bt);last = { token, plan: p };
    r = await call('/api/fight/turn', { token, plan: p });
    if (r.status !== 200 || r.body.over) break;
    token = r.body.token;Bt = r.body.B;
  }
  return { start: s, end: r, last };
}
(async () => {
  const db = new Client({ connectionString: DB });await db.connect();
  const tag = 'wb ' + Date.now() + ' ';

  console.log('while he rests');
  const closed = client(CLOSED);await closed('/api/auth/guest', {});
  const cv = (await closed('/api/wb')).body;
  check('the public view says no boss is up', cv.active === false && cv.tries === E.WB.tries, cv);
  check('a fight cannot start', (await closed('/api/wb/start', {})).status === 409);

  console.log('while he runs');
  const ov = (await client()('/api/wb')).body;
  check('the boss is up with its pool and no damage yet', ov.active === true && ov.boss && ov.boss.pool === E.WB.pool && ov.boss.dmg === 0 && E.BOSS_LIST.some(b => b.id === ov.boss.id), ov);
  check('it is the same boss for everyone in the run', ov.boss.id === E.wbBossOf(ov.boss.session));
  check('a made up player cannot start a fight', (await client()('/api/wb/start', {})).status === 401);
  const g = client();await g('/api/auth/guest', {});
  const f1 = await fight(g);
  check('a guest fights and the fight ends with damage counted', f1.end && f1.end.status === 200 && f1.end.body.wb && f1.end.body.wb.dmg > 0 && f1.end.body.wb.left === E.WB.tries - 1, f1.end && f1.end.body && f1.end.body.wb);
  const d1 = f1.end.body.wb.dmg;
  check('the damage is what the boss lost, never more than its hit points', d1 > 0 && d1 <= 60000 && f1.end.body.wb.mine === d1);
  const again = await g('/api/fight/turn', f1.last);
  check('asking for the last turn again gives the same answer and counts nothing more', again.status === 200 && again.body.wb && again.body.wb.dmg === d1 && again.body.wb.mine === d1, again.body && again.body.wb);
  const f2 = await fight(g), f3 = await fight(g);
  const all = f1.end.body.wb.dmg + f2.end.body.wb.dmg + f3.end.body.wb.dmg;
  check('three fights are the most', f2.end.body.wb && f3.end.body.wb && f3.end.body.wb.left === 0 && f3.end.body.wb.mine === all, f3.end.body.wb);
  const f4 = await g('/api/wb/start', {});
  check('a fourth fight is refused', f4.status === 409, f4.body);
  const me = (await g('/api/wb/me')).body;
  check('the player sees its damage and no fights left', me.dmg === all && me.left === 0, me);
  await new Promise(r => setTimeout(r, 9000));
  const ov2 = (await client()('/api/wb')).body;
  check('the shared total counts every fight once', ov2.boss.dmg >= all && ov2.players >= 1, { total: ov2.boss.dmg, all });
  const other = await wallet(tag + 'other');
  const fo = await fight(other.call);
  check('another player adds to the same total', fo.end && fo.end.body.wb && fo.end.body.wb.total >= all + fo.end.body.wb.dmg, fo.end && fo.end.body.wb);
  check('a wallet that fought is ranked, a guest is not', fo.end.body.wb.rank >= 1 && f3.end.body.wb.rank === null, [fo.end.body.wb.rank, f3.end.body.wb.rank]);
  const dev = await wallet('wallet D');
  const fd = await fight(dev.call);
  check('a dev wallet fights for practice and the board does not move', fd.end && fd.end.body.wb && fd.end.body.wb.dev === true && (await db.query('SELECT dmg FROM world_boss_dmg WHERE session = $1 AND player_id = $2', [ov.boss.session, dev.id])).rows.every(r => Number(r.dmg) === 0));
  check('the run in progress is not paid early', (await g('/api/wb/claim', {})).body.runs.length === 0);

  console.log('a finished run pays');
  const old = Math.floor(Date.now() / 1000) - 7200;
  const ws = [];
  for (let i = 1; i <= 12; i++) ws.push(await wallet(tag + 'w' + i));
  const guest = client();await guest('/api/auth/guest', {});const gid = (await guest('/api/me')).body.player.id;
  await db.query('INSERT INTO world_boss (session, boss, pool, dmg, killed_at) VALUES ($1, $2, $3, $4, now())', [old, 'alarm_clock', E.WB.pool, E.WB.pool + 10000]);
  const rows = [[gid, 99000], [dev.id, 98000], ...ws.map((w, i) => [w.id, 50000 - i * 1000])];
  for (const [pid, dmg] of rows) await db.query('INSERT INTO world_boss_dmg (session, player_id, dmg, tries, at) VALUES ($1, $2, $3, 3, now() - interval \'1 hour\')', [old, pid, dmg]);
  /* a tie on damage goes to whoever got there first: wallet 11 reached wallet 10's damage a minute later, so the tenth place stays with wallet 10 */
  await db.query('UPDATE world_boss_dmg SET dmg = $3, at = now() - interval \'59 minutes\' WHERE session = $1 AND player_id = $2', [old, ws[10].id, 50000 - 9 * 1000]);
  const got = [];
  for (const w of ws) got.push((await w.call('/api/wb/claim', {})).body);
  const sum = r => r.runs.length ? r.runs[0] : null;
  const coins = got.map(r => sum(r) ? sum(r).coins : null);
  const part = E.WB_PART.coins + E.WB_KILL.coins;
  check('first place of the wallets gets the top prize, the guest and dev wallet do not count', coins[0] === part + 3000 && sum(got[0]).rank === 1 && sum(got[0]).prize.chest === 4, sum(got[0]));
  check('second and third get the middle prize', coins[1] === part + 2000 && coins[2] === part + 2000 && sum(got[1]).rank === 2 && sum(got[2]).rank === 3, [coins[1], coins[2]]);
  check('fourth to tenth get the last prize', coins.slice(3, 10).every(c => c === part + 1000) && sum(got[9]).rank === 10, coins.slice(3, 10));
  check('eleventh and twelfth get the fighting and the fall rewards only', coins[10] === part && coins[11] === part && sum(got[10]).prize === null, [coins[10], coins[11]]);
  const st = got[0].state;
  check('the chests are in the save: two Wood, a Silver for the fall, a Diamond for first place', st.chests[0] >= E.WB_PART.n && st.chests[2] >= E.WB_KILL.n && st.chests[4] >= 1, st.chests);
  check('asking again pays nothing', (await ws[0].call('/api/wb/claim', {})).body.runs.length === 0 && (await ws[0].call('/api/wb/me')).body.owed === 0);
  const gc = (await guest('/api/wb/claim', {})).body;
  check('a guest is paid for fighting but has no place to be paid for', gc.runs.length === 1 && gc.runs[0].rank === null && gc.runs[0].coins === part, gc.runs[0]);
  const dc = (await dev.call('/api/wb/claim', {})).body;
  check('a dev wallet is paid nothing', dc.runs.length === 0);
  check('a run older than 3 days is not paid', await (async () => {
    const o = await wallet(tag + 'late'), s = Math.floor(Date.now() / 1000) - 5 * 86400;
    await db.query('INSERT INTO world_boss (session, boss, pool, dmg) VALUES ($1, $2, $3, 0)', [s, 'alarm_clock', E.WB.pool]);
    await db.query('INSERT INTO world_boss_dmg (session, player_id, dmg, tries) VALUES ($1, $2, 5000, 3)', [s, o.id]);
    return (await o.call('/api/wb/claim', {})).body.runs.length === 0;
  })());

  await db.query('DELETE FROM world_boss WHERE session < $1', [Math.floor(Date.now() / 1000) - 3600]);
  await db.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 300);
})().catch(e => { console.log('FAIL crashed', e.stack || e.message); process.exit(1); });
