import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import pool from "../db.js";
import {
  addCategoryToWidgetSchema,
  editWidgetSchema,
  queryParamsSchema,
  registerWidgetSchema,
} from "../validators/schemas.js";
import {
  createApprovedWidget,
  getAllWidgets,
  registerWidget,
  updateWidget,
  deleteWidget,
  getPendingWidgets,
  removeRequest,
} from "../services/widgetService.js";
import { requireSiteAdmin, requireAuth } from "../middleware/permission-guards.js";
import { requireWidgetOwnership, requireWidgetOwner } from "../middleware/ownership-guards.js";

const router = Router();

// ─── Queries ─────────────────────────────────────────────────────────────────

const SELECT_WIDGET_BY_ID = `SELECT * FROM widgets WHERE widget_id = $1`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseId(param) {
  const id = parseInt(param, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function handleError(error, res, context) {
  console.error(`[widgets] ${context} — unexpected error:`, error);
  return res.status(500).json({ success: false, message: "An unexpected error occurred." });
}

async function assertWidgetExists(widgetId, res, context) {
  const result = await pool.query(SELECT_WIDGET_BY_ID, [widgetId]);
  if (result.rowCount === 0) {
    res.status(404).json({ success: false, message: "Widget not found." });
    return null;
  }
  return result.rows[0];
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /widgets
 * Fetch all widgets, with optional filtering.
 */
router.get(
  "/",
  validationMiddleware({ querySchema: queryParamsSchema }),
  async (req, res) => {
    try {
      const { widgetName, categories, page, limit, userId } = req.query;
      const widgets = await getAllWidgets(widgetName, categories, page, limit, userId);
      return res.status(200).json({
        success: true,
        message: "Widgets retrieved successfully.",
        data: widgets,
      });
    } catch (error) {
      return handleError(error, res, "getAllWidgets");
    }
  },
);

/**
 * PATCH /widgets/:widgetId
 * Edit a widget's metadata.
 */
router.patch(
  "/:widgetId",
  requireWidgetOwnership,
  validationMiddleware({ bodySchema: editWidgetSchema }),
  async (req, res) => {
    const id = parseId(req.params.widgetId);
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid widget ID." });
    }

    try {
      const widget = await assertWidgetExists(id, res, `editWidget(${id})`);
      if (!widget) return;

      const { name, description, redirectLink, visibility, imageUrl, publicId, restrictedAccess } = req.body;
      const updatedWidget = await updateWidget({ id, name, description, redirectLink, visibility, imageUrl, publicId, restrictedAccess });

      return res.status(200).json({
        success: true,
        message: "Widget updated successfully.",
        data: updatedWidget,
      });
    } catch (error) {
      return handleError(error, res, `editWidget(${id})`);
    }
  },
);

/**
 * DELETE /widgets/:widgetId
 * Delete a widget.
 */
router.delete("/:widgetId", requireWidgetOwnership, async (req, res) => {
  const id = parseId(req.params.widgetId);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  try {
    const widget = await assertWidgetExists(id, res, `deleteWidget(${id})`);
    if (!widget) return;

    const deletedWidget = await deleteWidget(id);
    return res.status(200).json({
      success: true,
      message: "Widget deleted successfully.",
      data: deletedWidget,
    });
  } catch (error) {
    return handleError(error, res, `deleteWidget(${id})`);
  }
});

/**
 * POST /widgets/register
 * Submit a new widget registration request.
 */
router.post(
  "/register",
  requireAuth,
  validationMiddleware({ bodySchema: registerWidgetSchema }),
  async (req, res) => {
    const { widgetName, description, visibility, userId, teamIds } = req.body;

    try {
      const requestedWidget = await registerWidget(userId, widgetName, description, visibility, teamIds ?? []);
      return res.status(200).json({
        success: true,
        message: "Widget registration request sent successfully.",
        data: requestedWidget,
      });
    } catch (error) {
      return handleError(error, res, `registerWidget(user=${userId})`);
    }
  },
);

/**
 * POST /widgets/metrics
 * Record a widget metric event (e.g. launch).
 * TODO: infer userId from auth store rather than body.
 */
router.post("/metrics", requireAuth, async (req, res) => {
  const { widgetId, userId, metricType } = req.body;

  if (!widgetId || !userId) {
    return res.status(400).json({ success: false, message: "widgetId and userId are required." });
  }

  if (metricType !== "launch") {
    return res.status(400).json({ success: false, message: `Unknown metric type: "${metricType}".` });
  }

  try {
    const result = await pool.query(
      `INSERT INTO widget_launches (widget_id, user_id) VALUES ($1, $2) RETURNING *`,
      [widgetId, userId]
    );
    return res.status(201).json({
      success: true,
      message: "Widget launch metric recorded successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return handleError(error, res, `recordMetric(widget=${widgetId}, user=${userId})`);
  }
});

// ─── Categories ───────────────────────────────────────────────────────────────

/**
 * GET /widgets/:widgetId/categories
 * Get all categories for a widget.
 */
router.get("/:widgetId/categories", async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  if (!widgetId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  try {
    const widget = await assertWidgetExists(widgetId, res, `getCategories(${widgetId})`);
    if (!widget) return;

    const result = await pool.query(
      `SELECT c.*
         FROM categories c
         JOIN widget_categories wc ON c.id = wc.category_id
        WHERE wc.widget_id = $1`,
      [widgetId]
    );

    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully.",
      data: result.rows,
    });
  } catch (error) {
    return handleError(error, res, `getCategories(${widgetId})`);
  }
});

/**
 * POST /widgets/:widgetId/categories
 * Add a category to a widget.
 */
router.post(
  "/:widgetId/categories",
  requireWidgetOwnership,
  validationMiddleware({ bodySchema: addCategoryToWidgetSchema }),
  async (req, res) => {
    const widgetId = parseId(req.params.widgetId);
    const { categoryId } = req.body;

    if (!widgetId) {
      return res.status(400).json({ success: false, message: "Invalid widget ID." });
    }
    if (!categoryId) {
      return res.status(400).json({ success: false, message: "categoryId is required." });
    }

    try {
      const widget = await assertWidgetExists(widgetId, res, `addCategory(${widgetId})`);
      if (!widget) return;

      const categoryRes = await pool.query("SELECT * FROM categories WHERE id = $1", [categoryId]);
      if (categoryRes.rowCount === 0) {
        return res.status(404).json({ success: false, message: "Category not found." });
      }

      const result = await pool.query(
        `INSERT INTO widget_categories (widget_id, category_id) VALUES ($1, $2) RETURNING *`,
        [widgetId, categoryId]
      );

      return res.status(201).json({
        success: true,
        message: "Category added to widget successfully.",
        data: result.rows[0],
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ success: false, message: "This category is already associated with this widget." });
      }
      return handleError(error, res, `addCategory(widget=${widgetId}, category=${categoryId})`);
    }
  }
);

/**
 * DELETE /widgets/:widgetId/categories/:categoryId
 * Remove a category from a widget.
 */
router.delete("/:widgetId/categories/:categoryId", requireWidgetOwnership, async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  const categoryId = parseId(req.params.categoryId);

  if (!widgetId || !categoryId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID or category ID." });
  }

  try {
    const widget = await assertWidgetExists(widgetId, res, `removeCategory(${widgetId})`);
    if (!widget) return;

    const result = await pool.query(
      `DELETE FROM widget_categories WHERE widget_id = $1 AND category_id = $2 RETURNING *`,
      [widgetId, categoryId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Category not found on this widget." });
    }

    return res.status(200).json({
      success: true,
      message: "Category removed from widget successfully.",
      data: result.rows[0],
    });
  } catch (error) {
    return handleError(error, res, `removeCategory(widget=${widgetId}, category=${categoryId})`);
  }
});

// ─── Collaborators ────────────────────────────────────────────────────────────

/**
 * GET /widgets/:widgetId/collaborators
 * Get all collaborators (developers) on a widget.
 * NOTE: previously also existed as GET /:widgetId/developers — consolidated here.
 */
router.get("/:widgetId/collaborators", requireAuth, async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  if (!widgetId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  try {
    const result = await pool.query(
      `SELECT uw.user_id, u.email, uw.role
         FROM user_widget uw
         JOIN users u ON u.user_id = uw.user_id
        WHERE uw.widget_id = $1`,
      [widgetId]
    );

    return res.status(200).json({
      success: true,
      message: "Collaborators retrieved successfully.",
      data: result.rows,
    });
  } catch (error) {
    return handleError(error, res, `getCollaborators(${widgetId})`);
  }
});

/**
 * POST /widgets/:widgetId/collaborators
 * Add a collaborator to a widget by email.
 */
router.post("/:widgetId/collaborators", requireWidgetOwner, async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  if (!widgetId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : null;
  if (!email) {
    return res.status(400).json({ success: false, message: "A valid email is required." });
  }

  try {
    const widget = await assertWidgetExists(widgetId, res, `addCollaborator(${widgetId})`);
    if (!widget) return;

    const userResult = await pool.query("SELECT user_id, email FROM users WHERE email = $1", [email]);
    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "No user found with that email." });
    }

    const { user_id: userId, email: userEmail } = userResult.rows[0];

    const existing = await pool.query(
      "SELECT 1 FROM user_widget WHERE user_id = $1 AND widget_id = $2",
      [userId, widgetId]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ success: false, message: "User is already a collaborator on this widget." });
    }

    const result = await pool.query(
      `INSERT INTO user_widget (user_id, widget_id, role) VALUES ($1, $2, 'member') RETURNING *`,
      [userId, widgetId]
    );

    return res.status(201).json({
      success: true,
      message: "Collaborator added successfully.",
      data: { ...result.rows[0], email: userEmail },
    });
  } catch (error) {
    return handleError(error, res, `addCollaborator(widget=${widgetId}, email=${email})`);
  }
});

