import { Router } from "express";
import pool from "../db.js";
import { createPendingDeveloper, approveDeveloper } from "../services/developerService.js";
import { signUpUserWithCognito } from "../services/userService.js";

const router = Router();

router.post("/pending/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await approveDeveloper(id);
    
    res.status(200).json({
      success: true,
      message: "Developer approved and API key sent",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    console.log("Received registration request:", req.body);
    const { email, password, firstName, lastName } = req.body;
    console.log("Extracted data:", { email, password, firstName, lastName });
    // Create pending developer using the service
    const result = await createPendingDeveloper({
      email,
      password,
      firstName,
      lastName,
    });
    console.log("Developer created:", result);
    res.status(201).json({
      success: true,
      message: "Developer registration pending approval",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error creating pending developer: ${error.message}`
    });
  }
});

router.get("/pending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT request_id, email, first_name, last_name, status, created_at 
      FROM pending_developers 
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `);

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching pending developers: ${error.message}`
    });
  }
});

export default router;