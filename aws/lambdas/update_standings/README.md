# `update_standings` (iScore)

Source-controlled implementation of the AWS Lambda `update_standings`. Fetches
league standings from the iScore public API and writes
`s3://$STANDINGS_BUCKET_NAME/standings/{SEASON_YEAR}-standings.json` in the shape
the SLUGGER frontend + `update_league_leaders` expect.

## Required env vars
- `BASE_URL` — iScore public base (e.g. `https://api.microservices.iscoresports.com/api/public`)
- `SEASON_ID` — iScore season GUID (the league is resolved from the season)
- `SEASON_YEAR` — e.g. `2026`
- `STANDINGS_BUCKET_NAME` — e.g. `alpb-jsondata`
- `LEAGUE_ID` *(optional)* — iScore league GUID; derived from the season if unset

## iScore endpoints
- `GET {BASE_URL}/seasons/{seasonId}` → season details (provides `leagueGuid`)
- `GET {apiRoot}/leagues/{leagueId}/standings` → `{ leagueId, teams: [ { teamId, name, shortName, w, l, t, rs, ra, gp } ] }`
  (where `apiRoot` is `BASE_URL` without the trailing `/public`)

> Note: as of 2026-06-18 the iScore `/leagues/{id}/standings` endpoint returns a
> server-side 500 (the rest of the iScore API is healthy). This function is
> correct and deploys cleanly; fresh standings resume automatically on the next
> scheduled run once iScore restores that endpoint.

## Test & deploy
```bash
npm install
npm test                       # node --test
zip -r update_standings.zip index.js package.json package-lock.json node_modules   # (use python zipfile on Git Bash)
aws lambda update-function-code --function-name update_standings \
  --zip-file fileb://update_standings.zip --region us-east-2
```
