// A single function handles every /api/... path
const crypto = require('crypto');
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { HttpError, bad, sendJson, readJson, parseCookies, signToken, readToken, seedFor, clientIp } = require('./http');
const { allow } = require('./ratelimit');
const { syncRounds } = require('./chain');
const { withPlayer, createPlayer, claimGuest, loadRow, toG, publicState } = require('./players');
const { ACTIONS, TRIAL } = require('./actions');
const { bonusOf, arenaGate } = require('./live');
const { getDaily, dailyBoard, myDaily, triesLeft, firstTurn, saveBest, payChest, hpLeft, ticketEnd, closedRanks, payPrize } = require('./daily');
const AR = require('./arena');
const SQ = require('./squeek');
const SK = require('./sqk');
const QS = require('./quests');
const TW = require('./tpweek');
const AL = require('./alerts');
const XA = require('./xapi');

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
  const newest = cfg.cores()[cores.length - 1], frontier = cores.length ? cores[cores.length - 1].frontier : 0, newestKey = newest ? newest.core.toLowerCase() : '';
  FL.meta = { cores, frontier, readAt: Math.max(0, ...st.rows.map(x => x.read_at)), settled: newest ? newest.genesis + frontier * 600 : 0, work: FL.rows.reduce((a, x) => a + (x.core === newestKey ? Number(x.work) : 0), 0) };
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
const sessionOf = req => {
  const bearer = /^Bearer (\S+)$/.exec(req.headers.authorization || '');
  return readToken(bearer ? bearer[1] : parseCookies(req).ht_s);
};
function sessionCookie(id) {
  return `ht_s=${sessionTicket(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${cfg.isProd ? '; Secure' : ''}`;
}
/* the site on our own address gets a cookie. A copy hosted elsewhere cannot use one, so it gets the same signed ticket to send as a header */
function signedIn(c, id) {
  if (c.crossHost) return { ok: true, session: sessionTicket(id) };
  c.res.setHeader('Set-Cookie', sessionCookie(id));
  return { ok: true };
}
/* public data carries no cookies or tickets, so any site may read it and the CDN keeps one copy */
const PUBLIC_DATA = { headersOpen: true };
const routes = {};
const on = (m, p, f, o) => { routes[m + ' ' + p] = Object.assign({ f }, o || {}); };
const AUTH = { auth: true };

on('GET', '/api/config', () => ({ guest: cfg.allowGuest() }), PUBLIC_DATA);
/* wallets are stored in lower case and only ever come from a checked signature, guests have none */
const isTestWallet = row => !!row.wallet && cfg.testWallets().includes(row.wallet);
const canTest = row => cfg.allowTrial() || isTestWallet(row);

/* only requests that reach the server can trigger a chain read, about once a minute */
async function syncIfOld() {
  await getFloors();
  if (!FL.rows.length || Date.now() - (FL.meta.readAt || 0) * 1000 > cfg.syncEveryMs) {
    /* never let a slow RPC hold up the response: wait briefly if floors already exist, fully only when there are none */
    const run = syncRounds().then(async s => { if (s.added) { FL.at = 0; await getFloors(); } }).catch(e => console.error('sync', e.message));
    if (FL.rows.length) await Promise.race([run, new Promise(r => setTimeout(r, 3000))]);
    else await run;
  }
}
/* floors go out through the CDN */
on('GET', '/api/rounds', async c => {
  await syncIfOld();
  return { rounds: FL.rows.map(r => [r.round, r.work, r.blocks, r.hash, r.gap, Number(r.t)]), cores: FL.meta.cores, frontier: FL.meta.frontier, readAt: FL.meta.readAt };
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } });

on('GET', '/api/cron/sync', async c => {
  const want = cfg.cronSecret();
  /* without a secret anyone can call this, so it only reads the chain when the last read is old, like any visit does */
  if (!want) { await syncIfOld(); return { checked: true }; }
  if (c.req.headers.authorization !== 'Bearer ' + want) throw new HttpError(401, 'Not allowed');
  const s = await syncRounds();FL.at = 0;
  return s;
});
/* calls that make this server read the chain: a wallet costs nothing to make, so each address also has its own limit */
async function chainCall(c, key, perPlayer, perIp) {
  if (!await allow(key + ':' + c.pid, 60, perPlayer) || !await allow(key + 'ip:' + clientIp(c.req), 60, perIp)) throw new HttpError(429, 'Please wait a moment and try again');
}

