// Simulates many players against a running server and reports latency per route.
// Start the target server with RATE_LIMIT_OFF=1 MIN_MS_PER_ROUND=0 ALLOW_GUEST=1 ALLOW_TRIAL=1.
// Usage: node scripts/loadtest.js --base=http://localhost:3100 --users=10000 --fight=90 --seconds=120
const E = require('../lib/engine.generated.cjs');
const http = require('http');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const BASE = new URL(arg('base', 'http://localhost:3100'));
const USERS = +arg('users', 1000), FIGHT = +arg('fight', 90), SECONDS = +arg('seconds', 120), SETUP_CONC = +arg('setup', 40);
const agent = new http.Agent({ keepAlive: true, maxSockets: +arg('sockets', 256) });
const hist = {}, errors = {};
function record(route, ms, status) {
  (hist[route] = hist[route] || []).push(ms);
  if (status >= 400 || status === 0) errors[route + ' ' + status] = (errors[route + ' ' + status] || 0) + 1;
}
function call(route, cookie, body, measure) {
  return new Promise(resolve => {
    const data = body === undefined ? null : JSON.stringify(body);
    const headers = { 'content-type': 'application/json' };
    if (cookie) headers.cookie = cookie;
    if (data) headers['content-length'] = Buffer.byteLength(data);
    const t0 = performance.now();
    const req = http.request({ host: BASE.hostname, port: BASE.port, path: route, method: data ? 'POST' : 'GET', headers, agent }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const ms = performance.now() - t0;
        if (measure !== false) record(route, ms, res.statusCode);
        let j = {};try { j = JSON.parse(Buffer.concat(chunks).toString()); } catch (e) {}
        resolve({ status: res.statusCode, body: j, cookie: (res.headers['set-cookie'] || [''])[0].split(';')[0] });
      });
    });
    req.on('error', () => { if (measure !== false) record(route, performance.now() - t0, 0); resolve({ status: 0, body: {} }); });
    req.setTimeout(30000, () => req.destroy());
    if (data) req.write(data);
    req.end();
  });
}
const rid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const unpack = st => { const G = {}; for (const k of ['coins', 'top', 'team', 'chests', 'pityE', 'pityL', 'bags', 'sweepDay', 'gifts', 'battles', 'wins', 'foods']) if (st[k] !== undefined) G[k] = st[k]; if (st.owned) G.owned = st.owned; if (st.items) G.items = st.items.map(a => ({ uid: a[0], set: a[1], slot: a[2], rar: a[3], plus: a[4] })); return G; };
function botPlans(G, node, floors, seed) {
  const { B } = E.startBattle(G, node, floors, { seed });
  const plans = [];let g = 0;
  while (!B.over && g++ < 40) {
    const p = {};
    E.alive(B, 'p').forEach(u => { p[u.id] = { i: E.canPick(B, u.id, 2) ? 2 : E.canPick(B, u.id, 1) ? 1 : 0, target: null }; });
    plans.push(JSON.parse(JSON.stringify(p)));
    E.runRound(B, p);
  }
  return plans;
}
async function pool(n, conc, fn) {
  let i = 0;
  await Promise.all(new Array(conc).fill(0).map(async () => { while (i < n) { const k = i++; await fn(k); } }));
}
const pct = (a, p) => a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
function report(label, secs) {
  let total = 0;
  const lines = Object.keys(hist).sort().map(r => {
    const a = hist[r].slice().sort((x, y) => x - y);total += a.length;
    return `  ${r.padEnd(22)} ${String(a.length).padStart(7)} req  ${(a.length / secs).toFixed(1).padStart(7)}/s  p50 ${pct(a, .5).toFixed(0).padStart(5)} ms  p95 ${pct(a, .95).toFixed(0).padStart(5)} ms  p99 ${pct(a, .99).toFixed(0).padStart(5)} ms  max ${a[a.length - 1].toFixed(0).padStart(5)} ms`;
  });
  console.log(`\n${label}: ${total} requests, ${(total / secs).toFixed(0)} per second`);
  lines.forEach(l => console.log(l));
  console.log('  errors:', Object.keys(errors).length ? JSON.stringify(errors) : 'none');
}
(async () => {
  const R = await new Promise(res => http.get(new URL('/api/rounds', BASE), r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res(JSON.parse(s))); }));
  const floors = E.buildFloors(R.rounds.map(x => ({ round: x[0], work: x[1], blocks: x[2], hash: x[3], gap: x[4], t: x[5] })));
  console.log(`Target ${BASE.href}, ${floors.length} floors. Creating ${USERS} players...`);
  const users = new Array(USERS);
  const t0 = Date.now();
  await pool(USERS, SETUP_CONC, async k => {
    const r = await call('/api/auth/guest', null, {}, false);
    const cookie = r.cookie;
    const top = 5 + Math.floor(Math.random() * 120);
    await call('/api/dev', cookie, { op: 'jump', n: top }, false);
    await call('/api/dev', cookie, { op: 'coins' }, false);
    await call('/api/action', cookie, { type: 'bag', n: 20, requestId: rid() }, false);
    const me = await call('/api/me', cookie, undefined, false);
    users[k] = { cookie, G: unpack(me.body.state), cycle: 0 };
    if (k && k % 2000 === 0) console.log(`  ${k} players ready`);
  });
  console.log(`Players ready in ${((Date.now() - t0) / 1000).toFixed(0)} s. Each one fights every ${FIGHT} s on average for ${SECONDS} s.`);
  Object.keys(hist).forEach(k => delete hist[k]);Object.keys(errors).forEach(k => delete errors[k]);
  let running = true, started = 0, wins = 0, losses = 0, stale = 0;
  const merge = (u, st) => { Object.assign(u.G, unpack(st)); };
  const loop = async u => {
    await new Promise(r => setTimeout(r, Math.random() * FIGHT * 1000));
    while (running) {
      const floor = Math.max(1, Math.min(u.G.top, floors.length));
      const s = await call('/api/battle/start', u.cookie, { floor, b: u.G.battles });
      started++;
      await new Promise(r => setTimeout(r, FIGHT * 1000 * (.7 + Math.random() * .6)));
      if (!running) break;
      if (s.status === 200) {
        const plans = botPlans(u.G, floors[floor - 1], floors, s.body.seed);
        const f = await call('/api/battle/finish', u.cookie, { token: s.body.token, plans, requestId: rid() });
        if (f.status === 200 && f.body.state) { merge(u, f.body.state); if (f.body.over === 'win') wins++; else losses++; }
        else if (f.body && f.body.state) { merge(u, f.body.state); stale++; }
      }
      u.cycle++;
      if (u.cycle % 5 === 0) {
        if (u.G.chests.some(x => x > 0)) {
          const c = await call('/api/action', u.cookie, { type: 'chest', all: true, requestId: rid() });
          if (c.body.state) merge(u, c.body.state);
        }
        const id = u.G.team[0], o = u.G.owned[id], tier = o.lv >= E.FOOD_BAGS[2].a ? 2 : o.lv >= E.FOOD_BAGS[1].a ? 1 : 0;
        if (u.G.coins >= E.FOOD_BAGS[tier].cost * 5) {
          const b = await call('/api/action', u.cookie, { type: 'foodbag', tier, n: 5, requestId: rid() });
          if (b.body.state) merge(u, b.body.state);
        }
        const o2 = u.G.owned[id];
        if (o2.full >= E.stomach(o2.lv) || E.feedPlan(u.G.foods, o2.full, E.stomach(o2.lv)).fills) {
          const r = await call('/api/action', u.cookie, { type: 'run', id, all: true, requestId: rid() });
          if (r.body.state) merge(u, r.body.state);
        }
      }
    }
  };
  const loops = users.map(loop);
  const t1 = Date.now();
  const tick = setInterval(() => { const n = Object.values(hist).reduce((a, b) => a + b.length, 0); console.log(`  ${((Date.now() - t1) / 1000).toFixed(0)} s: ${n} requests, wins ${wins}, losses ${losses}, stale ${stale}, errors ${Object.values(errors).reduce((a, b) => a + b, 0)}`); }, 15000);
  await new Promise(r => setTimeout(r, SECONDS * 1000));
  running = false;clearInterval(tick);
  report(`${USERS} players, one battle every ${FIGHT} s`, SECONDS);
  console.log(`  battles started ${started}, wins ${wins}, losses ${losses}, stale tickets ${stale}`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
