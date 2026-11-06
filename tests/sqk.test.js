// The SQK Chest and boss floor pouches against a running local server and a local copy of Sepolia made by anvil, with the real SQK token.
// Start anvil with a fork of Sepolia, deploy contracts/HamsterTowerSQK.json there with the test signer below, then start the server with
// SQK_SHOP, SQK_RPC (anvil), SQK_SIGNER_KEY (the test signer), SQK_CONFIRMATIONS=2, ALLOW_GUEST=1, ALLOW_TRIAL=1, MIN_MS_PER_ROUND=0 and
// TEST_WALLETS holding wallet D. Then: node tests/sqk.test.js <baseUrl> <info.json>, where info.json holds { rpc, shop, owner }.
// Every wallet here is made from fixed test words and holds nothing outside the local copy. Nothing is sent to Sepolia.
const fs = require('fs');
const E = require('../lib/engine.generated.cjs');
const { privateKeyToAccount } = require('viem/accounts');
const v = require('viem');
const ART = require('../contracts/HamsterTowerSQK.json');
const BASE = process.argv[2], INFO = process.argv[3];
if (!BASE || !INFO) { console.log('usage: node tests/sqk.test.js <baseUrl> <info.json>'); process.exit(2); }
const info = JSON.parse(fs.readFileSync(INFO, 'utf8'));
const SQK = '0xd78a3956cf63164d1fa1c622ad3c66623162fa1e', WHALE = '0x50fd1780526c3186a0c037c7622203bc4fb611ca';
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra, (k, x) => typeof x === 'bigint' ? x.toString() : x).slice(0, 300) : '')); } };
function client() {
  let cookie = '';
  return async function call(path, body) {
    const init = { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    const r = await fetch(BASE + path, init);
    const sc = r.headers.get('set-cookie');if (sc) cookie = sc.split(';')[0];
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j, headers: r.headers };
  };
}
const word = w => privateKeyToAccount(v.keccak256(v.toHex('hamster tower sqk test ' + w)));
const A = word('wallet A'), B = word('wallet B'), C = word('wallet C'), D = word('wallet D'), GU = word('wallet for a guest');
const SIGNER = privateKeyToAccount(v.keccak256(v.toHex('hamster tower test signer')));
async function signIn(call, acct) {
  const n = await call('/api/auth/nonce', { address: acct.address.toLowerCase() });
  return call('/api/auth/verify', { ticket: n.body.ticket, signature: await acct.signMessage({ message: n.body.message }) });
}
/* Rage skill when ready, then the skill, then a basic attack */
const plan = Bt => { const p = {}; E.alive(Bt, 'p').forEach(u => { p[u.id] = { i: E.canPick(Bt, u.id, 2) ? 2 : E.canPick(Bt, u.id, 1) ? 1 : 0, target: null }; }); return p; };
async function fight(call, floor) {
  const s = await call('/api/fight/start', { floor });
  if (s.status !== 200) return s;
  let token = s.body.token, Bt = s.body.B, r = null;
  for (let g = 0; g < 80; g++) { r = await call('/api/fight/turn', { token, plan: plan(Bt) }); if (r.status !== 200 || r.body.over) return r; token = r.body.token; Bt = r.body.B; }
  return r;
}
/* a loss pays nothing, so a fight that must be won is simply tried again */
async function win(call, floor) { let r; for (let i = 0; i < 6; i++) { r = await fight(call, floor); if (r.status !== 200 || r.body.over === 'win') return r; } return r; }
let rid = 0;
const act = (call, type, args) => call('/api/action', Object.assign({ type, requestId: 'sqk' + (++rid) }, args || {}));

