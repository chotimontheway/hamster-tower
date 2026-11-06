// A page on this machine for the owner of the SQK contract: deploy it, set the price and limits, fill the reward pool, pause, take SQK back,
// and attach it to the game running on this computer. The page only prepares transactions and the owner's own wallet signs each one.
// Nothing here holds a key. Usage: npm run sqk:admin, then open http://localhost:3460 in the browser that has the wallet.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.join(__dirname, '..'), DATA = path.join(ROOT, '.data'), ATTACHED = path.join(DATA, 'sqk.json');
const PORT = +(process.env.PORT || 3460);
/* only this page may attach a contract: another site in the same browser cannot read this token, so it cannot send it */
const TOKEN = crypto.randomBytes(16).toString('hex');
(async () => {
  const v = await import('viem'), { privateKeyToAccount } = await import('viem/accounts');
  const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts/HamsterTowerSQK.json'), 'utf8'));
  const sel = Object.fromEntries(ART.abi.filter(x => x.type === 'function').map(f => [f.name, v.toFunctionSelector(f)]));
  for (const s of ['transfer(address,uint256)', 'balanceOf(address)']) sel['erc20_' + s.split('(')[0]] = v.toFunctionSelector(s);
  /* the signer a game makes from the public development secret. A real contract must never trust it */
  const devSigner = privateKeyToAccount('0x' + crypto.createHmac('sha256', 'local-development-only-never-use-in-production').update('hamster-tower-sqk-signer').digest('hex')).address.toLowerCase();
  /* public Sepolia nodes the page asks for gas when a wallet cannot. Tests point it at their own chain */
  const rpcs = (process.env.SQK_PUBLIC_RPC || 'https://ethereum-sepolia-rpc.publicnode.com,https://sepolia.gateway.tenderly.co').split(',').map(s => s.trim()).filter(Boolean);
  const info = { sel, bytecode: ART.bytecode, compiler: ART.compiler, devSigner, token: '0xd78a3956cf63164d1fa1c622ad3c66623162fa1e', treasury: '0x543972e9a07fcc03c56cacd42a24d89425db9ab6', site: process.env.GAME || 'http://localhost:3000', price: '5', token2: TOKEN, rpcs };
  const page = () => fs.readFileSync(path.join(ROOT, 'tools/sqk-admin.html'), 'utf8').replace('/*INFO*/null', JSON.stringify(info));
  const send = (res, code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
  http.createServer((req, res) => {
    /* only by this machine's own name: a web page that points its name at this machine cannot read the page and its token */
    if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(String(req.headers.host || ''))) { res.statusCode = 403; res.end('This page only answers this computer'); return; }
    const url = req.url.split('?')[0];
    if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.setHeader('content-security-policy', "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https: http://localhost:*; frame-ancestors 'none'");
      res.end(page());
      return;
    }
    if (url === '/attach' && req.method === 'GET') { let cur = {}; try { cur = JSON.parse(fs.readFileSync(ATTACHED, 'utf8')); } catch (e) {} return send(res, 200, cur); }
    if (url === '/attach' && req.method === 'POST') {
      if (req.headers['x-token'] !== TOKEN) return send(res, 403, { error: 'Only this page can attach a contract' });
      let body = '';req.on('data', d => { body += d; if (body.length > 2000) req.destroy(); });
      req.on('end', () => {
        let b = {};try { b = JSON.parse(body); } catch (e) {}
        try {
          if (b.detach) { try { fs.unlinkSync(ATTACHED); } catch (e) {} return send(res, 200, {}); }
          const shop = String(b.shop || '').toLowerCase(), fromBlock = Math.floor(Number(b.fromBlock));
          if (!/^0x[0-9a-f]{40}$/.test(shop) || !(fromBlock >= 0)) return send(res, 400, { error: 'Invalid contract or block' });
          fs.mkdirSync(DATA, { recursive: true });
          fs.writeFileSync(ATTACHED, JSON.stringify({ shop, fromBlock, at: new Date().toISOString() }, null, 1));
          send(res, 200, { shop, fromBlock });
        } catch (e) { send(res, 500, { error: e.message }); }
      });
      return;
    }
    res.statusCode = 404;res.end('Not found');
  }).listen(PORT, '127.0.0.1', () => console.log(`SQK contract page: http://localhost:${PORT}  (Ctrl+C to stop)`));
})().catch(e => { console.error(e.message); process.exit(1); });
