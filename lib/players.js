// Reading and writing players. Each action reads once, computes with the same game code, and writes with a single statement.
// Battles only write the small row; pets and gear are only written when they really change.
const crypto = require('crypto');
const E = require('./engine.generated.cjs');
const { q } = require('./db');
const { HttpError } = require('./http');

const packItems = items => items.map(i => [i.uid, i.set, i.slot, i.rar, i.plus]);
const unpackItems = a => a.map(x => ({ uid: x[0], set: x[1], slot: x[2], rar: x[3], plus: x[4] }));
/* pets saved before food existed keep their level and start with an empty stomach */
function upgradePets(owned) {
  for (const o of Object.values(owned)) {
    if (o.xp === undefined) o.xp = 0;
    if (o.full === undefined) o.full = 0;
    delete o.fail;
  }
  return owned;
}
function toG(r) {
  return { v: 4, coins: r.coins, top: r.top, team: r.team, owned: upgradePets(r.owned), items: unpackItems(r.items), foods: r.foods, chests: r.chests, uid: r.uid, pityE: r.pity_e, pityL: r.pity_l, bags: r.bags, sweepDay: r.sweep_day, gifts: r.gifts, battles: r.battles, wins: r.wins, rs: r.rs };
}
/* the random state rs is never sent to the client, otherwise chest results could be predicted */
function publicState(G, withCold) {
  const s = { coins: G.coins, top: G.top, team: G.team, chests: G.chests, pityE: G.pityE, pityL: G.pityL, bags: G.bags, sweepDay: G.sweepDay, gifts: G.gifts, battles: G.battles, wins: G.wins };
  if (withCold) { s.owned = G.owned; s.items = packItems(G.items); s.foods = G.foods; }
  return s;
}
async function loadRow(id) {
  const r = await q('SELECT p.*, i.owned, i.items, i.uid, i.foods FROM players p JOIN inventory i ON i.player_id = p.id WHERE p.id = $1', [id]);
  if (!r.rows[0]) throw new HttpError(401, 'Your session is no longer valid');
  return r.rows[0];
}
const SET_HOT = `coins = $3::bigint, top = $4::int, top_at = CASE WHEN $4::int > top THEN now() ELSE top_at END, chests = $5::int[], pity_e = $6::int, pity_l = $7::int, bags = $8::int, battles = $9::int, wins = $10::int, sweep_day = $11::text, rs = $12::int[], team = $13::text[], gifts = $14::jsonb, last_req = $15::text, version = version + 1`;
async function saveRow(row, G, cold, requestId) {
  const hot = [row.id, row.version, G.coins, G.top, G.chests, G.pityE, G.pityL, G.bags, G.battles, G.wins, G.sweepDay, G.rs.map(x => x | 0), G.team, JSON.stringify(G.gifts), requestId || null];
  if (!cold) return (await q(`UPDATE players SET ${SET_HOT} WHERE id = $1 AND version = $2`, hot)).rowCount === 1;
  const r = await q(`WITH h AS (UPDATE players SET ${SET_HOT} WHERE id = $1 AND version = $2 RETURNING id) UPDATE inventory SET owned = $16::jsonb, items = $17::jsonb, uid = $18::int, foods = $19::jsonb FROM h WHERE inventory.player_id = h.id`, [...hot, JSON.stringify(G.owned), JSON.stringify(packItems(G.items)), G.uid, JSON.stringify(G.foods)]);
  return r.rowCount === 1;
}
/* read, compute, write. If two tabs write at once the later one recomputes on fresh data. Resending the same request id cannot pay twice */
async function withPlayer(id, requestId, fn) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const row = await loadRow(id);
    if (requestId && row.last_req === requestId) { const G = toG(row); return { dup: true, state: publicState(G, true) }; }
    const G = toG(row);
    const out = (await fn(G, row)) || {};
    const cold = !!out.cold;delete out.cold;
    if (await saveRow(row, G, cold, requestId)) return Object.assign(out, { state: publicState(G, cold) });
  }
  throw new HttpError(409, 'Busy right now, please try again');
}
/* create a new player, or return the existing one for this wallet */
async function createPlayer(wallet, name) {
  const G = E.newSave(crypto.randomBytes(16).toString('hex'));
  const r = await q(
    `WITH p AS (INSERT INTO players (wallet, name, rs, team) VALUES ($1, $2, $3::int[], $4::text[]) ON CONFLICT (wallet) DO NOTHING RETURNING id)
     INSERT INTO inventory (player_id, owned, items, uid) SELECT id, $5::jsonb, $6::jsonb, $7::int FROM p RETURNING player_id`,
    [wallet, name, G.rs.map(x => x | 0), G.team, JSON.stringify(G.owned), JSON.stringify([]), G.uid]);
  if (r.rows[0]) return r.rows[0].player_id;
  const x = await q('SELECT id FROM players WHERE wallet = $1', [wallet]);
  return x.rows[0].id;
}
module.exports = { toG, publicState, loadRow, withPlayer, createPlayer, packItems };
