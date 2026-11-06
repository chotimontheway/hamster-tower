// Configuration from environment variables. Production must set SESSION_SECRET and DATABASE_URL.
const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

/* The hamster's history lives on consecutive contracts, because Squeekchain redeploys now and then and the rounds restart.
   Only append to this list and never reorder it, because floor numbers depend on the order. A contract that has stopped is
   pinned to its last round. The live one is named by GET https://api.squeekchain.com/v1/core, and the servers here cannot
   read that address, so a new contract has to be added by hand. Until it is, new floors and the Arena wait. */
const DEFAULT_CORES = [
  { core: '0x74665dAecA35A2303e767E76a2FF1FB6F93e119f', genesis: 1791847800, through: 1973 },
  { core: '0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44', genesis: 1793022600, through: 1339 },
  { core: '0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4', genesis: 1793735400 },
];

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (isProd) throw new Error('SESSION_SECRET is not set');
  return 'local-development-only-never-use-in-production';
}

/* ON A COMPUTER ONLY: the SQK contract the owner page attached (.data/sqk.json) and this game's own signer key (.data/sqk-signer.key).
   Production never reads files, it takes SQK_SHOP and its key from the environment */
const path = require('path'), fs = require('fs');
const DATA = path.join(__dirname, '..', '.data');
const LOCAL = { at: 0, v: {} };
function localSqk() {
  if (isProd) return {};
  if (Date.now() - LOCAL.at > 3000) {
    try { LOCAL.v = JSON.parse(fs.readFileSync(path.join(DATA, 'sqk.json'), 'utf8')) || {}; } catch (e) { LOCAL.v = {}; }
    LOCAL.at = Date.now();
  }
  return LOCAL.v;
}
let KEY = null;
function localSignerKey() {
  if (KEY) return KEY;
  const file = path.join(DATA, 'sqk-signer.key');
  try { const k = fs.readFileSync(file, 'utf8').trim(); if (/^0x[0-9a-f]{64}$/.test(k)) return (KEY = k); } catch (e) {}
  KEY = '0x' + require('crypto').randomBytes(32).toString('hex');
  try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(file, KEY + '\n', { mode: 0o600 }); } catch (e) {}
  return KEY;
}

