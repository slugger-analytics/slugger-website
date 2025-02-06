import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware.ts";
import sendApiKeyEmail from "../services/emailService.js";
import pool from "../db.js";
import {
  editWidgetSchema,
  queryParamsSchema,
  registerWidgetSchema,
} from "../validators/schemas.ts";
import {
  createApprovedWidget,
  getUserData,
  generateApiKeyForUser,
  createUserWidgetRelation,
  getAllWidgets,
  registerWidget,
  getPendingWidgets,
  removeRequest,
  updateWidget,
  deleteWidget,
} from "../services/widgetService.js";

const selectWidgetById = `
    SELECT *
    FROM widgets
    WHERE widget_id = $1
`;

const selectRequestById = `
    SELECT *
    FROM requests
    WHERE request_id = $1
`;

const router = Router();

// get all widgets
router.get(
  "/",
  validationMiddleware({ querySchema: queryParamsSchema }),
  async (req, res) => {
    try {
      const { widgetName, categories, page, limit } = req.query;

      const widgets = await getAllWidgets(widgetName, categories, page, limit);

      res.status(200).json({
        success: true,
        message: "Widgets retrieved successfully",
        data: widgets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
);

// edit a widget
router.patch(
  "/:id",
  validationMiddleware({ bodySchema: editWidgetSchema }),
  async (req, res) => {
    const { name, description, redirectLink, visibility, imageUrl, publicId, restrictedAccess } = req.body;

    console.log({restrictedAccess})

    try {
      const id = parseInt(req.params.id);

      // Ensure target widget exists
      const targetWidgetRes = await pool.query(selectWidgetById, [id]);
      if (targetWidgetRes.rowCount === 0) {
        res.status(404).json({
          success: false,
          message: "Widget not found",
        });
        return;
      }

      const updatedWidget = await updateWidget({
        id,
        name,
        description,
        redirectLink,
        visibility,
        imageUrl,
        publicId,
        restrictedAccess
      });

      res.status(200).json({
        success: true,
        message: "Widget updated successfully",
        data: updatedWidget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Internal error: ${error.message}`,
      });
    }
  },
);

// delete a widget
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const targetWidgetRes = await pool.query(selectWidgetById, [id]);
    // Ensure target widget exists
    if (targetWidgetRes.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Widget does not exist",
      });
      return;
    }
    const deletedWidget = await deleteWidget(id);
    res.status(200).json({
      success: true,
      message: "Widget deleted successfully",
      data: deletedWidget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// approve a widget
router.post("/pending/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const targetRequestRes = await pool.query(selectRequestById, [id]);
    // Ensure target request exists
    if (targetRequestRes.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "Request does not exist",
      });
      return;
    }

    const targetRequest = targetRequestRes.rows[0];
    const userId = targetRequest["user_id"];

    // Create an approved widget based on the request data
    const approvedID = await createApprovedWidget(targetRequest);

    // Retrieve user data using the user's Cognito ID
    const user = await getUserData(userId);
    const userEmail = user["email"];

    // Generate an API key for the user
    const apiKey = await generateApiKeyForUser(userId, userEmail);

    // Create a relation between the user and the widget
    const userWidgetRelation = await createUserWidgetRelation(
      userId,
      approvedID,
      apiKey,
    );

    // Send the API key to the user via email
    await sendApiKeyEmail(userEmail, apiKey);

    res.status(200).json({
      success: true,
      message:
        "Widget approved, user-widget relation created, and API key sent via email",
      data: userWidgetRelation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// decline a widget
router.post("/pending/:id/decline", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Attempt to remove the request from the database
    const removedRequest = await removeRequest(id);

    res.status(200).json({
      success: true,
      message: "Request declined and removed",
      data: removedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: true,
      message: `Internal error: ${error.message}`,
    });
  }
});

// fetch all pending widgets
router.get("/pending", async (req, res) => {
  try {
    // Fetch all pending widgets from the service layer
    const widgets = await getPendingWidgets();

    res.status(200).json({
      success: true,
      message: "Pending widgets fetched successfully",
      data: widgets,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// register a widget
router.post(
  "/register",
  validationMiddleware({ bodySchema: registerWidgetSchema }),
  async (req, res) => {
    const { widgetName, description, visibility, userId } = req.body; // Extract widget details and userId from the request body

    try {
      const requestedWidget = await registerWidget(
        userId,
        widgetName,
        description,
        visibility,
      );
      res.status(200).json({
        success: true,
        message: "Widget registration request was sent successfully",
        data: requestedWidget,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Internal error: ${error.message}`,
      });
    }
  },
);

export default router;
