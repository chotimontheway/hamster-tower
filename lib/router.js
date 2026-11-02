// A single function handles every /api/... path
const crypto = require('crypto');
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { HttpError, bad, sendJson, readJson, parseCookies, signToken, readToken, seedFor, clientIp } = require('./http');
const { allow } = require('./ratelimit');
const { syncRounds } = require('./chain');
const { withPlayer, createPlayer, loadRow, toG, publicState } = require('./players');
const { ACTIONS, TRIAL } = require('./actions');

/* floors are read from the database and kept in memory, refreshed once a minute */
const FL = { at: 0, rows: [], floors: [], meta: null, pending: null };
async function loadFloors() {
  const r = await q('SELECT floor, core, round, work, blocks, hash, gap, t FROM rounds ORDER BY floor');
  if (r.rows.length !== FL.rows.length) { FL.rows = r.rows; FL.floors = E.buildFloors(r.rows); }
  const st = await q('SELECT core, frontier, read_at FROM sync_state');
  const stMap = Object.fromEntries(st.rows.map(x => [x.core, x]));
  const cores = cfg.cores().map(c => {
    const key = c.core.toLowerCase(), fl = FL.rows.filter(x => x.core === key);
    return { core: c.core, from: fl.length ? fl[0].floor : null, to: fl.length ? fl[fl.length - 1].floor : null, frontier: stMap[key] ? stMap[key].frontier : 0 };
  });
  FL.meta = { cores, frontier: cores.length ? cores[cores.length - 1].frontier : 0, readAt: Math.max(0, ...st.rows.map(x => x.read_at)) };
  FL.at = Date.now();
}
async function getFloors() {
  if (Date.now() - FL.at > cfg.syncEveryMs || !FL.floors.length) {
    if (!FL.pending) FL.pending = loadFloors().finally(() => { FL.pending = null; });
    await FL.pending;
  }
  return FL.floors;
}
const sessionTicket = id => signToken({ p: id, exp: Date.now() + 30 * 864e5 });
function sessionCookie(id) {
  return `ht_s=${sessionTicket(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${cfg.isProd ? '; Secure' : ''}`;
}
/* the site on our own address gets a cookie. A copy hosted elsewhere cannot use one, so it gets the same signed ticket to send as a header */
function signedIn(c, id) {
  if (c.crossHost) return { ok: true, ticket: sessionTicket(id) };
  c.res.setHeader('Set-Cookie', sessionCookie(id));
  return { ok: true };
}
/* public data carries no cookies or tickets, so any site may read it and the CDN keeps one copy */
const PUBLIC_DATA = { headersOpen: true };
const routes = {};
const on = (m, p, f, o) => { routes[m + ' ' + p] = Object.assign({ f }, o || {}); };
const AUTH = { auth: true };

on('GET', '/api/config', () => ({ guest: cfg.allowGuest(), trial: cfg.allowTrial() }), PUBLIC_DATA);

/* floors go out through the CDN; only requests that reach the server can trigger a chain read, about once a minute */
on('GET', '/api/rounds', async c => {
  await getFloors();
  if (!FL.rows.length || Date.now() - (FL.meta.readAt || 0) * 1000 > cfg.syncEveryMs) {
    /* never let a slow RPC hold up the response: wait briefly if floors already exist, fully only when there are none */
    const run = syncRounds().then(async s => { if (s.added) { FL.at = 0; await getFloors(); } }).catch(e => console.error('sync', e.message));
    if (FL.rows.length) await Promise.race([run, new Promise(r => setTimeout(r, 3000))]);
    else await run;
  }
  return { rounds: FL.rows.map(r => [r.round, r.work, r.blocks, r.hash, r.gap, Number(r.t)]), cores: FL.meta.cores, frontier: FL.meta.frontier, readAt: FL.meta.readAt };
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } });

on('GET', '/api/cron/sync', async c => {
  const want = cfg.cronSecret();
  if (want && c.req.headers.authorization !== 'Bearer ' + want) throw new HttpError(401, 'Not allowed');
  const s = await syncRounds();FL.at = 0;
  return s;
});

