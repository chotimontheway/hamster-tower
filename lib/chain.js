// Reads round history from the chain into the database. The first run reads every round of every contract, later runs only read new ones.
// A lease keeps it to one runner at a time, so however many people play, only one process calls the RPC.
const cfg = require('./config');
const { q, tx } = require('./db');
const SEL_STATE = '0xc19d93fb', SEL_PAGE = '0xc8b9e08f';
const ROUND = 600;
async function rpc(method, params) {
  let last;
  for (const url of cfg.rpcs()) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('Could not reach any RPC');
}
const hex64 = n => BigInt(n).toString(16).padStart(64, '0');
const words = r => { const s = r.slice(2), o = []; for (let i = 0; i + 64 <= s.length; i += 64) o.push(s.slice(i, i + 64)); return o; };
const num = w => Number(BigInt('0x' + w));
async function readState(core, tag) {
  const w = words(await rpc('eth_call', [{ to: core, data: SEL_STATE }, tag]));
  return { settled: num(w[0]), work: num(w[1]), units: num(w[2]), height: num(w[3]) };
}
async function readPage(core, after, through, tag) {
  const w = words(await rpc('eth_call', [{ to: core, data: SEL_PAGE + hex64(after) + hex64(through) + hex64(16) }, tag]));
  const cert = num(w[1]), n = num(w[9]), recs = [];
  for (let i = 0; i < n; i++) { const o = 10 + i * 5; recs.push({ round: num(w[o]), cum: num(w[o + 1]), units: num(w[o + 2]), hash: '0x' + w[o + 4] }); }
  return { cert, recs };
}
async function syncRounds() {
  const lease = await q(`UPDATE sync_lock SET until = now() + interval '120 seconds' WHERE id = 1 AND until < now() RETURNING 1`);
  if (!lease.rowCount) return { skipped: true };
  let added = 0;
  try {
    const head = parseInt(await rpc('eth_blockNumber', []), 16);
    const tag = '0x' + (head - cfg.confirmations).toString(16);
    for (const c of cfg.cores()) {
      const key = c.core.toLowerCase();
      await q('INSERT INTO sync_state (core) VALUES ($1) ON CONFLICT (core) DO NOTHING', [key]);
      const st = (await q('SELECT * FROM sync_state WHERE core = $1', [key])).rows[0];
      const on = await readState(c.core, tag);
      const through = c.through === undefined ? on.settled : Math.min(c.through, on.settled);
      let after = st.after_round, cumW = st.cum_work, cumU = st.cum_units;
      while (after < through) {
        const page = await readPage(c.core, after, through, tag);
        added += await tx(async db => {
          const last = (await db.query('SELECT floor, t FROM rounds ORDER BY floor DESC LIMIT 1')).rows[0];
          let floor = last ? last.floor : 0, prevT = last ? last.t : null, n = 0;
          for (const r of page.recs) {
            const work = r.cum - cumW, blocks = Math.round((r.units - cumU) / 1e8) / 10, t = c.genesis + (r.round - 1) * ROUND;
            const gap = prevT === null ? 0 : Math.max(0, Math.round((t - prevT) / ROUND) - 1);
            floor++;
            await db.query('INSERT INTO rounds (floor, core, round, work, blocks, hash, gap, t) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [floor, key, r.round, work, blocks, r.hash, gap, t]);
            cumW = r.cum;cumU = r.units;prevT = t;n++;
          }
          const nextAfter = Math.max(page.cert, page.recs.length ? page.recs[page.recs.length - 1].round : after);
          await db.query('UPDATE sync_state SET after_round = $2, cum_work = $3, cum_units = $4, frontier = $5, read_at = $6 WHERE core = $1', [key, nextAfter, cumW, cumU, through, Math.floor(Date.now() / 1000)]);
          after = nextAfter;
          return n;
        });
        if (page.cert <= after && !page.recs.length) break;
      }
      if (after >= through && through === on.settled && cumW !== on.work) throw new Error(`Total work does not match the chain for ${c.core}: ${cumW} vs ${on.work}`);
      await q('UPDATE sync_state SET frontier = $2, read_at = $3 WHERE core = $1', [key, through, Math.floor(Date.now() / 1000)]);
      if (after < through) break;
    }
    await q(`UPDATE battle_log SET plans = '[]'::jsonb WHERE at < now() - interval '30 days' AND plans <> '[]'::jsonb`);
    await q(`DELETE FROM daily_scores WHERE day < to_char(now() - interval '30 days', 'YYYY-MM-DD')`);
    await q(`DELETE FROM arena_days WHERE day < to_char(now() - interval '30 days', 'YYYY-MM-DD')`);
    await q(`DELETE FROM arena_log WHERE at < now() - interval '30 days'`);
    return { added };
  } finally {
    await q('UPDATE sync_lock SET until = now() WHERE id = 1');
  }
}
module.exports = { syncRounds };
