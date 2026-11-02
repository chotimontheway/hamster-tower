// Turns the SVG art into WebP files so browsers do not have to rasterize it and the CDN can serve it directly. Only rerun after changing the art.
// Usage: npm run bake-art rebuilds everything. node scripts/bake-art.js bg_ only rebakes names starting with bg_ and leaves the rest alone.
const { spawn } = require('child_process'), http = require('http'), path = require('path'), fs = require('fs'), os = require('os');
const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT = path.join(__dirname, '..'), PORT = 9344;
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'bake'));
const proc = spawn(chrome, ['--headless=new', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => http.get(u, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res(JSON.parse(s))); }).on('error', rej));
async function connect() { for (let i = 0; i < 40; i++) { try { const l = await getJson(`http://127.0.0.1:${PORT}/json`); const p = l.find(x => x.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) {} await sleep(250); } throw new Error('Could not open Chrome'); }
const only = process.argv[2];
const BG_SIZE = { bg_login: 1920, bg_login_tall: 1080, bg_night: 1600, bg_night_tall: 800 };
const sizeOf = id => BG_SIZE[id] || (id === 'scene' ? 1200 : id.startsWith('boss_') ? 640 : id === 'wheel_big' || id.startsWith('run_') ? 512 : id.startsWith('food_') ? 160 : (id.startsWith('pet_') || id.startsWith('mon_') || id === 'win_pet' || id === 'hurt_pet') ? 384 : (id.startsWith('el_') || id.startsWith('role_')) ? 96 : id.startsWith('nav_') ? 128 : id.startsWith('g_') ? 192 : 256);
(async () => {
  const ws = new WebSocket(await connect());
  await new Promise(r => { ws.onopen = r; });
  let id = 0;const pend = new Map();
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
  await send('Runtime.enable');
  await ev(fs.readFileSync(path.join(ROOT, 'tools/art-web.js'), 'utf8') + ';0');
  const ids = (await ev('artIds()')).filter(a => !only || a.startsWith(only));
  const out = path.join(ROOT, 'public/art');
  if (!only) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let total = 0;
  for (const a of ids) {
    const b64 = await ev(`(async()=>{const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(artSvg(${JSON.stringify(a)}));await img.decode();const w=${sizeOf(a)},h=Math.round(w*img.naturalHeight/img.naturalWidth);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);return c.toDataURL('image/webp',.86).split(',')[1];})()`);
    const buf = Buffer.from(b64, 'base64');total += buf.length;
    fs.writeFileSync(path.join(out, a + '.webp'), buf);
  }
  console.log(`Created ${ids.length} images, ${(total / 1024).toFixed(0)} KB in total`);
  ws.close();
})().catch(e => { console.error('Error', e.message); process.exitCode = 1; }).finally(() => { proc.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(); }, 600); });
