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
-- The Tower Points each player claimed in a week, named by its Monday (UTC). Who got there first breaks a tie, see lib/tpweek.js
CREATE TABLE IF NOT EXISTS tp_weeks (
  week      text NOT NULL,
  player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  tp        int NOT NULL DEFAULT 0,
  at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week, player_id)
) WITH (fillfactor = 70);
CREATE INDEX IF NOT EXISTS tp_weeks_board ON tp_weeks (week, tp DESC, at);

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
-- When a page said the run began, for a fight the chain could not confirm yet. Checked once the chain has caught up
ALTER TABLE arena_log ADD COLUMN IF NOT EXISTS early bigint;

-- Squeek NFTs brought in as pets. Traits and the picture are read from tokenURI once and never change. Level, holder and the player it fights for are
-- read from the chain again when a check is old. A Squeek fights for one player at a time
CREATE TABLE IF NOT EXISTS squeeks (
  id         int PRIMARY KEY,
  traits     jsonb NOT NULL,
  art        jsonb NOT NULL,
  svg        text NOT NULL,
  level      int NOT NULL DEFAULT 1,
  holder     text,
  staked     boolean NOT NULL DEFAULT false,
  player_id  bigint REFERENCES players (id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS squeeks_player ON squeeks (player_id);

-- SQK: SQK Chests not opened yet, the days whose purchase was counted, boss floor pouches and the SQK they gave. Purchases and payouts themselves are on the chain
ALTER TABLE players ADD COLUMN IF NOT EXISTS sqk jsonb NOT NULL DEFAULT '{}';

-- Quests: Tower Points earned, and today's quest list with its progress, the social quests done and the player's X name
ALTER TABLE players ADD COLUMN IF NOT EXISTS tp bigint NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS quests jsonb NOT NULL DEFAULT '{}';
-- Social quests the dev wallet writes on the admin screen. need holds the tags and hashtags a post must carry, space separated
CREATE TABLE IF NOT EXISTS social_quests (
  id         serial PRIMARY KEY,
  kind       text NOT NULL,
  title      text NOT NULL,
  url        text NOT NULL DEFAULT '',
  need       text NOT NULL DEFAULT '',
  tp         int NOT NULL,
  sqk_p      real NOT NULL DEFAULT 0,
  sqk_max    real NOT NULL DEFAULT 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Who did which social quest, with the link they gave for a comment or a post, so the admin can look at them
CREATE TABLE IF NOT EXISTS social_done (
  quest_id  int NOT NULL REFERENCES social_quests (id) ON DELETE CASCADE,
  player_id bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  proof     text,
  tp        int NOT NULL,
  sqk       bigint NOT NULL DEFAULT 0,
  at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (quest_id, player_id)
);
CREATE INDEX IF NOT EXISTS social_done_at ON social_done (at DESC);
-- X accounts connected through X's own sign in. One X account belongs to one player. The token is encrypted with a key made from
-- SESSION_SECRET and only reads that account's own posts, likes and follows for the checks
CREATE TABLE IF NOT EXISTS x_accounts (
  x_id       text PRIMARY KEY,
  player_id  bigint NOT NULL UNIQUE REFERENCES players (id) ON DELETE CASCADE,
  username   text NOT NULL,
  token      text NOT NULL,
  linked_at  timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- the X account that did each social quest, so moving it to another player cannot do the same quests again
ALTER TABLE social_done ADD COLUMN IF NOT EXISTS x_id text;
CREATE UNIQUE INDEX IF NOT EXISTS social_done_x ON social_done (quest_id, x_id) WHERE x_id IS NOT NULL;
-- one post or comment can pay one player only. A copy made before this rule may hold the same link twice, the first one stays
DELETE FROM social_done a USING social_done b WHERE a.proof IS NOT NULL AND a.proof = b.proof AND (a.at, a.quest_id, a.player_id) > (b.at, b.quest_id, b.player_id);
CREATE UNIQUE INDEX IF NOT EXISTS social_done_proof ON social_done (proof) WHERE proof IS NOT NULL;

-- One row for each browser that said yes to alerts. What was last announced is kept here, so each alert goes to a browser once:
-- arena_from is the start of the hamster's run the Arena alert was sent for, quest_day the UTC day the quest reminder was sent for
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint   text PRIMARY KEY,
  player_id  bigint NOT NULL REFERENCES players (id) ON DELETE CASCADE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  arena      boolean NOT NULL DEFAULT true,
  quests     boolean NOT NULL DEFAULT true,
  arena_from bigint NOT NULL DEFAULT 0,
  quest_day  text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subs_player ON push_subs (player_id);
