import { Router } from "express";
import { approveDeveloper, declineDeveloper, getPendingDevelopers } from "../services/developerService.js";
import { requireAdmin } from "../middleware/permission-guards.js";

const router = Router();

router.post("/pending/:developerId/approve", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.developerId);
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

router.post("/pending/:developerId/decline", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.developerId);
    await declineDeveloper(id);

    res.status(200).json({
      success: true,
      message: "Developer declined",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.get("/pending", requireAdmin, async (req, res) => {
  try {
    const result = await getPendingDevelopers();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching pending developers: ${error.message}`
    });
  }
});

export default router;