module.exports = {
  isProd,
  secret,
  databaseUrl: () => process.env.DATABASE_URL,
  pgPoolMax: () => +(process.env.PG_POOL_MAX || (process.env.VERCEL ? 1 : 12)),
  allowGuest: () => process.env.ALLOW_GUEST === '1',
  /* ALLOW_TRIAL gives the test panel to everyone, for local runs only. On the live site only the wallets in TEST_WALLETS get it */
  allowTrial: () => process.env.ALLOW_TRIAL === '1',
  testWallets: () => (process.env.TEST_WALLETS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean),
  cronSecret: () => process.env.CRON_SECRET || '',
  /* sites that may call the API from another address: the hosted static copy of the game */
  corsOrigins: () => (process.env.CORS_ORIGINS || 'https://hamster-tower.identitymd.eth.limo,https://hamster-tower.imd.site').split(',').map(s => s.trim()).filter(Boolean),
  rateLimitOff: () => process.env.RATE_LIMIT_OFF === '1',
  minMsPerRound: () => +(process.env.MIN_MS_PER_ROUND === undefined ? 700 : process.env.MIN_MS_PER_ROUND),
  rpcs: () => (process.env.SEPOLIA_RPC || 'https://ethereum-sepolia-rpc.publicnode.com,https://sepolia.gateway.tenderly.co,https://sepolia.rpc.thirdweb.com').split(',').map(s => s.trim()).filter(Boolean),
  cores: () => (process.env.SQUEEK_CORES ? JSON.parse(process.env.SQUEEK_CORES) : DEFAULT_CORES),
  /* the Squeek collection and Staking, from the official deployment record https://docs.squeekchain.com/assets/deployments/sepolia.json (release core-sepolia-20261103).
     Squeekchain may redeploy before mainnet. Until a new address is set here, Squeek pets cannot be checked and stay out of battles, the rest of the game carries on */
  squeekNft: () => (process.env.SQUEEK_NFT || '0xc4c7982657f00509548f3a3a41db7fa439a6856b').toLowerCase(),
  squeekStaking: () => (process.env.SQUEEK_STAKING || '0x50fd1780526c3186a0c037c7622203bc4fb611ca').toLowerCase(),
  /* local tests only: "id:wallet:level,..." stands in for the owner and level on the chain, or "@file" holding that text so a test can change it. Ignored in production */
  squeekFake: () => {
    if (isProd) return '';
    const v = process.env.SQUEEK_FAKE_OWNERS || '';
    if (!v.startsWith('@')) return v;
    try { return require('fs').readFileSync(v.slice(1), 'utf8').trim() || 'none'; } catch (e) { return 'none'; }
  },
  /* how old a Squeek check may be before a battle checks the chain again. Tests may set it to 0 */
  squeekRecheckMs: () => (!isProd && process.env.SQUEEK_RECHECK_MS !== undefined ? +process.env.SQUEEK_RECHECK_MS : 600000),
  /* SQK: the game's contract, contracts/src/HamsterTowerSQK.sol, which sells the SQK Chest and pays boss floor rewards. Without it both stay off */
  sqkShop: () => { const a = (process.env.SQK_SHOP || localSqk().shop || '').trim().toLowerCase(); return /^0x[0-9a-f]{40}$/.test(a) ? a : ''; },
  sqkToken: () => (process.env.SQK_TOKEN || '0xd78a3956cf63164d1fa1c622ad3c66623162fa1e').trim().toLowerCase(),
  sqkChainId: () => +(process.env.SQK_CHAIN_ID || 11155111),
  sqkRpcs: () => (process.env.SQK_RPC ? process.env.SQK_RPC.split(',').map(s => s.trim()).filter(Boolean) : module.exports.rpcs()),
  /* the key that signs how much SQK a wallet has earned. It holds nothing, and the contract's owner can replace it there at any time. Without
     SQK_SIGNER_KEY it is made from SESSION_SECRET, which already guards every session, so no new secret has to be kept. Never logged */
  sqkSignerKey: () => {
    const k = (process.env.SQK_SIGNER_KEY || '').trim();
    if (/^0x[0-9a-fA-F]{64}$/.test(k)) return k;
    /* a game on a computer has no secret of its own, and the development one is public, so it makes a random key once and keeps it in .data */
    if (!isProd && !process.env.SESSION_SECRET) return localSignerKey();
    return '0x' + require('crypto').createHmac('sha256', secret()).update('hamster-tower-sqk-signer').digest('hex');
  },
  /* blocks a purchase needs on top of it before the chest is given */
  sqkConfirmations: () => Math.max(1, +(process.env.SQK_CONFIRMATIONS || 3)),
  /* the block the contract was made in, so a search for missed purchases never reads further back */
  sqkFromBlock: () => +(process.env.SQK_FROM_BLOCK || localSqk().fromBlock || 0),
  /* whether a dev wallet earns and claims SQK like a player, to test claims. On by default on a computer, off on the live site unless DEV_SQK=1,
     because a dev wallet can jump floors and would collect every pouch on the way */
  devSqk: () => (process.env.DEV_SQK !== undefined && process.env.DEV_SQK !== '' ? process.env.DEV_SQK === '1' : !isProd),
  /* social quests show to players only with SOCIAL_QUESTS=1, until then their place says Coming soon */
  socialQuests: () => process.env.SOCIAL_QUESTS === '1',
  /* CONNECT X: an app from the X developer portal. Without its id and secret, connecting X and every social check stay off.
     The callback must be listed in that app exactly, for example https://www.hamstertower.site/api/x/callback. The other addresses
     are X's own and only change for tests */
  xClientId: () => (process.env.X_CLIENT_ID || '').trim(),
  xClientSecret: () => (process.env.X_CLIENT_SECRET || '').trim(),
  xRedirectUri: () => (process.env.X_REDIRECT_URI || '').trim(),
  /* read only: who the player is, their posts, likes and follows, and a refresh token so a check works after two hours */
  xScopes: () => (process.env.X_SCOPES || 'tweet.read users.read like.read follows.read offline.access').trim(),
  xAuthorizeUrl: () => (process.env.X_AUTHORIZE_URL || 'https://x.com/i/oauth2/authorize').trim(),
  xTokenUrl: () => (process.env.X_TOKEN_URL || 'https://api.x.com/2/oauth2/token').trim(),
  xRevokeUrl: () => (process.env.X_REVOKE_URL || 'https://api.x.com/2/oauth2/revoke').trim(),
  xApiBase: () => (process.env.X_API_BASE || 'https://api.x.com/2').trim().replace(/\/$/, ''),
  /* the fields a post check asks for, as parameter=list. The current docs name them post.fields and referenced_posts, older apps tweet.fields and referenced_tweets */
  xFields: () => (process.env.X_FIELDS || 'post.fields=referenced_posts,conversation_id,created_at,author_id').trim(),
  /* how many of a player's newest follows a follow check reads. X charges each one read */
  xFollowPage: () => Math.max(10, Math.min(1000, +(process.env.X_FOLLOW_PAGE || 100))),
  confirmations: 12,
  syncEveryMs: 60000,
  maxItems: 500,
};
