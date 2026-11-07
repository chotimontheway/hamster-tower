// Quests. Daily quests are made from the player's floor each UTC day and sit in the save with their progress, see shared/core.js.
// Social quests are written by the dev wallet and kept in social_quests. A player connects their X account with X's own sign in, and a
// claim reads that account through the X API: it must show the follow, like, repost, reply or post the quest asks for, see lib/xapi.js.
const cfg = require('./config');
const XA = require('./xapi');
const { q } = require('./db');
const { HttpError, bad } = require('./http');
const E = require('./engine.generated.cjs');
const { withPlayer, loadRow, toG, publicState } = require('./players');
const SK = require('./sqk');
const TW = require('./tpweek');

const OPEN_MS = 6000, MAX_SOCIAL = 60;
const isDev = row => !!row.wallet && cfg.testWallets().includes(row.wallet);
const ctxOf = (row, max) => { const day = E.dayKey(Date.now()); return { day, seed: row.id + ':' + day, max }; };
/* SQK is for wallets only. A dev wallet can jump floors, so it earns none unless DEV_SQK lets it test claims */
const canSqk = row => SK.on() && !!row.wallet && (!isDev(row) || cfg.devSqk());
const secsToReset = () => { const n = new Date(); return Math.ceil((Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime()) / 1000); };

/* the social quests running right now, kept for half a minute */
const S = { at: 0, rows: [] };
const rowOut = r => ({ id: r.id, kind: r.kind, title: r.title, url: r.url, need: r.need ? r.need.split(' ').filter(Boolean) : [], tp: r.tp, sqkP: Number(r.sqk_p), sqkMax: Number(r.sqk_max), ends: r.ends_at ? Math.floor(r.ends_at.getTime() / 1000) : null });
async function social() {
  if (Date.now() - S.at > 30000) {
    const r = await q('SELECT * FROM social_quests WHERE active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()) ORDER BY id DESC LIMIT $1', [MAX_SOCIAL]);
    S.rows = r.rows.map(rowOut);S.at = Date.now();
  }
  return S.rows;
}

/* the page's view of quests. Today's list is made once and saved, after that reading it writes nothing */
async function mine(pid, max) {
  let row = await loadRow(pid), G = toG(row), state = null;
  if (E.questOf(G).day !== E.dayKey(Date.now())) { state = (await withPlayer(pid, null, (G2, r2) => { E.ensureQuests(G2, ctxOf(r2, max)); })).state; row = await loadRow(pid); G = toG(row); }
  const on = cfg.socialQuests();
  return { state: state || publicState(G, false), social: on ? await social() : [], socialOn: on, x: on ? await XA.linkOf(pid) : null, xReady: XA.ready(), reset: secsToReset(), sqk: canSqk(row), dev: isDev(row) };
}
async function claim(pid, max, i) {
  const out = await withPlayer(pid, null, (G, row) => {
    const r = E.claimQuest(G, ctxOf(row, max), Math.floor(Number(i)), canSqk(row));
    if (!r) bad('This milestone is not reached yet or was already claimed');
    return { got: r };
  });
  /* the TP counts on this week's board too */
  await TW.addTp(pid, out.got && out.got.tp);
  return out;
}
/* a finished quest's own TP, claimed on the Quests screen */
async function take(pid, max, i) {
  const out = await withPlayer(pid, null, (G, row) => {
    const r = E.claimQuestTp(G, ctxOf(row, max), Math.floor(Number(i)));
    if (!r) bad('This quest is not finished yet or was already claimed');
    return { got: r };
  });
  await TW.addTp(pid, out.got && out.got.tp);
  return out;
}
async function swap(pid, max, i) {
  return withPlayer(pid, null, (G, row) => {
    const x = E.swapQuest(G, ctxOf(row, max), Math.floor(Number(i)));
    if (!x) bad('Only one unfinished quest a day can be swapped');
    return { swapped: x };
  });
}
/* social quests stay closed to players until SOCIAL_QUESTS=1. The admin screen still works, so quests can be written ahead */
const SOON = () => { if (!cfg.socialQuests()) throw new HttpError(409, 'Social quests are coming soon'); };
/* opening a quest's link starts its clock, and a check on X only looks at what came after it */
async function open(pid, id) {
  SOON();
  const quest = (await social()).find(x => x.id === Math.floor(Number(id)));
  if (!quest) throw new HttpError(404, 'This quest is over');
  return withPlayer(pid, null, G => {
    const Q = E.questOf(G);
    if (Q.sd.includes(quest.id)) return {};
    const day = Date.now() - 864e5;
    for (const k of Object.keys(Q.so)) if (Q.so[k] < day) delete Q.so[k];
    if (!Q.so[quest.id]) Q.so[quest.id] = Date.now();
  });
}

