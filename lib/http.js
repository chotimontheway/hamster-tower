// HTTP helpers shared by Vercel and the local server
const crypto = require('crypto');
const cfg = require('./config');
class HttpError extends Error {
  constructor(status, message, data) { super(message); this.status = status; this.data = data; }
}
const bad = (m, data) => { throw new HttpError(400, m, data); };
function sendJson(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', (headers && headers['Cache-Control']) || 'no-store');
  res.end(body);
}
async function readJson(req) {
  let parsed;
  try { parsed = req.body; } catch (e) { throw new HttpError(400, 'Invalid request data'); }
  if (parsed !== undefined && parsed !== null) {
    if (typeof parsed !== 'string') return parsed;
    try { return JSON.parse(parsed || '{}'); } catch (e) { throw new HttpError(400, 'Invalid request data'); }
  }
  const chunks = [];let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 256 * 1024) throw new HttpError(413, 'Request body is too large');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { throw new HttpError(400, 'Invalid request data'); }
}
function parseCookies(req) {
  const out = {};
  /* a cookie that is not valid percent encoding is skipped, it must not break the request */
  (req.headers.cookie || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) { try { out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); } catch (e) {} } });
  return out;
}
const b64 = b => Buffer.from(b).toString('base64url');
const hmac = s => crypto.createHmac('sha256', cfg.secret()).update(s).digest('base64url');
/* signed tickets: the server stores nothing, it only checks the signature */
function signToken(obj) { const p = b64(JSON.stringify(obj)); return p + '.' + hmac(p); }
function readToken(tok) {
  if (typeof tok !== 'string') return null;
  const i = tok.indexOf('.');if (i < 1) return null;
  const p = tok.slice(0, i), s = tok.slice(i + 1), want = hmac(p);
  if (s.length !== want.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want))) return null;
  try {
    const o = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (o.exp && o.exp < Date.now()) return null;
    return o;
  } catch (e) { return null; }
}
const seedFor = s => crypto.createHmac('sha256', cfg.secret()).update('seed:' + s).digest('hex');
function clientIp(req) { return (String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || (req.socket && req.socket.remoteAddress) || 'unknown'; }
module.exports = { HttpError, bad, sendJson, readJson, parseCookies, signToken, readToken, seedFor, clientIp };
