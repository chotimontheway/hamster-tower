// Creates the tables in the database given by DATABASE_URL. Safe to run more than once.
const { startLocalDb, migrate } = require('./local-db');
(async () => {
  const stopDb = await startLocalDb();
  await migrate();
  console.log('Schema is ready');
  await require('../lib/db').closeDb();await stopDb();
})().catch(e => { console.error(e); process.exit(1); });
