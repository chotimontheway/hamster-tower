-- Floor data: written by one process only, everyone reads it through the CDN
CREATE TABLE IF NOT EXISTS rounds (
  floor   int PRIMARY KEY,
  core    text NOT NULL,
  round   int NOT NULL,
  work    int NOT NULL,
  blocks  real NOT NULL,
  hash    text NOT NULL,
  gap     int NOT NULL,
  t       bigint NOT NULL,
  UNIQUE (core, round)
);
CREATE TABLE IF NOT EXISTS sync_state (
  core       text PRIMARY KEY,
  after_round int NOT NULL DEFAULT 0,
  cum_work   bigint NOT NULL DEFAULT 0,
  cum_units  bigint NOT NULL DEFAULT 0,
  frontier   int NOT NULL DEFAULT 0,
  read_at    bigint NOT NULL DEFAULT 0
);
-- A lease instead of a session lock, so it works through a connection pooler
CREATE TABLE IF NOT EXISTS sync_lock (id int PRIMARY KEY, until timestamptz NOT NULL);
INSERT INTO sync_lock (id, until) VALUES (1, now()) ON CONFLICT (id) DO NOTHING;

-- Hot data: one small row, written after every battle. The low fillfactor lets updates skip the indexes
CREATE TABLE IF NOT EXISTS players (
  id        bigserial PRIMARY KEY,
  wallet    text UNIQUE,
  name      text NOT NULL,
  top       int NOT NULL DEFAULT 0,
  top_at    timestamptz,
  coins     bigint NOT NULL DEFAULT 0,
  chests    int[] NOT NULL DEFAULT '{0,0,0,0,0}',
  pity_e    int NOT NULL DEFAULT 0,
  pity_l    int NOT NULL DEFAULT 0,
  bags      int NOT NULL DEFAULT 0,
  battles   int NOT NULL DEFAULT 0,
  wins      int NOT NULL DEFAULT 0,
  sweep_day text,
  rs        int[] NOT NULL,
  team      text[] NOT NULL,
  gifts     jsonb NOT NULL DEFAULT '{}',
  last_req  text,
  version   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 70);
CREATE INDEX IF NOT EXISTS players_rank ON players (top DESC, top_at ASC) WHERE top > 0;

-- Cold data: each player's pets and gear packed in one row, never one row per item
CREATE TABLE IF NOT EXISTS inventory (
  player_id bigint PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  owned     jsonb NOT NULL,
  items     jsonb NOT NULL,
  uid       int NOT NULL
);
-- Food counts by id, added after the first release
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS foods jsonb NOT NULL DEFAULT '{}';

-- Log of first clears, for checking cheats. Deleted after 7 days
CREATE TABLE IF NOT EXISTS battle_log (
  id        bigserial PRIMARY KEY,
  player_id bigint NOT NULL,
  floor     int NOT NULL,
  rounds    int NOT NULL,
  ms        int NOT NULL,
  plans     jsonb NOT NULL,
  at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS battle_log_at ON battle_log (at);
