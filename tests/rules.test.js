// The rules of the upper tower, checked on the engine alone. No server or database.
// npm run build, then: node tests/rules.test.js
const E = require('../lib/engine.generated.cjs');
let passed = 0, failed = 0;
const check = (name, ok, extra) => { if (ok) { passed++; console.log('  ok   ' + name); } else { failed++; console.log('  FAIL ' + name + (extra !== undefined ? ' -> ' + JSON.stringify(extra) : '')); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;
const node = (floor, enemies, o) => Object.assign({ floor, round: floor, work: 400, blocks: 1, hash: '0xabc' + floor, t: 0, gap: 0, type: 'normal', boss: false, enemies, rule: 'clear', map: { t: 0, tone: 0 } }, o);
/* a team at one level, with each pet wearing 4 pieces of the given set when one is named */
function team(ids, lv, set) {
  const items = [], owned = {}; let uid = 1;
  for (const id of ids) {
    const gear = {};
    if (set) for (const slot of ['weapon', 'armor', 'hat', 'charm']) { items.push({ uid, set, slot, rar: 'r', plus: 0 }); gear[slot] = uid++; }
    owned[id] = Object.assign(E.newPet(lv), { gear });
  }
  return { team: ids, owned, items, battles: 0, top: 1e9 };
}
const basics = B => { const p = {}; for (const u of E.alive(B, 'p')) p[u.id] = { i: 0, target: null }; return p; };
const start = (G, n, seed) => E.startBattle(G, n, [], { seed: seed || 'rules' });
/* plays basic attacks until the enemy starts charging */
function untilCharging(B, id, max) { let g = 0; const u = E.uById(B, id); while (!u.charging && !B.over && g++ < (max || 12)) E.runRound(B, basics(B)); return u; }

console.log('Height');
check('nothing changes up to floor 30', E.hardAt(1) === 0 && E.hardAt(30) === 0);
check('in full from floor 200', E.hardAt(200) === 1 && E.hardAt(524) === 1);
check('elements start at 40% and 25%', near(E.elRight(0), 1.4) && near(E.elWrong(0), .75));
check('and reach 80% and 60%', near(E.elRight(1), 1.8) && near(E.elWrong(1), .4));

console.log('Art');
const vm = require('vm'), fsT = require('fs'), pathT = require('path');
vm.runInThisContext(['client/rig-art.js', 'client/rig-mon.js'].map(f => fsT.readFileSync(pathT.join(__dirname, '..', f), 'utf8')).join('\n') + ';globalThis.RA=RA;');
const q = n => 'x' + n, RA = globalThis.RA;
check('every pet has a drawing', E.PETS_LIST.every(p => RA.PETS[p.id]));
check('every monster and boss has a drawing', E.MONS_LIST.every(m => (m.boss ? RA.BOSS : RA.MON)[m.id]));
check('every moving part of a monster is in its drawing', Object.entries(RA.MON).every(([, m]) => { const art = m.art(q); return (m.mv || []).every(v => art.includes('data-p="' + v[0] + '"')); }));
check('no monster picture is drawn from a broken number', Object.values(RA.MON).every(m => !/NaN|undefined/.test(m.art(q))));
{
  /* an effect that adds particles while it draws, as Golden Wheel does, must not start a second copy of the effect loop: copies would double every frame until the page froze */
  const frames = [], paint = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : paint, apply: () => paint, set: () => true });
  const sand = { window: { matchMedia: () => ({ matches: false }), devicePixelRatio: 1 }, matchMedia: () => ({ matches: false }), requestAnimationFrame: f => frames.push(f), cancelAnimationFrame() {}, performance, innerWidth: 800, innerHeight: 600, addEventListener() {}, console };
  vm.runInNewContext(fsT.readFileSync(pathT.join(__dirname, '..', 'client/fx.js'), 'utf8') + ';globalThis.FX=FX;', sand);
  sand.FX.init({ getContext: () => paint, width: 0, height: 0 }, () => 1);
  sand.FX.add({ k: 'fn', life: 400, x: 0, y: 0, fn: () => sand.FX.add({ k: 'p', shape: 'dot', x: 0, y: 0, vx: 0, vy: 0, life: 50, size: 1, c: '#fff' }) });
  let most = 0;
  for (let i = 0; i < 12; i++) { const now = frames.splice(0); most = Math.max(most, now.length); now.forEach(f => f(i * 16)); }
  check('an effect adding particles as it draws keeps one effect loop', most === 1, most);
}

console.log('Strength of a floor');
const pool = E.MONS_LIST.map(m => m.id);
let low = true, top = 1;
for (let f = 11; f < 30; f++) for (let i = 0; i < pool.length; i++) for (const type of ['normal', 'zoomies', 'sleepy']) { const x = E.floorScale(node(f, [pool[i], pool[(i + 7) % pool.length], pool[(i + 13) % pool.length]], { type })); if (x > 1 + 1e-9) { low = false; top = x; } }
check('below floor 30 a floor is never made stronger', low, top);
check('the first 10 floors are as they were', [1, 5, 10].every(f => E.floorScale(node(f, ['robot_vacuum', 'whale', 'shadow_cat'])) === 1));
check('the danger of an enemy lowers its floor', E.floorScale(node(60, ['robot_vacuum', 'shadow_cat', 'whale'])) < E.floorScale(node(60, ['strangle_vine', 'slimy_snail', 'yawning_bat'])));
check('the upper tower keeps growing', E.floorScale(node(500, ['slimy_snail', 'yawning_bat', 'whale'])) > E.floorScale(node(300, ['slimy_snail', 'yawning_bat', 'whale'])));

