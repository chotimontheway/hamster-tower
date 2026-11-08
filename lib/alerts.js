// ALERTS: browser push messages for two things, the Arena opening when the hamster runs and a reminder of the day's quests.
// A browser says yes on the Quests screen and is kept in push_subs. The schedule in vercel.json asks /api/cron/push every 15 minutes,
// and each alert is written down on the row it went to, so it goes once, however often anyone asks.
const crypto = require('crypto');
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { arenaGate } = require('./live');
const push = require('./push');
const { HttpError } = require('./http');

/* the key pair comes from SESSION_SECRET, so there is nothing more to keep. A new secret makes new keys and browsers sign up again at the next visit */
let KEYS = null;
const keys = () => KEYS || (KEYS = push.keysFrom(cfg.secret()));
const publicKey = () => ({ key: keys().publicText });

/* the quest reminder goes out from this UTC hour, about the evening where most players are */
const REMIND_HOUR = 13;
const PER_PLAYER_LIMIT = 5;
const SEND_LIMIT = 400;

async function subscribe(pid, body) {
  const sub = push.cleanSubscription(body);
  if (!sub) throw new HttpError(400, 'That is not a push address this site can use');
  const n = (await q('SELECT count(*)::int AS n FROM push_subs WHERE player_id = $1 AND endpoint <> $2', [pid, sub.endpoint])).rows[0].n;
  if (n >= PER_PLAYER_LIMIT) await q('DELETE FROM push_subs WHERE endpoint = (SELECT endpoint FROM push_subs WHERE player_id = $1 AND endpoint <> $2 ORDER BY created_at LIMIT 1)', [pid, sub.endpoint]);
  const arena = body.arena !== false, quests = body.quests !== false;
  /* a browser used by someone else before now belongs to this player */
  await q(`INSERT INTO push_subs (endpoint, player_id, p256dh, auth, arena, quests) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (endpoint) DO UPDATE SET player_id = EXCLUDED.player_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, arena = EXCLUDED.arena, quests = EXCLUDED.quests`, [sub.endpoint, pid, sub.p256dh, sub.auth, arena, quests]);
  return { ok: true, arena, quests };
}

async function unsubscribe(pid, endpoint) {
  const e = push.cleanEndpoint(endpoint);
  if (!e) throw new HttpError(400, 'That is not a push address this site can use');
  await q('DELETE FROM push_subs WHERE endpoint = $1 AND player_id = $2', [e, pid]);
  return { ok: true };
}

/* what this browser has set, or nothing when it is not signed up for this player */
async function status(pid, endpoint) {
  const e = push.cleanEndpoint(endpoint);
  if (!e) return { on: false };
  const r = (await q('SELECT arena, quests FROM push_subs WHERE endpoint = $1 AND player_id = $2', [e, pid])).rows[0];
  return r ? { on: true, arena: r.arena, quests: r.quests } : { on: false };
}

async function setPrefs(pid, endpoint, arena, quests) {
  const e = push.cleanEndpoint(endpoint);
  if (!e) throw new HttpError(400, 'That is not a push address this site can use');
  const r = await q('UPDATE push_subs SET arena = $3, quests = $4 WHERE endpoint = $1 AND player_id = $2 RETURNING 1', [e, pid, arena !== false, quests !== false]);
  if (!r.rows.length) throw new HttpError(404, 'This browser is not signed up for alerts');
  return { ok: true, arena: arena !== false, quests: quests !== false };
}

/* sends to one browser, and forgets it when its push service says it is gone */
async function deliver(row, message, opts) {
  let code = 0;
  try { code = await push.send({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }, message, keys(), opts); } catch (e) { return false; }
  if (code === 404 || code === 410) { await q('DELETE FROM push_subs WHERE endpoint = $1', [row.endpoint]); return false; }
  return code >= 200 && code < 300;
}
/* a few at a time, so one slow push service cannot hold the rest up */
async function each(rows, f) {
  let i = 0, sent = 0;
  await Promise.all(Array.from({ length: Math.min(10, rows.length) }, async () => { while (i < rows.length) { const r = rows[i++]; if (await f(r)) sent++; } }));
  return sent;
}

/* the hamster's run is the same for everyone, so the alert goes to each browser once per run, from when the Arena really opens until it shuts */
async function arenaAlert(floors, now) {
  const g = arenaGate(floors, now), opens = g.from + E.ARENA.waitMin * 60;
  if (!g.from || !g.open || now < opens) return { sent: 0, why: 'closed' };
  const rows = (await q(`SELECT s.endpoint, s.p256dh, s.auth FROM push_subs s JOIN players p ON p.id = s.player_id
    WHERE s.arena AND s.arena_from < $1 AND p.top >= $2 ORDER BY s.created_at LIMIT $3`, [g.from, E.ARENA.unlock, SEND_LIMIT])).rows;
  const left = Math.max(1, Math.round((g.until - now) / 60));
  const sent = await each(rows, async r => {
    /* a browser that cannot be reached is left for the next look, unless it is gone for good, which deliver() has already seen to */
    const ok = await deliver(r, { title: 'The Arena and the World Boss are open', body: `Squeektoshi is running. Take an Arena floor or hit the World Boss, it closes in about ${left} minutes.`, tag: 'arena', url: '/' }, { ttl: Math.max(60, Math.min(1800, g.until - now)), topic: 'arena' });
    if (ok) await q('UPDATE push_subs SET arena_from = $2 WHERE endpoint = $1', [r.endpoint, g.from]);
    return ok;
  });
  return { sent, of: rows.length };
}

/* once a day, in the evening, to browsers whose player has claimed no quest yet that UTC day */
async function questReminder(now) {
  const d = new Date(now);
  if (d.getUTCHours() < REMIND_HOUR) return { sent: 0, why: 'early' };
  const day = E.dayKey(now);
  const rows = (await q(`SELECT s.endpoint, s.p256dh, s.auth, p.quests AS qs FROM push_subs s JOIN players p ON p.id = s.player_id
    WHERE s.quests AND s.quest_day <> $1 AND p.top > 0 ORDER BY s.created_at LIMIT $2`, [day, SEND_LIMIT])).rows;
  const claimed = x => x && x.day === day && Array.isArray(x.list) && x.list.some(y => y && y.paid);
  let sent = 0, skipped = 0;
  const todo = [];
  for (const r of rows) { if (claimed(r.qs)) { skipped++; await q('UPDATE push_subs SET quest_day = $2 WHERE endpoint = $1', [r.endpoint, day]); } else todo.push(r); }
  sent = await each(todo, async r => {
    const ok = await deliver(r, { title: 'Your daily quests are waiting', body: 'Claim today\'s Tower Points before the list resets at 00:00 UTC.', tag: 'quests', url: '/' }, { ttl: 4 * 3600, topic: 'quests' });
    if (ok) await q('UPDATE push_subs SET quest_day = $2 WHERE endpoint = $1', [r.endpoint, day]);
    return ok;
  });
  return { sent, of: todo.length, skipped };
}

async function check(floors, now = Date.now()) {
  return { arena: await arenaAlert(floors, now / 1000), quests: await questReminder(now) };
}

module.exports = { publicKey, subscribe, unsubscribe, status, setPrefs, check, arenaAlert, questReminder, REMIND_HOUR, PER_PLAYER_LIMIT };
