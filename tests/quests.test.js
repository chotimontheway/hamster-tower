// Quests against a running local server: daily quests made from the floor, their progress through real play, milestones, the swap,
// and social quests from the admin screen down to a player's claim through a connected X account. X itself is played by a stand in that
// this test runs on 8599: its sign in (with PKCE), its tokens and the API reads a check makes.
// Start the server with SOCIAL_QUESTS=1, X_CLIENT_ID=test-client, X_CLIENT_SECRET=test-secret, X_AUTHORIZE_URL=http://127.0.0.1:8599/i/oauth2/authorize,
// X_TOKEN_URL=http://127.0.0.1:8599/2/oauth2/token, X_REVOKE_URL=http://127.0.0.1:8599/2/oauth2/revoke, X_API_BASE=http://127.0.0.1:8599/2,
// ALLOW_GUEST=1, ALLOW_TRIAL=1, MIN_MS_PER_ROUND=0, RATE_LIMIT_OFF=1, TEST_WALLETS holding wallet D below, and an SQK contract (SQK_SHOP)
// so rewards can include SQK. Then: node tests/quests.test.js <baseUrl>. Every wallet here is made from fixed test words and holds nothing.
const http = require('http');
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const v = require('viem');
const BASE = process.argv[2];
if (!BASE) { console.log('usage: node tests/quests.test.js <baseUrl>'); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
/* a player's browser: every cookie the server sets is kept, and nav() follows nothing, like a page visit read by hand */
function client() {
  const jar = new Map();let last = [];
  const take = r => { last = r.headers.getSetCookie ? r.headers.getSetCookie() : []; for (const c of last) { const [kv] = c.split(';'), i = kv.indexOf('='), k = kv.slice(0, i).trim(), val = kv.slice(i + 1).trim(); if (/max-age=0/i.test(c) || !val) jar.delete(k); else jar.set(k, val); } };
  const head = () => [...jar].map(([k, val]) => k + '=' + val).join('; ');
  async function call(path, body) {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, jar.size ? { cookie: head() } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);take(r);
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  }
  call.nav = async path => { const r = await fetch(BASE + path, { redirect: 'manual', headers: jar.size ? { cookie: head() } : {} });take(r);return { status: r.status, location: r.headers.get('location') || '' }; };
  call.has = k => jar.has(k);
  call.lastCookies = () => last;
  return call;
}
const word = w => privateKeyToAccount(v.keccak256(v.toHex('hamster tower sqk test ' + w)));
async function signIn(call, acct) {
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  return call('/api/auth/verify', { ticket: n.body.ticket, signature: await acct.signMessage({ message: n.body.message }) });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const plan = Bt => { const p = {}; E.alive(Bt, 'p').forEach(u => { p[u.id] = { i: E.canPick(Bt, u.id, 2) ? 2 : E.canPick(Bt, u.id, 1) ? 1 : 0, target: null }; }); return p; };
async function play(call, start, body) {
  const s = await call(start, body);
  if (s.status !== 200) return s;
  let token = s.body.token, Bt = s.body.B, r = null;
  for (let g = 0; g < 80; g++) { r = await call('/api/fight/turn', { token, plan: plan(Bt) }); if (r.status !== 200 || r.body.over) return r; token = r.body.token; Bt = r.body.B; }
  return r;
}
async function win(call, floor) { let r; for (let i = 0; i < 6; i++) { r = await play(call, '/api/fight/start', { floor }); if (r.status !== 200 || r.body.over === 'win') return r; } return r; }
let rid = 0;
const act = (call, type, args) => call('/api/action', Object.assign({ type, requestId: 'q' + (++rid) + Date.now() }, args || {}));

/* the stand in for X: its sign in, which checks the PKCE verifier against the challenge, tokens that run out and refresh once each,
   and the reads a check makes, each only for the account its token belongs to. Fields that were not asked for are left out, as X does */
const RUN = String(Date.now()).slice(-9);
const XU = { alice: { id: RUN + '1', username: 'alice_x' }, gina: { id: RUN + '2', username: 'gina_x' }, dora: { id: RUN + '3', username: 'dora_x' }, ham: { id: '2001', username: 'hamstertower' } };
const FX = { codes: new Map(), access: new Map(), refresh: new Map(), expires: 7200, refreshes: 0, revoked: [], following: {}, likes: {}, posts: {}, nextUser: 'alice' };
let tokN = 0;
const s256 = val => require('crypto').createHash('sha256').update(val).digest('base64url');
const xTime = ms => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
function issue(user) { const at = 'at' + (++tokN) + user, rt = 'rt' + tokN + user; FX.access.set(at, { user, exp: Date.now() + FX.expires * 1000 }); FX.refresh.set(rt, user); return { token_type: 'bearer', access_token: at, refresh_token: rt, expires_in: FX.expires, scope: 'tweet.read users.read like.read follows.read offline.access' }; }
const fakeX = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), send = (code, o) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(o)); };
  /* X's consent page, where the player already said yes */
  if (u.pathname === '/i/oauth2/authorize') {
    const code = 'code' + (++tokN);FX.codes.set(code, { ch: u.searchParams.get('code_challenge'), user: FX.nextUser, redirect: u.searchParams.get('redirect_uri') });
    const back = new URL(u.searchParams.get('redirect_uri'));back.searchParams.set('code', code);back.searchParams.set('state', u.searchParams.get('state'));
    res.statusCode = 302;res.setHeader('location', back.toString());res.end();return;
  }
  let body = '';req.on('data', x => body += x);req.on('end', () => {
    if (u.pathname === '/2/oauth2/token' || u.pathname === '/2/oauth2/revoke') {
      if (req.headers.authorization !== 'Basic ' + Buffer.from('test-client:test-secret').toString('base64')) return send(401, { error: 'unauthorized_client' });
      const f = new URLSearchParams(body);
      if (u.pathname.endsWith('revoke')) { FX.revoked.push(f.get('token'));return send(200, { revoked: true }); }
      if (f.get('grant_type') === 'authorization_code') {
        const c = FX.codes.get(f.get('code'));FX.codes.delete(f.get('code'));
        if (!c || c.redirect !== f.get('redirect_uri') || s256(f.get('code_verifier') || '') !== c.ch) return send(400, { error: 'invalid_request' });
        return send(200, issue(c.user));
      }
      if (f.get('grant_type') === 'refresh_token') {
        const user = FX.refresh.get(f.get('refresh_token'));FX.refresh.delete(f.get('refresh_token'));
        if (!user) return send(400, { error: 'invalid_grant' });
        FX.refreshes++;return send(200, issue(user));
      }
      return send(400, { error: 'unsupported_grant_type' });
    }
    const tok = FX.access.get(String(req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!tok || tok.exp < Date.now()) return send(401, { title: 'Unauthorized' });
    const me = XU[tok.user];let m;
    if (u.pathname === '/2/users/me') return send(200, { data: { id: me.id, name: me.username, username: me.username } });
    if ((m = /^\/2\/users\/by\/username\/(\w+)$/.exec(u.pathname))) { const x = Object.values(XU).find(y => y.username.toLowerCase() === m[1].toLowerCase());return x ? send(200, { data: { id: x.id, username: x.username } }) : send(200, { errors: [{ title: 'Not Found Error' }] }); }
    if ((m = /^\/2\/users\/(\d+)\/(following|liked_tweets|tweets)$/.exec(u.pathname))) {
      if (m[1] !== me.id) return send(403, { title: 'Forbidden' });
      const asked = (u.searchParams.get('post.fields') || '').split(','), ex = u.searchParams.get('exclude') || '', from = u.searchParams.get('start_time');
      let list;
      if (m[2] === 'following') list = (FX.following[m[1]] || []).map(id => ({ id }));
      else if (m[2] === 'liked_tweets') list = (FX.likes[m[1]] || []).map(id => ({ id, text: 'a post' }));
      else list = (FX.posts[m[1]] || []).filter(p => (!from || p.created_at >= from) && !(ex.includes('retweets') && (p.referenced_posts || []).some(r => r.type === 'retweeted')) && !(ex.includes('replies') && (p.referenced_posts || []).some(r => r.type === 'replied_to')))
        .map(p => Object.fromEntries(Object.entries(p).filter(([k]) => k === 'id' || k === 'text' || asked.includes(k))));
      return send(200, { data: list.slice(0, +u.searchParams.get('max_results') || 10), meta: { result_count: list.length } });
    }
    send(404, { title: 'Not Found' });
  });
});
/* Connect X as a page does it: the server's link to X, X's yes, and the way back to the callback */
async function connectX(call, user) {
  FX.nextUser = user;
  const c = await call('/api/x/connect', {});
  if (c.status !== 200) return { location: '', c };
  const back = (await fetch(c.body.url, { redirect: 'manual' })).headers.get('location'), bu = new URL(back);
  const r = await call.nav(bu.pathname + bu.search);
  return { location: r.location, c };
}

