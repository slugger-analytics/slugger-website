import { Router } from "express";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "../utils/stream";

dotenv.config();

const router = Router();

const YEAR = process.env.SEASON_YEAR;
const BUCKET_NAME = process.env.JSON_BUCKET_NAME;

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

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
