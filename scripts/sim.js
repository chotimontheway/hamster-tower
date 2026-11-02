// Balance bot: climbs the tower with a simple strategy and reports how many battles each floor takes.
// Usage: npm run sim [runs]. Reads floors from the local database.
const E = require('../lib/engine.generated.cjs');
const { startLocalDb } = require('./local-db');
function botPlan(B) {
  const plan = {};
  for (const u of E.alive(B, 'p')) {
    let i = 0;
    if (E.canPick(B, u.id, 2)) i = 2;else if (E.canPick(B, u.id, 1)) i = 1;
    const foes = E.alive(B, 'e');
    const tg = foes.find(x => x.mark && x.mark !== u.el) || E.minBy(foes, E.hpPct);
    plan[u.id] = { i, target: tg.id };
  }
  return plan;
}
function fight(G, B) {
  let guard = 0;
  while (!B.over && guard++ < 120) E.runRound(B, botPlan(B));
  if (guard >= 120) throw new Error('Battle never ended on floor ' + B.node.floor);
  return B.over;
}
function bestTeam(G) {
  const ids = Object.keys(G.owned).map(id => ({ id, p: E.petPower(E.petStats(G, id)), r: E.PETS[id].role }));
  ids.sort((a, b) => b.p - a.p);
  const team = [];
  const tank = ids.find(x => x.r === 'tank');if (tank) team.push(tank.id);
  const sup = ids.find(x => x.r === 'support');if (sup && team.length < 3) team.push(sup.id);
  for (const x of ids) { if (team.length >= 3) break; if (!team.includes(x.id)) team.push(x.id); }
  G.team = team;
}
/* spends every coin left on food for the lowest level pet in the team, using the bag that suits its level */
function feedTeam(G) {
  let g = 0;
  while (g++ < 20000) {
    const low = G.team.reduce((a, b) => G.owned[b].lv < G.owned[a].lv ? b : a), o = G.owned[low];
    if (o.full < E.stomach(o.lv)) E.autoFeed(G, low);
    if (E.runWheel(G, low)) continue;
    const t = o.lv >= E.FOOD_BAGS[2].a ? 2 : o.lv >= E.FOOD_BAGS[1].a ? 1 : 0;
    if (!E.openFoodBag(G, t) && !E.openFoodBag(G, 0)) break;
  }
}
function manage(G) {
  for (let t = 0; t < 5; t++) while (G.chests[t] > 0) E.openChest(G, t);
  while (G.coins >= E.BAG_COST * 2 && G.bags < (G.top + 5) * 1.2) E.openBag(G);
  E.mergeAll(G);
  for (const id of G.team) {
    for (const s of Object.keys(E.SLOTS)) {
      const cands = G.items.filter(i => i.slot === s);if (!cands.length) continue;
      const eq = E.equippedUids(G);
      const free = cands.filter(i => !eq.has(i.uid) || G.owned[id].gear[s] === i.uid);if (!free.length) continue;
      E.equip(G, id, free.reduce((a, b) => E.itemVal(b) > E.itemVal(a) ? b : a).uid);
    }
    const o = G.owned[id];if (o.star >= 3 && !o.branch) o.branch = E.BRANCHES[E.PETS[id].role][0][0];
  }
  if (G.items.length > 60) E.sellAll(G, ['n']);
  bestTeam(G);
  feedTeam(G);
}
(async () => {
  const runs = +(process.argv[2] || 4);
  const stopDb = await startLocalDb();
  const { q, closeDb } = require('../lib/db');
  const rows = (await q('SELECT round, work, blocks, hash, gap, t FROM rounds ORDER BY floor')).rows;
  const floors = E.buildFloors(rows);
  const marks = [5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 499].filter(x => x <= floors.length);
  const agg = {}, perFloor = {};
  let lastTop = null;
  for (let run = 0; run < runs; run++) {
    const G = E.newSave('sim' + run);
    let battles = 0, ms = Date.UTC(2026, 10, 1), day = 0;
    while (G.top < floors.length && battles < 30000) {
      manage(G);
      if (Math.floor(battles / 40) > day) { day = Math.floor(battles / 40); ms += 864e5; E.doSweep(G, floors, ms); manage(G); }
      const idx = G.top;
      const { B } = E.startBattle(G, floors[idx], floors);G.battles++;battles++;
      perFloor[idx + 1] = (perFloor[idx + 1] || 0) + 1;
      if (fight(G, B) === 'win') { E.finishWin(G, B, floors); if (marks.includes(G.top)) (agg[G.top] = agg[G.top] || []).push(battles); }
      else for (let i = 0; i < 4 && G.top > 0; i++) { const back = floors[Math.max(0, G.top - 1 - Math.floor(i / 2))]; const r2 = E.startBattle(G, back, floors); G.battles++; battles++; if (fight(G, r2.B) === 'win') E.finishWin(G, r2.B, floors); }
    }
    lastTop = { top: G.top, battles, level: G.team.map(x => x + ':' + G.owned[x].lv).join(' '), pets: Object.keys(G.owned).length };
    console.log(`run ${run}:`, JSON.stringify(lastTop));
  }
  console.log('Average battles to reach a floor:');
  for (const m of marks) if (agg[m]) console.log(`  floor ${m}: ${Math.round(agg[m].reduce((a, b) => a + b, 0) / agg[m].length)} battles (${agg[m].length}/${runs} runs)`);
  const hardest = Object.entries(perFloor).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f, n]) => `floor ${f}: ${(n / runs).toFixed(0)} tries`);
  console.log('Hardest floors:', hardest.join(', '));
  await closeDb();await stopDb();
})().catch(e => { console.error(e); process.exit(1); });
