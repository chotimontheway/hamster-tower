// A real Postgres that runs inside the project folder with nothing to install. Set DATABASE_URL to use another database instead.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = 54329, PASS = 'hamster-tower-local';
async function canConnect(url) {
  const { Client } = require('pg');
  const c = new Client({ connectionString: url, connectionTimeoutMillis: 1500 });
  try { await c.connect(); await c.end(); return true; } catch (e) { return false; }
}
async function startLocalDb() {
  if (process.env.DATABASE_URL) return async () => {};
  const url = `postgres://postgres:${PASS}@127.0.0.1:${PORT}/hamster`;
  if (await canConnect(url)) { process.env.DATABASE_URL = url; return async () => {}; }
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = path.join(ROOT, '.data', 'pg');
  const epg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: PASS, port: PORT, persistent: true, onLog: () => {}, onError: () => {}, postgresFlags: ['-c', 'max_connections=200'] });
  const fresh = !fs.existsSync(path.join(dir, 'PG_VERSION'));
  if (fresh) await epg.initialise();
  await epg.start();
  try { await epg.createDatabase('hamster'); } catch (e) { /* already exists */ }
  process.env.DATABASE_URL = url;
  return async () => { try { await epg.stop(); } catch (e) {} };
}
async function migrate() {
  const { q } = require('../lib/db');
  await q(fs.readFileSync(path.join(ROOT, 'sql', 'schema.sql'), 'utf8'));
}
module.exports = { startLocalDb, migrate, ROOT };
