import { Router } from "express";
import { approveDeveloper, declineDeveloper, getPendingDevelopers, getAllDevelopersWithWidgets } from "../services/developerService.js";
import { requireSiteAdmin } from "../middleware/permission-guards.js";

const router = Router();

router.post("/pending/:developerId/approve", requireSiteAdmin, async (req, res) => {
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

router.post("/pending/:developerId/decline", requireSiteAdmin, async (req, res) => {
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

router.get("/pending", requireSiteAdmin, async (req, res) => {
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

router.get("/", requireSiteAdmin, async (req, res) => {
  try {
    const result = await getAllDevelopersWithWidgets();

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching developers: ${error.message}`
    });
  }
});

export default router;