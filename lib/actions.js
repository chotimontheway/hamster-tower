// Every action that changes player data. The client only sends what it wants to do, the server rolls all random results.
const E = require('./engine.generated.cjs');
const cfg = require('./config');
const { bad } = require('./http');

const int = (v, a, b) => { const n = Math.floor(Number(v)); if (!Number.isFinite(n)) bad('Invalid number'); return Math.max(a, Math.min(b, n)); };
const fullMsg = () => `Your inventory is full (${cfg.maxItems} items max). Sell some items first.`;
const roomFor = (G, n) => { if (G.items.length + n > cfg.maxItems) bad(fullMsg()); };
/* only a plain string: an array holding the name would pass the lookup too, and that let one pet stand in a team three times */
const owned = (G, id) => { if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(G.owned, id)) bad('You do not own this pet'); return G.owned[id]; };

const ACTIONS = {
  sweep(G, a, c) {
    const r = E.doSweep(G, c.floors, Date.now());
    if (!r) bad(G.top === 0 ? 'Clear the first floor to unlock Sweep' : 'You already used Sweep today');
    c.quest({ k: 'sweep' });
    return { r };
  },
  bag(G, a, c) {
    const n = int(a.n, 1, 50);
    roomFor(G, n);
    const results = [];
    for (let i = 0; i < n; i++) { const r = E.openBag(G); if (!r) break; results.push(r); }
    if (!results.length) bad('Not enough coins');
    c.quest({ k: 'bag', n: results.length });
    return { results, cold: true };
  },
  chest(G, a, c) {
    const results = [], MAX = 1000;
    const canHold = () => G.items.length < cfg.maxItems;
    if (a.all) {
      for (let t = 4; t >= 0; t--) while (G.chests[t] > 0 && results.length < MAX && canHold()) results.push(E.openChest(G, t));
    } else {
      const t = int(a.tier, 0, 4), n = int(a.n, 1, 50);
      for (let i = 0; i < n && G.chests[t] > 0 && canHold(); i++) results.push(E.openChest(G, t));
    }
    if (!results.length) bad(canHold() ? 'No chests to open' : fullMsg());
    c.quest({ k: 'chests', n: results.length });
    return { results, cold: true };
  },
  /* an SQK Chest opens only with room for everything it can hold */
  sqkchest(G) {
    if (!(E.sqkOf(G).box > 0)) bad('No SQK Chest to open');
    roomFor(G, E.sqkChestRoom());
    return { results: [E.openSqkChest(G)], cold: true };
  },
  pouch(G, a) {
    const q = E.sqkOf(G);
    if (!q.pouch.length) bad('No SQK pouch to open');
    const n = a.all ? q.pouch.length : int(a.n, 1, 50), results = [];
    for (let i = 0; i < n && q.pouch.length; i++) results.push(E.openPouch(G));
    return { results };
  },
  foodbag(G, a) {
    const t = int(a.tier, 0, E.FOOD_BAGS.length - 1), n = int(a.n, 1, 50);
    const results = [];
    for (let i = 0; i < n; i++) { const r = E.openFoodBag(G, t); if (!r) break; results.push(r); }
    if (!results.length) bad('Not enough coins');
    return { results, cold: true };
  },
  feed(G, a) {
    const o = owned(G, a.id);
    if (o.full >= E.stomach(o.lv)) bad('This hamster is already full, time to run the wheel');
    if (a.auto) {
      const used = E.autoFeed(G, a.id);
      if (!used) bad('You have no food that suits this hamster. Buy some in the Shop.');
      return { used, cold: true };
    }
    if (typeof a.food !== 'string' || !Object.prototype.hasOwnProperty.call(E.FOODS, a.food)) bad('Invalid food');
    const used = E.feedPet(G, a.id, a.food, int(a.n, 1, 999));
    if (!used) bad('You do not have this food');
    return { used, cold: true };
  },
  run(G, a, c) {
    owned(G, a.id);
    if (a.all) {
      const r = E.trainAll(G, a.id, 200);
      if (!r.runs) bad('Not enough food to fill this hamster');
      c.quest({ k: 'wheel', n: r.runs });
      return { r, cold: true };
    }
    const r = E.runWheel(G, a.id);
    if (!r) bad('This hamster is not full yet');
    c.quest({ k: 'wheel' });
    return { r, cold: true };
  },
  adopt(G, a) {
    if (typeof a.id !== 'string' || !Object.prototype.hasOwnProperty.call(E.PETS, a.id)) bad('Invalid pet');
    if (!E.ADOPT[E.PETS[a.id].rar]) bad('This pet only comes from blind bags and chests');
    if (G.owned[a.id]) bad('You already own this pet');
    if (!E.adopt(G, a.id)) bad('Not enough coins');
    return { cold: true };
  },
  preset(G, a) {
    const i = int(a.slot, 0, E.PRESETS - 1);
    if (a.op === 'save') E.savePreset(G, i);
    else if (a.op === 'use') { if (!E.usePreset(G, i)) bad('This saved team is empty'); }
    else if (a.op === 'clear') { if (G.presets[i]) G.presets[i] = null; }
    else bad('Invalid action');
    return { cold: true };
  },
  team(G, a) {
    const t = a.team, why = E.teamProblem(G, t);
    if (why) bad(why);
    G.team = t.slice();
  },
  branch(G, a) {
    const o = owned(G, a.id);
    if (o.star < 3) bad(E.isSq(a.id) ? 'A Squeek chooses a branch from merge level 3' : 'Choosing a branch needs 3 stars');
    const list = E.BRANCHES[E.PETS[a.id].role].map(b => b[0]);
    if (a.b !== null && !list.includes(a.b)) bad('Invalid branch');
    o.branch = a.b;
    return { cold: true };
  },
  equip(G, a) {
    owned(G, a.id);
    if (!E.itemByUid(G, a.uid)) bad('You do not have this item');
    E.equip(G, a.id, a.uid);
    return { cold: true };
  },
  unequip(G, a) {
    owned(G, a.id);
    if (typeof a.slot !== 'string' || !Object.prototype.hasOwnProperty.call(E.SLOTS, a.slot)) bad('Invalid gear slot');
    E.unequip(G, a.id, a.slot);
    return { cold: true };
  },
  merge(G, a) {
    if (a.all) { const m = E.mergeAll(G); return { m, cold: true }; }
    const r = E.tryMerge(G, a.uid);
    if (!r) bad('Not enough items to merge');
    return { r, cold: true };
  },
  sell(G, a) {
    if (a.uid !== undefined) {
      const it = E.itemByUid(G, a.uid);
      if (!it) bad('You do not have this item');
      if (E.equippedUids(G).has(it.uid)) bad('This item is equipped');
      if (E.savedUids(G).has(it.uid)) bad('This item is in a saved team');
      const v = E.RARS[it.rar].sell * (1 + it.plus);
      G.items = G.items.filter(x => x.uid !== it.uid);
      G.coins += v;
      return { count: 1, coins: v, cold: true };
    }
    const rars = (Array.isArray(a.rars) ? a.rars : []).filter(r => E.RAR_ORDER.includes(r));
    const p = E.sellAll(G, rars);
    return { count: p.list.length, coins: p.coins, cold: true };
  },
};

