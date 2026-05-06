# `update_league_leaders` (iScore)

This folder contains a source-controlled implementation of the **AWS Lambda** function `update_league_leaders`.

The function fetches **Batting**, **Pitching**, and **Running (SB)** leaderboards from iScore and writes a JSON file to S3:

- `s3://$JSON_BUCKET_NAME/league-leaders/{year}-league-leaders.json`

The JSON shape matches what the SLUGGER frontend expects (`LeagueLeadersData` in `frontend/src/data/types.ts`).

## Required Lambda env vars

- `JSON_BUCKET_NAME`
- `ISCORE_LEAGUE_ID`
- `ISCORE_SEASON_ID`
- `ISCORE_BASE_URL` (optional, defaults to `https://api.microservices.iscoresports.com/api/api`)
- `ISCORE_LEADERBOARD_SIZE` (optional, defaults to 200)

## Event payload

The Lambda supports the existing payload pattern and will prefer explicit IDs from the event if present:

```json
{
  "year": "2026",
  "iscoreSeasonId": "....",
  "iscoreLeagueId": "....",
  "size": 200
}
```

It will also accept `seasonId` / `leagueId` / legacy `seasonid` / `leagueid`.

## Packaging & deployment (manual)

This Lambda has **no external dependencies** (uses runtime `fetch` + built-in `aws-sdk`).

From the repo root:

```bash
cd aws/lambdas/update_league_leaders
zip -r update_league_leaders.zip index.js

aws lambda update-function-code \
  --function-name update_league_leaders \
  --zip-file fileb://update_league_leaders.zip \
  --region us-east-2
```

Then set/update the environment variables in the Lambda console (or via CLI).

