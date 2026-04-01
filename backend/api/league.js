import { Router } from "express";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../utils/stream.js";

dotenv.config({ path: "../.env" });

const router = Router();

// ─── Config ───────────────────────────────────────────────────────────────────

const FIRST_YEAR = 2021;

const CURRENT_YEAR = parseInt(process.env.SEASON_YEAR, 10);
if (!Number.isFinite(CURRENT_YEAR)) {
  throw new Error("[league] SEASON_YEAR env var is missing or not a valid year.");
}

const BUCKET_NAME = process.env.JSON_BUCKET_NAME;
if (!BUCKET_NAME) {
  throw new Error("[league] JSON_BUCKET_NAME env var is missing.");
}

// ─── S3 Client ────────────────────────────────────────────────────────────────

// Uses explicit credentials in local dev, falls back to ECS task role in production.
const s3Config = { region: process.env.AWS_REGION || "us-east-2" };

const hasExplicitCredentials =
  process.env.AWS_ACCESS_KEY?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim();

if (hasExplicitCredentials) {
  console.info("[league] Using explicit AWS credentials from environment variables.");
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
} else {
  console.info("[league] Using ECS task role for AWS credentials.");
}

const s3 = new S3Client(s3Config);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch and parse a JSON file from S3.
 * Throws on any error — callers handle 404 vs 500 distinction.
 */
async function fetchS3Json(key) {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await s3.send(command);
  const text = await streamToString(response.Body);
  return JSON.parse(text);
}

/**
 * Central S3 error handler. Distinguishes missing keys (404) from other failures (500).
 */
function handleS3Error(error, res, context) {
  const isNotFound = error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404;
  console.error(`[league] ${context} — ${isNotFound ? "key not found" : "unexpected error"}:`, error);

  if (isNotFound) {
    return res.status(404).json({ success: false, message: error._notFoundMessage ?? "Data not found." });
  }
  return res.status(500).json({ success: false, message: "An unexpected error occurred." });
}

/**
 * Validate and parse a year query param, falling back to CURRENT_YEAR.
 * Returns null and sends a 400 if the value is present but invalid.
 */
function resolveYear(queryYear, res) {
  if (!queryYear) return CURRENT_YEAR;
  const parsed = parseInt(queryYear, 10);
  if (!Number.isFinite(parsed) || parsed < FIRST_YEAR || parsed > CURRENT_YEAR) {
    res.status(400).json({
      success: false,
      message: `Invalid year. Must be between ${FIRST_YEAR} and ${CURRENT_YEAR}.`,
    });
    return null;
  }
  return parsed;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /league/seasons
 * Returns the list of available seasons, newest first.
 */
router.get("/seasons", (req, res) => {
  const seasons = [];
  for (let y = CURRENT_YEAR; y >= FIRST_YEAR; y--) {
    seasons.push({
      year: String(y),
      label: y === CURRENT_YEAR ? `${y} (Current)` : String(y),
      isCurrent: y === CURRENT_YEAR,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Fetched available seasons.",
    data: { seasons, currentYear: String(CURRENT_YEAR) },
  });
});

/**
 * GET /league/standings?year=YYYY
 * Returns standings data for the requested season.
 */
router.get("/standings", async (req, res) => {
  const year = resolveYear(req.query.year, res);
  if (year === null) return;

  try {
    const data = await fetchS3Json(`standings/${year}-standings.json`);
    return res.status(200).json({
      success: true,
      message: "Fetched season standings successfully.",
      data,
    });
  } catch (error) {
    error._notFoundMessage = `No standings data available for the ${year} season.`;
    return handleS3Error(error, res, `standings(${year})`);
  }
});

/**
 * GET /league/leaders?year=YYYY
 * Returns league leaders data for the requested season.
 */
router.get("/leaders", async (req, res) => {
  const year = resolveYear(req.query.year, res);
  if (year === null) return;

  try {
    const data = await fetchS3Json(`league-leaders/${year}-league-leaders.json`);
    return res.status(200).json({
      success: true,
      message: "Fetched league leaders successfully.",
      data,
    });
  } catch (error) {
    error._notFoundMessage = `No stat leaders data available for the ${year} season.`;
    return handleS3Error(error, res, `leaders(${year})`);
  }
});

export default router;