(async () => {
  const chain = v.defineChain({ id: 11155111, name: 'Sepolia fork', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [info.rpc] } } });
  const pub = v.createPublicClient({ chain, transport: v.http(info.rpc) });
  const rpc = (method, params) => pub.request({ method, params });
  const wal = acct => v.createWalletClient({ chain, transport: v.http(info.rpc), account: acct });
  const token = { address: SQK, abi: v.parseAbi(['function balanceOf(address) view returns (uint256)', 'function transfer(address,uint256) returns (bool)', 'function approve(address,uint256) returns (bool)']) };
  const shop = { address: info.shop, abi: ART.abi };
  const send = async (from, c, fn, args, gas) => { const h = await wal(from).writeContract(Object.assign({ address: c.address, abi: c.abi, functionName: fn, args }, gas ? { gas } : {})); await pub.waitForTransactionReceipt({ hash: h }); return h; };
  const mine = n => rpc('anvil_mine', ['0x' + n.toString(16)]);
  const bal = a => pub.readContract({ ...token, functionName: 'balanceOf', args: [a] });
  const SQ = n => v.parseEther(String(n));

  console.log('Setting up wallets on the local chain');
  await rpc('anvil_impersonateAccount', [WHALE]);await rpc('anvil_setBalance', [WHALE, '0x56BC75E2D63100000']);
  for (const x of [A, B, C, D, GU]) { await rpc('anvil_setBalance', [x.address, '0x8AC7230489E80000']); await send(WHALE, token, 'transfer', [x.address, SQ(100)]); }
  await rpc('anvil_stopImpersonatingAccount', [WHALE]);

  console.log('What the page reads');
  const pub0 = await client()('/api/sqk');
  check('the shop is public, with contract, token, price and the server signer', pub0.status === 200 && pub0.body.on === true && pub0.body.contract === info.shop.toLowerCase() && pub0.body.token === SQK && pub0.body.price === SQ(10).toString() && pub0.body.signer === SIGNER.address.toLowerCase(), pub0.body);
  check('the CDN may keep it for a moment', /s-maxage=30/.test(pub0.headers.get('cache-control') || ''));
  const g = client();await g('/api/auth/guest', {});
  check('a guest cannot count a purchase', (await g('/api/sqk/credit', { tx: '0x' + '1'.repeat(64) })).status === 403);
  check('a guest cannot claim', (await g('/api/sqk/claim', {})).status === 403);
  const a = client(), b = client(), c = client(), d = client();
  check('wallets sign in', (await signIn(a, A)).status === 200 && (await signIn(b, B)).status === 200 && (await signIn(c, C)).status === 200 && (await signIn(d, D)).status === 200);
  let me = await a('/api/sqk/me');
  check('a wallet sees it has not bought today and earned nothing', me.status === 200 && me.body.bought === false && me.body.counted === false && me.body.earned === '0' && me.body.claimed === '0', me.body);

  const gb = await g('/api/sqk/balance'), ab = await a('/api/sqk/balance');
  check('a guest has no SQK balance to show', gb.status === 200 && gb.body.balance === null, gb.body);
  check('a wallet sees the SQK it holds, read from the token', ab.status === 200 && ab.body.wallet === A.address.toLowerCase() && ab.body.balance === (await bal(A.address)).toString(), ab.body);

  console.log('Buying the SQK Chest');
  await send(A, token, 'approve', [info.shop, SQ(10)]);
  const approveTx = await send(A, token, 'approve', [info.shop, SQ(10)]);
  const buyTx = await send(A, shop, 'buyChest', [SQ(10)]);
  check('a bad transaction id is refused', (await a('/api/sqk/credit', { tx: 'nope' })).status === 400);
  check('a transaction that is not a purchase is refused', (await a('/api/sqk/credit', { tx: approveTx })).status === 400);
  let r = await a('/api/sqk/credit', { tx: buyTx });
  check('a fresh purchase waits for blocks on top', r.status === 200 && r.body.waiting === true && r.body.left === 1, r.body);
  check('another wallet cannot take the purchase', (await b('/api/sqk/credit', { tx: buyTx })).status === 403);
  await mine(1);
  r = await a('/api/sqk/credit', { tx: buyTx });
  check('with enough blocks the chest arrives', r.status === 200 && r.body.fresh === true && r.body.state.sqk.box === 1, r.body);
  r = await a('/api/sqk/credit', { tx: buyTx });
  check('the same purchase sent again gives nothing more', r.status === 200 && r.body.fresh === false && r.body.state.sqk.box === 1, r.body);
  me = await a('/api/sqk/me');
  check('the page sees the purchase and that it was counted', me.body.bought === true && me.body.counted === true);
  check('the balance then shows the price paid', BigInt((await a('/api/sqk/balance')).body.balance) === BigInt(ab.body.balance) - SQ(10));
  const failTx = await send(A, shop, 'buyChest', [SQ(10)], 300000n).catch(e => e);
  let failHash = typeof failTx === 'string' ? failTx : null;
  if (!failHash) { const blk = await pub.getBlock({ includeTransactions: true }); failHash = blk.transactions.length ? blk.transactions[blk.transactions.length - 1].hash : null; }
  await mine(2);
  const rf = failHash ? await a('/api/sqk/credit', { tx: failHash }) : { status: 0 };
  check('a purchase that failed on the chain gives nothing', rf.status === 409 && /failed/.test(rf.body.error || ''), rf.body);
  check('an unknown transaction waits instead of failing', (await a('/api/sqk/credit', { tx: '0x' + 'ab'.repeat(32) })).body.waiting === true);

  console.log('Opening it');
  const o = await act(a, 'sqkchest');
  const x = o.body.results && o.body.results[0];
  check('an SQK Chest opens into chests, food, bags, gear and a pet', o.status === 200 && x && x.kind === 'sqk' && x.chests.reduce((s, n) => s + n, 0) >= 4 && x.food.length >= 6 && x.bags.length >= 1 && x.gear.length >= 3 && x.pet, x);
  check('the chests land in the inventory and the box is empty', o.body.state.sqk.box === 0 && o.body.state.chests.reduce((s, n) => s + n, 0) === x.chests.reduce((s, n) => s + n, 0));
  check('with no chest left nothing opens', (await act(a, 'sqkchest')).status === 400);

  console.log('A purchase the page never reported');
  await send(C, token, 'approve', [info.shop, SQ(10)]);await send(C, shop, 'buyChest', [SQ(10)]);await mine(3);
  r = await c('/api/sqk/scan', {});
  check('a search finds it and gives the chest', r.status === 200 && r.body.found === 1 && r.body.state.sqk.box === 1, r.body);
  r = await c('/api/sqk/scan', {});
  check('a second search gives nothing more', r.status === 200 && r.body.found === 0 && r.body.state.sqk.box === 1, r.body);

  console.log('Pouches from boss floors');
  for (let i = 0; i < 90; i++) { const R = await a('/api/rounds'); if (R.body.rounds && R.body.rounds.length >= 40) break; await new Promise(z => setTimeout(z, 2000)); }
  await a('/api/dev', { op: 'jump', n: 9 });
  r = await win(a, 1);
  check('a win below the first boss floor gives no pouch', r.status === 200 && r.body.over === 'win' && !r.body.res.pouches, r.body.res);
  r = await win(a, 10);
  check('clearing the floor 10 boss gives a pouch', r.status === 200 && r.body.over === 'win' && JSON.stringify(r.body.res.pouches) === '[10]' && JSON.stringify(r.body.state.sqk.pouch) === '[10]', r.body.res || r.body);
  r = await win(a, 10);
  check('beating it again gives no second pouch', r.status === 200 && r.body.over === 'win' && !r.body.res.pouches, r.body.res);
  await a('/api/dev', { op: 'jump', n: 31 });
  r = await win(a, 1);
  check('boss floors passed before pouches existed pay on the next win', r.status === 200 && JSON.stringify(r.body.res.pouches) === '[20,30]', r.body.res);
  await d('/api/dev', { op: 'jump', n: 21 });
  r = await win(d, 1);
  check('a dev wallet gets no pouch', r.status === 200 && r.body.over === 'win' && !r.body.res.pouches && r.body.state.sqk.boss === 20, r.body.res);
  check('a dev wallet cannot claim', (await d('/api/sqk/claim', {})).status === 403);
  await g('/api/dev', { op: 'jump', n: 11 });
  r = await win(g, 1);
  check('a guest gets no pouch', r.status === 200 && r.body.over === 'win' && !r.body.res.pouches, r.body.res);
  const gl = await signIn(g, GU);
  r = await win(g, 1);
  check('once the guest signs in with a wallet, its boss floor pays', gl.body.linked === true && JSON.stringify(r.body.res && r.body.res.pouches) === '[10]', r.body.res);
  const p1 = await act(a, 'pouch', { n: 1 });
  const got = p1.body.results && p1.body.results[0];
  check('an opened pouch pays inside its band', p1.status === 200 && got.floor === 10 && got.amount >= E.pouchBand(10).a * E.SQK_UNIT && got.amount <= E.pouchBand(10).b * E.SQK_UNIT && p1.body.state.sqk.earned === got.amount, p1.body);
  const pAll = await act(a, 'pouch', { all: true });
  const earned = pAll.body.state.sqk.earned;
  check('open all opens the rest', pAll.status === 200 && pAll.body.results.length === 2 && pAll.body.state.sqk.pouch.length === 0 && earned === got.amount + pAll.body.results.reduce((s, y) => s + y.amount, 0));
  check('with no pouch left nothing opens', (await act(a, 'pouch', { n: 1 })).status === 400);

  console.log('Claiming');
  check('a wallet with nothing earned has nothing to claim', (await b('/api/sqk/claim', {})).status === 409);
  const want = BigInt(earned) * 10n ** 12n;
  let t = await a('/api/sqk/claim', {});
  check('the server signs the whole amount when the pool allows', t.status === 200 && t.body.total === want.toString() && t.body.amount === want.toString() && t.body.rest === '0' && t.body.contract === info.shop.toLowerCase(), t.body);
  const before = await bal(A.address);
  await send(A, shop, 'claim', [BigInt(t.body.total), BigInt(t.body.deadline), t.body.sig]);
  check('the contract pays it to the wallet', (await bal(A.address)) - before === want);
  me = await a('/api/sqk/me');
  check('the page then sees it as sent', me.body.claimed === want.toString() && me.body.earned === want.toString());
  check('there is nothing more to claim', (await a('/api/sqk/claim', {})).status === 409);

  console.log('The contract limits');
  const owner = info.owner;
  await act(c, 'sqkchest');await c('/api/dev', { op: 'sqk' });await act(c, 'pouch', { all: true });
  const cEarned = BigInt((await c('/api/sqk/me')).body.earned);
  await send(owner, shop, 'setLimits', [SQ(1), SQ(200)]);
  t = await c('/api/sqk/claim', {});
  check('a claim is cut to what one claim may pay, the rest waits', t.status === 200 && t.body.amount === SQ(1).toString() && BigInt(t.body.rest) === cEarned - SQ(1), t.body);
  await send(owner, shop, 'setPaused', [true]);
  check('a paused contract is reported', (await c('/api/sqk/claim', {})).status === 409);
  await send(owner, shop, 'setPaused', [false]);
  await send(owner, shop, 'setSigner', [owner]);
  check('a contract that trusts another key is reported', (await c('/api/sqk/claim', {})).status === 503);
  await send(owner, shop, 'setSigner', [SIGNER.address]);
  const pool = (await pub.readContract({ ...shop, functionName: 'status', args: [owner] })).pool;
  await send(owner, shop, 'withdraw', [SQK, owner, pool]);
  const empty = await c('/api/sqk/claim', {});
  check('an empty pool is reported', empty.status === 409 && /empty/.test(empty.body.error || ''), empty.body);

  console.log('The signer key');
  {
    const cfgPath = require.resolve('../lib/config'), keep = { k: process.env.SQK_SIGNER_KEY, s: process.env.SESSION_SECRET };
    const keyWith = (k, s) => { if (k === undefined) delete process.env.SQK_SIGNER_KEY; else process.env.SQK_SIGNER_KEY = k; if (s === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = s; delete require.cache[cfgPath]; return require('../lib/config').sqkSignerKey(); };
    const a1 = keyWith(undefined, 'secret one'), a2 = keyWith(undefined, 'secret one'), b1 = keyWith(undefined, 'secret two'), own = keyWith('0x' + '7'.repeat(64), 'secret one');
    check('without its own key the signer comes from the session secret, the same every time', /^0x[0-9a-f]{64}$/.test(a1) && a1 === a2 && a1 !== b1);
    check('its own key wins when set', own === '0x' + '7'.repeat(64));
    check('a broken key is ignored', keyWith('0x123', 'secret one') === a1);
    keyWith(keep.k, keep.s);
  }

  console.log('A new contract');
  {
    const SKm = require('../lib/sqk'), keep = process.env.SQK_SHOP, A1 = '0x' + 'a'.repeat(40), B1 = '0x' + 'b'.repeat(40), day = 20400;
    process.env.SQK_SHOP = A1;
    const G1 = { sqk: { box: 0, days: [day], pouch: [], boss: 0, earned: 0 } };
    SKm.forShop(G1);
    check('a save from before contracts were noted keeps what it counted', G1.sqk.shop === A1 && G1.sqk.days.join() === String(day) && E.creditSqkChest(G1, day) === false);
    process.env.SQK_SHOP = B1;
    SKm.forShop(G1);
    check('a new contract counts its own purchases from a clean start, so a chest bought from it the same day still arrives', G1.sqk.shop === B1 && G1.sqk.days.length === 0 && E.creditSqkChest(G1, day) === true && G1.sqk.box === 1);
    SKm.forShop(G1);
    check('and that contract keeps its count', G1.sqk.days.join() === String(day) && E.creditSqkChest(G1, day) === false && G1.sqk.box === 1);
    if (keep === undefined) delete process.env.SQK_SHOP; else process.env.SQK_SHOP = keep;
  }

  console.log('Dev wallets and SQK');
  {
    const cfgPath = require.resolve('../lib/config'), keep = { d: process.env.DEV_SQK, v: process.env.VERCEL_ENV };
    const devWith = (d, prod) => { if (d === undefined) delete process.env.DEV_SQK; else process.env.DEV_SQK = d; if (prod) process.env.VERCEL_ENV = 'production'; else delete process.env.VERCEL_ENV; delete require.cache[cfgPath]; return require('../lib/config').devSqk(); };
    check('on a computer a dev wallet may claim SQK unless DEV_SQK=0', devWith(undefined, false) === true && devWith('0', false) === false && devWith('1', false) === true);
    check('on the live site only DEV_SQK=1 lets it', devWith(undefined, true) === false && devWith('0', true) === false && devWith('1', true) === true);
    if (keep.d === undefined) delete process.env.DEV_SQK; else process.env.DEV_SQK = keep.d;
    if (keep.v === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = keep.v;
    delete require.cache[cfgPath];
  }

  console.log('The page code');
  const page = fs.readFileSync(require('path').join(__dirname, '..', 'client', 'sqk.js'), 'utf8');
  const sel = { approve: 'approve(address,uint256)', allowance: 'allowance(address,address)', balanceOf: 'balanceOf(address)', buyChest: 'buyChest(uint256)', claim: 'claim(uint256,uint256,bytes)' };
  check('the page calls the contract with the right selectors', Object.entries(sel).every(([k, s]) => page.includes(`${k}:'${v.toFunctionSelector(s)}'`)));
  const enc = v.encodeFunctionData({ abi: ART.abi, functionName: 'claim', args: [123n, 456n, t.body.sig || '0x' + '11'.repeat(65)] });
  const vm = require('vm'), ctx = { BigInt };vm.createContext(ctx);
  vm.runInContext(page + ';this.f=skEncClaim;', ctx);
  check('the page encodes a claim the same way as the ABI', ctx.f(123n, 456n, t.body.sig || '0x' + '11'.repeat(65)) === enc);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.log('FAIL crashed:', e && (e.shortMessage || e.message)); process.exit(1); });