console.log('Strikes');
{
  const tank = ['knight'], low20 = start(team(tank, 5), node(20, ['whale'])).B, hi60 = start(team(tank, 5), node(60, ['whale'])).B;
  untilCharging(low20, 'e0'); untilCharging(hi60, 'e0');
  check('from floor 30 a charging enemy acts last', hi60.queue[hi60.queue.length - 1] === 'e0', hi60.queue);
  check('below floor 30 it keeps its place', low20.queue[0] === 'e0', low20.queue);
}
{
  const G = () => { const g = team(['singer'], 40); return g; };
  const hi = start(G(), node(60, ['whale'])).B, lo = start(G(), node(20, ['whale'])).B;
  for (const B of [hi, lo]) { const w = untilCharging(B, 'e0'); E.uById(B, 'p0').nrg = 100; check(`whale is charging on floor ${B.node.floor}`, !!w.charging); E.runRound(B, { p0: { i: 2, target: 'e0' } }); }
  check('sleep stops a charge from floor 30', !E.uById(hi, 'e0').charging);
  check('below floor 30 it does not', !!E.uById(lo, 'e0').charging);
}
for (const f of [20, 60]) {
  const B = start(team(['archer'], 40), node(f, ['whale'])).B, w = untilCharging(B, 'e0');
  E.runRound(B, { p0: { i: 1, target: 'e0' } });
  check(`an Interrupt skill stops a charge on floor ${f}`, !w.charging);
}
{
  let kept = 0, broke = 0;
  for (let s = 0; s < 80; s++) { const B = start(team(['knight'], 60), node(60, ['whale']), 'bash' + s).B, w = untilCharging(B, 'e0'); if (!w.charging) continue; E.runRound(B, { p0: { i: 0, target: 'e0' } }); if (B.over) continue; if (w.st.stun || w.st.guard) broke++; else kept++; }
  check('a basic attack only has its usual small chance', kept > broke && broke > 0, { kept, broke });
}
{
  let sure = 0, tries = 0;
  for (let s = 0; s < 30; s++) { const B = start(team(['thor'], 25), node(60, ['whale']), 'thor' + s).B, w = untilCharging(B, 'e0'); if (!w.charging) continue; E.uById(B, 'p0').nrg = 100; E.runRound(B, { p0: { i: 2, target: 'e0' } }); if (B.over) continue; tries++; if (!w.charging && (w.st.stun || w.st.guard)) sure++; }
  check('control on a Rage skill always lands on a charging enemy', tries > 5 && sure === tries, { sure, tries });
}
{
  const hit = f => { const B = start(team(['knight'], 300), node(f, ['whale']), 'heavy').B, w = untilCharging(B, 'e0'), me = E.uById(B, 'p0'); me.def = 1; const ev = E.runRound(B, { p0: { i: 0, target: 'e0' } }).filter(x => x.t === 'dmg' && x.to === 'p0'); return { val: ev.length ? ev[0].val : 0, atk: w.atk }; };
  const a = hit(31), b = hit(200);
  check('a strike hits harder the higher the floor', b.val / b.atk > a.val / a.atk * 1.3, { a, b });
}
{
  const has = (f, move) => { let seen = false; for (let s = 0; s < 6 && !seen; s++) { const B = start(team(['knight'], 500), node(f, ['robot_vacuum']), 'up' + s).B, u = E.uById(B, 'e0'); u.hp = u.hpMax = 1e9; let g = 0; while (!B.over && g++ < 14 && !seen) { for (const x of E.runRound(B, basics(B))) if ((x.t === 'charge' && x.next === move) || (x.t === 'use' && x.name === move)) seen = true; } } return seen; };
  check('a strike from floor 40 does not come earlier', !has(35, 'Turbo Suction'));
  check('and comes from then on', has(60, 'Turbo Suction'));
}

console.log('Spikes');
{
  const B = start(team(['knight'], 60), node(80, ['slimy_snail'])).B, u = E.uById(B, 'e0');
  let g = 0; while (!u.st.spikes && !B.over && g++ < 10) { u.hp = u.hpMax; E.runRound(B, basics(B)); }
  check('a stance raises Spikes', !!u.st.spikes);
  const ev = E.runRound(B, basics(B));
  check('hitting it hurts the attacker', ev.some(x => x.t === 'dmg' && x.to === 'p0' && x.key === 'thorns'));
  const ev2 = E.runRound(B, basics(B));
  check('and the Spikes are gone a turn later', !u.st.spikes && !ev2.some(x => x.t === 'dmg' && x.to === 'p0' && x.key === 'thorns'));
}

console.log('Daily Challenge');
{
  const n = node(100, ['robot_vacuum'], { daily: true }), B = start(team(['knight'], 200), n).B;
  check('its strength has no upper tower rules', E.floorScale(n) === 1 && B.h === 0 && B.hf === 0);
  let up = false; for (let g = 0; g < 14 && !B.over; g++) for (const x of E.runRound(B, basics(B))) if ((x.t === 'charge' && x.next === 'Turbo Suction') || (x.t === 'use' && x.name === 'Turbo Suction')) up = true;
  check('and no upper tower moves', !up);
}

console.log('Sets');
{
  const poisoned = set => { let n = 0; for (let s = 0; s < 8; s++) { const B = start(team(['knight'], 40, set), node(60, ['corn_worm']), 'p' + s).B; for (let g = 0; g < 3 && !B.over; g++) { E.runRound(B, basics(B)); if (E.uById(B, 'p0').st.poison) n++; } } return n; };
  check('Nurse gear is immune to Poison', poisoned('nurse') === 0 && poisoned('miner') > 0);
  const zapped = set => { let n = 0; for (let s = 0; s < 8; s++) { const B = start(team(['knight'], 60, set), node(60, ['stray_plug']), 'z' + s).B; for (let g = 0; g < 3 && !B.over; g++) { E.runRound(B, basics(B)); if (E.uById(B, 'p0').st.static) n++; } } return n; };
  check('Thunder gear is immune to Static', zapped('thunder') === 0 && zapped('miner') > 0);
  const missed = set => { let n = 0; for (let s = 0; s < 12; s++) { const B = start(team(['archer'], 8, set), node(60, ['hv_firefly']), 'm' + s).B; for (let g = 0; g < 4 && !B.over; g++) n += E.runRound(B, { p0: { i: 0, target: 'e0' } }).filter(x => x.t === 'miss').length; } return n; };
  check('Hunter gear never misses', missed('hunter') === 0 && missed('miner') > 0);
  const startNrg = set => start(team(['archer'], 8, set), node(60, ['whale'])).B.units[0].nrg;
  check('Thunder gear starts with Rage', startNrg('thunder') === 30 && startNrg('miner') === 0);
  check('Knight gear braces for strikes', E.petStats(team(['knight'], 8, 'knight'), 'knight').mods.brace === .4);
}

console.log('Raising the right pets');
{
  const G = E.newSave('rules');
  G.owned.blade.lv = 100; G.owned.dozer = E.newPet(1);
  const run = id => { const o = G.owned[id]; o.full = E.stomach(o.lv); const lv = o.lv, r = E.runWheel(G, id); return r.xp / (E.runXp(lv) * E.RUN_LUCK[r.luck].x); };
  const lowPet = run('dozer'), topPet = run('blade');
  check('a pet far below the strongest gains about 4 times the XP', lowPet > 3.4 && lowPet < 4.5, lowPet);
  check('the strongest pet gains the usual XP', topPet > .85 && topPet < 1.15, topPet);
}
console.log('Guard');
{
  const hit = (i, seed) => { const { B } = start(team(['knight'], 30), node(60, ['stray_plug']), seed); const u = E.uById(B, 'p0'), r0 = u.nrg, ev = E.runRound(B, { p0: { i, target: null } }); return { dmg: ev.filter(x => x.t === 'dmg' && x.to === 'p0').reduce((a, x) => a + x.val, 0), hits: ev.filter(x => x.t === 'dmg' && x.to === 'e0').length, used: ev.filter(x => x.t === 'use' && x.who === 'p0').map(x => x.name), rage: u.nrg - r0, B }; };
  const g = hit(3, 'guard1'), b = hit(0, 'guard1');
  check('every pet can Guard', E.PETS_LIST.every(p => p.skills[3] && p.skills[3].kind === 'guard'));
  check('it holds even against an enemy that acts first', b.dmg > 0 && g.dmg > 0 && g.dmg < b.dmg * .6, { g: g.dmg, b: b.dmg });
  check('it does not attack', g.hits === 0 && g.used[0] === 'Guard', g.used);
  check('it gains Rage', g.rage >= 20, g.rage);
  check('it ends with the turn', !E.uById(g.B, 'p0').st.braced);
  const si = start(team(['knight'], 30), node(60, ['sniper_bot']), 's').B;E.uById(si, 'p0').st.silence = { v: 1, t: 1 };
  check('Silence cannot stop it', E.canPick(si, 'p0', 3) && !E.canPick(si, 'p0', 1));
}

