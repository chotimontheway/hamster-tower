// Wins pay more for a while after the real hamster runs. This comes from the rounds already on the chain, so no page can claim it and no outside service can stop it.
const E = require('./engine.generated.cjs');
const ROUND = 600;
const minutes = () => process.env.LIVE_WINDOW_MIN === undefined ? E.LIVE_MINUTES : +process.env.LIVE_WINDOW_MIN;
/* floors are in order, so the last one is the newest round with work. t is when that round began */
function bonusOf(floors, nowSec) {
  const last = floors[floors.length - 1];
  if (!last) return { bonus: false, ran: null, until: 0 };
  const ran = Number(last.t), until = ran + ROUND + minutes() * 60;
  return { bonus: until > nowSec, ran, until };
}
/* the Arena opens 5 minutes after he starts and closes 5 minutes after he stops. Only a page can see that, because the wheel's API refuses this server's address, so the page keeps the clock (arenaRead in shared/core.js).
   The chain is the server's own check and no page can fake it, but it learns of a round only after the round ends. So it stays open long enough never to close on him while he runs, and the page's word is taken for the first minutes of a run, before any of it can be on the chain */
const holdMinutes = () => process.env.ARENA_WINDOW_MIN === undefined ? E.ARENA.holdMin : +process.env.ARENA_WINDOW_MIN;
function arenaGate(floors, nowSec) {
  const last = floors[floors.length - 1];
  if (!last) return { open: false, until: 0, end: 0, from: 0, last: 0 };
  const end = Number(last.t) + ROUND, until = end + holdMinutes() * 60;
  /* the run the newest round belongs to began in the first of the rounds in a row, as late in it as its work allows */
  let i = floors.length - 1;
  while (i > 0 && floors[i].gap === 0) i--;
  const n = floors[i], t = Number(n.t);
  /* and if the round before had work too, he ran on from there until its work was done */
  const stop = last.gap === 0 ? Math.min(end, Math.round(Number(last.t) + (Number(last.work) || 0) / E.ARENA.pace)) : end;
  return { open: until > nowSec, until, end, from: Math.max(t, Math.round(t + ROUND - (Number(n.work) || 0) / E.ARENA.pace)), last: stop };
}
/* a claim of a run that the chain has already settled as empty cannot be true. Claims near the frontier cannot be judged yet */
const CHAIN_SLACK = 180;
const fitsChain = (t, floors, settled) => t >= settled - CHAIN_SLACK || floors.some(n => Number(n.t) - CHAIN_SLACK <= t && t <= Number(n.t) + ROUND + CHAIN_SLACK);
/* what a page may claim: a fresh reading, and a run that began at least the wait ago */
function claimFits(run, floors, settled, nowSec) {
  const from = Number(run && run.from), at = Number(run && run.at);
  if (!Number.isFinite(from) || !Number.isFinite(at) || Math.abs(nowSec - at) > 90) return false;
  return from > 0 && from <= nowSec - E.ARENA.waitMin * 60 + 30 && fitsChain(from, floors, settled);
}
module.exports = { bonusOf, arenaGate, fitsChain, claimFits };
