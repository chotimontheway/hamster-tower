// Lists the wallets in line for the prize: from the top of the board down, skipping guests and test wallets, with what is needed to check each climb by hand.
// Usage: DATABASE_URL=... TEST_WALLETS=... npm run top10 [count]
const E = require('../lib/engine.generated.cjs');
const { q, closeDb } = require('../lib/db');
const cfg = require('../lib/config');
const FAST_MS = 1500;
(async () => {
  const count = Math.max(1, +(process.argv[2] || 10)), tw = cfg.testWallets();
  const rows = (await q(`SELECT p.id, p.name, p.top, p.top_at, p.battles, p.wins, p.bags, p.pity_l, p.team, i.owned, i.items FROM players p JOIN inventory i ON i.player_id = p.id
    WHERE p.top > 0 AND p.wallet IS NOT NULL AND NOT (p.wallet = ANY($1::text[])) ORDER BY p.top DESC, p.top_at ASC LIMIT $2`, [tw, count])).rows;
  const skipped = (await q(`SELECT count(*) FILTER (WHERE wallet IS NULL)::int AS guests, count(*) FILTER (WHERE wallet = ANY($1::text[]))::int AS tests FROM players WHERE top > 0 AND ($2::int = 0 OR top > $2 OR (top = $2 AND top_at < $3))`, [tw, rows.length ? rows[rows.length - 1].top : 0, rows.length ? rows[rows.length - 1].top_at : new Date()])).rows[0];
  console.log(`Top ${count} wallets by highest floor, then who got there first. Skipped above the last one: ${skipped.guests} guests, ${skipped.tests} test wallets.`);
  if (!tw.length) console.log('Warning: TEST_WALLETS is empty, so test wallets are not being skipped.');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const log = (await q('SELECT count(*)::int AS n, sum(rounds)::bigint AS rounds, sum(ms)::bigint AS ms, min(ms / GREATEST(rounds, 1))::int AS fastest FROM battle_log WHERE player_id = $1', [r.id])).rows[0];
    const drops = (await q(`SELECT source, kind, ref, at FROM rare_drops WHERE player_id = $1 ORDER BY at`, [r.id])).rows;
    const pets = Object.keys(r.owned).filter(id => E.PETS[id] && E.PETS[id].rar === 'l'), logged = drops.filter(d => d.kind === 'pet').map(d => d.ref);
    const msPerRound = Number(log.rounds) ? Math.round(Number(log.ms) / Number(log.rounds)) : null;
    const flags = [];
    if (msPerRound !== null && msPerRound < FAST_MS) flags.push(`fast, ${msPerRound} ms per round on average`);
    if (log.n < r.top) flags.push(`only ${log.n} first clears logged for floor ${r.top}`);
    const missing = pets.filter(id => !logged.includes(id));
    if (missing.length) flags.push(`legendary pets with no logged drop (older than the log, or look closer): ${missing.join(', ')}`);
    console.log(`\n${i + 1}. ${r.name}`);
    console.log(`   Floor ${r.top}, reached ${r.top_at.toISOString()}`);
    console.log(`   Battles ${r.battles}, wins ${r.wins}, bags ${r.bags}, bags since the last legendary ${r.pity_l}`);
    console.log(`   First clears logged ${log.n}, average ${msPerRound === null ? 'unknown' : msPerRound + ' ms'} per round, fastest floor ${log.fastest === null ? 'unknown' : log.fastest + ' ms'} per round`);
    console.log(`   Team ${r.team.map(id => `${id} level ${r.owned[id] ? r.owned[id].lv : '?'}`).join(', ')}`);
    console.log(`   Legendary pets ${pets.join(', ') || 'none'}, legendary gear ${r.items.filter(x => x[3] === 'l').length}, logged drops ${drops.length}`);
    for (const d of drops) console.log(`     ${d.at.toISOString()} ${d.kind} ${d.ref} from ${d.source}`);
    console.log(`   Check: ${flags.length ? flags.join('; ') : 'nothing stands out'}`);
  }
  await closeDb();
})().catch(e => { console.error(e.message); process.exit(1); });
