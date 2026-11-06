// SQK on the chain. The SQK Chest is bought from the game's contract, contracts/src/HamsterTowerSQK.sol, which burns half of the price
// and sends half to the treasury. The contract sells one a UTC day to each wallet, and this server gives the chest once the purchase
// has a few blocks on top of it. The SQK that boss floor pouches give is claimed from the same contract: this server signs the wallet's
// running total and the contract pays what was not paid yet, within the limits its owner set.
const cfg = require('./config');
const { HttpError, bad } = require('./http');
const E = require('./engine.generated.cjs');
const { withPlayer } = require('./players');

let V = null, A = null;
const viem = async () => V || (V = await import('viem'));
const ABI_TEXT = [
  'struct Status { uint256 price; bool isPaused; bool boughtToday; uint256 claimedTotal; uint256 pool; uint256 leftToday; uint256 maxClaim; address signer; address treasury; }',
  'function status(address wallet) view returns (Status)',
  'event ChestBought(address indexed buyer, uint256 indexed day, uint256 price, uint256 burned, uint256 toTreasury)',
];
async function abi() { if (!A) A = (await viem()).parseAbi(ABI_TEXT); return A; }
const TYPES = { Claim: [{ name: 'wallet', type: 'address' }, { name: 'total', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] };
const WEI = 10n ** 12n, TX = /^0x[0-9a-f]{64}$/, SCAN_BLOCKS = 21600, SCAN_STEP = 5000, KEEP_DAYS = 30;
const on = () => !!cfg.sqkShop();

async function rpc(method, params) {
  let last;
  for (const url of cfg.sqkRpcs()) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(15000) });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message || 'RPC error');
      return j.result;
    } catch (e) { last = e; }
  }
  throw last || new Error('Could not reach any RPC');
}
const chainDown = () => new HttpError(503, 'Could not read the chain right now, please try again');
function need(row) {
  if (!on()) throw new HttpError(409, 'The SQK Chest is not open yet');
  if (!row.wallet) throw new HttpError(403, 'Sign in with a wallet to use SQK');
}

/* what the contract says about one wallet, read at the newest block */
async function status(wallet) {
  const v = await viem(), a = await abi();
  const data = v.encodeFunctionData({ abi: a, functionName: 'status', args: [wallet || '0x0000000000000000000000000000000000000000'] });
  let r;
  try { r = await rpc('eth_call', [{ to: cfg.sqkShop(), data }, 'latest']); } catch (e) { throw chainDown(); }
  return v.decodeFunctionResult({ abi: a, functionName: 'status', data: r });
}
const S = { at: 0, v: null };
/* the shop as anyone sees it, kept for half a minute */
async function shop() {
  if (!on()) return { on: false };
  if (Date.now() - S.at > 30000 || !S.v) {
    const st = await status(null);
    S.v = { on: true, contract: cfg.sqkShop(), token: cfg.sqkToken(), chain: cfg.sqkChainId(), price: st.price.toString(), paused: st.isPaused, pool: st.pool.toString(), leftToday: st.leftToday.toString(), maxClaim: st.maxClaim.toString(), treasury: st.treasury.toLowerCase(), confirmations: cfg.sqkConfirmations() };
    S.at = Date.now();
  }
  return S.v;
}
const today = () => Math.floor(Date.now() / 864e5);
/* the days already counted belong to one contract. A new contract sells one chest a day afresh, so a player who bought from the old
   one that day still gets the chest bought from the new one. Purchases from the old contract can never be counted again, they are not its logs */
function forShop(G) {
  const s = E.sqkOf(G);
  /* a save from before contracts were noted takes the current one as its own, so nothing it counted can pay again */
  if (s.shop === undefined) s.shop = cfg.sqkShop();
  else if (s.shop !== cfg.sqkShop()) { s.days = []; s.shop = cfg.sqkShop(); }
  return G;
}
/* one wallet: whether it bought today, what it was paid, and what the game says it earned */
async function mine(row, G) {
  if (!on()) return { on: false };
  const st = row.wallet ? await status(row.wallet) : null, q = E.sqkOf(G);
  return Object.assign(await shop(), {
    wallet: row.wallet || null,
    bought: st ? st.boughtToday : false,
    counted: (q.shop === undefined || q.shop === cfg.sqkShop()) && q.days.includes(today()),
    claimed: st ? st.claimedTotal.toString() : '0',
    earned: (BigInt(q.earned) * WEI).toString(),
  });
}

/* the SQK this wallet holds, read from the token at the newest block. It needs no contract of the game, so it works before the shop opens */
async function balance(row) {
  if (!row.wallet) return { wallet: null, balance: null };
  let r;
  try { r = await rpc('eth_call', [{ to: cfg.sqkToken(), data: '0x70a08231' + row.wallet.slice(2).padStart(64, '0') }, 'latest']); } catch (e) { throw chainDown(); }
  return { wallet: row.wallet, balance: BigInt(r).toString() };
}

