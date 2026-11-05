# Hamster Tower

A turn-based tower climb built on real data from Squeekchain. Every settled round in which the hamster did work is one floor. The round's work sets the floor type, its hash sets the enemies, map and weather, and long naps leave treasure chests.

The tower is built from the hamster's whole history, not from today onward. It has over 500 floors and grows on its own as new rounds settle. A round passes every 10 minutes, but the contract only keeps a record when the hamster ran, about 17% of rounds so far, so empty rounds make no floor.

## Run it locally

You need Node 22 or newer. Nothing else: the project runs its own real Postgres from the project folder.

```
npm install
npm run dev
```

`npm run start` does the same. Run either from this folder, and use `$env:PORT=3100; npm run start` in PowerShell when port 3000 is taken.

Open http://localhost:3000 and choose **Play as guest** or **Sign in with wallet**. The first start creates the database and reads the full round history from the chain, which takes about 20 seconds.

Press Ctrl+C to stop. If you close the terminal instead, the database keeps running. The next `npm run dev` reuses it, or run `npm run db:stop`.

The **Test panel** button adds coins, chests and food, unlocks all pets, resets Sweep and the Daily Challenge, and jumps floors. `npm run dev` sets `ALLOW_TRIAL=1`, which gives it to everyone on your machine. On the live site only the wallets listed in `TEST_WALLETS` get it, and the server checks this on every call. Test wallets from `TEST_WALLETS` are never ranked, and the boards show them as Dev without their address. With `ALLOW_TRIAL=1` the list is empty, so everyone stays on the local board.

## The real hamster in the game

The Tower screen shows what Squeektoshi is doing right now, read by the page itself from the public status API at `/v1/status`. The wheel on the screen turns at his real speed. A stale, simulated or failed reading counts as unknown, and the game keeps working. The page reads it rather than the server because the API's Cloudflare answers Vercel's servers with a 403 challenge, and the docs say the API is for display anyway.

For 30 minutes after a round with work ends, battle wins pay 20% more coins. The server decides this from the rounds on the chain, so no page can claim it. A run reaches the chain a few minutes after its 10 minute round closes, so the bonus starts up to about 15 minutes after he starts.

## Daily Challenge

The biggest round the hamster ran the day before sets one team and one fight for everyone, so the score does not depend on chests or levels. Each player gets 3 tries a day, and a try is used when its first turn is played. Fewest rounds wins, then the most HP left, then whoever got there first. The first win of the day pays one chest, and the chest gets better the more the hamster ran the day before.

When a day ends, the top 10 wallets get rewards the next time they open the game. Guests stay on the board, but only connected wallets count, so the next wallet moves up, and test wallets get none. Rewards go out 15 minutes after midnight UTC, when the last battle of the day has ended. The icon on each board opens the wallets in line and, for the Daily Challenge, the winners of the last finished day.

| Rank | Chest | Blind Bags | Food bags that suit the team |
|---|---|---|---|
| 1 | Diamond | 3 | 10 |
| 2 and 3 | Gold | 2 | 6 |
| 4 to 10 | Silver | 1 | 3 |

The game's own bot plays each draw to set the enemy strength where it wins about 65% of the time, because teams and enemies differ too much for one fixed strength. The first request of a day builds the challenge and saves it in `daily_days`, so a round settled late cannot change it. It plays through the same server turns as a floor and never touches the climb.

A first clear, a boss win or a challenge win can be shared on X. The picture is drawn on the player's device and only leaves it if they post it.

## The upper tower

The first floors stay simple. From floor 30 a full set of gear is not enough: the floor asks for the right pets, the right set and the right move at the right time. All of it grows until floor 200, see `hardAt` in `shared/core.js`.

