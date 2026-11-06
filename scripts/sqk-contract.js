// Compiles contracts/src/HamsterTowerSQK.sol with Foundry and writes contracts/HamsterTowerSQK.json, which holds the ABI,
// the bytecode and the exact compiler settings, so the deploy page and the tests need no compiler and the source can be
// verified on an explorer with the same settings. Needs forge, set FORGE to its path if it is not on PATH.
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os');
const DIR = path.join(__dirname, '..', 'contracts');
const forge = process.env.FORGE || (fs.existsSync(path.join(os.homedir(), '.foundry/bin/forge.exe')) ? path.join(os.homedir(), '.foundry/bin/forge.exe') : 'forge');
execFileSync(forge, ['build', '--silent'], { cwd: DIR, stdio: 'inherit' });
const art = JSON.parse(fs.readFileSync(path.join(DIR, 'out/HamsterTowerSQK.sol/HamsterTowerSQK.json'), 'utf8'));
const meta = typeof art.rawMetadata === 'string' ? JSON.parse(art.rawMetadata) : art.metadata;
const out = {
  contract: 'HamsterTowerSQK',
  source: 'contracts/src/HamsterTowerSQK.sol',
  compiler: meta.compiler.version,
  settings: { optimizer: meta.settings.optimizer, evmVersion: meta.settings.evmVersion, metadata: meta.settings.metadata },
  abi: art.abi,
  bytecode: art.bytecode.object,
};
fs.writeFileSync(path.join(DIR, 'HamsterTowerSQK.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`Wrote contracts/HamsterTowerSQK.json, solc ${out.compiler}, ${(out.bytecode.length - 2) / 2} bytes of bytecode`);
