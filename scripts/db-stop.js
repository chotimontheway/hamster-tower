// Stops the local Postgres if it is still running, for example after a terminal was closed without Ctrl+C.
const { spawnSync } = require('child_process'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
const dataDir = path.join(ROOT, '.data', 'pg');
const candidates = ['windows-x64', 'linux-x64', 'darwin-arm64', 'darwin-x64'].map(p => path.join(ROOT, 'node_modules', '@embedded-postgres', p, 'native', 'bin', process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl'));
const pgCtl = candidates.find(f => fs.existsSync(f));
if (!pgCtl) { console.log('The local database tools are not installed.'); process.exit(0); }
if (!fs.existsSync(path.join(dataDir, 'postmaster.pid'))) { console.log('The local database is not running.'); process.exit(0); }
const r = spawnSync(pgCtl, ['-D', dataDir, 'stop', '-m', 'fast'], { encoding: 'utf8' });
const text = r.stderr || r.stdout || '';
if (r.status === 0) console.log('The local database stopped.');
else if (/No such process|not running|PID file .* does not exist/i.test(text)) console.log('The local database is not running.');
else console.log('Could not stop it: ' + text);
