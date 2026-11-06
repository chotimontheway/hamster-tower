// Squeek NFTs as pets. The page lists a wallet's Squeeks from the official API, and this server checks every one on the chain before it counts:
// who holds it, in the wallet or deposited in Staking, and its merge level. Traits and the picture come from tokenURI once, they never change.
// A Squeek fights for one player at a time, and it is checked again before a battle when the last check is old.
const cfg = require('./config');
const { q } = require('./db');
const { HttpError, bad } = require('./http');
const E = require('./engine.generated.cjs');
const { pack } = require('./squeek-art');
const { withPlayer } = require('./players');

const SEL = { ownerOf: '0x6352211e', level: '0x05c58df2', tokenURI: '0xc87b56dd', depositor: '0x5e020ebb' };
const STALE_OK_MS = 24 * 3600000, MAX_IDS = 40;
const TRAIT_KEYS = ['Palette', 'Color Pattern', 'Body Glyph', 'Face Glyph', 'Eye Glyph', 'Muzzle Glyph', 'Ear Glyph', 'Illumination', 'Eyes', 'Ears', 'Background'];

class Revert extends Error {}
async function rpc(method, params) {
  let last;
  for (const url of cfg.rpcs()) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      /* a call the contract refuses is an answer, not a broken node: a burned Squeek has no owner */
      if (j.error && /revert/i.test(String(j.error.message || '')) ) throw new Revert('reverted');
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } catch (e) { if (e instanceof Revert) throw e; last = e; }
  }
  throw last || new Error('Could not reach any RPC');
}
const hex64 = v => BigInt(v).toString(16).padStart(64, '0');
const call = (to, data) => rpc('eth_call', [{ to, data }, 'latest']);
const addrOf = w => '0x' + String(w).slice(-40).toLowerCase();

function fake(id) {
  const s = cfg.squeekFake();
  if (!s) return null;
  if (s === 'none') return { burned: true };
  for (const part of s.split(',')) { const [i, w, lv] = part.split(':'); if (+i === id) return { holder: String(w).toLowerCase(), level: +lv || 1, staked: true }; }
  return { burned: true };
}
/* who holds a Squeek right now: the owner, or for a deposited one the wallet that deposited it */
async function chainState(id) {
  const f = fake(id);
  if (f) return f;
  let owner;
  try { owner = addrOf(await call(cfg.squeekNft(), SEL.ownerOf + hex64(id))); } catch (e) { if (e instanceof Revert) return { burned: true }; throw e; }
  const level = Number(BigInt(await call(cfg.squeekNft(), SEL.level + hex64(id))));
  if (owner !== cfg.squeekStaking()) return { holder: owner, level, staked: false };
  const holder = addrOf(await call(cfg.squeekStaking(), SEL.depositor + hex64(cfg.squeekNft()) + hex64(id)));
  return { holder, level, staked: true };
}
/* the token's traits and picture, read once. Only known trait names and values are kept */
async function readMeta(id) {
  const r = await call(cfg.squeekNft(), SEL.tokenURI + hex64(id));
  const len = Number(BigInt('0x' + r.slice(66, 130)));
  if (!(len > 0 && len < 400000)) throw new Error('unexpected metadata');
  const uri = Buffer.from(r.slice(130, 130 + len * 2), 'hex').toString('utf8');
  if (!uri.startsWith('data:application/json;base64,')) throw new Error('unexpected metadata');
  const meta = JSON.parse(Buffer.from(uri.slice(29), 'base64').toString('utf8'));
  const traits = {};
  for (const a of Array.isArray(meta.attributes) ? meta.attributes : []) {
    if (a && TRAIT_KEYS.includes(a.trait_type) && typeof a.value === 'string' && /^[A-Za-z ]{1,40}$/.test(a.value)) traits[a.trait_type] = a.value;
  }
  const t = { pal: traits.Palette, body: traits['Body Glyph'], eye: traits.Eyes, ill: traits.Illumination };
  if (!E.SQ_EL[E.sqBase(t.pal)] || !E.SQ_ROLE[t.body] || !E.SQ_EYE[t.eye] || !E.SQ_ULT[t.ill]) throw new Error('unknown traits');
  const img = String(meta.image || '');
  if (!img.startsWith('data:image/svg+xml;base64,')) throw new Error('unexpected picture');
  const svg = Buffer.from(img.slice(26), 'base64').toString('utf8');
  return { t, traits, art: pack(svg), svg };
}
async function each(list, n, f) {
  const out = new Array(list.length);let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await f(list[k]); } catch (e) { out[k] = { error: e }; } } }));
  return out;
}
const idsOf = G => Object.keys(G.owned).filter(E.isSq).map(k => +k.slice(2));
/* a team keeps only Squeeks the player still holds, at most one, and never ends up empty */
function fixTeam(G) {
  let t = G.team.filter(id => G.owned[id] && E.sqUsable(G, id));
  t = t.filter((id, i) => !E.isSq(id) || t.filter(E.isSq).indexOf(id) < E.SQ_MAX);
  if (!t.length) { const best = Object.keys(G.owned).filter(id => !E.isSq(id)).sort((a, b) => E.petPower(E.petStats(G, b)) - E.petPower(E.petStats(G, a)))[0]; t = [best || 'blade']; if (!G.owned[t[0]]) G.owned[t[0]] = E.newPet(); }
  G.team = t;
}
function setSqueek(G, id, st, t) {
  const k = 'sq' + id, o = G.owned[k] || (G.owned[k] = E.newPet());
  o.star = Math.min(5, Math.max(1, st.level));
  o.sq = { t, lv: Math.max(1, st.level), staked: !!st.staked };
}
const lose = (G, id) => { const o = G.owned['sq' + id]; if (o && o.sq) o.sq = Object.assign({}, o.sq, { gone: 1 }); };

