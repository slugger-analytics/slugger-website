import { readFileSync } from "fs";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
  }
}

loadEnv();

const AWS_REGION   = process.env.AWS_REGION ?? "us-east-2";
const LEAGUE_ID    = process.env.POINTSTREAK_LEAGUE_ID ?? "174";

// Lambda function names
const LAMBDA_STANDINGS = "update_standings";
const LAMBDA_LEADERS   = "update_league_leaders";

// Confirmed Pointstreak season IDs for each ALPB year
const SEASON_IDS = {
  2025: process.env.SEASON_ID ?? "34102", // ALPB- 2025
  2024: "33927",                          // ALPB- 2024
  2023: "34162",                          // ALPB- 2023
  2022: "34154",                          // ALPB- 2022
  2021: "34146",                          // ALPB- 2021
};

// ─── AWS Lambda client ────────────────────────────────────────────────────────

const lambda = new LambdaClient({
  region: AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

// ─── Lambda invocation ────────────────────────────────────────────────────────

async function invokeLambda(functionName, payload) {
  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const response = await lambda.send(command);

  const result = response.Payload
    ? JSON.parse(Buffer.from(response.Payload).toString())
    : null;

  if (response.FunctionError) {
    throw new Error(
      `Lambda ${functionName} error: ${response.FunctionError} — ${JSON.stringify(result)}`,
    );
  }

  return result;
}

async function processYear(year, dryRun) {
  const seasonId = SEASON_IDS[year];
  if (!seasonId) {
    console.warn(`  ⚠ No season ID configured for ${year} — skipping.`);
    return;
  }

  const payload = {
    seasonid: seasonId,
    year:     String(year),
    leagueid: LEAGUE_ID,
  };

  console.log(`  Payload → ${JSON.stringify(payload)}`);

  if (dryRun) {
    console.log(`  [dry-run] would invoke ${LAMBDA_STANDINGS} and ${LAMBDA_LEADERS}`);
    return;
  }

  try {
    const [standingsResult, leadersResult] = await Promise.all([
      invokeLambda(LAMBDA_STANDINGS, payload),
      invokeLambda(LAMBDA_LEADERS,   payload),
    ]);

    console.log(`  ✓ ${LAMBDA_STANDINGS}:      ${JSON.stringify(standingsResult)}`);
    console.log(`  ✓ ${LAMBDA_LEADERS}: ${JSON.stringify(leadersResult)}`);
  } catch (err) {
    console.error(`  ✗ Failed for ${year}: ${err.message}`);
  }
}

async function main() {
  const args    = process.argv.slice(2);
  const dryRun  = args.includes("--dry-run");

  let years = [];

  const yearIdx  = args.indexOf("--year");
  const yearsIdx = args.indexOf("--years");

  if (yearIdx !== -1 && args[yearIdx + 1]) {
    years = [parseInt(args[yearIdx + 1], 10)];
  } else if (yearsIdx !== -1 && args[yearsIdx + 1]) {
    years = args[yearsIdx + 1].split(",").map((y) => parseInt(y.trim(), 10));
  } else {
    console.error("Usage: node scripts/fetch-historical-data.mjs --year 2024 [--dry-run]");
    console.error("       node scripts/fetch-historical-data.mjs --years 2021,2022,2023,2024 [--dry-run]");
    process.exit(1);
  }

  console.log(`\n🔧 Lambda  : ${LAMBDA_STANDINGS} / ${LAMBDA_LEADERS}`);
  console.log(`🌍 Region  : ${AWS_REGION}`);
  console.log(`📅 Years   : ${years.join(", ")}`);
  console.log(`🔍 Dry-run : ${dryRun}\n`);

  for (const year of years) {
    console.log(`\n── ${year} (seasonid=${SEASON_IDS[year]}) ──`);
    await processYear(year, dryRun);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