/* a purchase gives its chest once it has enough blocks on top. The same purchase sent again gets the same answer */
async function credit(pid, row, tx) {
  need(row);
  const hash = String(tx || '').toLowerCase();
  if (!TX.test(hash)) bad('Invalid transaction');
  const v = await viem(), a = await abi();
  let r, head;
  try { [r, head] = await Promise.all([rpc('eth_getTransactionReceipt', [hash]), rpc('eth_blockNumber', [])]); } catch (e) { throw chainDown(); }
  const want = cfg.sqkConfirmations();
  if (!r) return { waiting: true, left: want };
  if (r.status !== '0x1') throw new HttpError(409, 'This transaction failed on the chain, so nothing was bought');
  const topic = v.toEventSelector(a.find(x => x.name === 'ChestBought'));
  const log = (r.logs || []).find(l => String(l.address).toLowerCase() === cfg.sqkShop() && l.topics && l.topics[0] === topic);
  if (!log) bad('This transaction did not buy an SQK Chest');
  const ev = v.decodeEventLog({ abi: a, data: log.data, topics: log.topics });
  if (ev.args.buyer.toLowerCase() !== row.wallet) throw new HttpError(403, 'This chest was bought by another wallet');
  const have = parseInt(head, 16) - parseInt(r.blockNumber, 16) + 1;
  if (have < want) return { waiting: true, left: want - have };
  const day = Number(ev.args.day);
  if (day < today() - KEEP_DAYS) bad('This purchase is too old to count');
  const out = await withPlayer(pid, null, G => ({ fresh: E.creditSqkChest(forShop(G), day) }));
  return Object.assign(out, { day });
}

/* the page lost track of a purchase, for example it was closed while the transaction waited. Reads this wallet's purchases of the last few days */
async function scan(pid, row) {
  need(row);
  const v = await viem(), a = await abi();
  const topic = v.toEventSelector(a.find(x => x.name === 'ChestBought')), who = '0x' + row.wallet.slice(2).padStart(64, '0');
  const days = [];
  try {
    const head = parseInt(await rpc('eth_blockNumber', []), 16), to = head - cfg.sqkConfirmations() + 1;
    for (let from = Math.max(cfg.sqkFromBlock(), to - SCAN_BLOCKS); from <= to; from += SCAN_STEP) {
      const logs = await rpc('eth_getLogs', [{ address: cfg.sqkShop(), topics: [topic, who], fromBlock: '0x' + from.toString(16), toBlock: '0x' + Math.min(to, from + SCAN_STEP - 1).toString(16) }]);
      for (const l of logs) { const ev = v.decodeEventLog({ abi: a, data: l.data, topics: l.topics }); days.push(Number(ev.args.day)); }
    }
  } catch (e) { throw chainDown(); }
  const ok = days.filter(d => d >= today() - KEEP_DAYS);
  const out = await withPlayer(pid, null, G => { forShop(G); return { found: ok.filter(d => E.creditSqkChest(G, d)).length }; });
  return out;
}

/* a signed total the wallet takes to the contract. It is cut to what the contract can pay right now, the rest waits for later */
async function claimTicket(row, G, test) {
  need(row);
  if (test && !cfg.devSqk()) throw new HttpError(403, 'A dev wallet does not earn SQK here');
  const key = cfg.sqkSignerKey();
  if (!key) throw new HttpError(503, 'SQK rewards are not set up yet');
  const { privateKeyToAccount } = await import('viem/accounts');
  const acct = privateKeyToAccount(key), st = await status(row.wallet);
  if (st.signer.toLowerCase() !== acct.address.toLowerCase()) throw new HttpError(503, 'The reward contract does not trust this server yet');
  if (st.isPaused) throw new HttpError(409, 'SQK rewards are paused right now');
  const earned = BigInt(E.sqkOf(G).earned) * WEI, owed = earned - st.claimedTotal;
  if (owed <= 0n) throw new HttpError(409, 'Nothing to claim yet. Open your SQK pouches first');
  if (st.pool === 0n) throw new HttpError(409, 'The reward pool is empty right now, please try again later');
  if (st.leftToday === 0n) throw new HttpError(409, 'Today\'s SQK rewards are all paid out, please try again after 00:00 UTC');
  let amount = owed;
  for (const cap of [st.maxClaim, st.leftToday, st.pool]) if (cap < amount) amount = cap;
  if (amount <= 0n) throw new HttpError(409, 'Nothing can be paid right now, please try again later');
  const total = st.claimedTotal + amount, deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  const sig = await acct.signTypedData({ domain: { name: 'Hamster Tower SQK', version: '1', chainId: cfg.sqkChainId(), verifyingContract: cfg.sqkShop() }, types: TYPES, primaryType: 'Claim', message: { wallet: row.wallet, total, deadline } });
  return { contract: cfg.sqkShop(), chain: cfg.sqkChainId(), total: total.toString(), deadline: deadline.toString(), sig, amount: amount.toString(), rest: (owed - amount).toString() };
}

/* the address of the key that signs claims, so anyone can compare it with the one the contract trusts */
async function signerAddress() {
  const key = cfg.sqkSignerKey();
  if (!key) return null;
  const { privateKeyToAccount } = await import('viem/accounts');
  return privateKeyToAccount(key).address.toLowerCase();
}

/* pouches are for wallets only. A dev wallet can jump floors, so it earns none and its floors are marked as paid, unless DEV_SQK lets it test claims */
function pouchesFor(G, row, test) {
  if (!on() || !row.wallet) return [];
  if (test && !cfg.devSqk()) { const q = E.sqkOf(G); q.boss = Math.max(q.boss, Math.floor(G.top / 10) * 10); return []; }
  return E.grantPouches(G);
}
module.exports = { on, shop, mine, balance, forShop, credit, scan, claimTicket, signerAddress, pouchesFor, status };
