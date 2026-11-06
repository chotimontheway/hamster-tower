// Turns a Squeek's on-chain picture into plain numbers the page can draw: its dots without the background, the outline of its body,
// and the body part each dot belongs to. Every Squeek shares one body shape, so the parts are found by position and no Squeek is drawn by hand.
// Nothing from the picture is passed on as markup: only numbers, checked colours and checked path data are kept.
const P = 395.4;
const BOX = { x0: 4900, x1: 20150, y0: 3800, y1: 21300 };
const CX = 12544 / P;
const MAX_SVG = 250000;

function parse(svg) {
  if (typeof svg !== 'string' || svg.length > MAX_SVG) throw new Error('unexpected picture');
  const start = svg.indexOf('<g id="e">'), end = svg.indexOf('</defs>');
  if (start < 0 || end < start) throw new Error('unexpected picture');
  const dots = [];
  let color = null;
  for (const m of svg.slice(start, end).matchAll(/<g color="(#[0-9A-Fa-f]{6})">|<use href="#([A-Za-z])" x="(\d{1,5}(?:\.\d+)?)" y="(\d{1,5}(?:\.\d+)?)"(?: opacity="([01](?:\.\d+)?)")?\/>/g)) {
    if (m[1]) { color = m[1].toUpperCase(); continue; }
    if (!color) continue;
    dots.push({ g: m[2], x: +m[3], y: +m[4], o: m[5] ? Math.min(1, +m[5]) : 1, c: color });
  }
  const glyphs = {};
  for (const m of svg.matchAll(/<path id="([A-Za-z])" d="([^"]{1,600})"/g)) if (/^[MLHVQTCSAZmlhvqtcsaz0-9 .,-]+$/.test(m[2])) glyphs[m[1]] = m[2];
  if (dots.length < 300 || dots.length > 4000) throw new Error('unexpected picture');
  return { dots, glyphs };
}

/* dots outside the body area show what the background looks like, and every dot of that same look is background */
function splitBackground(dots) {
  const sig = new Set(), key = d => d.g + '|' + d.o + '|' + d.c;
  const inBox = d => d.x >= BOX.x0 && d.x <= BOX.x1 && d.y >= BOX.y0 && d.y <= BOX.y1;
  for (const d of dots) if (!inBox(d)) sig.add(key(d));
  return dots.filter(d => inBox(d) && !sig.has(key(d)));
}

const partOf = (cx, cy) => {
  if (cy <= 21.5 && cx <= 20.5) return 'earL';
  if (cy <= 21.5 && cx >= 42.5) return 'earR';
  if (cy <= 34.5) return 'head';
  if (cx <= 19.5) return 'armL';
  if (cx >= 43.5) return 'armR';
  if (cy >= 49.5) return cx <= CX ? 'legL' : 'legR';
  return 'torso';
};

/* the body shape: close the gaps between dots and fill what is enclosed */
function outline(body) {
  const N = 64, at = (x, y) => y * N + x, on = new Uint8Array(N * N);
  for (const d of body) { const x = Math.round(d.x / P), y = Math.round(d.y / P); if (x >= 0 && x < N && y >= 0 && y < N) on[at(x, y)] = 1; }
  const near = r => { const o = []; for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (a * a + b * b <= r * r) o.push([a, b]); return o; };
  const grow = (src, r) => { const out = new Uint8Array(N * N), k = near(r); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (src[at(x, y)]) for (const [a, b] of k) { const X = x + a, Y = y + b; if (X >= 0 && X < N && Y >= 0 && Y < N) out[at(X, Y)] = 1; } return out; };
  const shrink = (src, r) => { const out = new Uint8Array(N * N), k = near(r); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let keep = 1; for (const [a, b] of k) { const X = x + a, Y = y + b; if (X < 0 || X >= N || Y < 0 || Y >= N || !src[at(X, Y)]) { keep = 0; break; } } out[at(x, y)] = keep; } return out; };
  let g = grow(on, 2.3);
  const seen = new Uint8Array(N * N), st = [];
  for (let i = 0; i < N; i++) for (const c of [at(i, 0), at(i, N - 1), at(0, i), at(N - 1, i)]) if (!g[c] && !seen[c]) { seen[c] = 1; st.push(c); }
  while (st.length) { const c = st.pop(), x = c % N, y = (c - x) / N; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + a, Y = y + b; if (X < 0 || X >= N || Y < 0 || Y >= N) continue; const n = at(X, Y); if (!g[n] && !seen[n]) { seen[n] = 1; st.push(n); } } }
  for (let i = 0; i < N * N; i++) if (!g[i] && !seen[i]) g[i] = 1;
  g = shrink(g, 1.7);
  const cells = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[at(x, y)]) cells.push([x, y]);
  return cells;
}

const isEye = d => d.c === '#FFFFFF' && d.y / P >= 20 && d.y / P <= 29 && d.x / P >= 22 && d.x / P <= 41.5;
const inFace = d => d.x / P >= 22.5 && d.x / P <= 41 && d.y / P >= 24.5 && d.y / P <= 31.5;

/* everything the page needs to draw one Squeek, about 25 KB */
function pack(svg) {
  const { dots, glyphs } = parse(svg);
  const body = splitBackground(dots);
  if (body.length < 600 || body.length > 1600) throw new Error('unexpected picture');
  const eyes = body.filter(isEye), rest = body.filter(d => !isEye(d));
  /* the face plate is the common glyph on the face, what stands out on it is the muzzle. Eyes and muzzle are kept apart so the face can turn */
  const count = {};
  for (const d of rest) if (inFace(d)) count[d.g] = (count[d.g] || 0) + 1;
  const plate = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
  const parts = {};
  for (const d of rest) { const k = inFace(d) && d.g !== plate ? 'face' : partOf(d.x / P, d.y / P); (parts[k] = parts[k] || []).push(d); }
  const shape = {};
  for (const [x, y] of outline(body)) { const k = partOf(x, y); (shape[k] = shape[k] || []).push(x, y); }
  const cols = [], ci = c => { let i = cols.indexOf(c); if (i < 0) { i = cols.length; cols.push(c); } return i; };
  const used = new Set();
  const pk = arr => arr.map(d => { used.add(d.g); return [Math.round(d.x), Math.round(d.y), d.g, Math.round(d.o * 1000) / 1000, ci(d.c)]; });
  const out = { v: 1, cols, glyphs: {}, parts: {}, eyes: pk(eyes), shape };
  for (const [k, v] of Object.entries(parts)) out.parts[k] = pk(v);
  for (const g of used) { if (!glyphs[g]) throw new Error('unexpected picture'); out.glyphs[g] = glyphs[g]; }
  if (!eyes.length || !out.parts.head || !out.parts.torso) throw new Error('unexpected picture');
  return out;
}
module.exports = { pack, parse, P };