console.log('Gifts');
{
  const G = E.newSave('gifts'), floors = [node(1, ['grumpy_sprout'])];G.top = 30;
  const win = () => E.finishWin(G, { node: { floor: 1, type: 'normal', boss: false }, coinBonus: 0 }, floors).gift;
  const got = [win(), win(), win(), win(), win(), win()];
  check('a player past the floors gets the gifts one win at a time', got.join() === 'dozer,archer,sailor,sparky,farmer,', got);
  check('all five elements are in by then', new Set(Object.keys(G.owned).map(id => E.PETS[id].el)).size === 5, Object.keys(G.owned));
  const L = E.newSave('low');L.top = 7;
  const one = () => E.finishWin(L, { node: { floor: 1, type: 'normal', boss: false }, coinBonus: 0 }, floors).gift;
  check('a gift waits for its floor', [one(), one(), one()].join() === 'dozer,archer,', L.owned.sailor);
}

console.log('Adopting');
{
  const G = E.newSave('adopt');
  check('it costs coins', E.adopt(G, 'gunner') === false && !G.owned.gunner);
  G.coins = E.ADOPT.r + E.ADOPT.n;
  check('a rare pet for coins', E.adopt(G, 'gunner') === true && !!G.owned.gunner && G.coins === E.ADOPT.n);
  check('it joins a team with room', G.team.includes('gunner'));
  check('not twice', E.adopt(G, 'gunner') === false && G.coins === E.ADOPT.n);
  check('a common pet for less', E.adopt(G, 'sailor') === true && G.coins === 0);
  G.coins = 1e6;
  check('Epic and Legendary pets stay luck', E.adopt(G, 'thor') === false && E.adopt(G, 'viking') === false && !G.owned.thor && !G.owned.viking && G.coins === 1e6);
  check('no such pet', E.adopt(G, 'nobody') === false);
}

