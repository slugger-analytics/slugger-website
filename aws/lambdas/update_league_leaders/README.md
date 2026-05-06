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
- `LEADER_MIN_IP_PER_TEAM_GAME` (optional, defaults to `0.05`) — scales with league games played from `standings/{year}-standings.json`. Example: ~130 league games × `0.05` IP/game ≈ **6.5 IP** minimum (then converted to outs).
- `LEADER_MIN_OUTS_FLOOR` (optional, defaults to `9`) — never require less than this many outs (3.0 IP) for the ERA list.
- `LEADER_MAX_MIN_OUTS` (optional, defaults to `162` outs = **54.0 IP**) — safety cap so a mis-configured multiplier can’t blank the leaderboard mid-season.
- `LEADER_RELAXED_MIN_OUTS_FLOOR` (optional, defaults to `6` outs = **2.0 IP**) — if too few pitchers qualify, the Lambda may relax the minimum workload slightly (still ERA-sorted).
- `LEADER_MIN_QUALIFIED_PITCHERS` (optional, defaults to `8`) — threshold that triggers the relaxation behavior.

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

Bundles `@aws-sdk/client-s3` (Node.js 22 Lambda does not ship `aws-sdk` v2).

From the repo root:

```bash
cd aws/lambdas/update_league_leaders
npm install
zip -r update_league_leaders.zip index.js package.json package-lock.json node_modules

aws lambda update-function-code \
  --function-name update_league_leaders \
  --zip-file fileb://update_league_leaders.zip \
  --region us-east-2
```

Then set/update the environment variables in the Lambda console (or via CLI).

