// Request limits. With a REST Redis (Upstash) every function shares the counter, without it each function counts in memory.
// If Redis fails the request is allowed, so the game never stops because of a counter.
const cfg = require('./config');
const mem = new Map();
const restUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const restToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
function memHit(key, windowSec, limit) {
  const now = Date.now();
  let e = mem.get(key);
  if (!e || e.until < now) { e = { n: 0, until: now + windowSec * 1000 }; mem.set(key, e); }
  e.n++;
  if (mem.size > 50000) { for (const [k, v] of mem) if (v.until < now) mem.delete(k); }
  return e.n <= limit;
}
async function allow(key, windowSec, limit) {
  if (cfg.rateLimitOff()) return true;
  const url = restUrl(), token = restToken();
  if (!url || !token) return memHit(key, windowSec, limit);
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify([['INCR', 'rl:' + key], ['EXPIRE', 'rl:' + key, String(windowSec), 'NX']]), signal: AbortSignal.timeout(800) });
    const j = await r.json();
    const n = j && j[0] && j[0].result;
    return typeof n === 'number' ? n <= limit : true;
  } catch (e) {
    return true;
  }
}
module.exports = { allow };
