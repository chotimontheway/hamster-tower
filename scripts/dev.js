// Runs the whole game locally: Postgres, chain sync, API and website.
const http = require('http'), fs = require('fs'), path = require('path');
const { startLocalDb, migrate, ROOT } = require('./local-db');
process.env.ALLOW_GUEST = process.env.ALLOW_GUEST || '1';
process.env.ALLOW_TRIAL = process.env.ALLOW_TRIAL || '1';
/* the same dev wallet as on the live site, so its admin screen for quests can be tried here */
process.env.TEST_WALLETS = process.env.TEST_WALLETS === undefined ? '0x543972e9a07fcc03c56cacd42a24d89425db9ab6' : process.env.TEST_WALLETS;
const PORT = +(process.env.PORT || 3000);
/* this game hands the test panel to everyone and its contract trusts its own key, so it answers this machine only: it listens on 127.0.0.1,
   and a request must name this machine. A web page that points its own name at this machine (DNS rebinding) is refused that way.
   HOST=0.0.0.0 with DEV_HOSTS=name1,name2 opens it to other devices, on a network you trust */
const LISTEN = process.env.HOST ? [process.env.HOST] : ['127.0.0.1', '::1'];
const HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', ...(process.env.DEV_HOSTS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)]);
const hostOk = h => HOSTS.has(String(h || '').toLowerCase().replace(/:\d+$/, ''));
const MIME ={ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUB = path.join(ROOT, 'public');
function serveStatic(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { res.statusCode = 400; res.end('Bad request'); return; }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUB, p));
  /* inside public itself, not a folder next to it whose name starts the same way */
  if (!file.startsWith(PUB + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.statusCode = 404; res.end('Not found'); return; }
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
  const serve = (req, res) => {
    if (!hostOk(req.headers.host)) { res.statusCode = 403; res.end('This game only answers this computer'); return; }
    try {
      if (req.url.startsWith('/api/')) handler(req, res);
      else serveStatic(req, res);
    } catch (e) { if (!res.headersSent) res.statusCode = 500; res.end(); }
  };
  /* localhost can mean the IPv6 or the IPv4 loopback, so both are served. A machine without IPv6 just skips that one */
  const servers = LISTEN.map((h, i) => {
    const s = http.createServer(serve);
    s.on('error', e => { if (i > 0 && (e.code === 'EADDRNOTAVAIL' || e.code === 'EAFNOSUPPORT')) return; console.error('Could not start:', e.message); process.exit(1); });
    s.listen(PORT, h, () => { if (i === 0) console.log(`\nThe game is running: http://localhost:${PORT}\nPress Ctrl+C to stop.\n`); });
    return s;
  });
  const server = { close: () => servers.forEach(s => s.close()) };
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
