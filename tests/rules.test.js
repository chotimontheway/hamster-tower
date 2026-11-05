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
console.log('\nThe contracts the rounds are read from');
{
  const cores = require('../lib/config').cores();
  check('every contract but the newest is pinned to its last round', cores.slice(0, -1).every(c => c.through > 0) && cores[cores.length - 1].through === undefined, cores);
  check('they run forward in time', cores.every((c, i) => !i || c.genesis > cores[i - 1].genesis), cores);
  check('no contract is listed twice', new Set(cores.map(c => c.core.toLowerCase())).size === cores.length, cores);
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
