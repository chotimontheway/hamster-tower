// CONNECT X and the checks behind social quests. A player links their X account through X's own sign in (OAuth 2.0 with PKCE), so the game
// knows the account is theirs and nobody can claim with someone else's name. A check then reads that account's own newest data with its own
// token: its likes, its posts (which hold its reposts and replies) and the accounts it follows. X prices reads of your own data lowest.
// The scopes only read: the game never posts, likes or follows for anyone. Tokens are kept encrypted with a key made from the session secret.
// Everything waits for X_CLIENT_ID and X_CLIENT_SECRET from an X developer app. Paths, scopes and field names follow docs.x.com as read on
// 2026-11-06 and still have to be tried against the real API once the app exists, see README.
const crypto = require('crypto');
const cfg = require('./config');
const { q, tx } = require('./db');
const { HttpError, bad, signToken, readToken, parseCookies } = require('./http');

const ready = () => !!(cfg.xClientId() && cfg.xClientSecret());
const b64u = b => Buffer.from(b).toString('base64url');

/* TOKENS AT REST: AES-256-GCM, so a copy of the database alone cannot use anyone's X account */
const tokenKey = () => crypto.createHmac('sha256', cfg.secret()).update('hamster-tower-x-token').digest();
function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return b64u(Buffer.concat([iv, c.getAuthTag(), body]));
}
function unseal(s) {
  try {
    const b = Buffer.from(String(s), 'base64url'), d = crypto.createDecipheriv('aes-256-gcm', tokenKey(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
  } catch (e) { return null; }
}

/* where X sends the player back. It must match an address listed in the X app exactly */
const redirectUri = req => cfg.xRedirectUri() || `${cfg.isProd ? 'https' : 'http'}://${req.headers.host}/api/x/callback`;
const COOKIE = 'ht_x';
const cookieOf = (v, age) => `${COOKIE}=${v}; Path=/api/x; HttpOnly; SameSite=Lax; Max-Age=${age}${cfg.isProd ? '; Secure' : ''}`;

/* STEP 1: the address of X's own consent page. The PKCE verifier stays in a cookie that only this server reads, so a code caught on its way back is useless to anyone else */
function start(c) {
  if (!ready()) throw new HttpError(503, 'Connecting X is not set up yet');
  const state = b64u(crypto.randomBytes(18)), verifier = b64u(crypto.randomBytes(48));
  const challenge = b64u(crypto.createHash('sha256').update(verifier).digest()), back = redirectUri(c.req);
  c.res.setHeader('Set-Cookie', cookieOf(signToken({ xp: c.pid, s: state, v: verifier, r: back, exp: Date.now() + 10 * 60000 }), 600));
  const u = new URL(cfg.xAuthorizeUrl());
  for (const [k, val] of Object.entries({ response_type: 'code', client_id: cfg.xClientId(), redirect_uri: back, scope: cfg.xScopes(), state, code_challenge: challenge, code_challenge_method: 'S256' })) u.searchParams.set(k, val);
  return { url: u.toString() };
}

/* the app proves itself with HTTP Basic, as X asks of a confidential client */
async function tokenCall(body) {
  const auth = 'Basic ' + Buffer.from(encodeURIComponent(cfg.xClientId()) + ':' + encodeURIComponent(cfg.xClientSecret())).toString('base64');
  let r;
  try { r = await fetch(cfg.xTokenUrl(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: auth }, body: new URLSearchParams(body).toString(), signal: AbortSignal.timeout(15000) }); } catch (e) { throw new HttpError(503, 'Could not reach X right now, please try again'); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 400 || r.status === 401) throw new HttpError(409, 'X did not accept the sign in, please connect your X account again');
  if (!r.ok || typeof j.access_token !== 'string') throw new HttpError(503, 'Could not reach X right now, please try again');
  return { a: j.access_token, r: typeof j.refresh_token === 'string' ? j.refresh_token : null, e: Date.now() + (Number(j.expires_in) > 0 ? Number(j.expires_in) : 7200) * 1000 };
}
async function revoke(token) {
  if (!token || !ready()) return;
  const auth = 'Basic ' + Buffer.from(encodeURIComponent(cfg.xClientId()) + ':' + encodeURIComponent(cfg.xClientSecret())).toString('base64');
  try { await fetch(cfg.xRevokeUrl(), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: auth }, body: new URLSearchParams({ token }).toString(), signal: AbortSignal.timeout(8000) }); } catch (e) {}
}