const LB = { at: 0, rows: [], total: 0 };
on('GET', '/api/leaderboard', async () => {
  if (Date.now() - LB.at > 30000) {
    const r = await q(`SELECT name, top, extract(epoch FROM top_at)::bigint AS at FROM players WHERE top > 0 ORDER BY top DESC, top_at ASC LIMIT 100`);
    const n = await q('SELECT count(*)::int AS n FROM players WHERE top > 0');
    LB.rows = r.rows;LB.total = n.rows[0].n;LB.at = Date.now();
  }
  return { top: LB.rows, total: LB.total };
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });

on('GET', '/api/rank', async c => {
  const me = await q('SELECT top, top_at FROM players WHERE id = $1', [c.pid]);
  if (!me.rows[0] || !me.rows[0].top) return { rank: null, top: 0 };
  const r = await q('SELECT count(*)::int AS n FROM players WHERE top > $1 OR (top = $1 AND top_at < $2)', [me.rows[0].top, me.rows[0].top_at]);
  return { rank: r.rows[0].n + 1, top: me.rows[0].top };
}, AUTH);

on('POST', '/api/auth/guest', async c => {
  if (!cfg.allowGuest()) throw new HttpError(403, 'This version requires a wallet sign in');
  if (!await allow('guest:' + clientIp(c.req), 60, 30)) throw new HttpError(429, 'Too many new accounts, please wait a moment');
  const name = 'Guest ' + Math.floor(100000 + Math.random() * 900000);
  const id = await createPlayer(null, name);
  return signedIn(c, id);
});
/* wallet sign in by signature: no fee and no transaction. The ticket is signed, so nothing needs storing */
on('POST', '/api/auth/nonce', async c => {
  const address = String(c.body.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) bad('Invalid wallet address');
  if (!await allow('nonce:' + clientIp(c.req), 60, 60)) throw new HttpError(429, 'Please try again in a moment');
  const host = c.crossHost || c.req.headers.host || 'local', n = crypto.randomBytes(12).toString('hex');
  const message = `Sign in to Hamster Tower\nSite: ${host}\nWallet: ${address}\nNonce: ${n}\n\nThis signature costs nothing and sends no transaction.`;
  return { message, ticket: signToken({ a: address, m: message, exp: Date.now() + 5 * 60000 }) };
});
on('POST', '/api/auth/verify', async c => {
  const t = readToken(c.body.ticket);
  if (!t || !t.a) bad('The sign in request expired, please try again');
  const { recoverMessageAddress } = await import('viem');
  let who;
  try { who = await recoverMessageAddress({ message: t.m, signature: c.body.signature }); } catch (e) { bad('Invalid signature'); }
  if (who.toLowerCase() !== t.a) bad('The signature does not match the wallet');
  const id = await createPlayer(t.a, who);
  return signedIn(c, id);
});
on('POST', '/api/auth/logout', c => {
  c.res.setHeader('Set-Cookie', `ht_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cfg.isProd ? '; Secure' : ''}`);
  return { ok: true };
});

on('GET', '/api/me', async c => {
  const row = await loadRow(c.pid), G = toG(row);
  return { player: { id: row.id, name: row.name, wallet: row.wallet }, state: publicState(G, true) };
}, AUTH);

/* entering a battle does not touch the database. The seed depends on the battle count, so re-entering cannot reroll luck */
on('POST', '/api/battle/start', async c => {
  const f = Math.floor(Number(c.body.floor)), b = Math.floor(Number(c.body.b));
  const floors = await getFloors();
  if (!floors[f - 1]) bad('This floor does not exist');
  if (!Number.isFinite(b) || b < 0) bad('Invalid battle data');
  const seed = seedFor(`${c.pid}:${b}:${f}`);
  return { seed, token: signToken({ p: c.pid, f, b, s: seed, iat: Date.now(), exp: Date.now() + 40 * 60000 }) };
}, AUTH);