/* test wallets can jump floors, so they are left out of every ranking. Guests stay on the board */
const RANKED = `(wallet IS NULL OR NOT (wallet = ANY($1::text[])))`;
const LB = { at: 0, rows: [], devs: [], total: 0, winners: [] };
on('GET', '/api/leaderboard', async () => {
  if (Date.now() - LB.at > 30000) {
    const tw = cfg.testWallets();
    const r = await q(`SELECT id, name, top, extract(epoch FROM top_at)::bigint AS at FROM players WHERE top > 0 AND ${RANKED} ORDER BY top DESC, top_at ASC LIMIT 100`, [tw]);
    const n = await q(`SELECT count(*)::int AS n FROM players WHERE top > 0 AND ${RANKED}`, [tw]);
    /* a dev wallet shows with a tag and no rank number. Its address never leaves the server */
    const dev = await q('SELECT id, top, extract(epoch FROM top_at)::bigint AS at FROM players WHERE top > 0 AND wallet = ANY($1::text[]) ORDER BY top DESC, top_at ASC', [tw]);
    /* the wallets in line for the prize: guests are skipped and the next wallet moves up */
    const w = await q('SELECT id, name, top, extract(epoch FROM top_at)::bigint AS at FROM players WHERE top > 0 AND wallet IS NOT NULL AND NOT (wallet = ANY($1::text[])) ORDER BY top DESC, top_at ASC LIMIT 10', [tw]);
    LB.winners = w.rows;LB.rows = r.rows;LB.devs = dev.rows.map(x => Object.assign(x, { name: 'Dev', dev: true }));LB.total = n.rows[0].n;LB.at = Date.now();
  }
  return { top: LB.rows, devs: LB.devs, total: LB.total, winners: LB.winners };
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });

async function rankOf(row) {
  const r = await q(`SELECT count(*)::int AS n FROM players WHERE ${RANKED} AND (top > $2 OR (top = $2 AND top_at < $3))`, [cfg.testWallets(), row.top, row.top_at]);
  return r.rows[0].n + 1;
}
on('GET', '/api/rank', async c => {
  const row = (await q('SELECT top, top_at, wallet FROM players WHERE id = $1', [c.pid])).rows[0];
  if (!row || !row.top) return { rank: null, top: 0 };
  if (isTestWallet(row)) return { rank: null, top: row.top, test: true };
  return { rank: await rankOf(row), top: row.top };
}, AUTH);

/* a climber's public page: what anyone needs to see that a fast climb is fair. Never the random state, coins or food, and nothing at all for someone who never reached a board */
on('GET', '/api/player', async c => {
  const id = Number(c.url.searchParams.get('id'));
  if (!Number.isSafeInteger(id) || id < 1) bad('Invalid player');
  if (!await allow('player:' + clientIp(c.req), 60, 120)) throw new HttpError(429, 'Please try again in a moment');
  const row = (await q(`SELECT p.name, p.wallet, p.top, p.top_at, p.battles, p.wins, p.bags, p.team, p.created_at, p.gifts, i.owned, i.items FROM players p JOIN inventory i ON i.player_id = p.id WHERE p.id = $1 AND (p.top > 0 OR EXISTS (SELECT 1 FROM daily_scores s WHERE s.player_id = p.id AND s.rounds IS NOT NULL))`, [id])).rows[0];
  if (!row) throw new HttpError(404, 'This player does not exist');
  const items = new Map(row.items.map(x => [x[0], x]));
  const team = row.team.filter(p => row.owned[p]).map(p => { const o = row.owned[p], out = { id: p, lv: o.lv, star: o.star, branch: o.branch || null, gear: Object.values(o.gear).map(u => items.get(u)).filter(Boolean).map(x => x.slice(1)) }; if (o.sq) out.sq = { t: o.sq.t, lv: o.sq.lv }; return out; });
  const clears = (await q('SELECT count(*)::int AS n, sum(rounds)::bigint AS rounds, sum(ms)::bigint AS ms FROM battle_log WHERE player_id = $1', [id])).rows[0];
  const drops = await q(`SELECT source, kind, ref, extract(epoch FROM at)::bigint AS at FROM rare_drops WHERE player_id = $1 ORDER BY at DESC LIMIT 20`, [id]);
  const dev = isTestWallet(row);
  return {
    name: dev ? 'Dev' : row.name, dev, guest: !row.wallet, top: row.top, at: row.top_at ? Math.floor(row.top_at.getTime() / 1000) : null, since: Math.floor(row.created_at.getTime() / 1000),
    rank: row.top && !dev ? await rankOf(row) : null, battles: row.battles, wins: row.wins, bags: row.bags, team,
    msPerRound: Number(clears.rounds) ? Math.round(Number(clears.ms) / Number(clears.rounds)) : null, clears: clears.n,
    legendaries: Object.keys(row.owned).filter(p => E.PETS[p] && E.PETS[p].rar === 'l'), legendaryGear: row.items.filter(x => x[3] === 'l').length, drops: drops.rows,
    /* the achievements this player was paid for, shown as badges */
    ach: row.gifts && Array.isArray(row.gifts.ach) ? E.ACHS.map(a => a.id).filter(id => row.gifts.ach.includes(id)) : [],
  };
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });

