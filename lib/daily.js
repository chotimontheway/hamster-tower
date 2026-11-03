// The Daily Challenge. The biggest round the hamster ran the day before sets one team and one fight for everyone, so the score does not depend on chests or levels.
// The first request of a day builds it and saves it, so a round settled late can never change a challenge people are already playing.
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { HttpError } = require('./http');

const LV = 20, STAR = 3, MEASURE = 30, WANT_WIN = .65, RETRIES = 6, GRACE = 15 * 60000;
/* a battle must end within 15 minutes of its day closing, so the board is final when the rewards go out */
const ticketEnd = (day, now) => Math.min(now + 90 * 60000, Date.parse(day + 'T00:00:00Z') + 864e5 + GRACE);
const closedBefore = () => E.dayKey(Date.now() - GRACE);
const pick = E.pick;
const ranked = n => `(p.wallet IS NULL OR NOT (p.wallet = ANY($${n}::text[])))`;
/* the more the hamster ran yesterday, the better today's chest. A normal day has 7,500 to 13,800 work */
const chestFor = work => work >= 12000 ? 3 : work >= 9000 ? 2 : 1;
/* the biggest round of the day before. If the hamster did not run at all, the newest round before today */
function pickRound(floors, dayStart) {
  let best = null, work = 0;
  for (const n of floors) { const t = Number(n.t); if (t < dayStart - 86400 || t >= dayStart) continue; work += n.work; if (!best || n.work > best.work) best = n; }
  if (!best) for (const n of floors) if (Number(n.t) < dayStart) best = n;
  return { src: best || floors[floors.length - 1], work };
}
function build(day, src, work, attempt) {
  const s = E.seedOf(`${src.hash}:daily:${day}:${attempt}`);
  const front = pick(E.PETS_LIST.filter(p => p.role === 'tank' || p.role === 'fighter'), s);
  const a = pick(E.PETS_LIST.filter(p => p.id !== front.id && p.role !== 'tank'), s);
  const b = pick(E.PETS_LIST.filter(p => p.id !== front.id && p.id !== a.id && p.role !== 'tank' && (a.role !== 'support' || p.role !== 'support')), s);
  const boss = E.rnd(s) < .3;
  let enemies = [];
  if (boss) { const x = pick(E.BOSS_LIST, s); enemies = [x.id, ...x.minions]; }
  else for (let k = 0; k < 3; k++) { const tier = E.rnd(s) < .65 ? 2 : 3; enemies.push(pick(E.MONS_LIST.filter(m => m.tier === tier && !enemies.includes(m.id)), s).id); }
  return { day, work, chest: chestFor(work), lv: LV, star: STAR, team: [front.id, a.id, b.id], node: { floor: 30, src: src.floor, round: src.round, work: src.work, blocks: src.blocks, hash: src.hash, t: Number(src.t), gap: src.gap, type: src.type, boss, enemies, rule: src.rule, map: src.map, daily: true } };
}
const botPlan = B => {
  const plan = {};
  for (const u of E.alive(B, 'p')) {
    const foes = E.alive(B, 'e');
    plan[u.id] = { i: E.canPick(B, u.id, 2) ? 2 : E.canPick(B, u.id, 1) ? 1 : 0, target: (foes.find(x => x.mark && x.mark !== u.el) || E.minBy(foes, E.hpPct)).id };
  }
  return plan;
};
function measure(ch, scale) {
  ch.node.floor = scale;
  const rounds = [];
  for (let i = 0; i < MEASURE; i++) {
    const { B } = E.startBattle(E.dailyG(ch), ch.node, [], { seed: `measure:${ch.day}:${scale}:${i}` });
    let g = 0;
    while (!B.over && g++ < 80) E.runRound(B, botPlan(B));
    if (B.over === 'win') rounds.push(g);
  }
  rounds.sort((a, b) => a - b);
  return { win: rounds.length / MEASURE, rounds: rounds.length ? rounds[rounds.length >> 1] : 99 };
}
/* teams and enemies differ too much for one fixed strength, some days would be impossible. So the game's own bot plays each one and sets the enemy strength where it wins about 65% of the time */
function tune(ch) {
  let lo = 1, hi = 160;
  for (let k = 0; k < 8; k++) { const mid = Math.round((lo + hi) / 2); if (measure(ch, mid).win >= WANT_WIN) lo = mid; else hi = mid; }
  const m = measure(ch, lo);
  return m.rounds;
}
function makeDaily(day, floors) {
  const { src, work } = pickRound(floors, Date.parse(day + 'T00:00:00Z') / 1000);
  let best = null;
  /* a team with almost no damage makes a very long fight, which is no fun to replay, so that draw is skipped */
  for (let a = 0; a < RETRIES; a++) {
    const ch = build(day, src, work, a), rounds = tune(ch), off = Math.max(0, rounds - 9, 4 - rounds);
    if (!best || off < best.off) best = { ch: JSON.parse(JSON.stringify(ch)), off };
    if (!off) break;
  }
  return best.ch;
}
const D = { day: null, ch: null };
async function getDaily(freshFloors) {
  const day = E.dayKey(Date.now());
  if (D.day === day) return D.ch;
  let r = await q('SELECT ch FROM daily_days WHERE day = $1', [day]);
  if (!r.rows[0]) {
    const floors = await freshFloors();
    if (!floors.length) throw new HttpError(503, 'The tower is still loading, please try again in a moment');
    await q('INSERT INTO daily_days (day, ch) VALUES ($1, $2::jsonb) ON CONFLICT (day) DO NOTHING', [day, JSON.stringify(makeDaily(day, floors))]);
    r = await q('SELECT ch FROM daily_days WHERE day = $1', [day]);
  }
  D.day = day;D.ch = r.rows[0].ch;
  return D.ch;
}
const BOARD = { at: 0, day: null, top: [], devs: [], total: 0 };
async function dailyBoard(day) {
  if (BOARD.day !== day || Date.now() - BOARD.at > 30000) {
    const tw = cfg.testWallets(), scored = 'FROM daily_scores s JOIN players p ON p.id = s.player_id WHERE s.day = $1 AND s.rounds IS NOT NULL';
    const r = await q(`SELECT p.id, p.name, s.rounds, s.hp, extract(epoch FROM s.at)::bigint AS at ${scored} AND ${ranked(2)} ORDER BY s.rounds, s.hp DESC, s.at LIMIT 50`, [day, tw]);
    const n = await q(`SELECT count(*)::int AS n ${scored} AND ${ranked(2)}`, [day, tw]);
    /* a dev wallet shows with a tag and no rank number. Its address never leaves the server */
    const dev = await q(`SELECT p.id, s.rounds, s.hp, extract(epoch FROM s.at)::bigint AS at ${scored} AND p.wallet = ANY($2::text[]) ORDER BY s.rounds, s.hp DESC, s.at`, [day, tw]);
    BOARD.day = day;BOARD.top = r.rows;BOARD.devs = dev.rows.map(x => Object.assign(x, { name: 'Dev', dev: true }));BOARD.total = n.rows[0].n;BOARD.at = Date.now();
  }
  return { top: BOARD.top, devs: BOARD.devs, total: BOARD.total };
}
async function myDaily(pid, day) {
  const r = (await q(`SELECT p.wallet, p.gifts->'daily'->>'d' AS paid_day, s.tries, s.rounds, s.hp, s.at,
    EXISTS (SELECT 1 FROM daily_scores o WHERE o.player_id = p.id AND o.rounds IS NOT NULL AND o.day < $3 AND o.day > COALESCE(p.gifts->>'dailyRank', '')) AS waiting
    FROM players p LEFT JOIN daily_scores s ON s.player_id = p.id AND s.day = $1 WHERE p.id = $2`, [day, pid, closedBefore()])).rows[0] || {};
  const dev = !!r.wallet && cfg.testWallets().includes(r.wallet);
  const out = { day, left: Math.max(0, E.DAILY_TRIES - (r.tries || 0)), best: r.rounds ? { rounds: r.rounds, hp: r.hp } : null, paid: !!r.paid_day && r.paid_day >= day, rank: null, unclaimed: !dev && !!r.waiting };
  if (out.best && !dev) out.rank = await rankOn(day, r);
  return out;
}
async function rankOn(day, s) {
  const n = await q(`SELECT count(*)::int AS n FROM daily_scores s JOIN players p ON p.id = s.player_id
    WHERE s.day = $1 AND s.rounds IS NOT NULL AND ${ranked(2)}
    AND (s.rounds < $3 OR (s.rounds = $3 AND s.hp > $4) OR (s.rounds = $3 AND s.hp = $4 AND s.at < $5))`, [day, cfg.testWallets(), s.rounds, s.hp, s.at]);
  return n.rows[0].n + 1;
}
/* the player's finished days not yet settled, with the final rank of each */
async function closedRanks(pid, after) {
  const days = (await q('SELECT day, rounds, hp, at FROM daily_scores WHERE player_id = $1 AND rounds IS NOT NULL AND day > $2 AND day < $3 ORDER BY day', [pid, after, closedBefore()])).rows;
  for (const d of days) d.rank = await rankOn(d.day, d);
  return days;
}
/* the bags open at once, as if bought. With no room for gear the blind bag stays as its coins */
function payPrize(G, d, maxItems) {
  const p = E.dailyPrize(d.rank);
  if (!p) return null;
  const low = Math.min(...G.team.map(id => G.owned[id].lv)), tier = E.FOOD_BAGS.findIndex(b => low >= b.a && (!b.b || low < b.b)), results = [];
  let coins = 0;
  G.chests[p.chest]++;
  for (let i = 0; i < p.bags; i++) {
    G.coins += E.BAG_COST;
    if (G.items.length < maxItems) results.push(E.openBag(G)); else coins += E.BAG_COST;
  }
  for (let i = 0; i < p.food; i++) { G.coins += E.FOOD_BAGS[tier].cost; results.push(E.openFoodBag(G, tier)); }
  return { day: d.day, rank: d.rank, chest: p.chest, results, coins };
}
async function triesLeft(pid, day) {
  const r = (await q('SELECT tries FROM daily_scores WHERE day = $1 AND player_id = $2', [day, pid])).rows[0];
  return Math.max(0, E.DAILY_TRIES - (r ? r.tries : 0));
}
/* a try is used when its first turn is played, so opening the fight and looking costs nothing. The turn and the try are one write, so sending the turn again can never skip the try. Reports false if nothing was written */
async function firstTurn(day, pid, id, hash, minMs) {
  const r = await q(`WITH f AS (SELECT 1 FROM fights WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND at <= now() - ($5::int * interval '1 millisecond') FOR UPDATE),
    s AS (INSERT INTO daily_scores (day, player_id, tries) SELECT $1::text, $2::bigint, 1 FROM f ON CONFLICT (day, player_id) DO UPDATE SET tries = daily_scores.tries + 1 WHERE daily_scores.tries < $6 RETURNING 1)
    UPDATE fights SET n = 1, plan_hash = $4, at = now() WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND EXISTS (SELECT 1 FROM s) RETURNING 1`, [day, pid, id, hash, minMs, E.DAILY_TRIES]);
  return r.rowCount === 1;
}
/* keeps the best score of the day */
async function saveBest(day, pid, rounds, hp) {
  await q('UPDATE daily_scores SET rounds = $3, hp = $4, at = now() WHERE day = $1 AND player_id = $2 AND (rounds IS NULL OR $3::int < rounds OR ($3::int = rounds AND $4::int > hp))', [day, pid, rounds, hp]);
}
/* one chest a day. The record sits in the player's own row, so the chest and the record are one write. The battle that paid gets the same answer if its last turn is sent again */
function payChest(G, day, id, tier) {
  const g = G.gifts.daily;
  if (!g || day > g.d) { G.gifts.daily = { d: day, f: id };G.chests[tier]++;return { tier }; }
  return g.f === id ? { tier } : null;
}
const hpLeft = B => { const us = B.units.filter(u => u.side === 'p'); return Math.round(100 * us.reduce((a, u) => a + (u.alive ? Math.max(0, u.hp) : 0), 0) / us.reduce((a, u) => a + u.hpMax, 0)); };
module.exports = { getDaily, makeDaily, pickRound, chestFor, dailyBoard, myDaily, triesLeft, firstTurn, saveBest, payChest, hpLeft, ticketEnd, closedRanks, payPrize };