const cleanPlan = p => {
  const out = {};
  for (const k of ['p0', 'p1', 'p2']) {
    const x = p && p[k];
    if (x) out[k] = { i: [0, 1, 2].includes(x.i) ? x.i : 0, target: /^e[0-2]$/.test(String(x.target)) ? x.target : null };
  }
  return out;
};
/* end of battle: the server replays the same battle with the same code. The server result is the real one */
on('POST', '/api/battle/finish', async c => {
  const t = readToken(c.body.token), plans = c.body.plans;
  if (!t || t.p !== c.pid) throw new HttpError(400, 'The battle ticket is invalid or expired');
  if (!Array.isArray(plans) || plans.length > 80) bad('Invalid battle data');
  const ms = Date.now() - t.iat;
  if (ms < plans.length * cfg.minMsPerRound()) bad('The battle finished too quickly');
  const floors = await getFloors(), node = floors[t.f - 1];
  if (!node) bad('This floor does not exist');
  let log = null;
  const out = await withPlayer(c.pid, c.body.requestId, G => {
    if (t.b !== G.battles) throw new HttpError(409, 'This battle is no longer valid, your data was refreshed', { state: publicState(G, true) });
    if (t.f > G.top + 1) bad('This floor is still locked');
    const { B } = E.startBattle(G, node, floors, { seed: t.s });
    let rounds = 0;
    for (const p of plans) { if (B.over) break; E.runRound(B, cleanPlan(p)); rounds++; }
    G.battles++;
    const over = B.over || 'lose';
    let res = null, cold = false;
    if (over === 'win') {
      res = E.finishWin(G, B, floors);
      cold = !!res.gift;
      if (res.first) log = { floor: t.f, rounds, ms };
    }
    return { over, res, rounds, cold };
  });
  if (log) { try { await q('INSERT INTO battle_log (player_id, floor, rounds, ms, plans) VALUES ($1,$2,$3,$4,$5::jsonb)', [c.pid, log.floor, log.rounds, log.ms, JSON.stringify(plans)]); } catch (e) {} }
  return out;
}, AUTH);

on('POST', '/api/action', async c => {
  const f = Object.prototype.hasOwnProperty.call(ACTIONS, c.body.type) ? ACTIONS[c.body.type] : null;
  if (!f) bad('Invalid action');
  const floors = await getFloors();
  return withPlayer(c.pid, c.body.requestId, G => f(G, c.body, { floors }));
}, AUTH);

on('POST', '/api/dev', async c => {
  if (!cfg.allowTrial()) throw new HttpError(403, 'This version has no test panel');
  const f = Object.prototype.hasOwnProperty.call(TRIAL, c.body.op) ? TRIAL[c.body.op] : null;
  if (!f) bad('Invalid action');
  const floors = await getFloors();
  const out = await withPlayer(c.pid, null, G => f(G, c.body, { floors }));
  const row = await loadRow(c.pid);
  out.state = publicState(toG(row), true);
  return out;
}, AUTH);

async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const origin = req.headers.origin;
    let originHost = null;
    try { originHost = origin ? new URL(origin).host : null; } catch (e) { originHost = 'invalid'; }
    const other = !!origin && originHost !== req.headers.host, listed = other && cfg.corsOrigins().includes(origin);
    if (listed) {
      res.setHeader('Access-Control-Allow-Origin', origin);res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') { res.statusCode = 204;res.end();return; }
    const h = routes[req.method + ' ' + url.pathname];
    if (!h) throw new HttpError(404, 'Not found');
    if (h.headersOpen) { res.removeHeader('Vary');res.setHeader('Access-Control-Allow-Origin', '*'); }
    if (req.method === 'POST' && other && !listed) throw new HttpError(403, 'Request from another site');
    const c = { req, res, url, crossHost: listed ? originHost : null, body: req.method === 'POST' ? await readJson(req) : null };
    if (h.auth) {
      const bearer = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
      const s = readToken(bearer ? bearer[1] : parseCookies(req).ht_s);
      if (!s || !s.p) throw new HttpError(401, 'You are not signed in');
      c.pid = s.p;
      if (!await allow('p:' + s.p, 10, 40)) throw new HttpError(429, 'Too many actions, please wait a moment');
    }
    const out = await h.f(c);
    sendJson(res, 200, out, h.headers);
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, Object.assign({ error: e.message }, e.data || {}));
    console.error('Server error', e);
    sendJson(res, 500, { error: 'The server hit an error, please try again later' });
  }
}
module.exports = { handler, loadFloors, getFloors };
