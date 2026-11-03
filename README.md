# Hamster Tower

A turn-based tower climb built on real data from Squeekchain. Every settled round in which the hamster did work is one floor. The round's work sets the floor type, its hash sets the enemies, map and weather, and long naps leave treasure chests.

The tower is built from the hamster's whole history, not from today onward. It has over 500 floors and grows on its own as new rounds settle. A round passes every 10 minutes, but the contract only keeps a record when the hamster ran, about 17% of rounds so far, so empty rounds make no floor.

## Run it locally

You need Node 22 or newer. Nothing else: the project runs its own real Postgres from the project folder.

```
npm install
npm run dev
```

Open http://localhost:3000 and choose **Play as guest** or **Sign in with wallet**. The first start creates the database and reads the full round history from the chain, which takes about 20 seconds.

Press Ctrl+C to stop. If you close the terminal instead, the database keeps running. The next `npm run dev` reuses it, or run `npm run db:stop`.

The **Test panel** button adds coins, chests and food, unlocks all pets, resets Sweep and the Daily Challenge, and jumps floors. `npm run dev` sets `ALLOW_TRIAL=1`, which gives it to everyone on your machine. On the live site only the wallets listed in `TEST_WALLETS` get it, and the server checks this on every call. Test wallets from `TEST_WALLETS` are never ranked, and the boards show them as Dev without their address. With `ALLOW_TRIAL=1` the list is empty, so everyone stays on the local board.

## The real hamster in the game

The Tower screen shows what Squeektoshi is doing right now, read by the page itself from the public status API at `/v1/status`. The wheel on the screen turns at his real speed. A stale, simulated or failed reading counts as unknown, and the game keeps working. The page reads it rather than the server because the API's Cloudflare answers Vercel's servers with a 403 challenge, and the docs say the API is for display anyway.

For 30 minutes after a round with work ends, battle wins pay 20% more coins. The server decides this from the rounds on the chain, so no page can claim it. A run reaches the chain a few minutes after its 10 minute round closes, so the bonus starts up to about 15 minutes after he starts.

## Daily Challenge

The biggest round the hamster ran the day before sets one team and one fight for everyone, so the score does not depend on chests or levels. Each player gets 3 tries a day, and a try is used when its first turn is played. Fewest rounds wins, then the most HP left, then whoever got there first. The first win of the day pays one chest, and the chest gets better the more the hamster ran the day before.

When a day ends, the top 10 get rewards the next time they open the game. Rewards go out 15 minutes after midnight UTC, when the last battle of the day has ended, and test wallets get none.

| Rank | Chest | Blind Bags | Food bags that suit the team |
|---|---|---|---|
| 1 | Diamond | 3 | 10 |
| 2 and 3 | Gold | 2 | 6 |
| 4 to 10 | Silver | 1 | 3 |

The game's own bot plays each draw to set the enemy strength where it wins about 65% of the time, because teams and enemies differ too much for one fixed strength. The first request of a day builds the challenge and saves it in `daily_days`, so a round settled late cannot change it. It plays through the same server turns as a floor and never touches the climb.

A first clear, a boss win or a challenge win can be shared on X. The picture is drawn on the player's device and only leaves it if they post it.

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
| `npm run bake-art` | Regenerates the WebP art from `tools/art-web.js`, needs Chrome |
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

The fonts are Baloo 2 and Be Vietnam Pro, served from `public/fonts` under the SIL Open Font License, whose text sits next to them. Nothing is loaded from another site. The one outside address the page calls is the public Squeekchain status API, for the wheel on the Tower screen.

## Project layout

```
shared/      Game content and rules, used by both browser and server
client/      Interface, skill effects, maps, styles
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

Round history comes from `roundPage` on two SqueekCore contracts on Ethereum Sepolia, in this order:

| Floors | Contract | Status |
|---|---|---|
| 1 to 331 | `0x74665dAecA35A2303e767E76a2FF1FB6F93e119f` | Stopped, pinned to round 1973 |
| 332 onward | `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44` | Live |

The list lives in `lib/config.js`. Only append to it: floor numbers depend on its order. To use the live contract alone, set `SQUEEK_CORES` before the first sync and start from an empty database.

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
