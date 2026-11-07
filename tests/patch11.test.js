// Patch 1.1 against a running local server: achievements (paid once, only when reached), the counts they read, the weekly TP board
// fed by real quest claims, and the settlement of a finished week straight from the database: the top 10 wallets paid by place, a
// guest and the dev wallet skipped, nothing paid twice. Start the server with ALLOW_GUEST=1, ALLOW_TRIAL=1, MIN_MS_PER_ROUND=0,
// RATE_LIMIT_OFF=1 and TEST_WALLETS holding wallet D below. Then: node tests/patch11.test.js <baseUrl> <databaseUrl>
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const v = require('viem');
const { Client } = require('pg');
const [BASE, DB] = process.argv.slice(2);
if (!BASE || !DB) { console.log('usage: node tests/patch11.test.js <baseUrl> <databaseUrl>'); process.exit(2); }
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra).slice(0, 300) : '')); } };
function client() {
  const jar = new Map();
  const take = r => { for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'), i = kv.indexOf('='), k = kv.slice(0, i).trim(), val = kv.slice(i + 1).trim(); if (/max-age=0/i.test(c) || !val) jar.delete(k); else jar.set(k, val); } };
  return async (path, body) => {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, jar.size ? { cookie: [...jar].map(([k, val]) => k + '=' + val).join('; ') } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);take(r);
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
const word = w => privateKeyToAccount(v.keccak256(v.toHex('hamster tower sqk test ' + w)));
async function signIn(call, acct) {
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  return call('/api/auth/verify', { ticket: n.body.ticket, signature: await acct.signMessage({ message: n.body.message }) });
}
let rid = 0;
const act = (call, type, args) => call('/api/action', Object.assign({ type, requestId: 'p11' + (++rid) + Date.now() }, args || {}));
const plan = Bt => { const p = {}; E.alive(Bt, 'p').forEach(u => { p[u.id] = { i: E.canPick(Bt, u.id, 2) ? 2 : E.canPick(Bt, u.id, 1) ? 1 : 0, target: null }; }); return p; };
async function win(call, floor) {
  for (let t = 0; t < 6; t++) {
    const s = await call('/api/fight/start', { floor });if (s.status !== 200) return s;
    let token = s.body.token, Bt = s.body.B, r = null;
    for (let g = 0; g < 80; g++) { r = await call('/api/fight/turn', { token, plan: plan(Bt) }); if (r.status !== 200 || r.body.over) break; token = r.body.token; Bt = r.body.B; }
    if (r && r.body && r.body.over === 'win') return r;
  }
  return null;
}
/* finish one of today's quests with the cheapest play there is, then claim its TP. Gives the TP claimed */
async function earnTp(call) {
  for (let round = 0; round < 3; round++) {
    const q = (await call('/api/quests')).body, list = q.state.quests.list, top = q.state.top;
    for (const [i, x] of list.entries()) {
      if (x.paid) continue;
      if (x.have < x.n) {
        if (x.k === 'chests') { await call('/api/dev', { op: 'chests' });await act(call, 'chest', { all: true }); }
        else if (x.k === 'bag') { await call('/api/dev', { op: 'coins' });await act(call, 'bag', { n: x.n }); }
        else if (x.k === 'sweep') { await call('/api/dev', { op: 'sweep' });await act(call, 'sweep'); }
        else if (x.k === 'climb') await win(call, top + 1);
        else if (x.k === 'floor' || x.k === 'boss') await win(call, x.f);
        else if (x.k === 'wins') { for (let w = 0; w < x.n; w++) await win(call, Math.max(1, top - 1)); }
        else continue;
      }
      const t = await call('/api/quests/take', { i });
      if (t.status === 200) return t.body.got.tp;
    }
    /* nothing cheap today: trade a quest once and look again */
    const open = list.findIndex(x => x.have < x.n);
    if (open >= 0) await call('/api/quests/swap', { i: open });
  }
  return 0;
}
(async () => {
  const db = new Client({ connectionString: DB });await db.connect();
  const week = E.weekKey(Date.now()), last = E.weekKey(Date.parse(week + 'T00:00:00Z') - 864e5);
  /* this test writes last week itself, so whatever an earlier run left there goes first */
  await db.query('DELETE FROM tp_weeks WHERE week = $1', [last]);

  console.log('the list of achievements');
  const fs = require('fs'), path = require('path');
  const art = new Set(fs.readdirSync(path.join(__dirname, '..', 'public', 'art')).map(f => f.replace(/\.[a-z]+$/, '')));
  const groupKs = E.ACH_GROUPS.flatMap(g => g.k);
  check('every achievement has its own id, a picture and a group', new Set(E.ACHS.map(a => a.id)).size === E.ACHS.length && E.ACHS.every(a => art.has(a.art) && groupKs.includes(a.k)), E.ACHS.filter(a => !art.has(a.art) || !groupKs.includes(a.k)).map(a => a.id));
  check('no dash marks in their words', !E.ACHS.some(a => /[–—]/.test(a.n + a.d)));
  check('every one pays coins and a real chest', E.ACHS.every(a => a.r.coins > 0 && a.r.chest >= 0 && a.r.chest < E.CHESTS.length && (a.r.n || 1) >= 1));

  console.log('what the goals count, read from a save');
  {
    const P = E.PETS_LIST, G = { top: 75, tp: 1200, wins: 520, owned: {}, items: [], gifts: {}, quests: {} };
    /* every pet: the first 5 at level 60, all at level 30 or more, the first 3 at 5 stars */
    P.forEach((p, i) => { G.owned[p.id] = Object.assign(E.newPet(i < 5 ? 60 : 30), { star: i < 3 ? 5 : 1 }); });
    /* a full Legendary Thunder set on the first pet, its hat at +5, and a full Rare Knight set on the second */
    const slots = ['hat', 'armor', 'charm', 'weapon'];
    slots.forEach((slot, i) => { G.items.push({ uid: 1 + i, set: 'thunder', slot, rar: 'l', plus: i === 0 ? 5 : 0 }); G.owned[P[0].id].gear[slot] = 1 + i; });
    slots.forEach((slot, i) => { G.items.push({ uid: 11 + i, set: 'knight', slot, rar: 'r', plus: 0 }); G.owned[P[1].id].gear[slot] = 11 + i; });
    const L = E.achList(G), by = id => L.find(a => a.id === id);
    check('every pet, every Epic and every Legendary pet count as owned', by('pets').done && by('epics').done && by('epics').need === 8 && by('legs').done && by('legs').need === 5 && by('legpet').done);
    check('3 pets at 5 stars reach Constellation, not Galaxy', by('stars3').done && !by('stars10').done && by('stars10').have === 3 && by('starsall').need === P.length);
    check('pets at level 30 and at level 60 are counted, the best level too', by('lvs5').done && by('lvs3').done && by('lv60').done && !by('lv100').done);
    check('Tower Points, wins and the floor come from the save', by('tp1k').done && !by('tp10k').done && by('wins500').done && !by('wins1000').done && by('f75').done && !by('f100').done);
    check('gear: Epic or better, Legendary, +3, +5 and a Legendary at +5', by('epicgear').done && by('leg').done && by('plus3').done && by('plus5').done && by('legplus5').done);
    check('full sets: 2 pets in one, 1 of them all Legendary', by('set4').done && by('sets3').have === 2 && !by('sets3').done && by('setleg').done);
    G.items[0].plus = 4;
    check('a Legendary at +4 is not a Legendary at +5', !E.achList(G).find(a => a.id === 'legplus5').done);

    /* merges: each one that works counts once, a failed one does not */
    const Gm = E.newSave('patch 1.1 merge count');
    for (let i = 0; i < 21; i++) Gm.items.push({ uid: 500 + i, set: 'miner', slot: 'hat', rar: 'r', plus: 0 });
    let okN = 0, tries = 0;
    for (let r = E.tryMerge(Gm, 500); r; r = E.tryMerge(Gm, 500)) { tries++; if (r.ok) okN++; }
    check('a merge that works is counted, a failed one is not', tries > okN && okN > 0 && (Gm.quests.life.merge | 0) === okN && Gm.items.find(x => x.uid === 500).plus === okN, { tries, okN, life: Gm.quests.life });

    /* a day counts once its last milestone is claimed */
    const ctx = { day: E.dayKey(Date.now()), seed: 'p11 days ' + Date.now(), max: 600 };
    const Gq = E.newSave('patch 1.1 days');Gq.top = 40;
    const q = E.ensureQuests(Gq, ctx);q.list.forEach(x => { x.have = x.n; });
    const ms = E.questMs(q.list.length);
    for (let i = 0; i < ms.length - 1; i++) E.claimQuest(Gq, ctx, i, false);
    const before = q.life.days | 0;
    E.claimQuest(Gq, ctx, ms.length - 1, false);
    check('the last milestone of the day counts a full day, the others do not', before === 0 && q.life.days === 1, q.life);
    check('claiming it again does not count the day twice', E.claimQuest(Gq, ctx, ms.length - 1, false) === null && q.life.days === 1);

    /* a social quest done counts once */
    const Gs = E.newSave('patch 1.1 social');
    E.socialReward(Gs, { id: 7, tp: 30, sqkP: 0, sqkMax: 0 }, false);
    check('a social quest done is counted', Gs.quests.life.social === 1 && Gs.tp === 30);
  }

  console.log('achievements');
  const g1 = client();await g1('/api/auth/guest', {});
  await g1('/api/dev', { op: 'jump', n: 12 });
  const me1 = (await g1('/api/me')).body, coins0 = me1.state.coins, bronze0 = me1.state.chests[1];
  const list = E.achList(Object.assign({ owned: {}, items: [], gifts: {}, quests: {} }, me1.state));
  check('floor 12 shows First Boss as reached', list.find(a => a.id === 'f10').done && !list.find(a => a.id === 'f25').done);
  const a1 = await act(g1, 'ach', { id: 'f10' });
  check('First Boss pays 500 coins and a Bronze Chest', a1.status === 200 && a1.body.r.coins === 500 && a1.body.state.coins === coins0 + 500 && a1.body.state.chests[1] === bronze0 + 1, a1.body);
  check('it is written down in the save', a1.status === 200 && a1.body.state.gifts.ach.includes('f10'));
  const a2 = await act(g1, 'ach', { id: 'f10' });
  check('paying it again is refused', a2.status === 400, a2.body);
  check('one not reached is refused', (await act(g1, 'ach', { id: 'f50' })).status === 400);
  check('an unknown one is refused', (await act(g1, 'ach', { id: 'nope' })).status === 400);
  check('a list instead of an id is refused', (await act(g1, 'ach', { id: ['f10'] })).status === 400);
  await g1('/api/dev', { op: 'chests' });
  const oc = await act(g1, 'chest', { all: true });
  check('opening chests counts toward Treasure Hunter', oc.status === 200 && (oc.body.state.quests.life || {}).chests === oc.body.results.length, oc.body.state && oc.body.state.quests.life);

  console.log('weekly board from real claims');
  const tp1 = await earnTp(g1);
  check('a guest finished and claimed a quest', tp1 > 0, tp1);
  const w1 = (await g1('/api/tpweek/me')).body;
  check('its TP is on this week\'s board', w1.week === week && w1.tp === tp1 && w1.rank >= 1, w1);
  const pub = (await g1('/api/tpweek?w=' + week)).body;
  const pid1 = me1.player.id;
  check('the board says when it resets and what it pays', pub.ends === Math.floor(E.weekEnd(week) / 1000) && pub.prizes.length === 3);
  /* the dev wallet has the most TP this week, written straight in so the test can run again on the same day */
  const d = client();await signIn(d, word('wallet D'));
  const pidD = (await d('/api/me')).body.player.id;
  await db.query('INSERT INTO tp_weeks (week, player_id, tp) VALUES ($1, $2, 77777) ON CONFLICT (week, player_id) DO UPDATE SET tp = EXCLUDED.tp', [week, pidD]);
  const wD = (await d('/api/tpweek/me')).body;
  check('a dev wallet with TP this week is not ranked', wD.dev && wD.tp === 77777 && wD.rank === null, wD);

  console.log('a finished week pays its top 10 wallets');
  const ws = [];
  for (let i = 1; i <= 12; i++) { const c = client();await signIn(c, word('week wallet ' + i + ' ' + Date.now()));ws.push({ c, id: (await c('/api/me')).body.player.id }); }
  const ids = ws.map(w => w.id);
  /* the guest and the dev wallet have the most TP of all, the wallets come after them in order */
  await db.query('INSERT INTO tp_weeks (week, player_id, tp, at) VALUES ($1, $2, 99999, now() - interval \'3 days\'), ($1, $3, 88888, now() - interval \'3 days\') ON CONFLICT (week, player_id) DO UPDATE SET tp = EXCLUDED.tp', [last, pid1, pidD]);
  for (const [i, id] of ids.entries()) await db.query('INSERT INTO tp_weeks (week, player_id, tp, at) VALUES ($1, $2, $3, now() - interval \'2 days\') ON CONFLICT (week, player_id) DO UPDATE SET tp = EXCLUDED.tp', [last, id, 5000 - i * 100]);
  /* a tie on TP goes to whoever got there first: wallet 11 reached wallet 10's TP a day later, so the tenth place stays with wallet 10 */
  await db.query('UPDATE tp_weeks SET tp = $3, at = now() - interval \'1 day\' WHERE week = $1 AND player_id = $2', [last, ids[10], 5000 - 9 * 100]);
  const waits = (await ws[0].c('/api/tpweek/me')).body;
  check('a wallet with a finished week to settle is told so', waits.unclaimed === true, waits);
  const got = [];
  for (const w of ws) got.push((await w.c('/api/tpweek/claim', {})).body);
  const shape = got.map(g => g.prizes && g.prizes[0] ? g.prizes[0].rank + ':' + g.prizes[0].chest + 'x' + g.prizes[0].n : '-');
  check('wallet places skip the guest and the dev wallet: 1 gets 2 Diamond, 2 and 3 get 1 Diamond, 4 to 10 get a Gold Chest, 11 and 12 nothing', shape.join(' ') === '1:4x2 2:4x1 3:4x1 4:3x1 5:3x1 6:3x1 7:3x1 8:3x1 9:3x1 10:3x1 - -', shape);
  check('the bags opened and the chests arrived', got[0].prizes[0].results.length === 5 + 15 && got[0].state.chests[4] >= 2, got[0].prizes && got[0].prizes[0] && got[0].prizes[0].results.length);
  check('the week is written down in each save', got.every(g => !g.state || g.state.gifts.tpWeek === last));
  const life = i => (got[i].state && got[i].state.quests && got[i].state.quests.life) || {};
  check('first place counts a week in the top 10 and a week first, fourth place only the top 10, eleventh nothing', life(0).wk10 === 1 && life(0).wk1 === 1 && life(3).wk10 === 1 && !life(3).wk1 && !life(10).wk10, [life(0), life(3), life(10)]);
  const c0 = got[0].state.coins, dia0 = got[0].state.chests[4];
  const t10 = await act(ws[0].c, 'ach', { id: 'wk10' }), t1 = await act(ws[0].c, 'ach', { id: 'wk1' });
  check('Top Ten and Week Champion can then be claimed', t10.status === 200 && t1.status === 200 && t1.body.state.coins === c0 + 3000 + 10000 && t1.body.state.chests[4] === dia0 + 2, [t10.body, t1.body.r]);
  check('Week Champion is not open to the fourth place', (await act(ws[3].c, 'ach', { id: 'wk1' })).status === 400);
  const again = (await ws[0].c('/api/tpweek/claim', {})).body;
  check('a second claim pays nothing', again.prizes.length === 0, again);
  check('the wallet is no longer told to claim', (await ws[0].c('/api/tpweek/me')).body.unclaimed === false);
  const gc = (await g1('/api/tpweek/claim', {})).body;
  check('the guest is paid nothing but its week is settled', gc.prizes.length === 0 && gc.state && gc.state.gifts.tpWeek === last, gc);
  const dc = (await d('/api/tpweek/claim', {})).body;
  check('the dev wallet is paid nothing', dc.prizes.length === 0, dc);
  /* the public board is kept for half a minute, so it is read again after that */
  await new Promise(r => setTimeout(r, 31000));
  const lastPub = (await g1('/api/tpweek?w=' + week + '&n=3')).body;
  check('last week\'s winners are the 10 wallets in order', lastPub.last.week === last && lastPub.last.winners.map(r => r.id).join() === ids.slice(0, 10).join(), lastPub.last.winners.map(r => r.id));
  check('this week\'s public board lists the guest with its TP', lastPub.top.some(r => r.id === pid1 && r.tp === tp1), lastPub.top.slice(0, 3));
  check('and leaves the dev wallet out', !lastPub.top.some(r => r.id === pidD));

  console.log('profile badges');
  const prof = (await g1('/api/player?id=' + pid1)).body;
  check('the profile lists the achievements paid', Array.isArray(prof.ach) && prof.ach.includes('f10'), prof.ach);

  await db.end();
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL crashed', e.message); process.exit(1); });