(async () => {
  await new Promise(r => fakeX.listen(8599, '127.0.0.1', r));
  const today = E.dayKey(Date.now());
  const A = word('quest wallet A ' + today), B = word('quest wallet B ' + today), D = word('wallet D');
  const a = client(), b = client(), d = client(), g = client();
  await g('/api/auth/guest', {});
  check('wallets sign in', (await signIn(a, A)).status === 200 && (await signIn(b, B)).status === 200 && (await signIn(d, D)).status === 200);

  console.log('Daily quests');
  let qa = await a('/api/quests');
  const L0 = qa.body.state && qa.body.state.quests;
  check('a new player gets today\'s list for floor 0', qa.status === 200 && L0.day === today && L0.top === 0 && L0.list.length === E.questBand(0).n, qa.body);
  check('the page learns the time to the next list and whether SQK can come', qa.body.reset > 0 && qa.body.reset <= 86400 && qa.body.sqk === true && qa.body.dev === false);
  const again = await a('/api/quests'), flat = l => JSON.stringify(l.map(x => [x.k, x.f || 0, x.n, x.have, x.tp]));
  check('reading it again gives the same list', flat(again.body.state.quests.list) === flat(L0.list));
  const gq = await g('/api/quests');
  check('a guest gets quests too, without SQK', gq.status === 200 && gq.body.sqk === false && gq.body.state.quests.list.length >= 2);
  const dq = await d('/api/quests');
  check('a dev wallet gets no SQK either, and sees the admin screen', dq.body.sqk === false && dq.body.dev === true);
  check('social quests are open on this server', qa.body.socialOn === true);

  /* a player at floor 35 whose list holds nothing that needs the Arena or a new floor, so everything can be done here */
  let p = null, pl = null, tries = 0;
  for (; tries < 25 && !p; tries++) {
    const c = client();await signIn(c, word('quest climber ' + today + ' ' + tries));
    await c('/api/dev', { op: 'jump', n: 35 });
    const r = await c('/api/quests'), list = r.body.state.quests.list;
    if (!list.some(x => x.k === 'arena' || x.k === 'climb')) { p = c;pl = list; }
  }
  check('a player at floor 35 gets 4 quests and SQK at the last milestone', !!p && pl.length === 4 && E.questBand(35).sqk, { tries, pl });
  await p('/api/dev', { op: 'coins' });await p('/api/dev', { op: 'chests' });await p('/api/dev', { op: 'food' });
  let last = null;
  for (const x of pl) {
    if (x.k === 'floor' || x.k === 'boss') last = await win(p, x.f);
    else if (x.k === 'wins') { for (let i = 0; i < x.n; i++) last = await win(p, 1); }
    else if (x.k === 'daily') last = await play(p, '/api/daily/start', {});
    else if (x.k === 'sweep') last = await act(p, 'sweep');
    else if (x.k === 'chests') last = await act(p, 'chest', { tier: 0, n: x.n });
    else if (x.k === 'bag') last = await act(p, 'bag', { n: 1 });
    else if (x.k === 'wheel') { const me = await p('/api/me'), id = me.body.state.team[0]; for (let i = 0; i < x.n; i++) { await act(p, 'feed', { id, auto: true }); last = await act(p, 'run', { id }); } }
  }
  const after = (await p('/api/quests')).body.state.quests;
  check('real play finishes every kind of quest on the list', after.list.every(E.questDone), after.list);
  const before = (await p('/api/me')).body.state.tp || 0, own = pl.reduce((s, x) => s + x.tp, 0);
  check('finished quests pay nothing until they are claimed', before === 0, before);
  check('a quest not finished cannot be claimed', (await a('/api/quests/take', { i: 0 })).status === 400);
  const takes = [];
  for (let i = 0; i < pl.length; i++) takes.push(await p('/api/quests/take', { i }));
  check('Claim on each finished quest pays its own TP', own > 0 && takes.every((r, i) => r.status === 200 && r.body.got.tp === pl[i].tp) && takes[takes.length - 1].body.state.tp === own, takes.map(r => r.body.got || r.body.error));
  check('a quest pays only once', (await p('/api/quests/take', { i: 0 })).status === 400 && (await p('/api/quests/take', { i: 9 })).status === 400);
  const tp0 = (await p('/api/me')).body.state.tp || 0, e0 = (await p('/api/me')).body.state.sqk.earned;
  const c0 = await p('/api/quests/claim', { i: 0 }), c1 = await p('/api/quests/claim', { i: 1 }), c2 = await p('/api/quests/claim', { i: 2 });
  check('the milestones pay 20, 40 and 80 TP', c0.status === 200 && c1.status === 200 && c2.status === 200 && c0.body.got.tp === 20 && c1.body.got.tp === 40 && c2.body.got.tp === 80 && c2.body.state.tp - tp0 === 140, [c0.body, c1.body, c2.body]);
  check('the last one adds SQK inside the floor 30 band', c2.body.got.sqk >= E.questBand(35).sqk[0] * E.SQK_UNIT && c2.body.got.sqk <= E.questBand(35).sqk[1] * E.SQK_UNIT && c2.body.state.sqk.earned - e0 === c2.body.got.sqk, c2.body.got);
  check('a milestone pays only once', (await p('/api/quests/claim', { i: 2 })).status === 400 && (await p('/api/quests/claim', { i: 9 })).status === 400);
  check('a milestone not reached yet is refused', (await a('/api/quests/claim', { i: 1 })).status === 400);
  const sw = await b('/api/quests/swap', { i: 0 });
  check('one quest a day can be swapped', sw.status === 200 && sw.body.swapped && sw.body.state.quests.swap === 1, sw.body);
  check('a second swap is refused', (await b('/api/quests/swap', { i: 1 })).status === 400);

  console.log('The admin screen');
  check('a player who is not the dev wallet cannot open it', (await a('/api/admin/social')).status === 403 && (await g('/api/admin/social')).status === 403 && (await a('/api/admin/social', { quest: { kind: 'like', title: 'x', url: 'https://x.com/a/status/123456', tp: 10 } })).status === 403);
  const ad0 = await d('/api/admin/social');
  check('the dev wallet opens it', ad0.status === 200 && Array.isArray(ad0.body.quests) && ad0.body.defaults.kinds.post.tp === 80, ad0.body);
  const bad = async (quest, why) => { const r = await d('/api/admin/social', { quest }); return r.status === 400 && (!why || why.test(r.body.error || '')) ? true : r.body; };
  check('a task that does not exist is refused', await bad({ kind: 'hack', title: 'Hello there', tp: 10 }));
  check('a like needs the link of a post', await bad({ kind: 'like', title: 'Like it now', url: 'https://evil.example/x', tp: 10 }, /post on X/));
  check('a post needs a tag or hashtag', await bad({ kind: 'post', title: 'Post about us', tp: 10 }, /tag/));
  check('a title with markup is refused', await bad({ kind: 'follow', title: '<img src=x onerror=alert(1)>', url: '@hamster', tp: 10 }, /without/));
  check('TP and SQK stay in their limits', await bad({ kind: 'follow', title: 'Follow us', url: '@hamster', tp: 5000 }) === true && await bad({ kind: 'follow', title: 'Follow us', url: '@hamster', tp: 10, sqkP: 2 }) === true);
  const add = async quest => (await d('/api/admin/social', { quest })).body;
  await add({ kind: 'follow', title: 'Follow Hamster Tower', url: 'https://x.com/hamstertower', tp: 50, sqkP: 1, sqkMax: 1 });
  await add({ kind: 'like', title: 'Like the launch post', url: 'https://twitter.com/hamstertower/status/1000000001?s=20', tp: 10, sqkP: 0, sqkMax: 0 });
  await add({ kind: 'comment', title: 'Reply to the launch post', url: 'https://x.com/hamstertower/status/1000000001', tp: 30, sqkP: 0, sqkMax: 0 });
  await add({ kind: 'repost', title: 'Repost the launch post', url: 'https://x.com/hamstertower/status/1000000001', tp: 20, sqkP: 0, sqkMax: 0 });
  const listed = await add({ kind: 'post', title: 'Post your floor', need: '@HamsterTower #Squeekchain', tp: 80, sqkP: 0, sqkMax: 0 });
  const ids = Object.fromEntries(listed.quests.map(x => [x.kind, x.id]));
  check('five quests are saved, links in one form', listed.quests.length >= 5 && listed.quests.find(x => x.kind === 'like').url === 'https://x.com/hamstertower/status/1000000001' && listed.quests.find(x => x.kind === 'follow').url === 'https://x.com/hamstertower', listed.quests);

  console.log('Connect X');
  /* the same wallets play every run of a day, so whatever an earlier run left connected goes first */
  await a('/api/x/disconnect', {});await b('/api/x/disconnect', {});
  const x0 = await a('/api/quests');
  check('players see the live social quests', x0.body.social.length >= 5 && x0.body.social.some(x => x.id === ids.post && x.need.join(' ') === '@HamsterTower #Squeekchain'));
  check('connecting X is ready on this server and nothing is connected yet', x0.body.xReady === true && x0.body.x === null, [x0.body.xReady, x0.body.x]);
  check('a claim before opening the quest is refused', (await a('/api/quests/social', { id: ids.follow })).status === 400);
  for (const k of ['follow', 'like', 'repost', 'comment', 'post']) await a('/api/quests/open', { id: ids[k] });
  const openedA = Date.now();
  check('a claim right after opening waits a moment', /Open it on X first/.test((await a('/api/quests/social', { id: ids.follow })).body.error || ''));
  await sleep(6300);
  check('a claim needs a connected X account', /Connect your X account first/.test((await a('/api/quests/social', { id: ids.follow })).body.error || ''));
  const xc = await a('/api/x/connect', {}), cu = new URL(xc.body.url || 'http://none/'), sc = a.lastCookies().join(' ');
  check('Connect X goes to X\'s own sign in with PKCE and only read scopes', xc.status === 200 && cu.origin + cu.pathname === 'http://127.0.0.1:8599/i/oauth2/authorize' && cu.searchParams.get('response_type') === 'code' && cu.searchParams.get('client_id') === 'test-client' && cu.searchParams.get('code_challenge_method') === 'S256' && (cu.searchParams.get('code_challenge') || '').length >= 43 && cu.searchParams.get('redirect_uri') === BASE + '/api/x/callback' && (cu.searchParams.get('scope') || '').split(' ').every(s => /\.read$|^offline\.access$/.test(s)) && (cu.searchParams.get('state') || '').length >= 20, xc.body);
  check('the sign in ticket is a cookie only the server reads, for ten minutes', /ht_x=[^;]+; Path=\/api\/x; HttpOnly; SameSite=Lax; Max-Age=600/.test(sc) && !(cu.searchParams.get('code_challenge') || '').includes(sc.slice(5, 25)), sc.slice(0, 80));
  const wrong = await a.nav('/api/x/callback?code=nope&state=' + encodeURIComponent('not-' + cu.searchParams.get('state')));
  check('coming back with another state is refused and nothing is connected', wrong.status === 302 && /^\/\?x=failed&why=.*another%20page/.test(wrong.location) && !a.has('ht_x') && (await a('/api/quests')).body.x === null, wrong.location);
  /* a code whose challenge does not match the verifier in the cookie, as a code caught on its way back would be */
  await a('/api/x/connect', {});
  const st = new URL((await a('/api/x/connect', {})).body.url).searchParams.get('state');
  FX.codes.set('stolen', { ch: 'a-challenge-that-is-not-ours', user: 'alice', redirect: BASE + '/api/x/callback' });
  const stolen = await a.nav('/api/x/callback?code=stolen&state=' + encodeURIComponent(st));
  check('a code that does not match the PKCE verifier connects nothing', /^\/\?x=failed&why=X%20did%20not%20accept/.test(stolen.location) && (await a('/api/quests')).body.x === null, stolen.location);
  const cx = await connectX(a, 'alice');
  check('a real sign in connects the account and comes back to the game', cx.location === '/?x=connected&name=alice_x' && !a.has('ht_x'), cx.location);
  const xa1 = await a('/api/quests');
  check('the Quests tab shows the connected account', xa1.body.x && xa1.body.x.username === 'alice_x' && xa1.body.x.id === XU.alice.id, xa1.body.x);
  check('the way back works once only', /^\/\?x=failed/.test((await a.nav('/api/x/callback?code=code1&state=' + encodeURIComponent(cu.searchParams.get('state')))).location));
  {
    const XAm = require('../lib/xapi'), sealed = XAm.seal({ a: 'secret-access-token', r: 'secret-refresh-token', e: 1 });
    const flip = sealed.slice(0, -2) + (sealed.slice(-2) === 'AA' ? 'AB' : 'AA');
    check('tokens are kept encrypted, and a changed copy does not open', !sealed.includes('secret') && XAm.unseal(sealed).a === 'secret-access-token' && XAm.unseal(flip) === null);
  }

  console.log('Checks on X');
  FX.following[XU.alice.id] = [XU.gina.id];
  const nf = await a('/api/quests/social', { id: ids.follow });
  check('a follow X does not show is refused, naming the account', nf.status === 400 && /follow @hamstertower/.test(nf.body.error || ''), nf.body);
  FX.following[XU.alice.id] = [XU.gina.id, XU.ham.id];
  const f1 = await a('/api/quests/social', { id: ids.follow });
  check('then it pays its TP and, at a 100% chance, some SQK', f1.status === 200 && f1.body.got.tp === 50 && f1.body.got.sqk >= .2 * E.SQK_UNIT && f1.body.got.sqk <= E.SQK_UNIT && f1.body.state.quests.sd.includes(ids.follow), f1.body);
  check('a quest pays each player once', /already did/.test((await a('/api/quests/social', { id: ids.follow })).body.error || ''));
  FX.likes[XU.alice.id] = ['999', '1000000001'];
  const lk = await a('/api/quests/social', { id: ids.like });
  check('a like is found among the account\'s newest likes', lk.status === 200 && lk.body.got.tp === 10, lk.body);
  const postAt = xTime(openedA + 1000), oldAt = xTime(openedA - 10 * 60000);
  FX.posts[XU.alice.id] = [
    { id: '3005', text: 'Old post @HamsterTower #Squeekchain', created_at: oldAt },
    { id: '3003', text: 'Climbing @HamsterTower tonight', created_at: postAt },
  ];
  const np = await a('/api/quests/social', { id: ids.post });
  check('a post missing a hashtag, or made before the quest was opened, does not count, and the reason names the tags', np.status === 400 && /@HamsterTower #Squeekchain/.test(np.body.error || ''), np.body);
  check('nothing to repost or reply yet either', /repost/.test((await a('/api/quests/social', { id: ids.repost })).body.error || '') && /reply/.test((await a('/api/quests/social', { id: ids.comment })).body.error || ''));
  FX.posts[XU.alice.id].push(
    { id: '3004', text: 'Climbing @HamsterTower tonight #Squeekchain', created_at: postAt },
    { id: '3002', text: 'great game', referenced_posts: [{ type: 'replied_to', id: '1000000001' }], conversation_id: '1000000001', created_at: postAt },
    { id: '3001', text: 'RT @hamstertower: launch', referenced_posts: [{ type: 'retweeted', id: '1000000001' }], created_at: postAt },
  );
  const okPost = await a('/api/quests/social', { id: ids.post }), okReply = await a('/api/quests/social', { id: ids.comment }), okRepost = await a('/api/quests/social', { id: ids.repost });
  check('a new post with every tag pays', okPost.status === 200 && okPost.body.got.tp === 80, okPost.body);
  check('a reply to the quest\'s post pays', okReply.status === 200 && okReply.body.got.tp === 30, okReply.body);
  check('a repost of the quest\'s post pays', okRepost.status === 200 && okRepost.body.got.tp === 20, okRepost.body);

  console.log('One X account, one player');
  const bx = await connectX(b, 'alice');
  check('an X account connected to one player cannot be connected to another', /^\/\?x=failed&why=.*already%20connected%20to%20another%20player/.test(bx.location) && (await b('/api/quests')).body.x === null, bx.location);
  const gx = await connectX(g, 'gina');
  check('a guest can connect its own X account', gx.location === '/?x=connected&name=gina_x', gx.location);
  FX.following[XU.gina.id] = [XU.ham.id];
  await g('/api/quests/open', { id: ids.follow });await sleep(6300);
  const gf = await g('/api/quests/social', { id: ids.follow });
  check('a guest gets the TP but no SQK', gf.status === 200 && gf.body.got.tp === 50 && gf.body.got.sqk === 0, gf.body);
  const off = await a('/api/x/disconnect', {});
  check('disconnecting forgets the account and revokes its tokens at X', off.status === 200 && (await a('/api/quests')).body.x === null && FX.revoked.length >= 2, FX.revoked.length);
  const bx2 = await connectX(b, 'alice');
  check('once disconnected it can be connected to another player', bx2.location === '/?x=connected&name=alice_x', bx2.location);
  await b('/api/quests/open', { id: ids.follow });await b('/api/quests/open', { id: ids.post });await sleep(6300);
  const again1 = await b('/api/quests/social', { id: ids.follow });
  check('but that X account cannot do the same quest again for the new player', again1.status === 400 && /@alice_x already did this quest/.test(again1.body.error || ''), again1.body);
  /* the newest matching post was already used, so a claim looks for one that was not */
  FX.posts[XU.alice.id].push({ id: '3010', text: 'Floor 60 on @HamsterTower #Squeekchain', created_at: xTime(Date.now()) });
  check('the same X account cannot do the post quest again with a new post either', /@alice_x already did this quest/.test((await b('/api/quests/social', { id: ids.post })).body.error || ''));

  console.log('At the same moment');
  const extra = (await d('/api/admin/social', { quest: { kind: 'like', title: 'Like the second post', url: 'https://x.com/hamstertower/status/1000000003', tp: 12, sqkP: 0, sqkMax: 0 } })).body.quests.find(x => x.title === 'Like the second post').id;
  FX.likes[XU.alice.id].push('1000000003');
  await b('/api/quests/open', { id: extra });await sleep(6300);
  const race = await Promise.all([1, 2, 3, 4].map(() => b('/api/quests/social', { id: extra })));
  check('four claims of one quest sent at once pay once', race.filter(r => r.status === 200).length === 1 && race.filter(r => r.status === 400).length === 3, race.map(r => r.status + ' ' + (r.body.error || 'paid')));

  console.log('A sign in that runs out');
  FX.expires = 30;
  const dx = await connectX(d, 'dora');
  check('the dev wallet connects an account whose token runs out in half a minute', dx.location === '/?x=connected&name=dora_x', dx.location);
  FX.expires = 7200;FX.following[XU.dora.id] = [XU.ham.id];
  const r0 = FX.refreshes;
  await d('/api/quests/open', { id: ids.follow });await sleep(6300);
  const dfl = await d('/api/quests/social', { id: ids.follow });
  check('a token about to run out is refreshed before the check, and the check pays', dfl.status === 200 && FX.refreshes === r0 + 1, [dfl.status, dfl.body.error, FX.refreshes - r0]);
  FX.likes[XU.dora.id] = ['1000000001'];
  await d('/api/quests/open', { id: ids.like });await sleep(6300);
  const dlk = await d('/api/quests/social', { id: ids.like });
  check('the new token is kept, so the next check needs no refresh', dlk.status === 200 && FX.refreshes === r0 + 1, [dlk.status, dlk.body.error, FX.refreshes - r0]);
  const ad1 = await d('/api/admin/social');
  check('the admin sees who claimed what, with the post that proves it', ad1.body.recent.some(r => r.proof === 'https://x.com/i/status/3004' && r.who === A.address.toLowerCase()) && ad1.body.recent.some(r => r.proof === 'https://x.com/i/status/3001') && ad1.body.quests.find(x => x.id === ids.follow).done === 3, ad1.body.recent.slice(0, 5));
  await d('/api/admin/social', { op: 'toggle', id: ids.like });
  check('a paused quest leaves the players\' list', !(await b('/api/quests')).body.social.some(x => x.id === ids.like));
  check('and cannot be opened or claimed', (await b('/api/quests/open', { id: ids.like })).status === 404);
  await d('/api/admin/social', { id: ids.like, quest: { kind: 'like', title: 'Like the new post', url: 'https://x.com/hamstertower/status/1000000002', tp: 15, sqkP: .1, sqkMax: .5, active: true } });
  const edited = (await b('/api/quests')).body.social.find(x => x.id === ids.like);
  check('an edit changes what players see', edited && edited.title === 'Like the new post' && edited.tp === 15 && edited.url.endsWith('1000000002'), edited);
  await d('/api/admin/social', { op: 'delete', id: ids.comment });
  check('a deleted quest is gone', !(await d('/api/admin/social')).body.quests.some(x => x.id === ids.comment));
  const ends = await d('/api/admin/social', { quest: { kind: 'follow', title: 'Ended quest', url: '@someone', tp: 5, starts: Math.floor(Date.now() / 1000) - 7200, ends: Math.floor(Date.now() / 1000) - 3600 } });
  check('a quest whose end has passed is saved but not shown to players', ends.status === 200 && ends.body.quests.some(x => x.title === 'Ended quest' && x.tp === 5 && x.sqkP === 0) && !(await b('/api/quests')).body.social.some(x => x.title === 'Ended quest'), ends.body.error);
  const later = await d('/api/admin/social', { quest: { kind: 'follow', title: 'Later quest', url: '@someone', starts: Math.floor(Date.now() / 1000) + 3600 } });
  check('an empty TP takes the task\'s usual TP, and a quest that has not started is hidden too', later.status === 200 && later.body.quests.some(x => x.title === 'Later quest' && x.tp === E.SOCIAL_KINDS.follow.tp) && !(await b('/api/quests')).body.social.some(x => x.title === 'Later quest'));
  console.log(`\n${passed} passed, ${failed} failed`);
  fakeX.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL crashed:', e && (e.stack || e.message)); fakeX.close(); process.exit(1); });
