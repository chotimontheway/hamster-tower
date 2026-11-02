// Drives the real page in headless Chrome. Usage: node scripts/e2e.js flow | node scripts/e2e.js shot name width height [js-to-run]
const { spawn } = require('child_process'), http = require('http'), path = require('path'), fs = require('fs'), os = require('os');
const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3000', PORT = 9345 + Math.floor(Math.random() * 500);
const ROOT = path.join(__dirname, '..');
const mode = process.argv[2] || 'flow';
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e'));
const proc = spawn(chrome, ['--headless=new', '--hide-scrollbars', '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--window-size=1200,900', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = u => new Promise((res, rej) => http.get(u, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => res(JSON.parse(s))); }).on('error', rej));
async function connect() { for (let i = 0; i < 40; i++) { try { const l = await getJson(`http://127.0.0.1:${PORT}/json`); const p = l.find(x => x.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) {} await sleep(250); } throw new Error('Could not open Chrome'); }
(async () => {
  const ws = new WebSocket(await connect());
  await new Promise(r => { ws.onopen = r; });
  let id = 0;const pend = new Map();const consoleErrors = [];
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    if (d.method === 'Runtime.exceptionThrown') consoleErrors.push(d.params.exceptionDetails.text + ' ' + ((d.params.exceptionDetails.exception || {}).description || ''));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') consoleErrors.push(d.params.entry.text + ' ' + (d.params.entry.url || ''));
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => { const r = await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result.result.value; };
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  if (mode === 'flow') {
    await send('Emulation.setDeviceMetricsOverride', { width: 1100, height: 800, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: BASE });await sleep(2500);
    const out = await ev(fs.readFileSync(path.join(ROOT, 'tests/flow.js'), 'utf8'));
    (out.seen || []).forEach(l => console.log(' ', l));
    console.log(out.ok ? 'FLOW FINISHED' : 'FLOW FAILED: ' + out.error);
    console.log('Page errors:', (out.errs || []).length ? out.errs.join(' | ') : 'none');
    const real = consoleErrors.filter(x => !/4\d\d|fonts\.g/.test(x));
    console.log('Console errors:', real.length ? real.slice(0, 8).join(' | ') : 'none');
    process.exitCode = out.ok && !(out.errs || []).length ? 0 : 1;
  } else {
    /* screenshot mode: set up a state in the page and save an image */
    const name = process.argv[3], w = +process.argv[4] || 400, h = +process.argv[5] || 800, js = process.argv[6] || '0';
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 500 });
    await send('Page.navigate', { url: BASE });await sleep(2000);
    await ev(`(async()=>{if(UI.view==='login'){await ACT.guest();}PREF.speed=3;${js};})()`);
    await sleep(+process.env.SETTLE || 1500);
    const r = await send('Page.captureScreenshot', { format: 'png' });
    const dir = path.join(ROOT, 'shots');fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name + '.png'), Buffer.from(r.result.data, 'base64'));
    console.log('Saved', name, consoleErrors.filter(x => !/fonts\.g/.test(x)).slice(0, 4).join(' | '));
  }
  ws.close();
})().catch(e => { console.error('Error', e.message); process.exitCode = 1; }).finally(() => { proc.kill(); setTimeout(() => { try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) {} process.exit(); }, 500); });
