import { Router } from "express";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../utils/stream.js";

dotenv.config({ path: "../.env" });

const router = Router();

const CURRENT_YEAR = process.env.SEASON_YEAR;
const BUCKET_NAME = process.env.JSON_BUCKET_NAME;

const FIRST_YEAR = 2021;

// Configure S3 client - uses IAM role in production, explicit credentials in local dev
const s3Config = {
    region: process.env.AWS_REGION || "us-east-2"
};

// Only add explicit credentials if provided (for local development)
// In production (ECS), the SDK will automatically use the task role
// Check that both keys are present AND non-empty to avoid invalid credential objects
if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_ACCESS_KEY.trim() !== '' && process.env.AWS_SECRET_ACCESS_KEY.trim() !== '') {
    console.log('Using explicit AWS credentials from environment variables');
    s3Config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
} else {
    console.log('Using ECS task role for AWS credentials');
}

const s3 = new S3Client(s3Config);

/** Returns the list of seasons the UI can request, newest first. */
router.get("/seasons", (req, res) => {
    const currentYear = parseInt(CURRENT_YEAR, 10);
    const seasons = [];

    for (let y = currentYear; y >= FIRST_YEAR; y--) {
        seasons.push({
            year: String(y),
            label: y === currentYear ? `${y} (Current)` : String(y),
            isCurrent: y === currentYear,
        });
    }

    res.status(200).json({
        success: true,
        message: "Fetched available seasons",
        data: { seasons, currentYear: String(currentYear) },
    });
});

router.get("/standings", async (req, res) => {
    const year = req.query.year || CURRENT_YEAR;
    const key = `standings/${year}-standings.json`;

    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
        const s3Response = await s3.send(command);
        const jsonText = await streamToString(s3Response.Body);
        const data = JSON.parse(jsonText);

        res.status(200).json({
            success: true,
            message: "Fetched season standings successfully",
            data,
        });
    } catch (error) {
        const notFound = error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404;
        console.error("Error fetching league standings data from S3:", error);
        res.status(notFound ? 404 : 500).json({
            success: false,
            message: notFound
                ? `No standings data available for the ${year} season.`
                : `Error fetching league standings data: ${error.message}`,
        });
    }
});

router.get("/leaders", async (req, res) => {
    const year = req.query.year || CURRENT_YEAR;
    const key = `league-leaders/${year}-league-leaders.json`;

    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
        const s3Response = await s3.send(command);
        const jsonText = await streamToString(s3Response.Body);
        const data = JSON.parse(jsonText);

        res.status(200).json({
            success: true,
            message: "Fetched league leaders successfully",
            data,
        });
    } catch (error) {
        const notFound = error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404;
        console.error("Error fetching league leaders data from S3:", error);
        res.status(notFound ? 404 : 500).json({
            success: false,
            message: notFound
                ? `No stat leaders data available for the ${year} season.`
                : `Error fetching league leaders data: ${error.message}`,
        });
    }
});

export default router;
