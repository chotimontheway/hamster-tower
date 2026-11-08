// THE WORLD BOSS: while the hamster runs and the Arena is open there is one boss for everyone. Each player fights it up to E.WB.tries times,
// every fight adds its damage to one shared total, and the boss falls when the total reaches the pool. After the run the players are paid
// from their own save: one reward for fighting, one more if it fell, and a prize for the top 10 wallets by damage. The record of what was
// paid sits in the player's save (gifts.wbDone, the newest run paid), so a run never pays twice. A dev wallet fights for practice and
// leaves nothing on the board.
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { withPlayer } = require('./players');
const { arenaGate } = require('./live');

const NO_TRIES = 'You have used your fights against this boss. A new one comes when the hamster runs again';
const CLOSED = 'The World Boss comes when Squeektoshi runs, a few minutes after he starts';
const isDev = wallet => !!wallet && cfg.testWallets().includes(wallet);
const RANKED = `(p.wallet IS NULL OR NOT (p.wallet = ANY($1::text[])))`;

/* the run in progress, from the same clock as the Arena, or null while he rests */
function active(floors, nowSec) {
  const g = arenaGate(floors, nowSec), opens = g.from + E.ARENA.waitMin * 60;
  if (!g.from || !g.open || nowSec < opens) return null;
  return { session: g.from, until: g.until, boss: E.wbBossOf(g.from) };
}
async function ensure(s) {
  await q('INSERT INTO world_boss (session, boss, pool) VALUES ($1, $2, $3) ON CONFLICT (session) DO NOTHING', [s.session, s.boss, E.WB.pool]);
}
async function triesLeft(pid, session) {
  const r = (await q('SELECT tries FROM world_boss_dmg WHERE session = $1 AND player_id = $2', [session, pid])).rows[0];
  return Math.max(0, E.WB.tries - (r ? r.tries : 0));
}
/* a try is used when the first turn is played, so opening the fight and looking costs nothing. The turn and the try are one write */
async function firstTurn(session, pid, id, hash, minMs) {
  const r = await q(`WITH f AS (SELECT 1 FROM fights WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND at <= now() - ($5::int * interval '1 millisecond') FOR UPDATE),
    s AS (INSERT INTO world_boss_dmg (session, player_id, tries) SELECT $1::bigint, $2::bigint, 1 FROM f ON CONFLICT (session, player_id) DO UPDATE SET tries = world_boss_dmg.tries + 1 WHERE world_boss_dmg.tries < $6 RETURNING 1)
    UPDATE fights SET n = 1, plan_hash = $4, at = now() WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND EXISTS (SELECT 1 FROM s) RETURNING 1`, [session, pid, id, hash, minMs, E.WB.tries]);
  return r.rowCount === 1;
}
const CACHE = { at: 0, key: '', out: null };
/* a finished fight is counted once, by its id, so the same answer asked for again changes nothing */
async function finish(pid, id, session, dmg, dev) {
  const total = async () => (await q('SELECT dmg, pool, killed_at FROM world_boss WHERE session = $1', [session])).rows[0] || { dmg: 0, pool: E.WB.pool, killed_at: null };
  const mineNow = async () => (await q('SELECT dmg, tries FROM world_boss_dmg WHERE session = $1 AND player_id = $2', [session, pid])).rows[0] || { dmg: 0, tries: 0 };
  const shape = async (did, fresh) => {
    const t = await total(), m = await mineNow();
    return { dmg: did, mine: Number(m.dmg), total: Number(t.dmg), pool: Number(t.pool), killed: !!t.killed_at, left: Math.max(0, E.WB.tries - m.tries), rank: dev ? null : await rankOf(pid, session), dev, fresh };
  };
  if (dev) return shape(dmg, true);
  const first = await q('INSERT INTO world_boss_log (id, session, player_id, dmg) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING RETURNING 1', [id, session, pid, dmg]);
  if (!first.rowCount) { const seen = (await q('SELECT dmg FROM world_boss_log WHERE id = $1', [id])).rows[0]; return shape(seen ? seen.dmg : dmg, false); }
  await q('UPDATE world_boss_dmg SET dmg = dmg + $3, at = now() WHERE session = $1 AND player_id = $2', [session, pid, dmg]);
  await q('UPDATE world_boss SET dmg = dmg + $2, killed_at = CASE WHEN killed_at IS NULL AND dmg + $2 >= pool THEN now() ELSE killed_at END WHERE session = $1', [session, dmg]);
  CACHE.at = 0;
  return shape(dmg, true);
}
/* the place among wallets: more damage first, and whoever got there first when it is equal. A guest has no place to be paid */
async function rankOf(pid, session) {
  const me = (await q('SELECT d.dmg, d.at, p.wallet FROM world_boss_dmg d JOIN players p ON p.id = d.player_id WHERE d.session = $1 AND d.player_id = $2', [session, pid])).rows[0];
  if (!me || !me.wallet || isDev(me.wallet) || Number(me.dmg) <= 0) return null;
  const r = await q(`SELECT count(*)::int AS n FROM world_boss_dmg d JOIN players p ON p.id = d.player_id WHERE d.session = $2 AND p.wallet IS NOT NULL AND NOT (p.wallet = ANY($1::text[])) AND d.dmg > 0 AND (d.dmg > $3 OR (d.dmg = $3 AND d.at < $4))`, [cfg.testWallets(), session, me.dmg, me.at]);
  return r.rows[0].n + 1;
}

