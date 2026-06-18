# `update_scoreboard` (iScore)

Source-controlled implementation of the AWS Lambda `update_scoreboard`. Fetches
recent/upcoming league games from the iScore public API, pulls each game's latest
score, and upserts into the Aurora `scores` table that the SLUGGER super-widget reads.

## Required env vars
- `BASE_URL` — iScore public base (`https://api.microservices.iscoresports.com/api/public`)
- `LEAGUE_ID` — iScore league GUID
- `DB_HOST` — Aurora host. The live value is the **read-only** (`.cluster-ro-`) endpoint;
  the code rewrites it to the writer endpoint before connecting (writes fail on the reader).
- `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- `SCOREBOARD_WINDOW_DAYS` *(optional, default 2)* — fetch games within ±N days of now

## iScore endpoints
- `GET {BASE_URL}/games?leagueId=&startDateFrom=&startDateTo=` → game list (no scores)
- `GET {apiRoot}/games/{gameGuid}/latest-score/internal` → `{ teams: { HOME:{runs}, AWAY:{runs} } }`

## `scores` mapping
`game_id`=gameGuid (uuid), `date`=scheduledDate (ISO string), team names from home/away,
scores from latest-score runs, `game_status` from gameStatusId (1→SCHEDULED, 2→LIVE, 3→FINAL),
`field`=gameInfo.location. Upsert key: `game_id`.

## Test & deploy
```bash
npm install
npm test
# build zip (python zipfile on Git Bash) of index.js, package.json, package-lock.json, node_modules
aws lambda update-function-code --function-name update_scoreboard \
  --zip-file fileb://update_scoreboard.zip --region us-east-2
```