- **Elements.** A hit with the element that beats the target is 40% stronger and a hit against it 25% weaker on the first floors. From floor 30 the gap grows to 80% and 60% at floor 200, both ways. The floor screen names the best element.
- **Strikes.** Bosses and tier 3 enemies charge a strike, and from floor 30 a charging enemy acts last in the next turn, so the warning always comes in time. A strike hits harder the higher the floor. An Interrupt skill stops it on any floor, and from floor 30 so do Stun, Freeze and Sleep. Control on a skill or Rage skill always lands on a charging enemy, a basic attack keeps its small chance. A shield or Taunt softens it. Some strikes suck away shields first, so a shield is not always enough. Each element has a cheap pet that can interrupt: Little Blade, Seed Forest Archer, Little Dozer, Volt Gunner, Little Sailor and Alchemist. Their skills have a cooldown, so the question is when to use them.
- **Spikes.** From floor 50 some enemies raise Spikes until the end of next turn. Every hit on them hurts the attacker and goes through shields. Spamming attacks into them costs a lot of HP.
- **Sets.** 4 pieces of one set do something big: Miner +20% Bite, Knight a big starting shield and 40% less from strikes, Wizard reactions twice as strong and 20 Rage each, Hunter +60% crit damage and never misses, Nurse 6% HP each action and immune to Poison, Burn and Bleed, Thunder Rage skills 50% stronger with 30 Rage at the start and immune to Static. Bosses show which set suits them.
- **Guard.** Every pet can Guard instead of acting: 60% less from hits that whole turn, whoever acts first, and 20 Rage. Any team can answer a strike or wait out Spikes this way.
- **Getting the right pets.** Little Sailor comes at floor 8, Little Sparky at floor 18 and Corn Farmer at floor 28, so every element is in before elements start to matter. A player past those floors gets them one win at a time. Common pets can be adopted in the Shop for 1,000 coins and Rare pets for 3,000. Epic and Legendary pets only come from blind bags and chests.
- **Raising pets.** A hamster below your strongest gains up to 4 times the XP from a run, so raising a new pet to 80% of your best costs less than half of what it did.
- **Saved teams.** Six slots on the Team screen hold a team and what it wears, and change both in one tap. Gear in a saved team is safe from mass selling and merging.
- **Strength of a floor.** Enemies are drawn from the round hash, so some draws used to be far harder than their floor number. `DANGER` in `shared/data.js` holds how hard each enemy is, measured by simulating every floor, and a floor uses it to even out its strength. Below floor 30 this can only make a floor easier, and the first 10 floors are untouched. Bosses sit a little above the floors around them, and enemies keep growing faster above floor 50.

The Daily Challenge keeps its own rules: everyone gets the same team with no gear, and its bot sets the strength each day.

Measured with bots on the real 524 floors on 2026-11-04, with the real economy: coins, chests, bags, stars, merging and food. Hours count 5 s a turn and 10 s a battle. Each row is 8 whole climbs. No person has played these rules yet.

| Player | Hours to floor 30 | Floor 100 | Floor 200 | Floor 524 | Level at 524 | Before: hours, level |
|---|---|---|---|---|---|---|
| Keeps the first 3 pets, sensible moves | 0.3 | 5.6 | 21.3 | 136 | 298 | 67, 211 |
| Keeps the first 3 pets, spams skills | 0.3 | 7.0 | 25.9 | 173 | 360 | 64, 207 |
| Right team and set for each floor, sensible moves, raises 5 pets | 0.4 | 6.4 | 23.3 | 204 | 187 | 121, 148 |
| The same, raises 9 pets | 0.3 | 8.5 | 37.7 | 285 | 187 | 152, 140 |
| Right team and set, spams skills, raises 9 pets | 0.3 | 7.0 | 61.1 | 414 | 254 | 138, 130 |
| Always the strongest pets, spams skills | 0.9 | 25.4 | 97.6 | 624 | 367 | 146, 173 |
| Always the strongest pets, sensible moves | 1.2 | 27.3 | 102 | 665 | 345 | 181, 175 |

Battles per floor for the 9 pet row, floors 1 to 10, 11 to 20, 21 to 30, 31 to 50, 51 to 75, 76 to 100, 101 to 150, 151 to 200, 201 to 300, 301 to 400, 401 to 524: 1, 1.2, 1.4, 2.6, 7.2, 9.6, 10, 23, 35, 49, 46. Before they went 1, 1.5, 7, 28, 16, 40, 30, 43, 13, 19, 14.

At the level where the right team, set and moves win about 79%, on floors from 30 up: spamming skills wins 48%, a neutral team 34%, a wrong team 16%, no set bonus 28%, the wrong set 51%, and everything wrong 7%. From floor 50, spamming needs 1.5 times the level of expert play on bosses and 1.27 times on normal floors.

