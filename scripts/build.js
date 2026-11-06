// Assembles the code: one copy for the server (lib/engine.generated.cjs) and one minified copy for the browser (public/app).
// With --export it writes dist/ instead: a static copy with its own art that calls the API named in site.config.json, for hosting on IPFS.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const esbuild = require('esbuild');
const ROOT = path.join(__dirname, '..');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exporting = process.argv.includes('--export');
const data = rd('shared/data.js'), core = rd('shared/core.js');
const EXPORTS = ['seedOf', 'rnd', 'pick', 'TUNE', 'hardAt', 'elRight', 'elWrong', 'floorScale', 'matchup', 'ADOPT', 'adopt', 'PRESETS', 'savePreset', 'usePreset', 'savedUids', 'GIFTS', 'buildFloors', 'newSave', 'newPet', 'stomach', 'runXp', 'xpNeed', 'luckAvg', 'foodRate', 'feedPlan', 'petStats', 'petPower', 'startBattle', 'runRound', 'finishWin', 'doSweep', 'canSweep', 'dayKey', 'dailyG', 'DAILY_TRIES', 'LIVE_BONUS', 'LIVE_MINUTES', 'dailyPrize', 'DAILY_PRIZES', 'ARENA', 'arenaRead', 'arenaState', 'ARENA_PRIZES', 'arenaPrize', 'teamSnapshot', 'snapshotG', 'arenaG', 'teamPower', 'arenaBot', 'arenaNode', 'arenaTargets', 'foePick', 'foeTarget', 'peekMove', 'previewAim', 'openBag', 'openChest', 'openFoodBag', 'feedPet', 'autoFeed', 'runWheel', 'trainAll', 'tryMerge', 'mergeAll', 'sellAll', 'sellPreview', 'equip', 'unequip', 'canMerge', 'itemByUid', 'equippedUids', 'chestTotal', 'alive', 'canPick', 'minBy', 'hpPct', 'uById', 'itemVal', 'BRANCHES', 'PETS', 'PETS_LIST', 'MONS', 'MONS_LIST', 'BOSS_LIST', 'RAR_ORDER', 'RARS', 'SLOTS', 'CHESTS', 'BAG_COST', 'FOODS', 'FOODS_LIST', 'FOOD_BAGS', 'RUN_LUCK', 'RULES', 'MAP_NAMES', 'TONE_NAMES', 'ROLES', 'ELS', 'SQ_MAX', 'SQ_STAR', 'SQ_EL', 'SQ_ROLE', 'SQ_EYE', 'SQ_ULT', 'sqBase', 'squeekDef', 'isSq', 'addSqueek', 'useSqueeks', 'ensureSqueeks', 'sqUsable', 'teamProblem', 'skillDesc', 'grantPet', 'SQK_CHEST', 'SQK_POUCH', 'SQK_UNIT', 'sqkOf', 'creditSqkChest', 'sqkChestRoom', 'openSqkChest', 'pouchBand', 'grantPouches', 'rollPouch', 'openPouch', 'sqkText', 'newItem', 'QUEST_BANDS', 'QUEST_MS', 'QUEST_KINDS', 'SOCIAL_KINDS', 'SOCIAL_SQK', 'questOf', 'questBand', 'questMs', 'questMsTp', 'questDone', 'questKinds', 'newQuests', 'ensureQuests', 'questOn', 'claimQuest', 'claimQuestTp', 'swapQuest', 'socialReward', 'wPick'];
if (!exporting) fs.writeFileSync(path.join(ROOT, 'lib/engine.generated.cjs'), `// Generated from shared/data.js and shared/core.js by npm run build. Do not edit by hand.\n${data}\n${core}\nmodule.exports = { ${EXPORTS.join(', ')} };\n`);
const js = [data, core, rd('client/fx.js'), rd('client/map.js'), rd('client/sound.js'), rd('client/rig-art.js'), rd('client/rig-mon.js'), rd('client/rig.js'), rd('client/squeek.js'), rd('client/sqk.js'), rd('client/quests.js'), rd('client/patches.js'), rd('client/ui.js')].join('\n');
/* the pictures are cached for days, so their address changes whenever one of them changes */
const artV = (() => { const h = crypto.createHash('sha256'); for (const d of ['public/art', 'public/brand']) for (const f of fs.readdirSync(path.join(ROOT, d)).sort()) { h.update(f); h.update(fs.readFileSync(path.join(ROOT, d, f))); } return h.digest('hex').slice(0, 8); })();
const css = rd('client/style.css').replace(/(art\/[a-z_]+\.webp)/g, `$1?v=${artV}`);
const apiBase = exporting ? (process.env.API_BASE || JSON.parse(rd('site.config.json')).apiBase).replace(/\/$/, '') : '';
const OUT = path.join(ROOT, exporting ? 'dist' : 'public');
(async () => {
  const j = await esbuild.transform(js, { minify: true, target: 'es2020', legalComments: 'none', charset: 'utf8', define: { __API_BASE__: JSON.stringify(apiBase), __ART_V__: JSON.stringify(artV) } });
  const c = await esbuild.transform(css, { minify: true, loader: 'css', charset: 'utf8' });
  const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
  if (exporting) { fs.rmSync(OUT, { recursive: true, force: true }); for (const d of ['art', 'fonts', 'brand']) fs.cpSync(path.join(ROOT, 'public', d), path.join(OUT, d), { recursive: true }); }
  const appDir = path.join(OUT, 'app');
  fs.mkdirSync(appDir, { recursive: true });
  for (const f of fs.readdirSync(appDir)) fs.unlinkSync(path.join(appDir, f));
  const jsName = `app.${hash(j.code)}.js`, cssName = `app.${hash(c.code)}.css`;
  fs.writeFileSync(path.join(appDir, jsName), j.code);
  fs.writeFileSync(path.join(appDir, cssName), c.code);
  fs.writeFileSync(path.join(OUT, 'index.html'), rd('client/index.html').replace('{{CSS}}', cssName).replace('{{JS}}', jsName).replace(/((?:art|brand)\/[a-z0-9_-]+\.(?:webp|png|jpg))/g, `$1?v=${artV}`));
  const gz = s => zlib.gzipSync(s).length;
  console.log(`Built ${jsName} ${(j.code.length / 1024).toFixed(0)} KB (gzip ${(gz(j.code) / 1024).toFixed(0)} KB), ${cssName} ${(c.code.length / 1024).toFixed(0)} KB (gzip ${(gz(c.code) / 1024).toFixed(0)} KB)${exporting ? `, static copy in dist/ calling ${apiBase}` : ''}`);
})().catch(e => { console.error(e); process.exit(1); });