/* whether wins pay more right now, for the home screen. The CDN keeps it a few seconds, so a crowd costs one read */
on('GET', '/api/live', async () => {
  await syncIfOld();
  const now = Date.now() / 1000;
  return Object.assign(bonusOf(FL.floors, now), { arena: Object.assign(arenaGate(FL.floors, now), { work: FL.meta.work }) });
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' } });

/* the day's challenge is saved once, so it is built from rounds read just now. A slow RPC must not hold up the page for long */
async function freshFloors() {
  await Promise.race([syncRounds().catch(e => console.error('sync', e.message)), new Promise(r => setTimeout(r, 8000))]);
  FL.at = 0;
  return getFloors();
}
on('GET', '/api/daily', async () => {
  const ch = await getDaily(freshFloors);
  return Object.assign({ ch }, await dailyBoard(ch.day));
}, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
on('GET', '/api/daily/me', async c => myDaily(c.pid, (await getDaily(freshFloors)).day), AUTH);

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
  if (!await allow('verify:' + clientIp(c.req), 60, 60)) throw new HttpError(429, 'Please try again in a moment');
  const t = readToken(c.body.ticket);
  if (!t || !t.a) bad('The sign in request expired, please try again');
  const { recoverMessageAddress } = await import('viem');
  let who;
  try { who = await recoverMessageAddress({ message: t.m, signature: c.body.signature }); } catch (e) { bad('Invalid signature'); }
  if (who.toLowerCase() !== t.a) bad('The signature does not match the wallet');
  const s = sessionOf(c.req);
  const linked = !!(s && s.p) && await claimGuest(s.p, t.a, who);
  const id = linked ? s.p : await createPlayer(t.a, who);
  return Object.assign(signedIn(c, id), { linked });
});
on('POST', '/api/auth/logout', c => {
  c.res.setHeader('Set-Cookie', `ht_s=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${cfg.isProd ? '; Secure' : ''}`);
  return { ok: true };
});

/* a guest has no way back once the session ends, so opening the game extends it. A wallet can always sign in again */
const RENEW_BELOW_MS = 29 * 864e5;
on('GET', '/api/me', async c => {
  const row = await loadRow(c.pid), G = toG(row);
  const out = { player: { id: row.id, name: row.name, wallet: row.wallet, trial: canTest(row), dev: isTestWallet(row) }, state: publicState(G, true) };
  return !row.wallet && c.session.exp - Date.now() < RENEW_BELOW_MS ? Object.assign(out, signedIn(c, c.pid)) : out;
}, AUTH);

const cleanPlan = p => {
  const out = {};
  for (const k of ['p0', 'p1', 'p2']) {
    const x = p && p[k];
    if (x) out[k] = { i: [0, 1, 2, 3].includes(x.i) ? x.i : 0, target: /^e[0-2]$/.test(String(x.target)) ? x.target : null };
  }
  return out;
};
/* Battles run here one turn at a time. A turn's luck is made from the server secret, the battle and the turn number, so nobody can know it before sending the plan.
   Turns are counted in the database, so each one can only be played once and a plan cannot be tried twice. The battle itself travels as a signed ticket, which keeps a turn to one small write */
const MAX_ROUNDS = 80;
const NO_TRIES = 'No tries left today, a new challenge starts at 00:00 UTC';
/* walking away after the first turn counts as a lost battle */
async function settleOpen(pid) {
  const open = (await q('SELECT f.b, f.n, p.battles FROM fights f JOIN players p ON p.id = f.player_id WHERE f.player_id = $1', [pid])).rows[0];
  if (open && open.n > 0 && open.b === open.battles) await withPlayer(pid, null, G => { if (G.battles === open.b) G.battles++; });
}
async function openFight(pid, b) {
  const id = crypto.randomBytes(12).toString('hex');
  await q('INSERT INTO fights (player_id, id, b, n, plan_hash, at) VALUES ($1, $2, $3, 0, NULL, now()) ON CONFLICT (player_id) DO UPDATE SET id = $2, b = $3, n = 0, plan_hash = NULL, at = now()', [pid, id, b]);
  return id;
}
on('POST', '/api/fight/start', async c => {
  const f = Math.floor(Number(c.body.floor));
  const floors = await getFloors(), node = floors[f - 1];
  if (!node) bad('This floor does not exist');
  await settleOpen(c.pid);
  let row = await loadRow(c.pid), G = toG(row);
  if (f > G.top + 1) bad('This floor is still locked');
  if (await SQ.checkTeam(c.pid, row, G)) { row = await loadRow(c.pid); G = toG(row); }
  const id = await openFight(c.pid, G.battles);
  const { B, init } = E.startBattle(G, node, floors, { seed: seedFor(`fight:${id}:start`) });
  delete B.rng;
  const now = Date.now();
  return { B, init, minMs: cfg.minMsPerRound(), token: signToken({ fp: c.pid, id, f, b: G.battles, n: 0, B, plans: [], iat: now, exp: now + 90 * 60000 }) };
}, AUTH);
/* the Arena plays through the same turns as well. Every pet fights at one level. The ticket keeps the team that started, so taking a floor for the first time needs no second read */
on('POST', '/api/arena/start', async c => {
  const f = Math.floor(Number(c.body.floor));
  let row = await loadRow(c.pid), G = toG(row);
  if (await SQ.checkTeam(c.pid, row, G)) { row = await loadRow(c.pid); G = toG(row); }
  /* open while the real hamster runs. Floors can be a minute old, so a closed answer is checked against the chain once more, and in the first minutes of a run the page's word counts, see lib/live.js. A fight already begun may finish. Testers can fight any time, to see it work */
  let early = 0;
  if (!canTest(row)) {
    await getFloors();
    if (!arenaGate(FL.floors, Date.now() / 1000).open) {
      await syncIfOld();
      if (!arenaGate(FL.floors, Date.now() / 1000).open) {
        if (!await AR.earlyOk(c.pid, c.body.run, FL.floors, FL.meta.settled, Date.now() / 1000)) throw new HttpError(409, AR.CLOSED);
        early = Math.floor(Number(c.body.run.from));
      }
    }
  }
  const { holder, mine } = await AR.arenaOpen(c.pid, G, row, f, AR.today());
  await settleOpen(c.pid);
  const id = await openFight(c.pid, -1), node = E.arenaNode(f);
  const { B, init } = E.startBattle(E.arenaG(G), node, [], { seed: seedFor(`fight:${id}:start`), foe: E.snapshotG(holder.def) });
  delete B.rng;
  const now = Date.now();
  return { B, init, node, holder: { floor: f, name: holder.name, bot: !!holder.bot, id: holder.id }, minMs: cfg.minMsPerRound(), token: signToken({ fp: c.pid, id, ar: { f, h: Number(holder.id) || 0, m: mine, def: E.teamSnapshot(G), e: early }, b: -1, n: 0, B, plans: [], iat: now, exp: now + 90 * 60000 }) };
}, AUTH);
/* the challenge plays through the same turns as a floor. It never touches the battle count, so its b can never match a player's */
on('POST', '/api/daily/start', async c => {
  const ch = await getDaily(freshFloors);
  if (!await triesLeft(c.pid, ch.day)) throw new HttpError(409, NO_TRIES);
  await settleOpen(c.pid);
  const id = await openFight(c.pid, -1);
  const { B, init } = E.startBattle(E.dailyG(ch), ch.node, [], { seed: seedFor(`fight:${id}:start`) });
  delete B.rng;
  const now = Date.now();
  return { B, init, node: ch.node, minMs: cfg.minMsPerRound(), token: signToken({ fp: c.pid, id, d: ch.day, c: ch.chest, b: -1, n: 0, B, plans: [], iat: now, exp: ticketEnd(ch.day, now) }) };
}, AUTH);
on('POST', '/api/fight/turn', async c => {
  const t = readToken(c.body.token);
  if (!t || t.fp !== c.pid || typeof t.id !== 'string') throw new HttpError(400, 'This battle has ended, please enter again');
  const plan = cleanPlan(c.body.plan), hash = crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex').slice(0, 16);
  const firstOfTry = (t.d || t.ar) && t.n === 0;
  const done = firstOfTry ? await (t.ar ? AR.firstTurn(AR.today(), c.pid, t.id, hash, cfg.minMsPerRound()) : firstTurn(t.d, c.pid, t.id, hash, cfg.minMsPerRound())) : (await q(`UPDATE fights SET n = n + 1, plan_hash = $4, at = now() WHERE player_id = $1 AND id = $2 AND n = $3 AND at <= now() - ($5::int * interval '1 millisecond') RETURNING 1`, [c.pid, t.id, t.n, hash, cfg.minMsPerRound()])).rowCount === 1;
  if (!done) {
    const r = (await q('SELECT id, n, plan_hash FROM fights WHERE player_id = $1', [c.pid])).rows[0];
    if (!r || r.id !== t.id) throw new HttpError(409, 'This battle was replaced by a newer one');
    if (r.n === t.n) {
      if (firstOfTry && t.ar && !await AR.triesLeft(c.pid, AR.today())) throw new HttpError(409, AR.NO_TRIES);
      if (firstOfTry && t.d && !await triesLeft(c.pid, t.d)) throw new HttpError(409, NO_TRIES);
      throw new HttpError(429, 'Too fast, please wait a moment', { slow: true });
    }
    /* the same plan sent again gets the same answer, in case the first answer was lost. Any other plan is refused */
    if (r.n !== t.n + 1 || r.plan_hash !== hash) throw new HttpError(409, 'This turn was already played');
  }
  const B = t.B;
  /* a battle begun before the upper tower rules plays on under the old ones. Its ticket lasts 90 minutes at most, so this line can go after that */
  if (B.hf === undefined) { B.hf = 0; B.h = 0; }
  B.rng = E.seedOf(seedFor(`fight:${t.id}:${t.n}`));
  const ev = E.runRound(B, plan);
  delete B.rng;
  const plans = t.plans.concat([plan]);
  if (!B.over && plans.length >= MAX_ROUNDS) B.over = 'lose';
  if (!B.over) return { ev, B, token: signToken(Object.assign({}, t, { n: t.n + 1, B, plans })) };
  const over = { ev, B, over: B.over, rounds: plans.length };
  if (t.ar) {
    const arena = await AR.arenaFinish(c.pid, t.id, t.ar, B.over === 'win', isTestWallet(await loadRow(c.pid)));
    /* any Arena fight counts for the day's quest, won or lost */
    const max = (await getFloors()).length, state = (await withPlayer(c.pid, null, (G, row) => { E.questOn(G, QS.ctxOf(row, max), { k: 'arena' }); })).state;
    return Object.assign(over, { arena, state });
  }
  if (t.d) {
    let reward = null;
    const won = B.over === 'win', hp = won ? hpLeft(B) : 0, max = (await getFloors()).length;
    if (won) await saveBest(t.d, c.pid, plans.length, hp);
    const state = (await withPlayer(c.pid, null, (G, row) => { E.questOn(G, QS.ctxOf(row, max), { k: 'daily' }); if (won) reward = payChest(G, t.d, t.id, t.c); })).state;
    return Object.assign(over, { state }, { daily: Object.assign(await myDaily(c.pid, t.d), { won, hp, reward }) });
  }
  /* the server knows the outcome first and books it at once, so a lost battle cannot go unreported */
  const floors = await getFloors();
  /* wins pay more for a while after the real hamster runs, going by the rounds on the chain */
  const awake = B.over === 'win' && bonusOf(floors, Date.now() / 1000).bonus;
  if (awake) B.coinBonus += E.LIVE_BONUS;
  let log = null;
  const out = await withPlayer(c.pid, 'f' + t.id, (G, row) => {
    if (G.battles !== t.b) return { res: null, dup: true };
    G.battles++;
    let res = null, cold = false;
    if (B.over === 'win') {
      res = E.finishWin(G, B, floors);
      res.live = awake;
      cold = !!res.gift;
      if (res.first) log = { floor: t.f, rounds: plans.length, ms: Date.now() - t.iat };
      /* a wallet gets an SQK pouch for each boss floor it has cleared, including ones cleared before pouches existed */
      const p = SK.pouchesFor(G, row, isTestWallet(row));
      if (p.length) res.pouches = p;
      const fin = E.questOn(G, QS.ctxOf(row, floors.length), { k: 'win', f: t.f, first: res.first });
      if (fin.length) res.quests = fin;
    }
    return { res, cold };
  });
  if (log) { try { await q('INSERT INTO battle_log (player_id, floor, rounds, ms, plans) VALUES ($1,$2,$3,$4,$5::jsonb)', [c.pid, log.floor, log.rounds, log.ms, JSON.stringify(plans)]); } catch (e) {} }
  return Object.assign(out, over);
}, AUTH);

/* The copy hosted on IPFS still plays whole battles by itself and cannot be changed, so it may only practice: it gets throwaway luck and nothing it plays counts.
   Its result screen shows this text as HTML. A tab of this site opened before the update gets the same routes until it reloads */
const PRACTICE_ONLY = 'This copy of the game can only practice now, so the leaderboard stays fair. To climb and earn rewards, play at <a href="https://www.hamstertower.site" target="_blank" rel="noopener noreferrer" style="color:#FFD56A;text-decoration:underline">www.hamstertower.site</a>. Sign in with the same wallet and your progress is there.';
on('POST', '/api/battle/start', async c => {
  const floors = await getFloors();
  if (!floors[Math.floor(Number(c.body.floor)) - 1]) bad('This floor does not exist');
  return { seed: crypto.randomBytes(16).toString('hex'), token: 'practice' };
}, AUTH);
on('POST', '/api/battle/finish', c => {
  throw new HttpError(400, c.crossHost ? PRACTICE_ONLY : 'The game was updated. Please reload this page to keep climbing.');
}, AUTH);

/* the top 10 wallets of a finished day. The record of settled days sits in the player's own row, so the rewards and the record are one write and cannot pay twice. Test wallets get nothing, and a guest's days are settled with nothing, so signing in later does not pay them */
on('POST', '/api/daily/claim', async c => {
  const row = (await q(`SELECT wallet, gifts->>'dailyRank' AS done FROM players WHERE id = $1`, [c.pid])).rows[0];
  if (!row || isTestWallet(row)) return { prizes: [] };
  const days = await closedRanks(c.pid, row.done || '');
  if (!days.length) return { prizes: [] };
  const out = await withPlayer(c.pid, null, G => {
    const prizes = [];
    for (const d of days) {
      if (d.day <= (G.gifts.dailyRank || '')) continue;
      G.gifts.dailyRank = d.day;
      if (!row.wallet) continue;
      const p = payPrize(G, d, cfg.maxItems);
      if (p) prizes.push(p);
    }
    return { prizes, cold: prizes.length > 0 };
  });
  for (const p of out.prizes) await logRare(c.pid, p.results);
  return out;
}, AUTH);

/* the Arena: the floors real players hold, cached by the CDN for everyone */
on('GET', '/api/arena', () => AR.arenaBoard(), { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
on('GET', '/api/arena/me', async c => {
  const [me, row] = await Promise.all([AR.arenaMe(c.pid), loadRow(c.pid), getFloors()]);
  return Object.assign(me, { gate: Object.assign(arenaGate(FL.floors, Date.now() / 1000), { test: canTest(row), work: FL.meta.work, now: Date.now() / 1000 }) });
}, AUTH);
on('POST', '/api/arena/defense', async c => {
  let row = await loadRow(c.pid), G = toG(row);
  if (await SQ.checkTeam(c.pid, row, G)) { row = await loadRow(c.pid); G = toG(row); }
  return { def: await AR.setDefense(c.pid, G) };
}, AUTH);

/* SQUEEK PETS: the page sends the ids the official API lists for this wallet, the server checks each one on the chain */
on('POST', '/api/squeek/sync', async c => {
  if (!await allow('sq:' + c.pid, 60, 6) || !await allow('sqip:' + clientIp(c.req), 60, 20)) throw new HttpError(429, 'Please wait a moment before checking your Squeeks again');
  return SQ.syncSqueeks(c.pid, await loadRow(c.pid), c.body.ids);
}, AUTH);
/* a Squeek's dots for drawing, and its real picture for the pet page. Neither changes, so the CDN keeps them for a day */
/* every one reads the database, and an address with an extra word skips the CDN, so each address has a generous limit */
const artLimit = async c => { if (!await allow('art:' + clientIp(c.req), 60, 240)) throw new HttpError(429, 'Please try again in a moment'); };
on('GET', '/api/squeek/art', async c => { await artLimit(c); return SQ.artOf(c.url.searchParams.get('ids')); }, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
on('GET', '/api/squeek/pic', async c => { await artLimit(c); return SQ.picOf(c.url.searchParams.get('id')); }, { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
/* one chest for each finished day the player fought on, by the floor they stood on when it ended. The record sits in the player's own row, so the chest and the record are one write. A guest's days are settled with nothing, so signing in later does not pay them */
on('POST', '/api/arena/claim', async c => {
  const row = (await q(`SELECT wallet, gifts->>'arenaDay' AS done FROM players WHERE id = $1`, [c.pid])).rows[0];
  if (!row || isTestWallet(row)) return { prizes: [] };
  const days = await AR.closedDays(c.pid, row.done || '');
  if (!days.length) return { prizes: [] };
  return withPlayer(c.pid, null, G => {
    const prizes = [];
    for (const d of days) {
      if (d.day <= (G.gifts.arenaDay || '')) continue;
      G.gifts.arenaDay = d.day;
      if (!row.wallet) continue;
      const p = AR.payDay(G, d);
      if (p) prizes.push(p);
    }
    return { prizes };
  });
}, AUTH);

/* SQK: the SQK Chest is bought on the chain, and boss floor pouches are claimed from the same contract, see lib/sqk.js */
on('GET', '/api/sqk', async () => Object.assign(await SK.shop(), { signer: await SK.signerAddress() }), { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
on('GET', '/api/sqk/me', async c => { await chainCall(c, 'sqkm', 30, 150); const row = await loadRow(c.pid); return SK.mine(row, toG(row)); }, AUTH);
on('GET', '/api/sqk/balance', async c => { await chainCall(c, 'sqkb', 12, 120); return SK.balance(await loadRow(c.pid)); }, AUTH);
on('POST', '/api/sqk/credit', async c => {
  await chainCall(c, 'sqkc', 40, 120);
  return SK.credit(c.pid, await loadRow(c.pid), c.body.tx);
}, AUTH);
on('POST', '/api/sqk/scan', async c => {
  await chainCall(c, 'sqks', 4, 20);
  return SK.scan(c.pid, await loadRow(c.pid));
}, AUTH);
on('POST', '/api/sqk/claim', async c => {
  await chainCall(c, 'sqkq', 6, 30);
  const row = await loadRow(c.pid);
  return SK.claimTicket(row, toG(row), isTestWallet(row));
}, AUTH);

/* every legendary is written down, so a climb can be checked by hand against what really dropped. An SQK Chest is written as its parts */
const rareParts = r => r.kind !== 'sqk' ? [r] : [...r.bags, ...r.gear, ...(r.pet ? [r.pet] : [])].map(x => Object.assign({ src: 'sqk' }, x));
async function logRare(pid, results) {
  for (const r of results.flatMap(rareParts)) {
    const source = r.src || (r.kind === 'chest' ? 'chest ' + r.tier : 'bag'), pet = r.kind === 'chest' ? r.pet : r.kind === 'pet' ? r : null, rows = [];
    if (pet && pet.rar === 'l') rows.push(['pet', pet.id]);
    if (r.item && r.item.rar === 'l') rows.push(['item', r.item.set + ' ' + r.item.slot]);
    for (const [kind, ref] of rows) { try { await q('INSERT INTO rare_drops (player_id, source, kind, ref) VALUES ($1,$2,$3,$4)', [pid, source, kind, ref]); } catch (e) {} }
  }
}

on('POST', '/api/action', async c => {
  const f = Object.prototype.hasOwnProperty.call(ACTIONS, c.body.type) ? ACTIONS[c.body.type] : null;
  if (!f) bad('Invalid action');
  const floors = await getFloors();
  /* the id is kept with the save to answer a resent request, so only a short plain one is taken */
  const rq = c.body.requestId;
  if (rq !== undefined && rq !== null && !(typeof rq === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(rq))) bad('Invalid request');
  const out = await withPlayer(c.pid, rq || null, (G, row) => f(G, c.body, { floors, quest: ev => E.questOn(G, QS.ctxOf(row, floors.length), ev) }));
  if (out.results) await logRare(c.pid, out.results);
  return out;
}, AUTH);

/* QUESTS: the day's list comes from the player's floor, social quests from the dev wallet, see lib/quests.js */
on('GET', '/api/quests', async c => QS.mine(c.pid, (await getFloors()).length), AUTH);
on('POST', '/api/quests/claim', async c => QS.claim(c.pid, (await getFloors()).length, c.body.i), AUTH);
on('POST', '/api/quests/take', async c => QS.take(c.pid, (await getFloors()).length, c.body.i), AUTH);
on('POST', '/api/quests/swap', async c => QS.swap(c.pid, (await getFloors()).length, c.body.i), AUTH);
/* the weekly Tower Points board, see lib/tpweek.js. The page puts the week in the address, so the CDN never keeps last week's board past Monday */
on('GET', '/api/tpweek', () => TW.board(), { headersOpen: true, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } });
on('GET', '/api/tpweek/me', c => TW.mine(c.pid), AUTH);
on('POST', '/api/tpweek/claim', async c => {
  const out = await TW.claim(c.pid);
  for (const p of out.prizes || []) await logRare(c.pid, p.results);
  return out;
}, AUTH);
/* ALERTS: a browser signs up on the Quests screen. The schedule asks /api/cron/push every 15 minutes, and so may anyone: the answer is the same
   whoever asks, and each alert is written down on the row it went to, so it only ever goes once */
on('GET', '/api/push/key', () => AL.publicKey(), { headersOpen: true, headers: { 'Cache-Control': 'public, max-age=3600' } });
on('POST', '/api/push/subscribe', async c => { if (!await allow('ps:' + c.pid, 60, 20)) throw new HttpError(429, 'Please wait a moment'); return AL.subscribe(c.pid, c.body || {}); }, AUTH);
on('POST', '/api/push/unsubscribe', c => AL.unsubscribe(c.pid, (c.body || {}).endpoint), AUTH);
on('POST', '/api/push/status', c => AL.status(c.pid, (c.body || {}).endpoint), AUTH);
on('POST', '/api/push/prefs', c => AL.setPrefs(c.pid, (c.body || {}).endpoint, (c.body || {}).arena, (c.body || {}).quests), AUTH);
const pushCheck = async c => {
  if (!await allow('pc:' + clientIp(c.req), 3600, 40)) throw new HttpError(429, 'That is a lot of looks for one hour');
  await syncIfOld();
  return AL.check(FL.floors);
};
on('GET', '/api/cron/push', pushCheck);
on('POST', '/api/cron/push', pushCheck);
/* CONNECT X: the page goes to X's own sign in, and X sends the player back to the callback, which is a page visit ending in a redirect */
on('POST', '/api/x/connect', async c => {
  if (!await allow('xc:' + c.pid, 60, 10)) throw new HttpError(429, 'Please wait a moment before connecting again');
  return QS.connect(c);
}, AUTH);
on('POST', '/api/x/disconnect', c => QS.disconnectX(c.pid), AUTH);
on('GET', '/api/x/callback', async c => {
  const s = sessionOf(c.req), query = Object.fromEntries(c.url.searchParams);
  /* the one time ticket is used up whatever happens */
  c.res.setHeader('Set-Cookie', XA.cookieOf('', 0));
  if (!s || !s.p) return { location: '/?x=signin' };
  try {
    const r = await QS.connected(c.req, query, s.p);
    return { location: '/?x=connected&name=' + encodeURIComponent(r.username) };
  } catch (e) {
    if (!(e instanceof HttpError)) console.error('x callback', e);
    return { location: '/?x=failed&why=' + encodeURIComponent(e instanceof HttpError ? e.message : 'Could not connect X right now, please try again') };
  }
}, { nav: true });
on('POST', '/api/quests/open', c => QS.open(c.pid, c.body.id), AUTH);
on('POST', '/api/quests/social', async c => {
  if (!await allow('qs:' + c.pid, 60, 12) || !await allow('qsip:' + clientIp(c.req), 60, 60)) throw new HttpError(429, 'Please wait a moment before the next quest');
  return QS.done(c.pid, c.body);
}, AUTH);
on('GET', '/api/admin/social', c => QS.adminList(c.pid), AUTH);
on('POST', '/api/admin/social', c => QS.adminSave(c.pid, c.body), AUTH);

on('POST', '/api/dev', async c => {
  if (!canTest(await loadRow(c.pid))) throw new HttpError(403, 'This account cannot use the test panel');
  if (c.body.op === 'arena') {
    await q('UPDATE arena_players SET tries = 0 WHERE player_id = $1', [c.pid]);
    return { ok: true };
  }
  if (c.body.op === 'daily') {
    await q('DELETE FROM daily_scores WHERE day = $1 AND player_id = $2', [E.dayKey(Date.now()), c.pid]);
    return withPlayer(c.pid, null, G => { delete G.gifts.daily; });
  }
  const f = Object.prototype.hasOwnProperty.call(TRIAL, c.body.op) ? TRIAL[c.body.op] : null;
  if (!f) bad('Invalid action');
  const floors = await getFloors();
  const out = await withPlayer(c.pid, null, G => f(G, c.body, { floors }));
  if (c.body.op === 'wipe') await q('DELETE FROM arena_floors WHERE player_id = $1', [c.pid]);
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
      const s = sessionOf(req);
      if (!s || !s.p) throw new HttpError(401, 'You are not signed in');
      c.pid = s.p;c.session = s;
      if (!await allow('p:' + s.p, 10, 40)) throw new HttpError(429, 'Too many actions, please wait a moment');
    }
    const out = await h.f(c);
    /* a page visit, like coming back from X, ends on the game itself. Only paths of this site, never an address from outside */
    if (h.nav) { res.statusCode = 302; res.setHeader('Location', /^\/(?!\/)/.test(out.location) ? out.location : '/'); res.setHeader('Cache-Control', 'no-store'); res.end(); return; }
    sendJson(res, 200, out, h.headers);
  } catch (e) {
    if (e instanceof HttpError) return sendJson(res, e.status, Object.assign({ error: e.message }, e.data || {}));
    console.error('Server error', e);
    sendJson(res, 500, { error: 'The server hit an error, please try again later' });
  }
}
module.exports = { handler, loadFloors, getFloors };