/* the page sends the ids it found for this wallet. Every one is checked on the chain, and so is every Squeek already saved */
async function syncSqueeks(pid, row, ids) {
  if (!row.wallet) throw new HttpError(403, 'Sign in with a wallet to bring your Squeeks');
  if (!Array.isArray(ids)) bad('Invalid list');
  const asked = [...new Set(ids.map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 9999))].slice(0, MAX_IDS);
  const saved = (await q('SELECT owned FROM inventory WHERE player_id = $1', [pid])).rows[0];
  const mine = saved ? Object.keys(saved.owned).filter(E.isSq).map(k => +k.slice(2)) : [];
  const all = [...new Set([...asked, ...mine])];
  const states = await each(all, 4, chainState);
  if (states.some(s => s && s.error)) throw new HttpError(503, 'Could not read the chain right now, please try again');
  const held = all.filter((id, i) => !states[i].burned && states[i].holder === row.wallet);
  /* traits and pictures that are not stored yet */
  const known = new Map((await q('SELECT id, traits FROM squeeks WHERE id = ANY($1::int[])', [held])).rows.map(r => [r.id, r.traits]));
  const fresh = await each(held.filter(id => !known.has(id)), 3, readMeta);
  const unread = [];
  for (const [i, id] of held.filter(x => !known.has(x)).entries()) {
    const m = fresh[i];
    if (!m || m.error) { unread.push(id); continue; }
    await q(`INSERT INTO squeeks (id, traits, art, svg, level, holder, staked, player_id, checked_at) VALUES ($1, $2::jsonb, $3::jsonb, $4, 1, NULL, false, NULL, now()) ON CONFLICT (id) DO NOTHING`, [id, JSON.stringify(Object.assign({ t: m.t }, m.traits)), JSON.stringify(m.art), m.svg]);
    known.set(id, Object.assign({ t: m.t }, m.traits));
  }
  const ok = held.filter(id => known.has(id));
  for (const id of ok) { const s = states[all.indexOf(id)]; await q('UPDATE squeeks SET level = $2, holder = $3, staked = $4, player_id = $5, checked_at = now() WHERE id = $1', [id, s.level, s.holder, s.staked, pid]); }
  const gone = all.filter(id => !ok.includes(id) && !unread.includes(id));
  if (gone.length) await q('UPDATE squeeks SET player_id = NULL WHERE id = ANY($1::int[]) AND player_id = $2', [gone, pid]);
  const out = await withPlayer(pid, null, G => {
    for (const id of ok) setSqueek(G, id, states[all.indexOf(id)], known.get(id).t);
    for (const id of idsOf(G)) if (!ok.includes(id) && !unread.includes(id)) lose(G, id);
    fixTeam(G);
    return { cold: true };
  });
  return Object.assign(out, { found: ok, unread });
}