/* the public view, kept for a few seconds: this run while it lasts, the last one after. Guests show on the board, a dev wallet does not */
async function view(floors, nowSec) {
  const a = active(floors, nowSec), key = a ? 'a' + a.session : 'r';
  if (CACHE.out && CACHE.key === key && Date.now() - CACHE.at < 8000) return CACHE.out;
  let row = null;
  if (a) { await ensure(a); row = (await q('SELECT session, boss, pool, dmg, killed_at FROM world_boss WHERE session = $1', [a.session])).rows[0]; }
  else row = (await q('SELECT session, boss, pool, dmg, killed_at FROM world_boss ORDER BY session DESC LIMIT 1')).rows[0] || null;
  const out = { active: !!a, until: a ? a.until : 0, tries: E.WB.tries, floor: E.WB.floor, boss: row ? { session: Number(row.session), id: row.boss, pool: Number(row.pool), dmg: Number(row.dmg), killed: !!row.killed_at } : null, top: [], players: 0 };
  if (row) {
    const top = await q(`SELECT p.id, p.name, d.dmg FROM world_boss_dmg d JOIN players p ON p.id = d.player_id WHERE d.session = $2 AND d.dmg > 0 AND ${RANKED} ORDER BY d.dmg DESC, d.at LIMIT 10`, [cfg.testWallets(), row.session]);
    out.top = top.rows.map(r => ({ id: r.id, name: r.name, dmg: Number(r.dmg) }));
    out.players = (await q('SELECT count(*)::int AS n FROM world_boss_dmg WHERE session = $1 AND dmg > 0', [row.session])).rows[0].n;
  }
  CACHE.at = Date.now();CACHE.key = key;CACHE.out = out;
  return out;
}

/* finished runs this player fought and was not paid for yet, within the last 3 days. The run in progress is never paid early */
async function owed(pid, live) {
  const row = (await q(`SELECT wallet, gifts->>'wbDone' AS done FROM players WHERE id = $1`, [pid])).rows[0];
  if (!row || isDev(row.wallet)) return [];
  return (await q(`SELECT d.session, d.dmg, w.boss, w.pool, w.dmg AS total, w.killed_at IS NOT NULL AS killed FROM world_boss_dmg d JOIN world_boss w ON w.session = d.session
    WHERE d.player_id = $1 AND d.dmg > 0 AND d.session > $2 AND d.session <> $3 AND d.session > $4 ORDER BY d.session`, [pid, Number(row.done) || 0, live || 0, Math.floor(Date.now() / 1000) - 3 * 86400])).rows;
}
async function mine(pid, floors, nowSec) {
  const a = active(floors, nowSec);
  const r = a ? (await q('SELECT dmg, tries FROM world_boss_dmg WHERE session = $1 AND player_id = $2', [a.session, pid])).rows[0] : null;
  return { dmg: r ? Number(r.dmg) : 0, left: a ? Math.max(0, E.WB.tries - (r ? r.tries : 0)) : 0, owed: (await owed(pid, a && a.session)).length };
}

async function claim(pid, floors, nowSec) {
  const row = (await q('SELECT wallet FROM players WHERE id = $1', [pid])).rows[0];
  if (!row || isDev(row.wallet)) return { runs: [] };
  const a = active(floors, nowSec), list = await owed(pid, a && a.session);
  if (!list.length) return { runs: [] };
  for (const w of list) w.rank = row.wallet ? await rankOf(pid, w.session) : null;
  return withPlayer(pid, null, G => {
    const gi = G.gifts && typeof G.gifts === 'object' ? G.gifts : (G.gifts = {}), runs = [];
    for (const w of list) {
      if (Number(w.session) <= (Number(gi.wbDone) || 0)) continue;
      gi.wbDone = Number(w.session);
      const parts = [E.WB_PART];
      if (w.killed) parts.push(E.WB_KILL);
      const pr = w.rank ? E.wbPrize(w.rank) : null;
      if (pr) parts.push(pr);
      let coins = 0;const chests = [0, 0, 0, 0, 0];
      for (const p of parts) { coins += p.coins; chests[p.chest] += p.n; }
      G.coins += coins;chests.forEach((n, i) => { G.chests[i] += n; });
      runs.push({ session: Number(w.session), boss: w.boss, dmg: Number(w.dmg), killed: !!w.killed, rank: w.rank, prize: pr ? { chest: pr.chest, n: pr.n } : null, coins, chests });
    }
    return { runs };
  });
}

module.exports = { active, ensure, triesLeft, firstTurn, finish, view, mine, claim, NO_TRIES, CLOSED };