New floors follow the same rules, because the chain only picks which enemies, map and weather a floor gets. Redrawing the enemies of every floor gave the same level curve: the level a mid build needs by band was 1, 1, 4, 7, 14, 26, 42, 62, 112, 192, 313 on the real floors and 1, 1, 3, 6, 15, 23, 39, 60, 115, 192, 313 on the redrawn ones. On made up floors past today's tower the need keeps rising, about 540 on floors 525 to 699 and 1,000 on floors 700 to 999, and no number breaks up to floor 2000. Bots raising 5 and 9 pets reached floor 1000 in all 12 climbs, in 859 and 1,143 hours, and the 9 pet bot spent 54, 107, 87, 186 and 143 battles per floor on floors 525 to 600, 601 to 700, 701 to 800, 801 to 900 and 901 to 1000.

Known weak point: choosing well saves level, not time. Keeping the same 3 pets needs 1.6 to 1.9 times the level at floor 524, but all food goes to those 3, so in hours it is still the fastest way up. It was also the fastest before these rules, by a wider margin.

Run `npm run test:rules` after changing any of this.

## Economy

Coins are in-game only. There are no top-ups, tokens, NFTs or trading. All odds are public in the game.

A first clear pays full coins and 2 to 4 chests. A replay pays 30% of the coins with no boss bonus, and has a 70% chance of 1 chest, one tier lower. Replays paid much more before, and spamming a boss floor made pets too strong too fast: in a simulated 2.5 hours at floor 10, team power grew 2.7 times then and 1.6 times now, and a bot climbing the whole tower needs about 11 hours instead of 6.

Hamsters level up through food, not by paying coins directly:

1. Buy a food bag in the **Shop**. Each bag opens into one food, with the same spin and quick open as chests.
2. Feed a hamster until it is 100% full. Foods give different fullness, and a higher level means a bigger stomach.
3. A full hamster can run the wheel, with an animation you can skip. The run empties its stomach and gives random XP.
4. Enough XP gives a level, which adds 10% of base stats.

| Item | Price | Contents |
|---|---|---|
| Snack Bag | 20 coins | Mostly small foods, suits levels 1 to 12 |
| Picnic Basket | 150 coins | Mostly medium foods, suits levels 12 to 40 |
| Feast Crate | 900 coins | Large foods, suits level 40 and up |
| Blind Bag | 500 coins | Gear or a pet |

The 43 foods live in `shared/data.js`. Each one is named as safe in at least one care guide from PetMD, Chewy, Woodgreen or Burgess, checked on 2026-11-02. The guides do not fully agree: PetMD and Burgess advise against cooked human food such as egg, chicken and tofu, which Chewy and Woodgreen allow in small amounts, and Burgess warns that sunflower seeds are very fatty, which PetMD allows as a treat. Grapes, peanuts, walnuts, hazelnuts and pasta were left out because the guides clash on them. In real life these are tiny treats next to a complete pellet diet, and this is not veterinary advice.

Existing saves keep their levels. Pets saved before food existed start with an empty stomach and 0 XP.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Builds and runs everything locally |
| `npm run build` | Builds the site and API for Vercel |
| `npm run export` | Builds the static copy in `dist/` |
| `npm test` | API, anti-cheat and wallet tests against a running server |
| `npm run e2e` | Clicks through the real UI in headless Chrome against a running server |
| `npm run sim` | Balance bot that climbs the tower and reports battles per floor |
| `npm run loadtest` | Simulates many players, see the notes below |
| `npm run sync` | Reads new rounds from the chain once |
| `npm run top10` | Lists the wallets in line for the prize, skipping guests and test wallets, with what is needed to check each climb |
| `npm run bake-art` | Regenerates the WebP art from `client/rig-art.js`, `client/rig-mon.js` and `tools/art-web.js`, needs Chrome. The next build gives the pictures a new address, so browsers fetch them again |
| `npm run db:stop` | Stops the local database |

## How it stays fast with many players

The database does as little as possible.