// ─── Teams ────────────────────────────────────────────────────────────────────

/**
 * GET /widgets/:widgetId/teams
 * Get all teams with access to a widget.
 */
router.get("/:widgetId/teams", requireAuth, async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  if (!widgetId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  try {
    const widget = await assertWidgetExists(widgetId, res, `getTeams(${widgetId})`);
    if (!widget) return;

    const result = await pool.query(
      `SELECT t.*
         FROM team t
         JOIN widget_team_access wta ON t.team_id = wta.team_id
        WHERE wta.widget_id = $1`,
      [widgetId]
    );

    return res.status(200).json({
      success: true,
      message: "Teams retrieved successfully.",
      data: result.rows,
    });
  } catch (error) {
    return handleError(error, res, `getTeams(${widgetId})`);
  }
});

/**
 * PUT /widgets/:widgetId/teams
 * Replace the full set of teams with access to a private widget.
 * This is an atomic operation — if any insert fails, the whole update is rolled back.
 */
router.put("/:widgetId/teams", requireWidgetOwnership, async (req, res) => {
  const widgetId = parseId(req.params.widgetId);
  if (!widgetId) {
    return res.status(400).json({ success: false, message: "Invalid widget ID." });
  }

  const { teamIds } = req.body;
  if (!Array.isArray(teamIds)) {
    return res.status(400).json({ success: false, message: "teamIds must be an array." });
  }

  try {
    const widget = await assertWidgetExists(widgetId, res, `updateTeams(${widgetId})`);
    if (!widget) return;

    if (widget.visibility?.toLowerCase() !== "private") {
      return res.status(400).json({ success: false, message: "Only private widgets can have team access restrictions." });
    }

    await pool.query("BEGIN");

    await pool.query("DELETE FROM widget_team_access WHERE widget_id = $1", [widgetId]);

    // All-or-nothing: if any teamId is invalid the transaction rolls back and the
    // client gets a clear error rather than a silent partial update.
    for (const teamId of teamIds) {
      await pool.query(
        `INSERT INTO widget_team_access (widget_id, team_id) VALUES ($1, $2)`,
        [widgetId, teamId]
      );
    }

    await pool.query("COMMIT");
    console.info(`[widgets] updateTeams — widget ${widgetId} team access updated (${teamIds.length} teams)`);

    return res.status(200).json({ success: true, message: "Widget team access updated successfully." });
  } catch (error) {
    try {
      await pool.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(`[widgets] updateTeams(${widgetId}) — rollback failed:`, rollbackError);
    }
    return handleError(error, res, `updateTeams(${widgetId})`);
  }
});

