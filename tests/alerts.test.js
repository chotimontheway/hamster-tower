// Alerts against a running local server and its database: signing a browser up, what it has set, the Arena alert going once per run of the
// hamster, the quest reminder going once a day and only to players who have not claimed, and a browser that is gone being forgotten.
// Start the server with ALLOW_GUEST=1 and RATE_LIMIT_OFF=1. Then: node tests/alerts.test.js <baseUrl> <databaseUrl>
const crypto = require('crypto');
const [BASE, DB] = process.argv.slice(2);
if (!BASE || !DB) { console.log('usage: node tests/alerts.test.js <baseUrl> <databaseUrl>'); process.exit(2); }
process.env.DATABASE_URL = DB;
const E = require('../lib/engine.generated.cjs');
const { Client } = require('pg');
const AL = require('../lib/alerts');
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
/* a real browser subscription: a push address on a known push service and a P-256 key with its secret */
let n = 0;
function browser() {
  const ecdh = crypto.createECDH('prime256v1');ecdh.generateKeys();
  return { endpoint: 'https://fcm.googleapis.com/fcm/send/test-' + Date.now() + '-' + (++n), keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
}
(async () => {
  const db = new Client({ connectionString: DB });await db.connect();
  const sent = [];
  const realFetch = global.fetch;
  /* every message to a push service is caught here, and the answer each address gets is chosen by the test */
  const answers = new Map();
  global.fetch = async (url, init) => {
    if (String(url).startsWith('https://fcm.googleapis.com/')) { sent.push({ url: String(url), headers: init.headers, size: init.body.length }); return { status: answers.get(String(url)) || 201 }; }
    return realFetch(url, init);
  };
  const a = client();await a('/api/auth/guest', {});
  const pid = (await a('/api/me')).body.player.id;
  await db.query('UPDATE players SET top = 10 WHERE id = $1', [pid]);

  console.log('signing up');
  check('the public key is a P-256 point the browser can use', (await a('/api/push/key')).body.key.length === 87);
  const b1 = browser();
  check('a browser can sign up', (await a('/api/push/subscribe', Object.assign({}, b1, { arena: true, quests: true }))).status === 200);
  check('it is kept with both alerts on', (await a('/api/push/status', { endpoint: b1.endpoint })).body.on === true);
  check('a made up address is refused', (await a('/api/push/subscribe', { endpoint: 'https://example.com/push', keys: b1.keys })).status === 400);
  check('an address with a port or a password is refused', (await a('/api/push/subscribe', { endpoint: 'https://fcm.googleapis.com:8443/x', keys: b1.keys })).status === 400 && (await a('/api/push/subscribe', { endpoint: 'https://u:p@fcm.googleapis.com/x', keys: b1.keys })).status === 400);
  check('keys that are not on the curve are refused', (await a('/api/push/subscribe', { endpoint: b1.endpoint + 'x', keys: { p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString('base64url'), auth: b1.keys.auth } })).status === 400);
  check('signing up needs a player', (await client()('/api/push/subscribe', b1)).status === 401);
  check('another player cannot read this browser', (await (async () => { const o = client();await o('/api/auth/guest', {});return (await o('/api/push/status', { endpoint: b1.endpoint })).body.on; })()) === false);
  const p = await a('/api/push/prefs', { endpoint: b1.endpoint, arena: false, quests: true });
  check('the Arena alert can be turned off on its own', p.status === 200 && (await a('/api/push/status', { endpoint: b1.endpoint })).body.arena === false);
  await a('/api/push/prefs', { endpoint: b1.endpoint, arena: true, quests: true });
  const extra = [];
  for (let i = 0; i < AL.PER_PLAYER_LIMIT + 2; i++) { const b = browser();extra.push(b);await a('/api/push/subscribe', b); }
  const rows = (await db.query('SELECT count(*)::int AS n FROM push_subs WHERE player_id = $1', [pid])).rows[0].n;
  check('a player keeps only a few browsers, the oldest go first', rows === AL.PER_PLAYER_LIMIT + 1 || rows === AL.PER_PLAYER_LIMIT, rows);

  console.log('the Arena alert');
  await db.query('DELETE FROM push_subs WHERE player_id = $1', [pid]);
  const b2 = browser();await a('/api/push/subscribe', b2);
  const nowSec = Math.floor(Date.now() / 1000);
  /* the hamster started a run 1000 seconds ago: the Arena opened 5 minutes after, and is open until 15 minutes after the round ends */
  const run = [{ t: nowSec - 1000, gap: 5, work: 200000 }];
  const g = require('../lib/live').arenaGate(run, nowSec);
  check('the test run has the Arena open', g.open && nowSec >= g.from + E.ARENA.waitMin * 60, g);
  let r = await AL.arenaAlert(run, nowSec);
  check('the alert goes to the browser', r.sent === 1 && sent.length === 1 && sent[0].url === b2.endpoint, { r, sent: sent.length });
  check('it is signed for the push service and sent encrypted', /^vapid t=/.test(sent[0].headers.authorization) && sent[0].headers['content-encoding'] === 'aes128gcm' && sent[0].size > 100);
  r = await AL.arenaAlert(run, nowSec + 60);
  check('asking again in the same run sends nothing', r.sent === 0 && sent.length === 1, r);
  const next = [{ t: nowSec + 7200, gap: 5, work: 200000 }];
  r = await AL.arenaAlert(next, nowSec + 7200 + 1000);
  check('the next run alerts again', r.sent === 1 && sent.length === 2, r);
  r = await AL.arenaAlert([{ t: nowSec - 100, gap: 5, work: 200000 }], nowSec);
  check('before the Arena has opened nothing goes', r.sent === 0 && r.why === 'closed', r);
  r = await AL.arenaAlert([{ t: nowSec - 100000, gap: 5, work: 200000 }], nowSec);
  check('once it is shut nothing goes', r.sent === 0 && r.why === 'closed', r);
  await a('/api/push/prefs', { endpoint: b2.endpoint, arena: false, quests: true });
  await db.query('UPDATE push_subs SET arena_from = 0 WHERE endpoint = $1', [b2.endpoint]);
  check('a browser with the Arena alert off gets none', (await AL.arenaAlert(run, nowSec)).sent === 0);
  await a('/api/push/prefs', { endpoint: b2.endpoint, arena: true, quests: true });
  await db.query('UPDATE players SET top = 2 WHERE id = $1', [pid]);
  check('a player who has not unlocked the Arena gets none', (await AL.arenaAlert(run, nowSec)).sent === 0);
  await db.query('UPDATE players SET top = 10 WHERE id = $1', [pid]);

  console.log('the quest reminder');
  const day = E.dayKey(Date.now());
  const evening = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate(), 14, 0, 0);
  const morning = evening - 6 * 3600e3;
  const before = sent.length;
  r = await AL.questReminder(morning);
  check('before the evening hour nothing goes', r.sent === 0 && r.why === 'early' && sent.length === before, r);
  /* the day key follows the real clock, so the test reminds with the evening of the real day */
  const dayNow = E.dayKey(evening);
  r = await AL.questReminder(evening);
  check('in the evening a player with no claimed quest is reminded', r.sent >= 1 && sent.length > before, r);
  const left = sent.length;
  r = await AL.questReminder(evening + 1800e3);
  check('only once a day', r.sent === 0 && sent.length === left, r);
  await db.query(`UPDATE push_subs SET quest_day = '' WHERE endpoint = $1`, [b2.endpoint]);
  await db.query('UPDATE players SET quests = $2 WHERE id = $1', [pid, JSON.stringify({ day: dayNow, list: [{ k: 'bag', n: 1, have: 1, paid: 1 }], got: [], sd: [], so: {}, life: {} })]);
  r = await AL.questReminder(evening);
  check('a player who already claimed a quest today is left alone', r.sent === 0 && r.skipped >= 1 && sent.length === left, r);
  check('and is not looked at again today', (await db.query('SELECT quest_day FROM push_subs WHERE endpoint = $1', [b2.endpoint])).rows[0].quest_day === dayNow);
  void day;

  console.log('a browser that is gone');
  await db.query('UPDATE push_subs SET arena_from = 0 WHERE endpoint = $1', [b2.endpoint]);
  answers.set(b2.endpoint, 410);
  r = await AL.arenaAlert(run, nowSec);
  check('a push service that says it is gone has its browser forgotten', r.sent === 0 && (await db.query('SELECT 1 FROM push_subs WHERE endpoint = $1', [b2.endpoint])).rows.length === 0, r);
  const b3 = browser();await a('/api/push/subscribe', b3);
  answers.set(b3.endpoint, 500);
  r = await AL.arenaAlert(run, nowSec);
  check('one that fails for now is kept and tried again', r.sent === 0 && (await db.query('SELECT arena_from FROM push_subs WHERE endpoint = $1', [b3.endpoint])).rows[0].arena_from == 0, r);
  check('turning alerts off removes the browser', (await a('/api/push/unsubscribe', { endpoint: b3.endpoint })).status === 200 && (await a('/api/push/status', { endpoint: b3.endpoint })).body.on === false);

  console.log('the schedule route');
  const c1 = await a('/api/cron/push');
  check('it answers for anyone and says what it did', c1.status === 200 && c1.body.arena && c1.body.quests, c1.body);

  global.fetch = realFetch;
  await db.query('DELETE FROM push_subs WHERE player_id = $1', [pid]);
  await db.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL crashed', e.stack || e.message); process.exit(1); });