/* admin links are kept in one form */
const TWEET = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})(?:[/?#].*)?$/;
const proofOf = id => 'https://x.com/i/status/' + id;
/* a claim: the player's connected X account must show the follow, like, repost, reply or post, read through the X API (lib/xapi.js).
   One X account does each quest once, whichever player it is connected to, and one post pays once */
async function done(pid, body) {
  SOON();
  const quest = (await social()).find(x => x.id === Math.floor(Number(body.id)));
  if (!quest) throw new HttpError(404, 'This quest is over');
  if (!XA.ready()) throw new HttpError(503, 'Checking on X is not set up yet');
  const row0 = await loadRow(pid), Q0 = E.questOf(toG(row0));
  if (Q0.sd.includes(quest.id)) bad('You already did this quest');
  if (!Q0.so[quest.id] || Date.now() - Q0.so[quest.id] < OPEN_MS) bad('Open it on X first, then come back');
  const me = await XA.tokenFor(pid);
  if ((await q('SELECT 1 FROM social_done WHERE quest_id = $1 AND x_id = $2', [quest.id, me.id])).rowCount) bad(`@${me.username} already did this quest`);
  const free = async id => !(await q('SELECT 1 FROM social_done WHERE proof = $1', [proofOf(id)])).rowCount;
  const found = await XA.check(quest, me, Q0.so[quest.id], free);
  if (!found.ok) bad(found.why);
  const proof = found.post ? proofOf(found.post) : null;
  /* the record is written before the reward, so neither the same quest nor the same post can pay twice, even when sent at the same moment */
  const mark = await q('INSERT INTO social_done (quest_id, player_id, proof, tp, sqk, x_id) VALUES ($1, $2, $3, $4, 0, $5) ON CONFLICT DO NOTHING RETURNING 1', [quest.id, pid, proof, quest.tp, me.id]);
  if (!mark.rowCount) {
    const mine = (await q('SELECT 1 FROM social_done WHERE quest_id = $1 AND player_id = $2', [quest.id, pid])).rowCount;
    bad(mine ? 'You already did this quest' : proof && !(await free(found.post)) ? 'This post was already used for a quest' : `@${me.username} already did this quest`);
  }
  let got = null, out;
  try {
    out = await withPlayer(pid, null, (G, row) => {
      const Q = E.questOf(G);
      if (Q.sd.includes(quest.id)) bad('You already did this quest');
      got = E.socialReward(G, quest, canSqk(row));
      return { got };
    });
  } catch (e) {
    /* nothing was paid, so the record goes and the player may try again */
    if (!(e instanceof HttpError && /already did/.test(e.message))) await q('DELETE FROM social_done WHERE quest_id = $1 AND player_id = $2', [quest.id, pid]).catch(() => {});
    throw e;
  }
  await q('UPDATE social_done SET tp = $3, sqk = $4 WHERE quest_id = $1 AND player_id = $2', [quest.id, pid, got.tp, got.sqk]).catch(() => {});
  await TW.addTp(pid, got.tp);
  return out;
}

/* ADMIN: only a dev wallet. Everything written here is shown to every player, so it is checked as strictly as player input */
async function needDev(pid) {
  const row = await loadRow(pid);
  if (!isDev(row)) throw new HttpError(403, 'Only the dev wallet can manage quests');
  return row;
}
const xName = s => { const t = String(s || '').trim(); const m = /^(?:https:\/\/(?:www\.)?(?:x|twitter)\.com\/)?@?([A-Za-z0-9_]{1,15})\/?$/.exec(t); return m ? m[1] : null; };
function cleanQuest(b) {
  const kind = String(b.kind || '');
  if (!E.SOCIAL_KINDS[kind]) bad('Pick what the quest asks for');
  const title = String(b.title || '').trim().replace(/\s+/g, ' ');
  if (title.length < 3 || title.length > 90 || /[<>]/.test(title)) bad('Write a title of 3 to 90 characters, without < or >');
  let url = '';
  if (kind === 'follow') { const n = xName(b.url); if (!n) bad('Give the X account to follow, like @name or its link'); url = 'https://x.com/' + n; }
  else if (kind !== 'post') { const m = TWEET.exec(String(b.url || '').trim()); if (!m) bad('Give the link of the post on X'); url = `https://x.com/${m[1]}/status/${m[2]}`; }
  const need = String(b.need || '').trim().split(/[\s,]+/).filter(Boolean);
  if (kind === 'post' && !need.length) bad('A post quest needs at least one tag or hashtag, like @name #Hamster');
  if (need.some(t => !/^[@#][A-Za-z0-9_]{1,30}$/.test(t)) || need.length > 6) bad('Tags and hashtags look like @name or #word, at most 6');
  /* an empty field takes the task's usual TP and no SQK */
  const blank = x => x === undefined || x === null || x === '';
  const tp = blank(b.tp) ? E.SOCIAL_KINDS[kind].tp : Math.floor(Number(b.tp));
  if (!(tp >= 0 && tp <= 1000)) bad('TP must be 0 to 1,000');
  const p = blank(b.sqkP) ? 0 : Number(b.sqkP), max = blank(b.sqkMax) ? 0 : Number(b.sqkMax);
  if (!(p >= 0 && p <= 1)) bad('The SQK chance must be 0 to 100%');
  if (!(max >= 0 && max <= 100)) bad('The most SQK must be 0 to 100');
  const when = v => { if (v === null || v === undefined || v === '') return null; const t = Number(v); if (!Number.isFinite(t) || t < 1e9 || t > 4e9) bad('Invalid date'); return new Date(t * 1000); };
  const starts = when(b.starts), ends = when(b.ends);
  if (starts && ends && ends <= starts) bad('The end must come after the start');
  return { kind, title, url, need: need.join(' '), tp, p, max, starts, ends, active: b.active !== false };
}
async function adminList(pid) {
  await needDev(pid);
  const rows = (await q(`SELECT s.*, (SELECT count(*)::int FROM social_done d WHERE d.quest_id = s.id) AS done FROM social_quests s ORDER BY s.id DESC LIMIT 200`)).rows;
  const recent = (await q(`SELECT d.quest_id, d.proof, d.tp, d.sqk, extract(epoch FROM d.at)::bigint AS at, p.name, p.wallet FROM social_done d JOIN players p ON p.id = d.player_id ORDER BY d.at DESC LIMIT 40`)).rows;
  return {
    quests: rows.map(r => Object.assign(rowOut(r), { active: r.active, starts: r.starts_at ? Math.floor(r.starts_at.getTime() / 1000) : null, done: r.done })),
    recent: recent.map(r => ({ quest: r.quest_id, proof: r.proof, tp: r.tp, sqk: Number(r.sqk), at: Number(r.at), who: r.wallet || r.name })),
    defaults: { kinds: E.SOCIAL_KINDS, sqk: E.SOCIAL_SQK },
    socialOn: cfg.socialQuests(),
  };
}
async function adminSave(pid, b) {
  await needDev(pid);
  if (b.op === 'toggle') {
    const r = await q('UPDATE social_quests SET active = NOT active WHERE id = $1 RETURNING active', [Math.floor(Number(b.id))]);
    if (!r.rowCount) throw new HttpError(404, 'No such quest');
  } else if (b.op === 'delete') {
    const r = await q('DELETE FROM social_quests WHERE id = $1', [Math.floor(Number(b.id))]);
    if (!r.rowCount) throw new HttpError(404, 'No such quest');
  } else {
    const x = cleanQuest(b.quest || {});
    if (b.id) {
      const r = await q('UPDATE social_quests SET kind = $2, title = $3, url = $4, need = $5, tp = $6, sqk_p = $7, sqk_max = $8, starts_at = $9, ends_at = $10, active = $11 WHERE id = $1', [Math.floor(Number(b.id)), x.kind, x.title, x.url, x.need, x.tp, x.p, x.max, x.starts, x.ends, x.active]);
      if (!r.rowCount) throw new HttpError(404, 'No such quest');
    } else {
      const n = (await q('SELECT count(*)::int AS n FROM social_quests WHERE active')).rows[0].n;
      if (n >= MAX_SOCIAL) bad(`At most ${MAX_SOCIAL} social quests can run at once`);
      await q('INSERT INTO social_quests (kind, title, url, need, tp, sqk_p, sqk_max, starts_at, ends_at, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [x.kind, x.title, x.url, x.need, x.tp, x.p, x.max, x.starts, x.ends, x.active]);
    }
  }
  S.at = 0;
  return adminList(pid);
}
/* CONNECT X from the Quests tab. Closed with the rest of the social quests */
function connect(c) { SOON(); return XA.start(c); }
async function connected(req, query, pid) { SOON(); return XA.finish(req, query, pid); }
async function disconnectX(pid) { await XA.disconnect(pid); return { ok: true }; }
module.exports = { mine, claim, take, swap, open, done, adminList, adminSave, ctxOf, canSqk, connect, connected, disconnectX };