/* only for wallets in TEST_WALLETS, or anyone when ALLOW_TRIAL=1 on a local machine */
const TRIAL = {
  coins(G) { G.coins += 10000; },
  chests(G) { [20, 10, 5, 2, 1].forEach((n, t) => { G.chests[t] += n; }); },
  food(G) {
    E.FOODS_LIST.forEach(f => { G.foods[f.id] = (G.foods[f.id] || 0) + 10; });
    return { cold: true };
  },
  pets(G) {
    E.PETS_LIST.forEach(p => { if (!G.owned[p.id]) G.owned[p.id] = Object.assign(E.newPet(Math.max(1, Math.round(1 + G.top * .5))), { star: 3 }); });
    return { cold: true };
  },
  sweep(G) { G.sweepDay = null; },
  /* an SQK Chest and three pouches, to see them open without buying or climbing */
  sqk(G) { const q = E.sqkOf(G); q.box++; q.pouch.push(10, 50, 100); },
  jump(G, a, c) {
    const n = int(a.n, 0, c.floors.length);
    G.top = n;
    E.GIFTS.forEach(([gf, gid]) => {
      if (n >= gf && !G.gifts[gid]) {
        G.gifts[gid] = 1;
        if (!G.owned[gid]) G.owned[gid] = E.newPet();
        if (G.team.length < 3 && !G.team.includes(gid)) G.team.push(gid);
      }
    });
    const lv = Math.round(1 + n * .62);
    Object.values(G.owned).forEach(o => { o.lv = Math.max(o.lv, lv); });
    return { lv, cold: true };
  },
  wipe(G) {
    const f = E.newSave('wipe' + Math.random());
    Object.assign(G, { coins: 0, top: 0, team: f.team, owned: f.owned, items: [], foods: {}, presets: [], chests: f.chests, uid: 1, pityE: 0, pityL: 0, bags: 0, sweepDay: null, gifts: {}, battles: G.battles + 1, wins: 0 });
    return { cold: true };
  },
};
module.exports = { ACTIONS, TRIAL };