/* one read of the X API with a player's own token. X's own refusals become plain words */
async function xget(path, token, params) {
  const u = new URL(cfg.xApiBase() + path);
  for (const [k, val] of Object.entries(params || {})) if (val !== undefined && val !== null && val !== '') u.searchParams.set(k, String(val));
  let r;
  try { r = await fetch(u, { headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(15000) }); } catch (e) { throw new HttpError(503, 'Could not reach X right now, please try again'); }
  if (r.status === 401) throw new HttpError(409, 'Please connect your X account again');
  if (r.status === 429) throw new HttpError(503, 'X is busy right now, please try again in a few minutes');
  if (r.status === 403) throw new HttpError(503, 'X does not let the game make this check right now');
  if (!r.ok) throw new HttpError(503, 'Could not check on X right now, please try again');
  return r.json().catch(() => ({}));
}

/* STEP 2: X sends the player back with a code. It must come back to the same signed in player who started, within ten minutes.
   One X account belongs to one player, so a second game account cannot use it for the same quests */
async function finish(req, query, pid) {
  const t = readToken(parseCookies(req)[COOKIE]);
  if (!t || !t.xp || String(t.xp) !== String(pid) || typeof query.state !== 'string' || t.s !== query.state) bad('This X sign in expired or came from another page, please connect again');
  if (query.error) bad('The X sign in was cancelled');
  if (typeof query.code !== 'string' || !query.code || query.code.length > 2000) bad('X did not send a sign in code, please connect again');
  const tok = await tokenCall({ grant_type: 'authorization_code', code: query.code, redirect_uri: t.r, code_verifier: t.v });
  const me = await xget('/users/me', tok.a);
  const id = String((me.data && me.data.id) || ''), username = String((me.data && me.data.username) || '');
  if (!/^\d{1,25}$/.test(id) || !/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new HttpError(503, 'X did not say which account this is, please connect again');
  try {
    await tx(async db => {
      await db.query('DELETE FROM x_accounts WHERE player_id = $1 AND x_id <> $2', [pid, id]);
      const ins = await db.query(`INSERT INTO x_accounts (x_id, player_id, username, token) VALUES ($1, $2, $3, $4)
        ON CONFLICT (x_id) DO UPDATE SET username = EXCLUDED.username, token = EXCLUDED.token, updated_at = now() WHERE x_accounts.player_id = EXCLUDED.player_id RETURNING 1`, [id, pid, username, seal(tok)]);
      if (!ins.rowCount) throw new HttpError(409, `@${username} is already connected to another player. Disconnect it there first`);
    });
  } catch (e) {
    /* nothing was kept, so neither token may stay usable at X */
    revoke(tok.r);revoke(tok.a);
    if (e.code === '23505') throw new HttpError(409, 'Busy right now, please connect again');
    throw e;
  }
  return { username };
}
async function disconnect(pid) {
  const r = (await q('DELETE FROM x_accounts WHERE player_id = $1 RETURNING token', [pid])).rows[0];
  const t = r && unseal(r.token);
  if (t) { revoke(t.r); revoke(t.a); }
}
async function linkOf(pid) {
  const r = (await q('SELECT x_id, username FROM x_accounts WHERE player_id = $1', [pid])).rows[0];
  return r ? { id: r.x_id, username: r.username } : null;
}

/* a working token for this player's account. A refresh token works once, so the row is locked while it is traded for a new pair */
async function tokenFor(pid) {
  return tx(async db => {
    const row = (await db.query('SELECT x_id, username, token FROM x_accounts WHERE player_id = $1 FOR UPDATE', [pid])).rows[0];
    if (!row) bad('Connect your X account first');
    let t = unseal(row.token);
    if (!t) throw new HttpError(409, 'Please connect your X account again');
    if (t.e - Date.now() < 60000) {
      if (!t.r) throw new HttpError(409, 'Your X sign in ran out, please connect your X account again');
      t = await tokenCall({ grant_type: 'refresh_token', refresh_token: t.r });
      await db.query('UPDATE x_accounts SET token = $2, updated_at = now() WHERE player_id = $1', [pid, seal(t)]);
    }
    return { id: row.x_id, username: row.username, token: t.a };
  });
}

/* CHECKS. The current docs ask for more post fields with post.fields and call what a post refers to referenced_posts. Older apps knew
   them as tweet.fields and referenced_tweets. X_FIELDS can switch the request without a code change, and answers are read under both names */
const fieldsParam = () => { const m = /^([a-z.]+)=([a-z_,]+)$/.exec(cfg.xFields()); return m ? { [m[1]]: m[2] } : {}; };
const refsOf =p => (Array.isArray(p.referenced_tweets) ? p.referenced_tweets : Array.isArray(p.referenced_posts) ? p.referenced_posts : []);
const postIdOf = url => (/status\/(\d{5,25})/.exec(url || '') || [])[1] || null;
const nameOf = url => (/x\.com\/([A-Za-z0-9_]{1,15})\/?$/.exec(url || '') || [])[1] || null;
/* posts from a little before the quest was opened, in X's time format */
const since = at => new Date(Math.max(0, Number(at) - 120000)).toISOString().replace(/\.\d{3}Z$/, 'Z');
const hasTag = (text, t) => new RegExp('(^|[^a-z0-9_])' + t.toLowerCase().replace(/[^a-z0-9_@#]/g, '') + '(?![a-z0-9_])').test(String(text || '').toLowerCase());
const USERS = new Map();
async function userId(name, token) {
  const k = name.toLowerCase();
  if (USERS.has(k)) return USERS.get(k);
  const j = await xget('/users/by/username/' + encodeURIComponent(name), token);
  const id = j.data && /^\d{1,25}$/.test(String(j.data.id)) ? String(j.data.id) : null;
  if (!id) throw new HttpError(503, `X does not show @${name} right now`);
  USERS.set(k, id);
  return id;
}
/* the player's newest posts since the quest was opened, retweets and replies included */
const recentPosts = (me, opened, extra) => xget(`/users/${me.id}/tweets`, me.token, Object.assign({ max_results: 20, start_time: since(opened) }, fieldsParam(), extra || {})).then(j => (Array.isArray(j.data) ? j.data : []).filter(p => !p.author_id || String(p.author_id) === me.id));

/* did this account do what the quest asks? Gives { ok, post } with the post that proves it when there is one, or { ok: false, why }.
   free(id) says whether a post may still be used, since one post pays once */
async function check(quest, me, opened, free) {
  const target = postIdOf(quest.url);
  if (quest.kind === 'follow') {
    const name = nameOf(quest.url);if (!name) bad('This quest has no account to follow');
    const tid = await userId(name, me.token);
    const j = await xget(`/users/${me.id}/following`, me.token, { max_results: cfg.xFollowPage() });
    return (Array.isArray(j.data) ? j.data : []).some(u => String(u.id) === tid) ? { ok: true } : { ok: false, why: `X does not show that you follow @${name} yet. Follow, then claim again in a moment` };
  }
  if (!target && quest.kind !== 'post') bad('This quest has no post on X');
  if (quest.kind === 'like') {
    const j = await xget(`/users/${me.id}/liked_tweets`, me.token, { max_results: 10 });
    return (Array.isArray(j.data) ? j.data : []).some(p => String(p.id) === target) ? { ok: true } : { ok: false, why: 'X does not show your like on that post yet. Like it, then claim again in a moment' };
  }
  if (quest.kind === 'repost') {
    for (const p of await recentPosts(me, opened)) if (refsOf(p).some(r => r.type === 'retweeted' && String(r.id) === target) && await free(p.id)) return { ok: true, post: String(p.id) };
    return { ok: false, why: 'X does not show your repost of that post yet. Repost it, then claim again in a moment' };
  }
  if (quest.kind === 'comment') {
    for (const p of await recentPosts(me, opened, { exclude: 'retweets' })) if ((refsOf(p).some(r => r.type === 'replied_to' && String(r.id) === target) || String(p.conversation_id) === target) && String(p.id) !== target && await free(p.id)) return { ok: true, post: String(p.id) };
    return { ok: false, why: 'X does not show a new reply of yours to that post yet. Reply, then claim again in a moment' };
  }
  if (quest.kind === 'post') {
    for (const p of await recentPosts(me, opened, { exclude: 'retweets' })) if (quest.need.every(t => hasTag(p.text, t)) && await free(p.id)) return { ok: true, post: String(p.id) };
    return { ok: false, why: `X does not show a new post of yours with ${quest.need.join(' ')} yet. Post it, then claim again in a moment` };
  }
  bad('Unknown quest');
}

module.exports = { ready, start, finish, disconnect, linkOf, tokenFor, check, seal, unseal, COOKIE, cookieOf };
