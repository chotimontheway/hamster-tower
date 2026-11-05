// Arena Tower. A row in arena_floors means a real player holds that floor, every other floor is held by its own team from the game. Beat a floor above you and you trade places.
// A fight plays through the same turns as a floor, its ticket only says which floor it is for. Places are checked again when it ends, so a floor that changed hands in the meantime stays as it is.
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q, tx } = require('./db');
const { HttpError, bad } = require('./http');

const today = () => E.dayKey(Date.now());
const isDev = row => !!row.wallet && cfg.testWallets().includes(row.wallet);
async function placeOf(pid) {
  const r = (await q('SELECT floor FROM arena_floors WHERE player_id = $1', [pid])).rows[0];
  return r ? r.floor : 0;
}
async function triesLeft(pid, day) {
  const r = (await q('SELECT day, tries FROM arena_players WHERE player_id = $1', [pid])).rows[0];
  return Math.max(0, E.ARENA.tries - (r && r.day === day ? r.tries : 0));
}
/* who stands on these floors. A floor with no row has its own team from the game */
async function holders(floors) {
  const r = await q(`SELECT f.floor, f.player_id, p.name, a.def FROM arena_floors f JOIN players p ON p.id = f.player_id LEFT JOIN arena_players a ON a.player_id = f.player_id WHERE f.floor = ANY($1::int[])`, [floors]);
  const held = new Map(r.rows.map(x => [x.floor, x]));
  return floors.map(f => {
    const x = held.get(f);
    if (x && x.def) return { floor: f, id: x.player_id, name: x.name, def: x.def };
    const b = E.arenaBot(f);
    return { floor: f, id: x ? x.player_id : 0, bot: true, name: b.name, def: b };
  });
}
async function arenaMe(pid) {
  const day = today(), row = (await q(`SELECT p.wallet, p.gifts->>'arenaDay' AS done, a.def, a.day, a.tries FROM players p LEFT JOIN arena_players a ON a.player_id = p.id WHERE p.id = $1`, [pid])).rows[0] || {};
  const floor = await placeOf(pid), targets = await holders(E.arenaTargets(floor));
  const log = await q(`SELECT l.at, l.attacker, l.defender, l.floor, l.won, l.moved, l.fell, CASE WHEN l.attacker = $1 THEN d.name ELSE a.name END AS other
    FROM arena_log l LEFT JOIN players a ON a.id = l.attacker LEFT JOIN players d ON d.id = l.defender WHERE l.attacker = $1 OR l.defender = $1 ORDER BY l.at DESC LIMIT 8`, [pid]);
  const waiting = (await q('SELECT 1 FROM arena_days WHERE player_id = $1 AND day > $2 AND day < $3 LIMIT 1', [pid, row.done || '', day])).rowCount > 0;
  return {
    day, floor, left: Math.max(0, E.ARENA.tries - (row.day === day ? row.tries : 0)), def: row.def || null, targets, dev: isDev(row), unclaimed: waiting && !isDev(row),
    log: log.rows.map(x => ({ at: Math.floor(x.at.getTime() / 1000), mine: Number(x.attacker) === Number(pid), floor: x.floor, won: x.won, moved: x.moved, fell: x.fell, other: x.other })),
  };
}
/* a floor is chosen from a fresh read, so nobody can ask for one out of reach */
async function arenaOpen(pid, G, row, floor, freshDay) {
  if (G.top < E.ARENA.unlock) bad(`Clear floor ${E.ARENA.unlock} of the tower to enter the Arena`);
  if (!G.team.length) bad('Your team is empty');
  const mine = await placeOf(pid);
  if (!E.arenaTargets(mine).includes(floor)) bad('You can only attack the next floors above you');
  if (!await triesLeft(pid, freshDay)) throw new HttpError(409, NO_TRIES);
  const [h] = await holders([floor]);
  return { holder: h, mine };
}
const NO_TRIES = 'No Arena tries left today, they come back at 00:00 UTC';
const CLOSED = 'The Arena is closed while Squeektoshi rests. It opens when he runs again';
/* a try is used when the first turn is played, so opening the fight and looking costs nothing. The turn and the try are one write */
async function firstTurn(day, pid, id, hash, minMs) {
  const r = await q(`WITH f AS (SELECT 1 FROM fights WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND at <= now() - ($5::int * interval '1 millisecond') FOR UPDATE),
    s AS (INSERT INTO arena_players (player_id, day, tries) SELECT $2::bigint, $1::text, 1 FROM f ON CONFLICT (player_id) DO UPDATE SET day = $1, tries = CASE WHEN arena_players.day = $1 THEN arena_players.tries + 1 ELSE 1 END WHERE arena_players.day <> $1 OR arena_players.tries < $6 RETURNING 1)
    UPDATE fights SET n = 1, plan_hash = $4, at = now() WHERE player_id = $2::bigint AND id = $3 AND n = 0 AND EXISTS (SELECT 1 FROM s) RETURNING 1`, [day, pid, id, hash, minMs, E.ARENA.tries]);
  if (r.rowCount === 1) await q(`INSERT INTO arena_days (day, player_id, floor) VALUES ($1, $2, COALESCE((SELECT floor FROM arena_floors WHERE player_id = $2), 0)) ON CONFLICT (day, player_id) DO NOTHING`, [day, pid]);
  return r.rowCount === 1;
}
/* trade places, if both still stand where they stood when the fight began. Nobody else can move the rows while they are locked, and two players taking the same free floor at once cannot both get it */
async function trade(pid, a) {
  try {
    return await tx(async c => {
      const rows = (await c.query('SELECT floor, player_id FROM arena_floors WHERE floor = ANY($1::int[]) OR player_id = $2 ORDER BY floor FOR UPDATE', [[a.f, a.m], pid])).rows;
      const mine = rows.find(x => Number(x.player_id) === Number(pid)), held = rows.find(x => x.floor === a.f);
      if ((mine ? mine.floor : 0) !== a.m || (held ? Number(held.player_id) : 0) !== a.h) return false;
      const gone = [a.f, a.m].filter(Boolean);
      await c.query('DELETE FROM arena_floors WHERE floor = ANY($1::int[])', [gone]);
      await c.query('INSERT INTO arena_floors (floor, player_id) VALUES ($1, $2)', [a.f, pid]);
      if (held && a.m) await c.query('INSERT INTO arena_floors (floor, player_id) VALUES ($1, $2)', [a.m, a.h]);
      return true;
    });
  } catch (e) {
    if (e.code === '23505' || e.code === '40P01') return false;
    throw e;
  }
}
/* the server knows the outcome first and books it at once. Whoever writes the log row first does the booking, so sending the last turn twice at once cannot book it twice or win back a try. Sending it again later gets the same answer */
async function arenaFinish(pid, id, a, won, dev) {
  const day = today();
  const first = await q('INSERT INTO arena_log (id, attacker, defender, floor, won, moved, fell) VALUES ($1, $2, $3, $4, $5, false, NULL) ON CONFLICT (id) DO NOTHING RETURNING 1', [id, pid, a.h || null, a.f, won]);
  if (!first.rowCount) {
    const seen = (await q('SELECT won, moved FROM arena_log WHERE id = $1', [id])).rows[0];
    return { won: seen.won, took: seen.moved, changed: seen.won && !seen.moved && !dev, floor: await placeOf(pid), from: a.m, target: a.f, left: await triesLeft(pid, day), dev };
  }
  let took = false, changed = false;
  if (won && !dev) { took = await trade(pid, a); changed = !took; }
  const floor = await placeOf(pid);
  if (changed) await q('UPDATE arena_players SET tries = GREATEST(0, tries - 1) WHERE player_id = $1 AND day = $2', [pid, day]);
  if (took) {
    await q(`INSERT INTO arena_players (player_id, day, tries, def) VALUES ($1, $3, 0, $2::jsonb) ON CONFLICT (player_id) DO UPDATE SET def = COALESCE(arena_players.def, $2::jsonb)`, [pid, JSON.stringify(a.def), day]);
    await q(`INSERT INTO arena_days (day, player_id, floor) VALUES ($1, $2, $3) ON CONFLICT (day, player_id) DO UPDATE SET floor = $3`, [day, pid, floor]);
    if (a.h) await q(`UPDATE arena_days SET floor = $3 WHERE day = $1 AND player_id = $2`, [day, a.h, a.m]);
  }
  if (took) await q('UPDATE arena_log SET moved = true, fell = $2 WHERE id = $1', [id, a.h ? a.m : null]);
  BOARD.at = 0;
  return { won, took, changed, floor, from: a.m, target: a.f, left: await triesLeft(pid, day), dev };
}
const BOARD = { at: 0, rows: [] };
/* every floor a real player holds. The page fills in the rest with the floors' own teams */
async function arenaBoard() {
  if (Date.now() - BOARD.at > 30000) {
    const r = await q(`SELECT f.floor, p.id, p.name, a.def, extract(epoch FROM f.since)::bigint AS since FROM arena_floors f JOIN players p ON p.id = f.player_id LEFT JOIN arena_players a ON a.player_id = p.id ORDER BY f.floor DESC`);
    BOARD.rows = r.rows.map(x => ({ floor: x.floor, id: x.id, name: x.name, since: x.since, team: x.def ? x.def.team : [] }));
    BOARD.at = Date.now();
  }
  return { floors: E.ARENA.floors, held: BOARD.rows };
}
/* the team that defends. Taking a floor for the first time uses the team that won it, after that only the player changes it */
async function setDefense(pid, G) {
  if (G.top < E.ARENA.unlock) bad(`Clear floor ${E.ARENA.unlock} of the tower to enter the Arena`);
  if (!G.team.length) bad('Your team is empty');
  const def = E.teamSnapshot(G);
  await q(`INSERT INTO arena_players (player_id, def) VALUES ($1, $2::jsonb) ON CONFLICT (player_id) DO UPDATE SET def = $2::jsonb`, [pid, JSON.stringify(def)]);
  BOARD.at = 0;
  return def;
}
/* finished days the player fought on and has not been paid for. A floor reached after a day ended counts for the next day */
async function closedDays(pid, after) {
  return (await q('SELECT day, floor FROM arena_days WHERE player_id = $1 AND day > $2 AND day < $3 ORDER BY day', [pid, after, today()])).rows;
}
function payDay(G, d) {
  const p = E.arenaPrize(d.floor);
  if (!p) return null;
  G.chests[p.chest]++;
  return { day: d.day, floor: d.floor, chest: p.chest };
}
module.exports = { arenaMe, arenaOpen, firstTurn, trade, arenaFinish, arenaBoard, setDefense, closedDays, payDay, triesLeft, placeOf, NO_TRIES, CLOSED, today };
