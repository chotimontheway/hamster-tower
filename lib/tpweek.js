// The weekly Tower Points board. Every TP a player claims from a quest or a milestone is added to the current week's row in tp_weeks,
// a week runs from Monday 00:00 UTC and is named by that Monday. Anyone can be on the board except the dev wallets, but like the Daily
// Challenge only wallets are paid: a guest is skipped and the next wallet moves up. A finished week pays its top 10 wallets the next
// time each of them comes back, and the week already settled sits in the player's own row (gifts.tpWeek), so nothing pays twice.
const cfg = require('./config');
const { q } = require('./db');
const E = require('./engine.generated.cjs');
const { withPlayer } = require('./players');

const now = () => Date.now();
const thisWeek = () => E.weekKey(now());
const lastWeekOf = wk => E.weekKey(Date.parse(wk + 'T00:00:00Z') - 864e5);
const ranked = i => `(p.wallet IS NULL OR NOT (p.wallet = ANY($${i}::text[])))`;
const wallets = i => `(p.wallet IS NOT NULL AND NOT (p.wallet = ANY($${i}::text[])))`;

/* after a claim that paid TP. A failed write only loses that claim's place on the board, never the TP itself. Times are kept to the
   millisecond, so a time read back and compared is exactly the one stored */
async function addTp(pid, n) {
  const tp = Math.floor(Number(n) || 0);
  if (!(tp > 0)) return;
  try {
    await q(`INSERT INTO tp_weeks (week, player_id, tp, at) VALUES ($1, $2, $3, date_trunc('milliseconds', now()))
      ON CONFLICT (week, player_id) DO UPDATE SET tp = tp_weeks.tp + EXCLUDED.tp, at = EXCLUDED.at`, [thisWeek(), pid, tp]);
  } catch (e) { console.error('tp week', e.message); }
}

/* the place among everyone on the board (who) or among the wallets that can be paid (wallets): more TP first, then who got there first */
async function placeOf(wk, tp, at, pid, who) {
  const r = await q(`SELECT count(*)::int AS n FROM tp_weeks w JOIN players p ON p.id = w.player_id
    WHERE w.week = $1 AND w.tp > 0 AND ${who(2)} AND (w.tp > $3 OR (w.tp = $3 AND (w.at < $4 OR (w.at = $4 AND w.player_id < $5))))`, [wk, cfg.testWallets(), tp, at, pid]);
  return r.rows[0].n + 1;
}

/* the board as everyone sees it, read again after half a minute */
const B = { at: 0, wk: null };
async function board() {
  const wk = thisWeek();
  if (B.wk !== wk || now() - B.at > 30000) {
    const tw = cfg.testWallets(), from = 'FROM tp_weeks w JOIN players p ON p.id = w.player_id WHERE w.week = $1 AND w.tp > 0';
    const top = await q(`SELECT p.id, p.name, w.tp ${from} AND ${ranked(2)} ORDER BY w.tp DESC, w.at, w.player_id LIMIT 50`, [wk, tw]);
    const n = await q(`SELECT count(*)::int AS n ${from} AND ${ranked(2)}`, [wk, tw]);
    const last = lastWeekOf(wk);
    const won = await q(`SELECT p.id, p.name, w.tp ${from} AND ${wallets(2)} ORDER BY w.tp DESC, w.at, w.player_id LIMIT 10`, [last, tw]);
    Object.assign(B, { at: now(), wk, top: top.rows, total: n.rows[0].n, last: { week: last, winners: won.rows } });
  }
  return { week: B.wk, ends: Math.floor(E.weekEnd(B.wk) / 1000), top: B.top, total: B.total, last: B.last, prizes: E.WEEK_PRIZES };
}

/* this player's week: TP, place, and whether a finished week still waits to pay */
async function mine(pid) {
  const wk = thisWeek();
  const r = (await q(`SELECT p.wallet, p.gifts->>'tpWeek' AS done, w.tp, w.at FROM players p
    LEFT JOIN tp_weeks w ON w.player_id = p.id AND w.week = $1 WHERE p.id = $2`, [wk, pid])).rows[0] || {};
  const dev = !!r.wallet && cfg.testWallets().includes(r.wallet);
  const out = { week: wk, ends: Math.floor(E.weekEnd(wk) / 1000), tp: r.tp || 0, rank: null, dev, wallet: !!r.wallet, unclaimed: false };
  if (r.tp > 0 && !dev) out.rank = await placeOf(wk, r.tp, r.at, pid, ranked);
  if (r.wallet && !dev) out.unclaimed = (await q('SELECT 1 FROM tp_weeks WHERE player_id = $1 AND week < $2 AND week > $3 AND tp > 0 LIMIT 1', [pid, wk, r.done || ''])).rowCount > 0;
  return out;
}

/* the chests go to the inventory and the bags open at once, as if bought. With no room for gear a blind bag stays as its coins */
function payWeek(G, w, maxItems) {
  const p = E.weekPrize(w.rank);
  if (!p) return null;
  /* counted for the achievements: a week in the top 10, and a week in first place */
  E.lifeAdd(G, 'wk10', 1);
  if (w.rank === 1) E.lifeAdd(G, 'wk1', 1);
  const low = Math.min(...G.team.map(id => G.owned[id].lv)), tier = Math.max(0, E.FOOD_BAGS.findIndex(b => low >= b.a && (!b.b || low < b.b))), results = [];
  let coins = 0;
  G.chests[p.chest] += p.n;
  for (let i = 0; i < p.bags; i++) {
    G.coins += E.BAG_COST;
    if (G.items.length < maxItems) results.push(E.openBag(G)); else coins += E.BAG_COST;
  }
  for (let i = 0; i < p.food; i++) { G.coins += E.FOOD_BAGS[tier].cost; results.push(E.openFoodBag(G, tier)); }
  return { week: w.week, rank: w.rank, chest: p.chest, n: p.n, results, coins };
}

/* finished weeks not settled yet. A dev wallet gets nothing and settles nothing; a guest's weeks are settled with nothing, so signing in later does not pay them */
async function claim(pid) {
  const row = (await q(`SELECT wallet, gifts->>'tpWeek' AS done FROM players WHERE id = $1`, [pid])).rows[0];
  if (!row || (row.wallet && cfg.testWallets().includes(row.wallet))) return { prizes: [] };
  const wk = thisWeek();
  const weeks = (await q('SELECT week, tp, at FROM tp_weeks WHERE player_id = $1 AND week < $2 AND week > $3 AND tp > 0 ORDER BY week', [pid, wk, row.done || ''])).rows;
  if (!weeks.length) return { prizes: [] };
  if (row.wallet) for (const w of weeks) w.rank = await placeOf(w.week, w.tp, w.at, pid, wallets);
  return withPlayer(pid, null, G => {
    const prizes = [];
    for (const w of weeks) {
      if (w.week <= (G.gifts.tpWeek || '')) continue;
      G.gifts.tpWeek = w.week;
      if (!row.wallet) continue;
      const p = payWeek(G, w, cfg.maxItems);
      if (p) prizes.push(p);
    }
    return { prizes, cold: prizes.length > 0 };
  });
}

module.exports = { addTp, board, mine, claim, thisWeek };
