// Is the hamster on the wheel right now? Read from the public Squeekchain API, at most once every few seconds per server. A failed read means unknown, never resting.
const cfg = require('./config');
const S = { at: 0, v: { known: false }, pending: null };
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function parse(j) {
  const m = j && j.schemaVersion === 1 ? j.measurement : null;
  if (!m || m.freshness !== 'online' || m.provenance !== 'hardware' || m.coreStatus === 'COUNTER_FAULT') return { known: false };
  const rpm = num(m.rpmMilli) / 1000, work = j.builder && j.builder.status === 'available' && j.builder.queued ? num(j.builder.queued.openRoundWorkUnits) : 0;
  const running = rpm >= 5 || m.coreStatus === 'ACTIVE';
  /* awake holds until the current 10 minute round closes, so a short pause on the wheel does not flip the bonus off and on */
  return { known: true, running, awake: running || work > 0, rpm: Math.round(rpm), mps: Math.round(num(m.speedMmPerSecond) / 100) / 10, work };
}
function readLive() {
  if (Date.now() - S.at < cfg.liveEveryMs()) return Promise.resolve(S.v);
  if (!S.pending) {
    S.pending = fetch(cfg.statusUrl(), { signal: AbortSignal.timeout(2000) }).then(r => r.ok ? r.json() : null).then(parse, () => ({ known: false })).then(v => { S.v = v;S.at = Date.now();S.pending = null;return v; });
  }
  return S.pending;
}
module.exports = { readLive };