/* before a battle: a Squeek in the team must still fight for this player, and an old check is made again on the chain */
async function checkTeam(pid, row, G) {
  const ids = G.team.filter(E.isSq).map(k => +k.slice(2));
  if (!ids.length) return null;
  const lost = [], moved = [];
  for (const id of ids) {
    const r = (await q('SELECT level, holder, player_id, checked_at FROM squeeks WHERE id = $1', [id])).rows[0];
    if (!r || !row.wallet || String(r.player_id) !== String(pid)) { lost.push(id); continue; }
    if (Date.now() - r.checked_at.getTime() < cfg.squeekRecheckMs()) continue;
    let st;
    try { st = await chainState(id); } catch (e) {
      if (Date.now() - r.checked_at.getTime() < STALE_OK_MS) continue;
      throw new HttpError(503, 'Could not check your Squeek on the chain right now, please try again');
    }
    if (st.burned || st.holder !== row.wallet) { lost.push(id); await q('UPDATE squeeks SET player_id = NULL, holder = $2 WHERE id = $1', [id, st.burned ? null : st.holder]); continue; }
    await q('UPDATE squeeks SET level = $2, staked = $3, checked_at = now() WHERE id = $1', [id, st.level, st.staked]);
    if (st.level !== G.owned['sq' + id].sq.lv || !!st.staked !== !!G.owned['sq' + id].sq.staked) moved.push([id, st]);
  }
  if (!lost.length && !moved.length) return null;
  const out = await withPlayer(pid, null, G2 => {
    for (const [id, st] of moved) if (G2.owned['sq' + id] && G2.owned['sq' + id].sq) setSqueek(G2, id, st, G2.owned['sq' + id].sq.t);
    for (const id of lost) lose(G2, id);
    fixTeam(G2);
    return { cold: true };
  });
  if (lost.length) throw new HttpError(409, `Squeek #${lost[0]} is no longer in your wallet, so it left your team`, { state: out.state });
  return out;
}

/* the dots of up to 12 Squeeks, for drawing. Pictures never change, so the CDN may keep them */
async function artOf(list) {
  const ids = [...new Set(String(list || '').split(',').map(Number).filter(n => Number.isInteger(n) && n >= 1 && n <= 9999))].slice(0, 12);
  if (!ids.length) return { art: {} };
  const r = await q('SELECT id, art, traits FROM squeeks WHERE id = ANY($1::int[])', [ids]);
  return { art: Object.fromEntries(r.rows.map(x => [x.id, Object.assign({ traits: Object.fromEntries(TRAIT_KEYS.filter(k => x.traits[k]).map(k => [k, x.traits[k]])) }, x.art)])) };
}
/* the real picture, only ever shown in an img tag as a data address */
async function picOf(v) {
  const id = Number(v);
  if (!Number.isInteger(id) || id < 1 || id > 9999) bad('Invalid Squeek');
  const r = (await q('SELECT svg FROM squeeks WHERE id = $1', [id])).rows[0];
  if (!r) throw new HttpError(404, 'This Squeek has not been brought into the game yet');
  return { svg: Buffer.from(r.svg).toString('base64') };
}
module.exports = { syncSqueeks, checkTeam, artOf, picOf, chainState, readMeta, fixTeam };
