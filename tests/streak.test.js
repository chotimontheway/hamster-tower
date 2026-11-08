// The login streak: its rules in the engine, then the action against a running local server and its database.
// Start the server with ALLOW_GUEST=1 and RATE_LIMIT_OFF=1. Then: node tests/streak.test.js <baseUrl> <databaseUrl>
const E = require('../lib/engine.generated.cjs');
const { Client } = require('pg');
const [BASE, DB] = process.argv.slice(2);
if (!BASE || !DB) { console.log('usage: node tests/streak.test.js <baseUrl> <databaseUrl>'); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
function client() {
  const jar = new Map();
  return async (path, body) => {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, jar.size ? { cookie: [...jar].map(([k, v]) => k + '=' + v).join('; ') } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'), i = kv.indexOf('='); const k = kv.slice(0, i).trim(), v = kv.slice(i + 1).trim(); if (/max-age=0/i.test(c) || !v) jar.delete(k); else jar.set(k, v); }
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
let rid = 0;
const act = (call, type, args) => call('/api/action', Object.assign({ type, requestId: 'st' + (++rid) + Date.now() }, args || {}));
(async () => {
  console.log('the rules');
  const D = 864e5, t0 = Date.UTC(2026, 10, 8, 12);
  const G = E.newSave('streak rules');
  check('a new player can collect day 1', JSON.stringify(E.streakNow(G, t0)) === JSON.stringify({ n: 0, can: true, next: 1, lost: false }), E.streakNow(G, t0));
  const r1 = E.claimStreak(G, t0);
  check('day 1 pays its coins and chest', r1.day === 1 && r1.coins === E.STREAK[0].coins && G.coins === E.STREAK[0].coins && G.chests[E.STREAK[0].chest] === E.STREAK[0].n, r1);
  check('it cannot be collected twice on the same UTC day', E.claimStreak(G, t0 + 3 * 3600e3) === null && E.streakNow(G, t0 + 3600e3).can === false);
  const days = [r1];
  for (let i = 1; i < 7; i++) days.push(E.claimStreak(G, t0 + i * D));
  check('seven days in a row each pay more than the one before', days.every((d, i) => d && d.day === i + 1) && days.every((d, i) => i === 0 || d.coins > days[i - 1].coins), days.map(d => d && d.coins));
  const r8 = E.claimStreak(G, t0 + 7 * D);
  check('day 8 starts the week again at the top reward but keeps counting', r8.day === 8 && r8.pos === 0 && r8.coins === E.STREAK[0].coins, r8);
  check('a day passes by: the next morning it can be collected and the streak goes on', E.streakNow(G, t0 + 8 * D).can && E.streakNow(G, t0 + 8 * D).n === 8);
  const miss = E.streakNow(G, t0 + 10 * D);
  check('a missed day starts it from day 1 and says it was lost', miss.n === 0 && miss.next === 1 && miss.lost === true, miss);
  const G2 = E.newSave('streak bad');G2.gifts = { streak: 'x' };
  check('a damaged save is read as no streak', E.streakNow(G2, t0).n === 0 && E.claimStreak(G2, t0).day === 1);
  const G3 = E.newSave('streak bad 2');G3.gifts = { streak: { d: 5, n: 'many' } };
  check('wrong kinds of values are read as nothing', E.streakNow(G3, t0).can === true && E.streakNow(G3, t0).n === 0);

  console.log('the action');
  const db = new Client({ connectionString: DB });await db.connect();
  const a = client();await a('/api/auth/guest', {});
  const me = (await a('/api/me')).body;
  const c0 = me.state.coins;
  const s1 = await act(a, 'streak');
  check('the first collect pays day 1', s1.status === 200 && s1.body.r.day === 1 && s1.body.state.coins === c0 + E.STREAK[0].coins && s1.body.state.gifts.streak.n === 1, s1.body);
  check('collecting again today is refused', (await act(a, 'streak')).status === 400);
  /* yesterday was the last collect: the streak goes on */
  const yesterday = E.dayKey(Date.now() - D);
  await db.query(`UPDATE players SET gifts = jsonb_set(gifts, '{streak}', $2::jsonb) WHERE id = $1`, [me.player.id, JSON.stringify({ d: yesterday, n: 3 })]);
  const s2 = await act(a, 'streak');
  check('after a day the streak goes on to day 4', s2.status === 200 && s2.body.r.day === 4 && s2.body.state.gifts.streak.n === 4, s2.body);
  await db.query(`UPDATE players SET gifts = jsonb_set(gifts, '{streak}', $2::jsonb) WHERE id = $1`, [me.player.id, JSON.stringify({ d: E.dayKey(Date.now() - 3 * D), n: 6 })]);
  const s3 = await act(a, 'streak');
  check('after missing days it starts from day 1', s3.status === 200 && s3.body.r.day === 1, s3.body);
  check('nobody else can collect it for a player', (await client()('/api/action', { type: 'streak', requestId: 'x' + Date.now() })).status === 401);
  await db.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
})().catch(e => { console.log('FAIL crashed', e.stack || e.message); process.exit(1); });
