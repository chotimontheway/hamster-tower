// Postgres connection. On Vercel each function keeps a single connection and must go through a pooler
// (a pooled DATABASE_URL), otherwise the database runs out of connections long before it runs out of capacity.
const { Pool, types } = require('pg');
const cfg = require('./config');
types.setTypeParser(20, Number);
let pool = null;
function getPool() {
  if (!pool) {
    if (!cfg.databaseUrl()) throw new Error('DATABASE_URL is not set');
    pool = new Pool({ connectionString: cfg.databaseUrl(), max: cfg.pgPoolMax(), idleTimeoutMillis: 10000, connectionTimeoutMillis: 8000, allowExitOnIdle: true });
    pool.on('error', () => {});
  }
  return pool;
}
const q = (text, params) => getPool().query(text, params);
async function tx(fn) {
  const c = await getPool().connect();
  try {
    await c.query('BEGIN');
    const out = await fn(c);
    await c.query('COMMIT');
    return out;
  } catch (e) {
    try { await c.query('ROLLBACK'); } catch (x) {}
    throw e;
  } finally {
    c.release();
  }
}
async function closeDb() { if (pool) { const p = pool; pool = null; await p.end(); } }
module.exports = { q, tx, closeDb };