- **A turn is one small write.** The battle travels as a signed ticket, so the database only holds a short row per player that counts the turns. A turn bumps that counter, and the player's own row is written once, when the battle ends.
- **Actions are batched.** Opening 50 bags, using all food or merging everything is one request and one write.
- **Hot and cold data are separate.** Coins, floor and chest counts sit in one small row written after each battle. Pets, gear and food are written only when they change, as one row per player and never one row per item. Inventories are capped at 500 items, and food is stored as a count per kind.
- **Reads avoid the database.** Art and code are static files on the CDN. The floor list is one cached response. One process reads the chain, however many people play. The leaderboard is cached for 30 seconds.
- **Connections are pooled.** On Vercel each function keeps one connection and must use a pooled `DATABASE_URL`.
- **Duplicates are harmless.** Every request has an id, so a retry cannot pay twice. A version number stops two tabs overwriting each other.

The leaderboard uses an indexed Postgres query behind the cache, so Redis is optional. It only shares request limits between functions.

## Fairness

The client never receives the random state, so chest, bag, food and wheel results cannot be predicted.

Real battles run on the server one turn at a time. A turn's luck is made from the server secret after the plan arrives, each turn is counted in the database and can only be played once, and the server books the result itself. So a modified client cannot see ahead, try a turn twice, claim a win or hide a loss. Practice battles run in the browser and count for nothing.

This does not stop bots. A script can play valid turns, and one person can use many wallets. The minimum time per turn is enforced in the database, so a bot cannot play faster than the fastest person, but a prize still needs a review by hand. `battle_log` keeps each first clear and `rare_drops` keeps every legendary that drops. `npm run top10` prints both for the wallets in line for the prize, and each climber's public page shows the same facts to everyone.

The prize for the top 10 wallets is paid personally by the maker and is not part of the game. Guests stay on the board, and the count skips them and test wallets. The rules are on the Ranks screen.

## Sound and fonts

Every sound is synthesized in `client/sound.js` with the Web Audio API, so there are no audio files and nothing to license. Browsers keep audio off until the first press, the speaker button or the M key mutes it, the note button or the N key turns only the music off, and the choice is remembered in the browser. `tests/flow.js` renders each sound without speakers and fails loudness checks if one goes silent or too loud.

The music is three short pieces written as notes for the same synth: a music box waltz for the tower and menus, an upbeat march for battles, and a darker, faster one for bosses.

The fonts are Baloo 2 and Be Vietnam Pro, served from `public/fonts` under the SIL Open Font License, whose text sits next to them. Nothing is loaded from another site. The one outside address the page calls is the public Squeekchain status API, for the wheel on the Tower and Arena screens.

## Arena Tower

A second tower of 100 floors, separate from the climb and the SQK prize. Every floor is held by one team: a Bot team that gets stronger with height, or a real player's team once someone takes it.

- **Open while the hamster runs.** It opens 5 minutes after he starts and closes 5 minutes after he stops, and its screen counts both down. A pause under 5 minutes keeps it open. A fight already begun may finish. `ARENA.waitMin` in `shared/core.js` sets the wait.
- **Who decides.** The API that reads the wheel refuses this server's address (Cloudflare answers Vercel with a challenge), so the page keeps the clock from `/v1/status` and `/v1/measurement/blocks`. The server checks against the chain: it allows a fight until `ARENA.holdMin` (15) minutes after the newest round with work ends, which no page can fake. In the first minutes of a run, before any of it can be on the chain, it takes the page's word for when the run began, as long as the chain has not already settled that time as empty. A player whose earlier claim the chain proved false has to wait for the chain from then on. So someone who forges the request could fight a few minutes out of hours, once. `ARENA_WINDOW_MIN` on a server changes the hold, for tests.
- **Taking a floor.** A player can attack any of the next 3 floors above them, with 5 tries a day. A try is used when the first turn is played. A win trades places with that team. Someone beaten by a player from outside the tower drops out of it. Places are checked again when a fight ends, so a floor that changed hands meanwhile stays as it is and the try comes back.
- **Same level.** Every pet fights at level 30. Stars and gear still count.
- **Defense.** A team fights by itself when attacked. Nothing it does is random except the luck of the battle, so the next move it shows is the move it makes. The team that first wins a floor defends it, and the player can change it. It is a copy, so selling gear later changes nothing.
- **Rewards.** When a day ends, a wallet that fought that day gets one chest for the floor it stands on: Wood from floor 10, Bronze from 30, Silver from 60, Gold from 85, Diamond on floor 100. Guests can climb but are not paid. A dev wallet can fight but never takes a floor.

