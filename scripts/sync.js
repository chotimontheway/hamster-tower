// Reads rounds from the chain into the database once and exits. Set DATABASE_URL to run it against a real database.
const { startLocalDb, migrate } = require('./local-db');
(async () => {
  const stopDb = await startLocalDb();
  await migrate();
  const { syncRounds } = require('../lib/chain');
  const { q, closeDb } = require('../lib/db');
  const s = await syncRounds();
  const r = (await q('SELECT count(*)::int AS n, max(floor) AS top FROM rounds')).rows[0];
  const by = (await q('SELECT core, count(*)::int AS n, min(floor) AS a, max(floor) AS b, sum(work)::bigint AS work FROM rounds GROUP BY core ORDER BY min(floor)')).rows;
  console.log('Result', s, 'total floors', r.n);
  by.forEach(x => console.log(`  ${x.core}: ${x.n} floors (${x.a} to ${x.b}), total work ${x.work}`));
  await closeDb();await stopDb();
})().catch(e => { console.error(e); process.exit(1); });
