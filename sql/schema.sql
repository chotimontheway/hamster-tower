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
-- Saved teams, added with the upper tower rules
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS presets jsonb NOT NULL DEFAULT '[]';

-- The battle a player is in. Turns are counted here so each one can only be played once. The battle itself travels as a signed ticket
CREATE TABLE IF NOT EXISTS fights (
  player_id bigint PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  id        text NOT NULL,
  b         int NOT NULL,
  n         int NOT NULL DEFAULT 0,
  plan_hash text,
  at        timestamptz NOT NULL DEFAULT now()
) WITH (fillfactor = 50);

-- Every legendary that drops, for checking a climb by hand
CREATE TABLE IF NOT EXISTS rare_drops (
  id        bigserial PRIMARY KEY,
  player_id bigint NOT NULL,
  source    text NOT NULL,
  kind      text NOT NULL,
  ref       text NOT NULL,
  at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rare_drops_player ON rare_drops (player_id, at);

-- Today's Challenge: the fight is saved once a day, scores keep each player's best. Scores are deleted after 30 days
CREATE TABLE IF NOT EXISTS daily_days (
  day text PRIMARY KEY,
  ch  jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS daily_scores (
  day       text NOT NULL,
  player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  tries     int NOT NULL DEFAULT 0,
  rounds    int,
  hp        int,
  at        timestamptz,
  PRIMARY KEY (day, player_id)
) WITH (fillfactor = 70);
CREATE INDEX IF NOT EXISTS daily_board ON daily_scores (day, rounds, hp DESC, at) WHERE rounds IS NOT NULL;

-- Log of first clears, for checking cheats. The plans are cleared after 30 days, floor and timing stay
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

-- Arena Tower: a row only for a floor a real player holds, every other floor has its own team from the game
CREATE TABLE IF NOT EXISTS arena_floors (
  floor     int PRIMARY KEY,
  player_id bigint NOT NULL UNIQUE REFERENCES players (id) ON DELETE CASCADE,
  since     timestamptz NOT NULL DEFAULT now()
);
-- Today's tries and the team that defends
CREATE TABLE IF NOT EXISTS arena_players (
  player_id bigint PRIMARY KEY REFERENCES players (id) ON DELETE CASCADE,
  day       text NOT NULL DEFAULT '',
  tries     int NOT NULL DEFAULT 0,
  def       jsonb
) WITH (fillfactor = 70);
-- The floor each player who fought that day stands on when the day ends. Rows are deleted after 30 days
CREATE TABLE IF NOT EXISTS arena_days (
  day       text NOT NULL,
  player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  floor     int NOT NULL,
  PRIMARY KEY (day, player_id)
);
-- Recent fights, shown to both sides. Rows are deleted after 30 days
CREATE TABLE IF NOT EXISTS arena_log (
  id        text PRIMARY KEY,
  at        timestamptz NOT NULL DEFAULT now(),
  attacker  bigint NOT NULL,
  defender  bigint,
  floor     int NOT NULL,
  won       boolean NOT NULL,
  moved     boolean NOT NULL,
  fell      int
);
CREATE INDEX IF NOT EXISTS arena_log_attacker ON arena_log (attacker, at DESC);
CREATE INDEX IF NOT EXISTS arena_log_defender ON arena_log (defender, at DESC);
