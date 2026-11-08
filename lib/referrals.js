// INVITES: a wallet shares a code, a new wallet joins with it, and when the new one climbs to floor REF.floor both are paid.
// The code is the player's id with a short check made from the server's secret, so nobody can guess another player's. Who invited
// whom is one row in referrals. The payment is written in the payer's own save in the same step that pays it (gifts.refPaid for the
// ids a referrer was paid for, gifts.refGot for an invited player), so nothing pays twice, however often it is asked.
const crypto = require('crypto');
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { q } = require('./db');
const { withPlayer } = require('./players');
const { HttpError } = require('./http');

const check = id => crypto.createHmac('sha256', cfg.secret()).update('ref:' + id).digest('hex').slice(0, 4);
const codeOf = id => Number(id).toString(36) + check(id);
function idOf(code) {
  const m = /^([0-9a-z]{1,10})([0-9a-f]{4})$/.exec(String(code || '').trim().toLowerCase());
  if (!m) return null;
  const id = parseInt(m[1], 36);
  return Number.isSafeInteger(id) && id > 0 && check(id) === m[2] ? id : null;
}
const isDev = wallet => !!wallet && cfg.testWallets().includes(wallet);

/* a new wallet that has not climbed yet joins with a code, once */
async function use(pid, code) {
  const me = (await q('SELECT wallet, top FROM players WHERE id = $1', [pid])).rows[0];
  if (!me || !me.wallet) throw new HttpError(400, 'Sign in with a wallet to use an invite code');
  if (isDev(me.wallet)) throw new HttpError(400, 'A dev wallet cannot use an invite code');
  if (me.top > 0) throw new HttpError(400, 'Invite codes are for new players who have not cleared a floor yet');
  const id = idOf(code);
  if (!id) throw new HttpError(400, 'That invite code is not right');
  if (id === pid) throw new HttpError(400, 'You cannot use your own invite code');
  const from = (await q('SELECT wallet FROM players WHERE id = $1', [id])).rows[0];
  if (!from || !from.wallet || isDev(from.wallet)) throw new HttpError(400, 'That invite code is not right');
  const r = await q('INSERT INTO referrals (referee_id, referrer_id) VALUES ($1, $2) ON CONFLICT (referee_id) DO NOTHING RETURNING 1', [pid, id]);
  if (!r.rowCount) throw new HttpError(409, 'You already joined with an invite code');
  return { ok: true, floor: E.REF.floor, reward: E.REF.referee };
}

async function mine(pid) {
  const row = (await q('SELECT wallet, top, gifts FROM players WHERE id = $1', [pid])).rows[0];
  if (!row) throw new HttpError(404, 'Unknown player');
  const g = row.gifts && typeof row.gifts === 'object' ? row.gifts : {};
  const paid = Array.isArray(g.refPaid) ? g.refPaid.map(Number) : [];
  const out = { wallet: !!row.wallet && !isDev(row.wallet), code: codeOf(pid), floor: E.REF.floor, cap: E.REF.cap, referrer: E.REF.referrer, referee: E.REF.referee, friends: 0, reached: 0, paid: paid.length, claimable: 0, joined: false, got: !!g.refGot, mine: 0 };
  if (!out.wallet) return out;
  const list = (await q('SELECT r.referee_id AS id, p.top FROM referrals r JOIN players p ON p.id = r.referee_id WHERE r.referrer_id = $1', [pid])).rows;
  out.friends = list.length;
  out.reached = list.filter(x => x.top >= E.REF.floor).length;
  out.claimable = Math.max(0, Math.min(list.filter(x => x.top >= E.REF.floor && !paid.includes(Number(x.id))).length, E.REF.cap - paid.length));
  const inv = (await q('SELECT p.top FROM referrals r JOIN players p ON p.id = r.referrer_id WHERE r.referee_id = $1', [pid])).rows[0];
  if (inv) { out.joined = true; out.mine = row.top; if (row.top >= E.REF.floor && !g.refGot) out.claimable += 1; }
  return out;
}

/* pays what is due to this player: for each invited friend who reached the floor, and for the player's own invite */
async function claim(pid) {
  const row = (await q('SELECT wallet FROM players WHERE id = $1', [pid])).rows[0];
  if (!row || !row.wallet || isDev(row.wallet)) return { paid: 0, got: null };
  const list = (await q('SELECT r.referee_id AS id FROM referrals r JOIN players p ON p.id = r.referee_id WHERE r.referrer_id = $1 AND p.top >= $2 ORDER BY r.at', [pid, E.REF.floor])).rows.map(x => Number(x.id));
  const inv = (await q('SELECT 1 FROM referrals r JOIN players p ON p.id = r.referee_id WHERE r.referee_id = $1 AND p.top >= $2', [pid, E.REF.floor])).rowCount > 0;
  if (!list.length && !inv) return { paid: 0, got: null };
  return withPlayer(pid, null, G => {
    const gi = G.gifts && typeof G.gifts === 'object' ? G.gifts : (G.gifts = {});
    if (!Array.isArray(gi.refPaid)) gi.refPaid = [];
    let paid = 0, coins = 0, chests = 0, got = null;
    for (const id of list) {
      if (gi.refPaid.includes(id) || gi.refPaid.length >= E.REF.cap) continue;
      gi.refPaid.push(id);
      const r = E.refPay(G, E.REF.referrer);paid++;coins += r.coins;chests += r.n;
    }
    if (inv && !gi.refGot) { gi.refGot = true; got = E.refPay(G, E.REF.referee); }
    return { paid, coins, chests, got };
  });
}

module.exports = { use, mine, claim, codeOf, idOf };
