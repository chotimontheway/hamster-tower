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
  confirmations: 12,
  syncEveryMs: 60000,
  maxItems: 500,
};
