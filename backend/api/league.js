import { Router } from "express";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../utils/stream.js";

dotenv.config({ path: "../.env" });

const router = Router();

const YEAR = process.env.SEASON_YEAR;
const BUCKET_NAME = process.env.JSON_BUCKET_NAME;

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

router.get("/standings", async (req, res) => {
    const key = `standings/${YEAR}-standings.json`;

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        const s3Response = await s3.send(command);
        const jsonText = await streamToString(s3Response.Body);
        const data = JSON.parse(jsonText);

        res.status(200).json({
            success: true,
            message: "Fetched season standings successfully",
            data
        })
    } catch (error) {
        console.error("Error fetching league standings data from S3:", error);
        res.status(500).json({
            success: false,
            message: `Error fetching league standings data: ${error.message}`,
        });
    }
});

router.get("/leaders", async (req, res) => {
    const key = `league-leaders/${YEAR}-league-leaders.json`;

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key
        });

        const s3Response = await s3.send(command);
        const jsonText = await streamToString(s3Response.Body);
        const data = JSON.parse(jsonText);

        res.status(200).json({
            success: true,
            message: "Fetched league leaders successfully",
            data
        })
    } catch (error) {
        console.error("Error fetching league leaders data from S3:", error);
        res.status(500).json({
            success: false,
            message: `Error fetching league leaders data: ${error.message}`,
        });
    }
});

export default router;
