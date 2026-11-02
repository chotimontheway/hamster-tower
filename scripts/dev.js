// Runs the whole game locally: Postgres, chain sync, API and website.
const http = require('http'), fs = require('fs'), path = require('path');
const { startLocalDb, migrate, ROOT } = require('./local-db');
process.env.ALLOW_GUEST = process.env.ALLOW_GUEST || '1';
process.env.ALLOW_TRIAL = process.env.ALLOW_TRIAL || '1';
const PORT = +(process.env.PORT || 3000);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUB = path.join(ROOT, 'public');
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('Not found'); return; }
  res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', p.startsWith('/app/') || p.startsWith('/art/') ? 'public, max-age=86400' : 'no-cache');
  fs.createReadStream(file).pipe(res);
}
(async () => {
  console.log('Starting the database...');
  const stopDb = await startLocalDb();
  await migrate();
  const { handler } = require('../lib/router');
  const { syncRounds } = require('../lib/chain');
  const { q } = require('../lib/db');
  const syncNow = async () => {
    try {
      const s = await syncRounds();
      const n = (await q('SELECT count(*)::int AS n FROM rounds')).rows[0].n;
      if (s.added) console.log(`Read ${s.added} new rounds, the tower now has ${n} floors`);
      return n;
    } catch (e) { console.error('Could not read the chain:', e.message); return null; }
  };
  console.log('Reading the full round history from the chain...');
  await syncNow();
  const timer = setInterval(syncNow, 60000);
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) handler(req, res);
    else serveStatic(req, res);
  });
  server.listen(PORT, () => console.log(`\nThe game is running: http://localhost:${PORT}\nPress Ctrl+C to stop.\n`));
  let closing = false;
  const stop = async () => {
    if (closing) return;closing = true;
    clearInterval(timer);server.close();
    try { await require('../lib/db').closeDb(); } catch (e) {}
    await stopDb();
    process.exit(0);
  };
  process.on('SIGINT', stop);process.on('SIGTERM', stop);
})().catch(e => { console.error('Could not start:', e); process.exit(1); });
