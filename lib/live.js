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
module.exports = { bonusOf };