console.log('Saved teams');
{
  const G = E.newSave('saved');
  G.owned.dozer = E.newPet();G.owned.archer = E.newPet();G.owned.sailor = E.newPet();
  G.items = [{ uid: 1, set: 'miner', slot: 'weapon', rar: 'n', plus: 0 }, { uid: 2, set: 'hunter', slot: 'weapon', rar: 'n', plus: 0 }, { uid: 3, set: 'hunter', slot: 'weapon', rar: 'n', plus: 0 }, { uid: 4, set: 'hunter', slot: 'weapon', rar: 'n', plus: 0 }];
  G.team = ['blade', 'dozer'];E.equip(G, 'blade', 1);
  E.savePreset(G, 0);
  G.team = ['sailor', 'archer'];E.equip(G, 'sailor', 1);E.equip(G, 'sailor', 2);
  check('using a team brings the pets back', E.usePreset(G, 0) === true && G.team.join() === 'blade,dozer');
  check('and what they wore', G.owned.blade.gear.weapon === 1 && !Object.values(G.owned.sailor.gear).includes(1));
  check('an empty slot does nothing', E.usePreset(G, 3) === false && G.team.join() === 'blade,dozer');
  E.unequip(G, 'blade', 'weapon');
  check('its gear is safe from mass selling while nobody wears it', !E.sellPreview(G, ['n']).list.some(i => i.uid === 1) && E.sellPreview(G, ['n']).list.some(i => i.uid === 3));
  G.items.push({ uid: 5, set: 'miner', slot: 'weapon', rar: 'n', plus: 0 }, { uid: 6, set: 'miner', slot: 'weapon', rar: 'n', plus: 0 });
  check('and safe from merging', !E.canMerge(G, E.itemByUid(G, 5)));
  check('it is still there after that', !!E.itemByUid(G, 1));
  G.items = G.items.filter(i => i.uid !== 1);
  check('gear that is gone is simply skipped', E.usePreset(G, 0) === true && G.owned.blade.gear.weapon === undefined);
}
console.log('Arena Tower');
{
  const A = E.ARENA, foe = f => E.snapshotG(E.arenaBot(f));
  check('a floor has its reach above it, the top has none', E.arenaTargets(0).join() === '1,2,3' && E.arenaTargets(50).join() === '51,52,53' && E.arenaTargets(99).join() === '100' && E.arenaTargets(100).length === 0);
  check('the bot teams are the same every time', JSON.stringify(E.arenaBot(37)) === JSON.stringify(E.arenaBot(37)));
  const pw = [];for (let f = 1; f <= A.floors; f++) pw.push(E.teamPower(foe(f)));
  check('every floor has a team with 3 different pets and real numbers', Array.from({ length: A.floors }, (_, i) => E.arenaBot(i + 1)).every(b => b.team.length === 3 && new Set(b.team.map(t => t.id)).size === 3 && b.team.every(t => E.PETS[t.id])) && pw.every(Number.isFinite));
  const avg = (a, b) => { const x = pw.slice(a, b);return x.reduce((m, v) => m + v, 0) / x.length; };
  check('the higher the floor the stronger the team', avg(0, 10) < avg(20, 30) && avg(20, 30) < avg(45, 55) && avg(45, 55) < avg(70, 80) && avg(70, 80) < avg(90, 100), pw.filter((_, i) => i % 20 === 0));
  const low = E.newSave('a'), high = E.newSave('b');high.owned.blade.lv = 200;
  check('a pet fights at the same level whatever its real level', E.teamPower(E.arenaG(low)) === E.teamPower(E.arenaG(high)));
  high.owned.blade.star = 4;
  check('stars still count', E.teamPower(E.arenaG(high)) > E.teamPower(E.arenaG(low)));
  high.items.push({ uid: 9, set: 'miner', slot: 'weapon', rar: 'e', plus: 2 });high.owned.blade.gear.weapon = 9;
  const snap = E.teamSnapshot(high), withGear = E.teamPower(E.snapshotG(snap));
  check('gear still counts', withGear > E.teamPower(E.arenaG(Object.assign(E.newSave('c'), { owned: { blade: Object.assign(E.newPet(), { star: 4 }) } }))));
  high.items = [];high.owned.blade.gear = {};
  check('a saved defense keeps its gear after the gear is sold', E.teamPower(E.snapshotG(snap)) === withGear);
  check('prizes go by floor, nothing below the first band', E.arenaPrize(100).chest === 4 && E.arenaPrize(99).chest === 3 && E.arenaPrize(85).chest === 3 && E.arenaPrize(84).chest === 2 && E.arenaPrize(60).chest === 2 && E.arenaPrize(30).chest === 1 && E.arenaPrize(29).chest === 0 && E.arenaPrize(10).chest === 0 && E.arenaPrize(9) === null && E.arenaPrize(0) === null);
  const mine = Object.assign(E.newSave('m'), { team: ['knight', 'nurse', 'wizard'] });mine.owned = { knight: E.newPet(), nurse: E.newPet(), wizard: E.newPet() };
  const plan = B => { const p = {};for (const u of E.alive(B, 'p')) p[u.id] = { i: E.canPick(B, u.id, 2) ? 2 : E.canPick(B, u.id, 1) ? 1 : 0, target: null };return p; };
  let ended = 0, crashed = null, moved = new Set(), foesRage = false, flipSide = true;
  for (const pet of E.PETS_LIST) {
    const others = E.PETS_LIST.filter(p => p.id !== pet.id), d = { team: [pet, others[(pet.id.length * 7) % others.length], others[(pet.id.length * 11 + 3) % others.length]].filter((v, i, a) => a.indexOf(v) === i).map(p => ({ id: p.id, star: 3, gear: [] })) };
    try {
      const { B } = E.startBattle(E.arenaG(mine), E.arenaNode(40), [], { seed: 'rules-arena-' + pet.id, foe: E.snapshotG(d) });
      if (!B.units.filter(u => u.side === 'e').every(u => u.pet && u.look && E.PETS[u.ref])) flipSide = false;
      let g = 0;
      while (!B.over && g++ < 80) {
        for (const ev of E.runRound(B, plan(B))) if (ev.t === 'use' && ev.who[0] === 'e') moved.add(ev.name);
        if (B.units.some(u => u.side === 'e' && u.nrg > 0)) foesRage = true;
      }
      if (B.over) ended++;
    } catch (e) { crashed = pet.id + ': ' + e.message; }
  }
  check('all ' + E.PETS_LIST.length + ' pets can fight on the enemy side without an error', !crashed, crashed);
  check('every one of those fights ends', ended === E.PETS_LIST.length, ended);
  check('they stand on the enemy side as pets', flipSide);
  check('they gain Rage like any pet', foesRage);
  const names = E.PETS_LIST.flatMap(p => [p.skills[1].n, p.skills[2].n]);
  check('they use their skills and Rage skills, not only basic attacks', names.filter(n => moved.has(n)).length > names.length * .4, names.filter(n => moved.has(n)).length);
  const { B: bb } = E.startBattle(E.arenaG(mine), E.arenaNode(40), [], { seed: 'peek', foe: foe(40) }), first = bb.queue.find(id => id[0] === 'e'), fu = E.uById(bb, first);
  check('nothing about their next move is random', E.peekMove(bb, fu).n === E.peekMove(bb, fu).n && E.foeTarget(bb, fu) === E.foeTarget(bb, fu));
  const d0 = { team: ['thor', 'poseidon', 'sandman'].map(id => ({ id, star: 5, gear: [] })) }, { B: b3 } = E.startBattle(E.arenaG(E.newSave('solo')), E.arenaNode(40), [], { seed: 'bonus', foe: E.snapshotG(d0) });
  check('a team on the enemy side gets its own team bonuses', b3.reactE === .2 && b3.reactP === 0, [b3.reactE, b3.reactP]);
  const n1 = E.arenaNode(7);
  check('a floor keeps its own map and weather', JSON.stringify(n1) === JSON.stringify(E.arenaNode(7)) && n1.arena === true && E.MAP_NAMES[n1.map.t] && E.RULES.some(r => r.id === n1.rule));
  const healer = E.PETS_LIST.find(p => p.skills[1].tgt !== 'self' && p.skills[1].ops.every(o => o[0] === 'heal')) || E.PETS_LIST.find(p => p.skills[1].ops.some(o => o[0] === 'heal' || o[0] === 'healLowOp') && !p.skills[1].ops.some(o => o[0] === 'dmg'));
  if (healer) {
    const { B: b4 } = E.startBattle(E.arenaG(mine), E.arenaNode(40), [], { seed: 'heal', foe: E.snapshotG({ team: [{ id: healer.id, star: 1, gear: [] }] }) });
    const u = b4.units.find(x => x.side === 'e');
    check('a healer does not waste its skill on a full team', E.foePick(b4, u) !== 1, healer.id);
    u.hp = Math.round(u.hpMax * .4);
    check('and uses it when someone is hurt', E.foePick(b4, u) === 1, healer.id);
  }
}
console.log('\nThe Arena opens and closes with the real wheel');
{
  const wait = E.ARENA.waitMin * 60, T = 1800000000, c0 = { work: 1000, end: T - 3600, from: T - 4000 };
  const read = (m, t, running, total, blocks, c) => E.arenaRead({ running, at: t, total, anchor: { work: 1000, end: T - 300 }, blocks: blocks || [] }, c || c0, m);
  const at = (m, t) => E.arenaState(m, t);
  let m = {};
  read(m, T - 60, false, 1000);
  check('a resting wheel means closed, with no countdown', at(m, T - 60).s === 'rest' && at(m, T - 60).left === 0, at(m, T - 60));
  read(m, T + 10, true, 1010);
  check('he starts: it counts down the wait', at(m, T + 10).s === 'wait' && Math.abs(at(m, T + 10).left - (wait - 10)) < 3, at(m, T + 10));
  check('the countdown runs on its own between readings', Math.abs(at(m, T + 40).left - (wait - 40)) < 3, at(m, T + 40));
  read(m, T + wait - 2, true, 1000 + wait);
  check('a moment before the wait is over it is still counting', at(m, T + wait - 5).s === 'wait', [at(m, T + wait - 5), m.from]);
  check('then it opens, with no countdown while he runs', at(m, T + wait + 3).s === 'open' && at(m, T + wait + 3).left === 0, at(m, T + wait + 3));
  const stop = T + 600;
  read(m, stop, true, 1600);
  read(m, stop + 15, false, 1600);
  check('a pause under half a minute is still running', at(m, stop + 20).s === 'open', at(m, stop + 20));
  check('a longer one starts the countdown to close', at(m, stop + 60).s === 'closing' && Math.abs(at(m, stop + 60).left - (wait - 60)) < 3, at(m, stop + 60));
  read(m, stop + 120, true, 1610);
  check('if he runs again it stays open, with no new wait', at(m, stop + 121).s === 'open', at(m, stop + 121));
  const end = stop + 200;
  read(m, end, true, 1690);
  read(m, end + 60, false, 1690);
  check('after he stops it stays open for the wait', at(m, end + wait - 2).s === 'closing', at(m, end + wait - 2));
  check('and closes when that is over', at(m, end + wait + 1).s === 'rest', at(m, end + wait + 1));
  read(m, end + wait + 300, false, 1690);
  check('and stays closed', at(m, end + wait + 301).s === 'rest', m);
  read(m, end + wait + 600, true, 1700);
  check('a new run after a long rest counts down again', at(m, end + wait + 601).s === 'wait' && Math.abs(at(m, end + wait + 601).left - (wait - 11)) < 4, at(m, end + wait + 601));
  /* a few turns of the wheel */
  let b = {};
  read(b, T - 10, false, 1000);
  read(b, T + 3, true, 1005);
  check('the first turns of the wheel count down', at(b, T + 4).s === 'wait', at(b, T + 4));
  read(b, T + 40, false, 1006);
  check('but a stop right after is not a run', at(b, T + 45).s === 'rest', at(b, T + 45));
  /* a page that arrives late */
  const blocks = [{ at: T + 11, th: 1011 }, { at: T + 22, th: 1022 }, { at: T + 120, th: 1120 }];
  let c = {};
  read(c, T + 130, true, 1130, blocks);
  check('a page that arrives during the wait knows when he began, from the blocks', c.from > T - 3 && c.from < T + 3 && at(c, T + 131).s === 'wait', c.from - T);
  let d = {};
  read(d, T + 400, true, 1400, [{ at: T + 11, th: 1011 }, { at: T + 390, th: 1390 }]);
  check('after the wait it finds it open', at(d, T + 401).s === 'open', [d.from - T, at(d, T + 401)]);
  let e = {};
  read(e, T + 400, false, 1400, [{ at: T + 11, th: 1011 }, { at: T + 340, th: 1340 }]);
  check('and from the last block when he stopped', e.last > T + 390 && at(e, T + 431).s === 'closing', [e.last - T, at(e, T + 431)]);
  let f = {};
  read(f, T + 1000, true, 1240, [{ at: T + 11, th: 1011 }, { at: T + 120, th: 1120 }, { at: T + 900, th: 1131 }, { at: T + 910, th: 1142 }]);
  check('a quiet spell inside the blocks means a new run began after it', f.from > T + 880 && f.from < T + 900 && at(f, T + 1001).s === 'wait', [f.from - T, at(f, T + 1001)]);
  /* only the chain to go by */
  const c1 = { work: 1500, end: T + 600, from: T };
  let g = {};
  E.arenaRead({ running: false, at: T + 700, total: 1500, anchor: null, blocks: [] }, c1, g);
  check('a new page with only the chain never counts down to a run that may be over', at(g, T + 701).s === 'closing', at(g, T + 701));
  let h = {};
  E.arenaRead({ running: true, at: T + 800, total: 1560, anchor: { work: 1500, end: T + 600 }, blocks: [{ at: T + 700, th: 1510 }] }, c1, h);
  check('a new page in the middle of a run finds it open', h.from === T && at(h, T + 801).s === 'open', [h.from - T, at(h, T + 801)]);
  let i = {};
  E.arenaRead({ running: false, at: T + 2000, total: 1500, anchor: null, blocks: [] }, c1, i);
  check('a new page long after the last round finds it closed', at(i, T + 2001).s === 'rest', at(i, T + 2001));
  let g2 = {};
  E.arenaRead({ running: false, at: T + 700, total: 1500, anchor: null, blocks: [] }, { work: 1500, end: T + 1200, from: T + 300, last: T + 650 }, g2);
  check('it dates his stop by the work in the last round, not the end of the round', g2.last === T + 650, g2.last - T);
  /* the server catching up must not reopen what a page saw end */
  let j = {};
  read(j, T + 100, true, 1100);
  read(j, T + 400, true, 1400);
  read(j, T + 420, false, 1410);
  E.arenaRead({ running: false, at: T + 720, total: 1410, anchor: null, blocks: [] }, { work: 1410, end: T + 600, from: T }, j);
  check('rounds reaching the server later do not reopen it', at(j, T + 721).s === 'rest', [at(j, T + 721), j.last - T]);
  /* but what happened while a page was not looking counts */
  let k = {};
  read(k, T + 100, false, 1000);
  E.arenaRead({ running: false, at: T + 2000, total: 1500, anchor: null, blocks: [] }, { work: 1500, end: T + 1900, from: T + 1400 }, k);
  check('a page coming back sees a run it missed', at(k, T + 2001).s === 'closing' && k.last === T + 1900, [at(k, T + 2001), k.last - T]);
  /* a reading that stops coming */
  let l = {};
  read(l, T + 10, true, 1010);
  read(l, T + 400, true, 1400);
  check('with no new reading for a minute he no longer counts as running', at(l, T + 500).s === 'closing', at(l, T + 500));
  /* what the server takes from a page */
  const { claimFits, fitsChain } = require('../lib/live');
  const now = 90000, fl = [{ t: 1000 }, { t: 2000 }], good = { from: now - wait, at: now };
  check('a fresh claim of a run that began the wait ago is believed', claimFits(good, fl, now - 200, now));
  check('a claim a little early still fits the clock of the page', claimFits({ from: now - wait + 20, at: now }, fl, now - 200, now));
  check('but not one well before the wait is over', !claimFits({ from: now - wait + 60, at: now }, fl, now - 200, now));
  check('an old reading is not believed', !claimFits({ from: now - wait, at: now - 200 }, fl, now - 200, now));
  for (const bad of [null, undefined, {}, 'x', { from: 'x', at: now }, { from: 0, at: now }, { from: -5, at: now }, { from: now - wait }, { at: now }, { from: Infinity, at: now }]) check('nonsense is refused: ' + JSON.stringify(bad), !claimFits(bad, fl, now - 200, now));
  check('a time the chain has already settled as empty is refused', !claimFits(good, fl, now + 600, now));
  check('a time the chain has work for is fine', claimFits({ from: 2100, at: now }, fl, now, now));
  check('a run the chain cannot judge yet is fine, and one it has judged empty is not', fitsChain(now, fl, now) && !fitsChain(5000, fl, now));
}
console.log('\nThe contracts the rounds are read from');
{
  const cores = require('../lib/config').cores();
  check('every contract but the newest is pinned to its last round', cores.slice(0, -1).every(c => c.through > 0) && cores[cores.length - 1].through === undefined, cores);
  check('they run forward in time', cores.every((c, i) => !i || c.genesis > cores[i - 1].genesis), cores);
  check('no contract is listed twice', new Set(cores.map(c => c.core.toLowerCase())).size === cores.length, cores);
}
console.log('\nSqueek pets');
{
  const PALS = Object.keys(E.SQ_EL).flatMap(p => p === 'RGB' ? [p] : [p, 'Spectral ' + p]), BODIES = Object.keys(E.SQ_ROLE), EYES = Object.keys(E.SQ_EYE), ILLS = Object.keys(E.SQ_ULT);
  let bad = null, kits = 0;
  const fxSrc = fsT.readFileSync(pathT.join(__dirname, '..', 'client/fx.js'), 'utf8');
  for (const pal of PALS) for (const body of BODIES) for (const eye of EYES) for (const ill of ILLS) {
    const p = E.squeekDef(42, { pal, body, eye, ill }, 1);kits++;
    const text = p.skills.map(s => E.skillDesc(s)).join(' ');
    if (p.skills.length !== 4 || !E.ELS[p.el] || !E.ROLES[p.role] || /undefined|NaN/.test(text) || p.skills.some(s => s.kind !== 'guard' && !new RegExp('\\b' + s.fx + ':\\(').test(fxSrc))) { bad = { pal, body, eye, ill, text }; break; }
  }
  check(`all ${kits} trait combinations make a full kit with effects that exist`, !bad, bad);
  check('every palette, body glyph, eye kind and illumination seen on the chain has a use', PALS.length === 17 && BODIES.length === 13 && EYES.length === 12 && ILLS.length === 5);
  const t = { pal: 'Hot Magenta', body: 'Shield', eye: 'Wide Blocks', ill: 'Rim Trace' };
  const k = E.addSqueek(359, t, 1), G = team(['king', k], 30);
  G.owned[k].sq = { t, lv: 1 };
  const sqSt = E.petStats(G, k), kgSt = E.petStats(G, 'king');
  check('a Squeek is a little stronger than a Legendary of the same role, level and stars', Math.abs(sqSt.hp / kgSt.hp - E.RARS.s.m / E.RARS.l.m) < .01 && E.RARS.s.m > E.RARS.l.m && E.RARS.s.m / E.RARS.l.m < 1.06, [sqSt.hp, kgSt.hp]);
  G.owned[k].star = 2;E.addSqueek(359, t, 2);
  const two = E.petStats(G, k);
  check('each real merge level counts as a star worth 5%', Math.abs(two.atk / sqSt.atk - 1.05) < .02, [two.atk, sqSt.atk]);
  check('Squeeks never come from bags or chests', E.PETS_LIST.every(p => !E.isSq(p.id)) && (() => { const g = E.newSave('bags'); for (let i = 0; i < 400; i++) for (const r of ['n', 'r', 'e', 'l']) { const x = E.grantPet(g, r); if (E.isSq(x.id)) return false; } return true; })());
  const two2 = E.addSqueek(361, { pal: 'Gold', body: 'Cross', eye: 'Reticle', ill: 'Overdrive' }, 2);
  G.owned[two2] = Object.assign(E.newPet(30), { star: 2, sq: { t: E.PETS[two2].sq.t, lv: 2 } });
  check('one Squeek is fine in a team', E.teamProblem(G, ['king', k]) === null);
  check('two Squeeks in one team are refused', /one Squeek/.test(E.teamProblem(G, [k, two2]) || ''));
  G.owned[two2].sq.gone = 1;
  check('a Squeek that left the wallet cannot join a team', /left your wallet/.test(E.teamProblem(G, ['king', two2]) || ''));
  G.presets = [{ team: [k, two2, 'king'], gear: {} }];
  E.usePreset(G, 0);
  check('a saved team drops a Squeek that left and keeps one Squeek at most', G.team.join() === [k, 'king'].join(), G.team);
  delete G.owned[two2].sq.gone;
  G.team = [k, 'king'];
  const B = start(G, node(40, ['biting_gear', 'clothespin']), 'sq');
  check('a battle ticket carries the Squeek traits', B.B.units[0].sq && B.B.units[0].sq.id === 359 && B.B.units[0].sq.t.eye === 'Wide Blocks');
  delete E.PETS[k];
  let ok = true;try { const T = JSON.parse(JSON.stringify(B.B));T.rng = E.seedOf('turn');E.runRound(T, basics(T)); } catch (e) { ok = e.message; }
  check('a server that never saw this Squeek can still play the next turn', ok === true, ok);
  /* every eye skill and every Rage skill in real fights, on both sides */
  let crashed = null, ended = 0, n = 0;
  pairs: for (const eye of EYES) for (const ill of ILLS) {
    const id = 1000 + n++, body = BODIES[n % BODIES.length], pal = PALS[n % PALS.length], key = E.addSqueek(id, { pal, body, eye, ill }, 1 + n % 3);
    const P = team([key, 'thor', 'nurse'], 40);P.owned[key].sq = { t: E.PETS[key].sq.t, lv: E.PETS[key].sq.lv };
    const F = team([E.addSqueek(id + 500, { pal, body: BODIES[(n + 5) % 13], eye: EYES[(n + 3) % 12], ill: ILLS[(n + 1) % 5] }, 2), 'king', 'wizard'], 40);
    const fk = F.team[0];F.owned[fk].sq = { t: E.PETS[fk].sq.t, lv: 2 };
    try {
      const foe = E.snapshotG(E.teamSnapshot(F));
      const b = E.startBattle(P, E.arenaNode(20), [], { seed: 'sqfight' + n, foe }).B;
      let g = 0;
      while (!b.over && g++ < 80) { const plan = {}; for (const u of E.alive(b, 'p')) plan[u.id] = { i: E.canPick(b, u.id, 2) ? 2 : E.canPick(b, u.id, 1) ? 1 : 0, target: null }; E.runRound(b, plan); }
      if (b.over) ended++;
      if (!foe.owned[fk].sq) throw new Error('snapshot lost the Squeek');
    } catch (e) { crashed = { eye, ill, e: e.message }; break pairs; }
  }
  check(`Squeeks fight on both sides in all ${EYES.length * ILLS.length} skill pairs without an error`, !crashed, crashed);
  check('every one of those fights ends', ended === EYES.length * ILLS.length, ended);
}
console.log('\nSqueek pictures');
{
  const { pack } = require('../lib/squeek-art');
  const svg = fsT.readFileSync(pathT.join(__dirname, 'fixtures', 'squeek359.svg'), 'utf8');
  const a = pack(svg);
  const dots = Object.values(a.parts).reduce((s, x) => s + x.length, 0) + a.eyes.length;
  check('a real Squeek picture becomes dots with the background left out', dots > 900 && dots < 1200, dots);
  check('every body part is found', ['head', 'earL', 'earR', 'armL', 'armR', 'legL', 'legR', 'torso', 'face'].every(k => a.parts[k] && a.parts[k].length), Object.keys(a.parts));
  check('its eyes are kept apart so they can blink and turn', a.eyes.length === 6, a.eyes.length);
  check('only checked colours and shapes are kept', a.cols.every(c => /^#[0-9A-F]{6}$/.test(c)) && Object.values(a.glyphs).every(d => /^[MLHVQTCSAZmlhvqtcsaz0-9 .,-]+$/.test(d)));
  let refused = 0;
  for (const evil of ['<svg><script>alert(1)</script></svg>', svg.replace('<g id="e">', '<g id="x">'), 'x'.repeat(300000)]) { try { pack(evil); } catch (e) { refused++; } }
  check('a picture that is not a Squeek is refused', refused === 3, refused);
}
console.log('\nSQK Chest and SQK pouches');
{
  const G = E.newSave('sqk-rules'), q = E.sqkOf(G);
  check('a purchase is counted once a day', E.creditSqkChest(G, 20400) && !E.creditSqkChest(G, 20400) && E.creditSqkChest(G, 20401) && q.box === 2);
  for (let d = 0; d < 130; d++) E.creditSqkChest(G, 30000 + d);
  check('the list of counted days stays short', q.days.length === 120 && q.days[119] === 30129, q.days.length);
  check('an SQK Chest needs room for everything it can hold', E.sqkChestRoom() === E.SQK_CHEST.gear.n[1] + E.SQK_CHEST.bags.n[1]);
  /* many chests from many saves: every count in its range, nothing below what the chest promises, and the coins only change by duplicate pet refunds */
  const C = E.SQK_CHEST, N = 6000, sum = { chests: 0, dia: 0, food: 0, bags: 0, gear: 0, gearL: 0, petL: 0, pets: 0 };
  let bad = null;
  for (let i = 0; i < N && !bad; i++) {
    const S = E.newSave('sqk-open' + i);S.owned.blade.lv = [1, 15, 45][i % 3];S.bags = 5;
    E.sqkOf(S).box = 1;
    const coins0 = S.coins, items0 = S.items.length, r = E.openSqkChest(S), nc = r.chests.reduce((a, b) => a + b, 0);
    const refunds = [...r.bags.filter(x => x.kind === 'pet'), ...(r.pet ? [r.pet] : [])].reduce((a, x) => a + (x.refund || 0), 0);
    const bagItems = r.bags.filter(x => x.kind === 'item').length;
    const inR = (n, rg) => n >= rg[0] && n <= rg[1];
    if (!inR(nc, C.chests.n) || !inR(r.food.length, C.food.n) || !inR(r.bags.length, C.bags.n) || !inR(r.gear.length, C.gear.n)) bad = { i, nc, food: r.food.length, bags: r.bags.length, gear: r.gear.length };
    else if (r.chests[0] || r.gear.some(g => g.rar === 'n') || (r.pet && r.pet.rar === 'n')) bad = { i, low: true };
    else if (S.coins - coins0 !== refunds) bad = { i, coins: S.coins - coins0, refunds };
    else if (S.items.length - items0 !== r.gear.length + bagItems) bad = { i, items: S.items.length - items0 };
    else if (r.foodBag !== [0, 1, 2][i % 3]) bad = { i, foodBag: r.foodBag };
    else if (E.sqkOf(S).box !== 0) bad = { i, box: E.sqkOf(S).box };
    sum.chests += nc;sum.dia += r.chests[4];sum.food += r.food.length;sum.bags += r.bags.length;sum.gear += r.gear.length;sum.gearL += r.gear.filter(g => g.rar === 'l').length;if (r.pet) { sum.pets++;if (r.pet.rar === 'l') sum.petL++; }
  }
  check(`${N} SQK Chests stay inside their ranges, never Wood, never Common, coins only from refunds`, !bad, bad);
  const w = (a, i) => a[i] / a.reduce((x, y) => x + y, 0), avg = r => (r[0] + r[1]) / 2;
  check('chests average the middle of their range', Math.abs(sum.chests / N - avg(C.chests.n)) < .06, sum.chests / N);
  check('Diamond chests come at their weight', Math.abs(sum.dia / sum.chests - w(C.chests.w, 4)) < .01, sum.dia / sum.chests);
  check('food bags and blind bags average their ranges', Math.abs(sum.food / N - avg(C.food.n)) < .1 && Math.abs(sum.bags / N - avg(C.bags.n)) < .05, [sum.food / N, sum.bags / N]);
  check('Legendary gear comes at its weight', Math.abs(sum.gearL / sum.gear - w(C.gear.w, 3)) < .01, sum.gearL / sum.gear);
  check('every SQK Chest holds a pet, Legendary at its weight', sum.pets === N && Math.abs(sum.petL / N - w(C.pet.w, 3)) < .015, [sum.pets, sum.petL / N]);
  const empty = E.newSave('sqk-empty');
  check('nothing opens without a chest', E.openSqkChest(empty) === null && E.openPouch(empty) === null);

  const P = E.newSave('sqk-pouch');
  P.top = 9;check('no pouch before the first boss floor', E.grantPouches(P).length === 0);
  P.top = 47;const a = E.grantPouches(P);
  check('every boss floor cleared gives one pouch', JSON.stringify(a) === '[10,20,30,40]', a);
  check('the same floors never pay twice', E.grantPouches(P).length === 0 && E.sqkOf(P).boss === 40);
  P.top = 63;check('a new boss floor pays the next pouch', JSON.stringify(E.grantPouches(P)) === '[50,60]');
  P.top = 10;check('falling back pays nothing', E.grantPouches(P).length === 0 && E.sqkOf(P).boss === 60);
  const L = E.SQK_POUCH.luck;
  check('pouch odds add up to 100%', L.reduce((x, l) => x + l[1], 0) === 100);
  check('higher bands pay more', E.SQK_POUCH.bands.every((b, i, all) => !i || (b.a > all[i - 1].a && b.b > all[i - 1].b && b.from > all[i - 1].from)));
  let outside = null;const hits = L.map(() => 0), s = E.seedOf('pouch-odds');
  for (let i = 0; i < 20000; i++) {
    const f = [10, 50, 100, 200, 500, 990][i % 6], band = E.pouchBand(f), r = E.rollPouch(f, s);
    hits[r.k]++;
    if (r.amount < band.a * E.SQK_UNIT || r.amount > band.b * E.SQK_UNIT || r.amount % 1) outside = { f, r };
  }
  check('a pouch always pays inside its band, in whole millionths', !outside, outside);
  check('luck lands at its odds', hits.every((h, k) => Math.abs(h / 20000 - L[k][1] / 100) < .012), hits);
  const before = E.sqkOf(P).earned, o = E.openPouch(P);
  check('an opened pouch adds its SQK to what the wallet earned', o.floor === 10 && E.sqkOf(P).earned - before === o.amount && E.sqkOf(P).pouch.length === 5);
  check('SQK shows with up to 2 decimals', E.sqkText(1000000) === '1' && E.sqkText(3400000) === '3.4' && E.sqkText(1234560000) === '1,234.56' && E.sqkText(0) === '0');
  check('a broken save is read as empty', (() => { const X = { sqk: { box: 'x', days: 5, pouch: null, boss: -3, earned: 'y' } }, k = E.sqkOf(X); return k.box === 0 && k.days.length === 0 && k.pouch.length === 0 && k.boss === 0 && k.earned === 0; })());
  check('the SQK pictures draw without a broken number', ['sqkChest', 'sqkPouch'].every(f => { const s2 = RA[f](); return s2.length > 500 && !/NaN|undefined/.test(s2); }));
}
console.log('\nQuests');
{
  const ctx = (seed, day, max) => ({ day: day || '2026-11-06', seed: seed || 'p1:2026-11-06', max: max || 558 });
  const at = top => { const G = E.newSave('quest' + top);G.top = top;return G; };
  /* every floor from 0 to 600, many players: the right number of quests, only kinds that floor allows, never two of a kind except two old floors */
  let bad = null;
  for (let top = 0; top <= 600 && !bad; top += top < 40 ? 1 : 7) for (let p = 0; p < 12 && !bad; p++) {
    const G = at(top), list = E.ensureQuests(G, ctx('p' + p + ':d', '2026-11-06', 558)).list, band = E.questBand(top);
    const kinds = list.map(x => x.k);
    if (list.length !== band.n) bad = { top, p, n: list.length, want: band.n };
    else if (list.some(x => E.QUEST_KINDS[x.k].from > top)) bad = { top, p, kinds, early: true };
    else if (new Set(kinds.filter(k => k !== 'floor')).size !== kinds.filter(k => k !== 'floor').length || kinds.filter(k => k === 'floor').length > 2) bad = { top, p, kinds };
    else if (list.some(x => (x.k === 'floor' && !(x.f >= 1 && x.f <= top)) || (x.k === 'boss' && !(x.f >= 10 && x.f <= top && x.f % 10 === 0)))) bad = { top, p, list };
    else if (list.some(x => x.k === 'climb') && top >= 558) bad = { top, climb: true };
    else if (new Set(list.filter(x => x.f).map(x => x.f)).size !== list.filter(x => x.f).length) bad = { top, p, twice: list };
  }
  check('every floor gets its band\'s number of quests, only kinds it has reached, never the same floor twice', !bad, bad);
  const lo = E.questBand(0), hi = E.questBand(250);
  check('a low floor gets few quests, little TP and no SQK, a high floor more of all', lo.n < hi.n && lo.tp < hi.tp && !lo.sqk && !!hi.sqk);
  check('SQK at the last milestone starts at floor 30', !E.questBand(29).sqk && !!E.questBand(30).sqk);
  const A = at(14), a1 = JSON.stringify(E.ensureQuests(A, ctx('7:2026-11-06')).list), B2 = at(14), a2 = JSON.stringify(E.ensureQuests(B2, ctx('7:2026-11-06')).list);
  check('the same player and day always get the same list', a1 === a2);
  check('another day gives another list', JSON.stringify(E.ensureQuests(at(14), ctx('7:2026-11-07', '2026-11-07')).list) !== a1);
  const Q = E.ensureQuests(A, ctx('7:2026-11-06'));
  A.top = 40;E.ensureQuests(A, ctx('7:2026-11-06'));
  check('the list is made once a day, a higher floor later that day changes nothing', JSON.stringify(Q.list) === a1 && Q.top === 14);
  /* progress */
  const P = at(25), pq = E.ensureQuests(P, ctx('progress')), c0 = ctx('progress');
  pq.list = [{ k: 'floor', f: 8, n: 1, have: 0, tp: 15 }, { k: 'boss', f: 20, n: 1, have: 0, tp: 30 }, { k: 'wins', n: 5, have: 0, tp: 15 }, { k: 'climb', n: 1, have: 0, tp: 30 }];
  E.questOn(P, c0, { k: 'win', f: 9, first: false });
  check('a win on another floor only counts for wins', pq.list[0].have === 0 && pq.list[1].have === 0 && pq.list[2].have === 1 && pq.list[3].have === 0);
  const f1 = E.questOn(P, c0, { k: 'win', f: 8, first: false });
  check('a replay of the asked floor finishes it', pq.list[0].have === 1 && f1.length === 1 && f1[0].k === 'floor');
  check('a finished quest pays nothing until it is claimed', !P.tp, P.tp);
  check('a quest not finished cannot be claimed', E.claimQuestTp(P, c0, 1) === null && E.claimQuestTp(P, c0, 9) === null && !P.tp);
  const t0 = E.claimQuestTp(P, c0, 0);
  check('claiming a finished quest pays its own TP once', t0 && t0.tp === 15 && P.tp === 15 && pq.list[0].paid === 1 && E.claimQuestTp(P, c0, 0) === null && P.tp === 15, { t0, tp: P.tp });
  E.questOn(P, c0, { k: 'win', f: 20, first: false });E.questOn(P, c0, { k: 'win', f: 26, first: true });
  check('the boss floor and a first clear count', E.questDone(pq.list[1]) && E.questDone(pq.list[3]) && pq.list[2].have === 4);
  for (let i = 0; i < 9; i++) E.questOn(P, c0, { k: 'win', f: 3 });
  check('progress stops at what the quest needs', pq.list[2].have === 5);
  [1, 2, 3].forEach(i => E.claimQuestTp(P, c0, i));
  check('every finished quest pays its TP once when claimed, more wins after it is done pay nothing', P.tp === 15 + 30 + 15 + 30, P.tp);
  E.questOn(P, c0, { k: 'chests', n: 30 });E.questOn(P, c0, { k: 'arena' });
  check('events of kinds not on the list change nothing', pq.list.every(x => x.have <= x.n));
  /* milestones */
  const M = at(35), mc = ctx('ms'), mq = E.ensureQuests(M, mc), ms = E.questMs(mq.list.length), tps = E.questMsTp(mq.list.length, E.questBand(35).tp);
  check('milestones need one quest, half and all of them', JSON.stringify(ms) === JSON.stringify([1, 2, 4]) && JSON.stringify(E.questMs(5)) === JSON.stringify([1, 3, 5]) && JSON.stringify(E.questMs(2)) === JSON.stringify([1, 2]));
  check('and pay 1, 2 and 4 times the band\'s TP', JSON.stringify(tps) === JSON.stringify([20, 40, 80]) && JSON.stringify(E.questMsTp(2, 5)) === JSON.stringify([5, 20]));
  check('nothing pays before it is reached', E.claimQuest(M, mc, 0, true) === null);
  mq.list[0].have = mq.list[0].n;
  const g1 = E.claimQuest(M, mc, 0, true);
  check('the first milestone pays its TP once', g1 && g1.tp === 20 && M.tp === 20 && E.claimQuest(M, mc, 0, true) === null && M.tp === 20);
  check('a milestone further on still waits', E.claimQuest(M, mc, 2, true) === null && E.claimQuest(M, mc, 7, true) === null);
  mq.list.forEach(x => { x.have = x.n; });
  const e0 = E.sqkOf(M).earned, g3 = E.claimQuest(M, mc, 2, true);
  check('the last milestone pays TP and SQK inside the band', g3.tp === 80 && g3.sqk >= E.questBand(35).sqk[0] * E.SQK_UNIT && g3.sqk <= E.questBand(35).sqk[1] * E.SQK_UNIT && E.sqkOf(M).earned - e0 === g3.sqk);
  const N = at(35), nc = ctx('nosqk'), nq = E.ensureQuests(N, nc);nq.list.forEach(x => { x.have = x.n; });
  const g4 = E.claimQuest(N, nc, 2, false);
  check('a guest or a dev wallet gets the TP without SQK', g4.tp === 80 && g4.sqk === 0 && E.sqkOf(N).earned === 0);
  const L2 = at(12), lc = ctx('low'), lq = E.ensureQuests(L2, lc);lq.list.forEach(x => { x.have = x.n; });
  check('below floor 30 the last milestone pays no SQK', E.claimQuest(L2, lc, E.questMs(lq.list.length).length - 1, true).sqk === 0);
  const D = at(30), dc = ctx('next-day'), dq = E.ensureQuests(D, dc);dq.list.forEach(x => { x.have = x.n; });E.claimQuest(D, dc, 0, true);
  const dq2 = E.ensureQuests(D, ctx('next-day:2', '2026-11-07'));
  check('a new day brings a new list with nothing paid yet', dq2.day === '2026-11-07' && dq2.got.length === 0 && dq2.list.every(x => x.have === 0) && D.tp === 20);
  /* swap */
  const S = at(50), sc = ctx('swap'), sq = E.ensureQuests(S, sc), before = sq.list.map(x => x.k + (x.f || '')).join();
  const sw = E.swapQuest(S, sc, 0);
  check('one unfinished quest can be swapped for another kind', sw && sq.list[0] === sw && sq.list.map(x => x.k + (x.f || '')).join() !== before && sq.swap === 1);
  check('only once a day', E.swapQuest(S, sc, 1) === null);
  const S2 = at(50), sc2 = ctx('swap2'), sq2 = E.ensureQuests(S2, sc2);sq2.list[0].have = sq2.list[0].n;
  check('a finished quest cannot be swapped', E.swapQuest(S2, sc2, 0) === null && E.swapQuest(S2, sc2, 99) === null);
  let swapBad = null;
  for (let p = 0; p < 200 && !swapBad; p++) { const T = at(5 + p), tc = ctx('sw' + p), tq = E.ensureQuests(T, tc); const x = E.swapQuest(T, tc, p % tq.list.length); if (!x) continue; const ks = tq.list.map(y => y.k), nonFloor = ks.filter(k => k !== 'floor'); if (new Set(nonFloor).size !== nonFloor.length || ks.filter(k => k === 'floor').length > 2 || E.QUEST_KINDS[x.k].from > T.top) swapBad = { top: T.top, ks }; }
  check('a swap never doubles a kind or brings one the floor has not reached', !swapBad, swapBad);
  /* social */
  const Z = at(10), quest = { id: 9, tp: 50, sqkP: 1, sqkMax: 1 }, z0 = E.sqkOf(Z).earned;
  const r1 = E.socialReward(Z, quest, true);
  check('a social quest pays its TP, and SQK when its chance hits', r1.tp === 50 && Z.tp === 50 && r1.sqk >= .2 * E.SQK_UNIT && r1.sqk <= E.SQK_UNIT && E.sqkOf(Z).earned - z0 === r1.sqk && E.questOf(Z).sd.includes(9));
  const r2 = E.socialReward(at(10), { id: 3, tp: 20, sqkP: 1, sqkMax: 1 }, false);
  check('a guest or dev wallet gets the TP only', r2.tp === 20 && r2.sqk === 0);
  let hits = 0;const W = at(10);for (let i = 0; i < 4000; i++) if (E.socialReward(W, { id: 100 + i, tp: 1, sqkP: .3, sqkMax: 1 }, true).sqk) hits++;
  check('the SQK chance lands near its odds', Math.abs(hits / 4000 - .3) < .03, hits / 4000);
  check('the quest icons draw', fsT.existsSync(pathT.join(__dirname, '..', 'public', 'art', 'nav_quest.webp')) && fsT.existsSync(pathT.join(__dirname, '..', 'public', 'art', 'tp.webp')) && fsT.existsSync(pathT.join(__dirname, '..', 'public', 'art', 'x_logo.webp')));
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
