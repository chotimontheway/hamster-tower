// A real Postgres that runs inside the project folder with nothing to install. Set DATABASE_URL to use another database instead.
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const PORT = 54329, PASS = 'hamster-tower-local';
async function canConnect(url) {
  const { Client } = require('pg');
  const c = new Client({ connectionString: url, connectionTimeoutMillis: 1500 });
  try { await c.connect(); await c.end(); return true; } catch (e) { return false; }
}
/* a hard stop can leave a database worker behind that keeps the port, and then no new database can start. Only this folder's own copy of Postgres is touched */
function clearStuckDb(dir) {
  if (process.platform === 'win32') {
    const ps = `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('\\','/').ToLower().Contains($env:HT_PG_BIN) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    const HT_PG_BIN = path.join(ROOT, 'node_modules', '@embedded-postgres').replace(/\\/g, '/').toLowerCase();
    spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { env: { ...process.env, HT_PG_BIN } });
  }
  fs.rmSync(path.join(dir, 'postmaster.pid'), { force: true });
}
async function startLocalDb() {
  if (process.env.DATABASE_URL) return async () => {};
  const url = `postgres://postgres:${PASS}@127.0.0.1:${PORT}/hamster`;
  if (await canConnect(url)) { process.env.DATABASE_URL = url; return async () => {}; }
  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const dir = path.join(ROOT, '.data', 'pg');
  const said = [];
  const epg = new EmbeddedPostgres({ databaseDir: dir, user: 'postgres', password: PASS, port: PORT, persistent: true, onLog: m => { said.push(String(m).trim()); if (said.length > 6) said.shift(); }, onError: () => {}, postgresFlags: ['-c', 'max_connections=200'] });
  const fresh = !fs.existsSync(path.join(dir, 'PG_VERSION'));
  if (fresh) await epg.initialise();
  try { await epg.start(); }
  catch (first) {
    clearStuckDb(dir);
    try { await epg.start(); }
    catch (second) { throw new Error('The local database did not start. It said:\n' + said.join('\n')); }
  }
  try { await epg.createDatabase('hamster'); } catch (e) { /* already exists */ }
  process.env.DATABASE_URL = url;
  return async () => { try { await epg.stop(); } catch (e) {} };
}
async function migrate() {
  const { q } = require('../lib/db');
  await q(fs.readFileSync(path.join(ROOT, 'sql', 'schema.sql'), 'utf8'));
}
module.exports = { startLocalDb, migrate, ROOT };