// ─── Admin: Pending Widgets ───────────────────────────────────────────────────

/**
 * GET /widgets/pending
 * Get all pending widget registration requests.
 */
router.get("/pending", requireSiteAdmin, async (req, res) => {
  try {
    const pendingWidgets = await getPendingWidgets();
    return res.status(200).json({
      success: true,
      message: "Pending widgets retrieved successfully.",
      data: pendingWidgets,
    });
  } catch (error) {
    return handleError(error, res, "getPendingWidgets");
  }
});

/**
 * POST /widgets/pending/:requestId/approve
 * Approve a pending widget registration request.
 */
router.post("/pending/:requestId/approve", requireSiteAdmin, async (req, res) => {
  const requestId = parseId(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ success: false, message: "Invalid request ID." });
  }

  try {
    const result = await createApprovedWidget(requestId);
    console.info(`[widgets] approveWidget — request ${requestId} approved, widget ${result.widgetId} created`);
    return res.status(200).json({
      success: true,
      message: result.message,
      data: { widgetId: result.widgetId },
    });
  } catch (error) {
    return handleError(error, res, `approveWidget(${requestId})`);
  }
});

/**
 * POST /widgets/pending/:requestId/decline
 * Decline a pending widget registration request.
 */
router.post("/pending/:requestId/decline", requireSiteAdmin, async (req, res) => {
  const requestId = parseId(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ success: false, message: "Invalid request ID." });
  }

  try {
    const result = await removeRequest(requestId);
    console.info(`[widgets] declineWidget — request ${requestId} declined`);
    return res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    return handleError(error, res, `declineWidget(${requestId})`);
  }
});

export default router;