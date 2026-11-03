// Who may use the test panel on the live site.
// Start a server on an empty database with ALLOW_TRIAL=0 ALLOW_GUEST=1 and TEST_WALLETS set to the address of a throwaway key, then:
// TESTER_KEY=0x... node tests/testers.test.js [baseUrl]
const BASE = process.argv[2] || 'http://localhost:3000';
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra ? ' -> ' + JSON.stringify(extra).slice(0, 200) : '')); } };
function client() {
  let cookie = '';
  return async (path, body) => {
    const r = await fetch(BASE + path, { method: body === undefined ? 'GET' : 'POST', headers: Object.assign({ 'content-type': 'application/json' }, cookie ? { cookie } : {}), body: body === undefined ? undefined : JSON.stringify(body) });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let j = {};try { j = await r.json(); } catch (e) {}
    return { status: r.status, body: j };
  };
}
async function signIn(account) {
  const c = client();
  const n = await c('/api/auth/nonce', { address: account.address });
  await c('/api/auth/verify', { ticket: n.body.ticket, signature: await account.signMessage({ message: n.body.message }) });
  return c;
}
const refused = async c => {
  const before = (await c('/api/me')).body.state.coins;
  const out = [];
  for (const body of [{ op: 'coins' }, { op: 'chests' }, { op: 'food' }, { op: 'pets' }, { op: 'sweep' }, { op: 'jump', n: 50 }, { op: 'wipe' }]) out.push((await c('/api/dev', body)).status);
  const after = (await c('/api/me')).body.state;
  return out.every(s => s === 403) && after.coins === before && after.top === 0;
};
(async () => {
  const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts');
  const tester = privateKeyToAccount(process.env.TESTER_KEY), other = privateKeyToAccount(generatePrivateKey());
  const config = await (await fetch(BASE + '/api/config')).json();
  check('this server gives the panel to nobody by default', !('trial' in config), config);
  const anon = client();
  check('no session cannot use the panel', (await anon('/api/dev', { op: 'coins' })).status === 401);
  const guest = client();await guest('/api/auth/guest', {});
  check('a guest is not told it has the panel', (await guest('/api/me')).body.player.trial === false);
  check('a guest is refused every test action and nothing changes', await refused(guest));
  const stranger = await signIn(other);
  const meOther = await stranger('/api/me');
  check('another wallet is not told it has the panel', meOther.body.player.trial === false && !!meOther.body.player.wallet, meOther.body.player);
  check('another wallet is refused every test action and nothing changes', await refused(stranger));
  const t = await signIn(tester);
  const meT = await t('/api/me');
  check('the test wallet is told it has the panel', meT.body.player.trial === true && meT.body.player.wallet === tester.address.toLowerCase(), meT.body.player);
  const c0 = meT.body.state.coins;
  const added = await t('/api/dev', { op: 'coins' });
  check('the test wallet can add coins', added.status === 200 && added.body.state.coins === c0 + 10000, added.body);
  const jumped = await t('/api/dev', { op: 'jump', n: 20 });
  check('the test wallet can jump floors', jumped.status === 200 && jumped.body.state.top === 20, jumped.body.state && jumped.body.state.top);
  const rankT = await t('/api/rank');
  check('the test wallet is told it is not ranked', rankT.body.rank === null && rankT.body.test === true, rankT.body);
  const rival = await signIn(privateKeyToAccount(generatePrivateKey()));
  const st = await rival('/api/fight/start', { floor: 1 });
  let B = st.body.B, tok = st.body.token;
  while (!B.over) {
    await new Promise(r => setTimeout(r, st.body.minMs + 30));
    const plan = {};B.units.filter(u => u.side === 'p' && u.alive).forEach(u => { plan[u.id] = { i: 0, target: null }; });
    const r = await rival('/api/fight/turn', { token: tok, plan });B = r.body.B;tok = r.body.token;
  }
  const rivalMe = (await rival('/api/me')).body;
  check('a normal wallet below it on floors still ranks first', (await rival('/api/rank')).body.rank === 1 && rivalMe.state.top === 1);
  if (process.env.DATABASE_URL) {
    const daily = require('../lib/daily'), { q } = require('../lib/db'), day = new Date().toISOString().slice(0, 10);
    await fetch(BASE + '/api/daily');
    await q('INSERT INTO daily_scores (day, player_id, tries) VALUES ($1, $2, 1)', [day, meT.body.player.id]);await daily.saveBest(day, meT.body.player.id, 7, 50);
    const myDay = (await t('/api/daily/me')).body;
    check('it keeps its score but gets no rank number', myDay.best.rounds === 7 && myDay.rank === null, myDay);
    const past = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10), rivalId = rivalMe.player.id;
    await q('INSERT INTO daily_scores (day, player_id, tries, rounds, hp, at) VALUES ($1, $2, 1, 2, 100, now()), ($1, $3, 1, 5, 50, now())', [past, meT.body.player.id, rivalId]);
    const testerPrize = await t('/api/daily/claim', {}), rivalPrize = await rival('/api/daily/claim', {});
    check('a test wallet gets no rewards, even with the best score', testerPrize.body.prizes.length === 0 && (await t('/api/daily/me')).body.unclaimed === false, testerPrize.body);
    check('and takes no place from the wallet below it, which ranks first', rivalPrize.body.prizes.length === 1 && rivalPrize.body.prizes[0].rank === 1 && rivalPrize.body.prizes[0].chest === 4, rivalPrize.body);
  }
  await new Promise(r => setTimeout(r, 31000));
  if (process.env.DATABASE_URL) {
    const pub = await (await fetch(BASE + '/api/daily')).json();
    check('on the challenge board it shows only as Dev too', pub.devs.length === 1 && pub.devs[0].name === 'Dev' && pub.devs[0].rounds === 7 && !pub.top.some(r => r.dev) && !JSON.stringify(pub).toLowerCase().includes(tester.address.toLowerCase()), pub.devs);
  }
  const board = await (await fetch(BASE + '/api/leaderboard')).json();
  check('the board ranks the normal wallet and not the test wallet', board.top.some(r => r.name === rivalMe.player.name) && !board.top.some(r => r.dev), board.top);
  check('the test wallet shows only as Dev, with its floor and no rank', board.devs.length === 1 && board.devs[0].name === 'Dev' && board.devs[0].dev === true && board.devs[0].top === 20 && !('rank' in board.devs[0]), board.devs);
  const leaks = async path => (await (await fetch(BASE + path)).text()).toLowerCase().includes(tester.address.toLowerCase());
  check('its address is not in the leaderboard answer', !await leaks('/api/leaderboard'));
  const pageT = await (await fetch(BASE + '/api/player?id=' + meT.body.player.id)).json();
  check('its public page shows Dev, no rank and no address', pageT.top === 20 && pageT.rank === null && pageT.name === 'Dev' && pageT.dev === true && !await leaks('/api/player?id=' + meT.body.player.id), pageT);
  check('its own session still knows its address', (await t('/api/me')).body.player.wallet === tester.address.toLowerCase());
  const ds = await t('/api/dev', { op: 'daily' });
  check('the test wallet can reset the challenge', ds.status === 200);
  check('nobody else can', (await rival('/api/dev', { op: 'daily' })).status === 403);
  const wiped = await t('/api/dev', { op: 'wipe' });
  check('the test wallet can erase its own data', wiped.status === 200 && wiped.body.state.top === 0 && wiped.body.state.coins === 0);
  check('the other wallet was not touched by any of this', (await stranger('/api/me')).body.state.coins === 0);
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('Test run failed:', e); process.exit(1); });