## Project layout

```
shared/      Game content and rules, used by both browser and server
client/      Interface, skill effects, maps, styles, the drawn pets, monsters, bosses and gear and how they move
lib/         Server: routes, players, chain sync, limits
api/         The single Vercel function
sql/         Database schema
tools/       Art source
scripts/     Build, local server, sync, simulation, load test
tests/       API tests and browser flow
public/      Build output served as static files
```

`lib/engine.generated.cjs`, `public/app/` and `public/index.html` are generated by `npm run build`. Run it before `npm test`. Do not edit them by hand.

## Data source

Round history comes from `roundPage` on three SqueekCore contracts on Ethereum Sepolia, in this order:

| Floors | Contract | Status |
|---|---|---|
| 1 to 331 | `0x74665dAecA35A2303e767E76a2FF1FB6F93e119f` | Stopped, pinned to round 1973 |
| 332 to 544 | `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` | Stopped, pinned to round 1339 |
| 545 onward | `0xfd6c166d4b8e2962e65746a13e5a0797cd4de0c4` | Live |

The list lives in `lib/config.js`. Only append to it: floor numbers depend on its order. To use the live contract alone, set `SQUEEK_CORES` before the first sync and start from an empty database.

When Squeekchain redeploys, rounds restart on a new contract and the game stops seeing the hamster: no new floors, no coin bonus, and the Arena stays closed. `GET https://api.squeekchain.com/v1/core` names the live contract and its genesis. Add it to the list and pin the old one to its last settled round.

The sync checks that total work matches the chain and only reads rounds at least 12 Ethereum blocks old.

## Deploying to Vercel

1. Create a Postgres database and copy its **pooled** connection string.
2. Set `DATABASE_URL` and `SESSION_SECRET` in Vercel. See `.env.example`. Set `ALLOW_GUEST=1` if people should be able to play without a wallet. Never set `ALLOW_TRIAL` or `RATE_LIMIT_OFF` in production.
3. Run `DATABASE_URL=... npm run migrate` once, then `DATABASE_URL=... npm run sync` to load the history.
4. Deploy.
5. Run a load test against a preview deployment before opening to players.

## The static copy

`npm run export` writes `dist/`: the same game as a static site with relative paths, for hosting on IPFS through IMD. It holds no server code. It calls the API named in `site.config.json`, so the battle replay, random rolls and database stay on Vercel.

The copy already hosted on IPFS was built before battles moved to the server and cannot change without a new paid IMD job. It still runs whole battles by itself, so the server gives it throwaway luck, saves nothing it plays and points players to the main site. Everything else in it still works. A new export plays real battles as usual.

The API only accepts calls from the addresses in `CORS_ORIGINS`. Cookies do not cross between sites, so the copy keeps a signed session ticket in the browser and sends it as a header. Public data such as floors and the leaderboard can be read from anywhere and stays cached by the CDN.

Vercel Cron on the Hobby plan runs once a day. That is only a backup: requests to `/api/rounds` that reach the server also sync when the data is over a minute old.

## Load test notes

`scripts/loadtest.js` needs a server started with `RATE_LIMIT_OFF=1 MIN_MS_PER_ROUND=0 ALLOW_GUEST=1 ALLOW_TRIAL=1`, on a separate database because it creates thousands of players.

Results on one Windows desktop, with the load generator, one Node process and Postgres sharing the machine:

| Simulated load, a turn every 5 s and 30 s between battles | Turns per second | Playing a turn, p99 | Errors |
|---|---|---|---|
| 1,000 players | About 100 | 8 ms | None |
| 3,000 players | About 300 | 12 ms | None |
| 10,000 players | About 930 | 2,767 ms, the one Node process is saturated | None |

These numbers do not describe Vercel or a hosted database. They show the design has room at the target load. Repeat the test against real infrastructure before launch.
