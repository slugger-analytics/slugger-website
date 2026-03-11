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

const selectWidgetById = `
    SELECT *
    FROM widgets
    WHERE widget_id = $1
`;

const router = Router();

const parseIdList = (value) => {
  if (value === undefined || value === null) return [];

  const normalize = (items) =>
    items
      .map((item) => {
        if (typeof item === "number") return item;
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (!trimmed) return null;
          const asNumber = Number(trimmed);
          return Number.isNaN(asNumber) ? trimmed : asNumber;
        }
        return null;
      })
      .filter((item) => item !== null);

  if (Array.isArray(value)) {
    return normalize(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return normalize(parsed);
        }
      } catch (error) {
        return [];
      }
    }

    return normalize(trimmed.split(","));
  }

  return [];
};

// get all widgets
router.get(
  "/",
  validationMiddleware({ querySchema: queryParamsSchema }),
  async (req, res) => {
    try {
      const { widgetName, categories, page, limit, userId } = req.query;

      const widgets = await getAllWidgets(widgetName, categories, page, limit, userId);

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

// Special endpoint for Hitting Analytics widget (widget_id 93)
// Returns hitting statistics as JSON
router.get("/93/hitting-data", async (req, res) => {
  try {
    const playerIds = parseIdList(req.query.playerIds);
    const teamIds = parseIdList(req.query.teamIds);

    // Build query to get player hitting stats
    let query = `
      SELECT 
        p.player_id,
        p.player_name,
        p.team_id,
        p.player_batting_handedness as position
      FROM player p
    `;

    const params = [];
    const conditions = [];

    // Filter by playerIds if provided
    if (playerIds.length > 0) {
      conditions.push(`p.player_id = ANY($${params.length + 1}::text[])`);
      params.push(playerIds);
    }

    // Filter by teamIds if provided
    if (teamIds.length > 0) {
      conditions.push(`p.team_id = ANY($${params.length + 1}::uuid[])`);
      params.push(teamIds);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` LIMIT 100`;

    const result = await pool.query(query, params);
    const players = result.rows || [];

    // Build hitting statistics response
    const hittingData = {
      success: true,
      data: {
        widgetId: 93,
        widgetName: "Hitting Analytics",
        playerCount: players.length,
        teamCount: teamIds.length,
        players: players.map((p) => ({
          id: p.player_id,
          name: p.player_name,
          team: p.team_id,
          position: p.position,
          stats: {
            avg: Math.random() * 0.3 + 0.2, // Mock data
            hr: Math.floor(Math.random() * 40),
            rbi: Math.floor(Math.random() * 120),
            hits: Math.floor(Math.random() * 180),
            ab: Math.floor(Math.random() * 600),
          },
        })),
        bullets: [
          `Hitting Analytics executed successfully.`,
          `Analysis covers ${players.length} player(s) from ${teamIds.length} team(s).`,
          players.length > 0
            ? `Top performer: ${players[0].player_name} (AVG .${(Math.random() * 300 + 200).toFixed(0)})`
            : "No players selected for analysis.",
        ],
      },
    };

    return res.status(200).json(hittingData);
  } catch (error) {
    console.error("[Hitting Analytics] Error:", error);
    return res.status(500).json({
      success: false,
      message: `Error fetching hitting data: ${error.message}`,
    });
  }
});

router.get("/:widgetId/execute", async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId, 10);
    if (Number.isNaN(widgetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid widgetId",
      });
    }

    const teamIds = parseIdList(req.query.teamIds);
    const playerIds = parseIdList(req.query.playerIds);
    const source = typeof req.query.source === "string" ? req.query.source : "superwidget";

    // Special handling for Hitting Analytics widget (93)
    if (widgetId === 93) {
      try {
        const hittingResponse = await fetch(`http://localhost:3001/api/widgets/93/hitting-data?${new URLSearchParams({
          playerIds: JSON.stringify(playerIds),
          teamIds: JSON.stringify(teamIds)
        }).toString()}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const hittingData = await hittingResponse.json();
        if (hittingData.success) {
          return res.status(200).json({
            success: true,
            message: "Widget executed successfully",
            data: {
              widgetId,
              widgetName: "Hitting Analytics",
              teamIds,
              playerIds,
              widgetOutput: hittingData.data,
              bullets: hittingData.data.bullets || []
            }
          });
        }
      } catch (hittingError) {
        console.error("[Widget Execute] Error calling hitting-data endpoint:", hittingError);
      }
    }

    const widgetResult = await pool.query(selectWidgetById, [widgetId]);
    if (widgetResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: `Widget ${widgetId} not found`,
      });
    }

    const widget = widgetResult.rows[0];
    const widgetName = widget.widget_name || widget.name || `Widget ${widgetId}`;
    const description = widget.description || "No widget description provided.";
    const redirectLink = widget.redirect_link || widget.redirectlink || null;

    // If no redirectLink, return metadata only
    if (!redirectLink) {
      const bullets = [
        `${widgetName}: No redirect link configured.`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Source: ${source}`,
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: false,
        message: "Widget has no redirect link configured",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          bullets,
        },
      });
    }

    // Try to call the widget's redirectLink with parameters
    try {
      const url = new URL(redirectLink);
      url.searchParams.append('teamIds', JSON.stringify(teamIds));
      url.searchParams.append('playerIds', JSON.stringify(playerIds));
      url.searchParams.append('source', source);

      console.log(`[Widget Execute] Calling ${widgetName} at ${url.toString()}`);

      const widgetResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Slugger-SuperWidget/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      const contentType = widgetResponse.headers.get('content-type');
      const responseText = await widgetResponse.text();

      // Check if response is JSON
      if (contentType && contentType.includes('application/json')) {
        try {
          const widgetData = JSON.parse(responseText);
          
          // Return the actual widget data
          return res.status(200).json({
            success: true,
            message: "Widget executed successfully",
            data: {
              widgetId,
              widgetName,
              teamIds,
              playerIds,
              widgetOutput: widgetData,
              bullets: widgetData.bullets || [`${widgetName} returned data successfully`]
            },
          });
        } catch (parseError) {
          console.error(`[Widget Execute] Failed to parse JSON response from ${widgetName}:`, parseError);
        }
      }

      // If we got HTML or non-JSON response, widget doesn't support API mode
      console.warn(`[Widget Execute] ${widgetName} returned HTML/non-JSON (Content-Type: ${contentType})`);
      
      const bullets = [
        `${widgetName} is a UI-only widget (returns HTML, not JSON).`,
        `To use this widget in SuperWidget, it needs an API endpoint that returns JSON.`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Configured redirect: ${redirectLink}`
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: false,
        message: "Widget does not support API mode (returns HTML instead of JSON)",
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          bullets,
          widgetOutput: {
            error: "Widget UI returned HTML instead of JSON API response",
            contentType,
            responsePreview: responseText.substring(0, 200) + "..."
          }
        },
      });

    } catch (fetchError) {
      console.error(`[Widget Execute] Error calling ${widgetName}:`, fetchError.message);

      const bullets = [
        `${widgetName}: Failed to fetch data from widget endpoint.`,
        `Error: ${fetchError.message}`,
        `Selection scope: ${teamIds.length} team(s), ${playerIds.length} player(s).`,
        `Configured redirect: ${redirectLink}`
      ];

      if (description) {
        bullets.push(`Summary: ${description}`);
      }

      return res.status(200).json({
        success: false,
        message: `Failed to execute widget: ${fetchError.message}`,
        data: {
          widgetId,
          widgetName,
          teamIds,
          playerIds,
          bullets,
          widgetOutput: {
            error: fetchError.message
          }
        },
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

// edit a widget
router.patch(
  "/:widgetId",
  requireWidgetOwnership,
  validationMiddleware({ bodySchema: editWidgetSchema }),
  async (req, res) => {
    const { name, description, redirectLink, visibility, imageUrl, publicId, restrictedAccess } = req.body;

    try {
      const id = parseInt(req.params.widgetId);

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
router.delete("/:widgetId", requireWidgetOwnership, async (req, res) => {
  try {
    const id = parseInt(req.params.widgetId);
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

// register a widget
router.post(
  "/register",
  requireAuth,
  validationMiddleware({ bodySchema: registerWidgetSchema }),
  async (req, res) => {
    const { widgetName, description, visibility, userId, teamIds } = req.body; // Extract widget details and userId from the request body

    try {
      const requestedWidget = await registerWidget(
        userId,
        widgetName,
        description,
        visibility,
        teamIds || [],
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

// Get categories for a widget
router.get("/:widgetId/categories", async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Get all categories for this widget
    const categoriesResult = await pool.query(
      `SELECT c.* 
       FROM categories c
       JOIN widget_categories wc ON c.id = wc.category_id
       WHERE wc.widget_id = $1`,
      [widgetId]
    );

    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categoriesResult.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Add a category to a widget
router.post("/:widgetId/categories", requireWidgetOwnership, validationMiddleware({ bodySchema: addCategoryToWidgetSchema }), async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required"
      });
    }

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if category exists
    const categoryExists = await pool.query(
      "SELECT * FROM categories WHERE id = $1",
      [categoryId]
    );
    if (categoryExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Add relation to widget_categories
    const result = await pool.query(
      `INSERT INTO widget_categories (widget_id, category_id)
       VALUES ($1, $2)
       RETURNING *`,
      [widgetId, categoryId]
    );

    res.status(201).json({
      success: true,
      message: "Category added to widget successfully",
      data: result.rows[0]
    });
  } catch (error) {
    // Handle duplicate entry
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: "This category is already associated with this widget"
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Remove a category from a widget
router.delete("/:widgetId/categories/:categoryId", requireWidgetOwnership, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const categoryId = parseInt(req.params.categoryId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Delete the relation
    const result = await pool.query(
      `DELETE FROM widget_categories 
       WHERE widget_id = $1 AND category_id = $2
       RETURNING *`,
      [widgetId, categoryId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found for this widget"
      });
    }

    res.status(200).json({
      success: true,
      message: "Category removed from widget successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.post("/metrics", requireAuth, async (req, res) => { // TODO remove userId since should be inferred from user store
  try {
    const { widgetId, userId, metricType } = req.body;

    if (metricType === "launch") {
      const result = await pool.query(`
        INSERT INTO widget_launches (widget_id, user_id)
        VALUES ($1, $2)
        RETURNING *
      `, [widgetId, userId]);

      return res.status(201).json({
        success: true,
        message: "Widget launch metric recorded successfully",
        data: result.rows[0]
      })
    }

    else {throw new Error("Invalid metric type")}
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

router.get('/:widgetId/developers', requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const response = await pool.query(`
      SELECT uw.user_id, u.email, uw.role
      FROM user_widget as uw
      LEFT JOIN users as u
        ON u.user_id = uw.user_id
      WHERE uw.widget_id = $1
    `, [widgetId])

    return res.status(201).json({
      success: true,
      message: `Widget developers fetched successfully`,
      data: response.rows
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

router.post('/:widgetId/developers', requireWidgetOwner, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const developerId = parseInt(req.body.developerId);

    // Check if developer is already added to widget
    const alreadyDevRes = await pool.query(`
      SELECT user_id
      FROM user_widget
      WHERE
        widget_id = $1
        AND user_id = $2
      `, [widgetId, developerId]);

    if (alreadyDevRes.rowCount > 0) {
      return res.status(500).json({
        success: false,
        message: `Error: user with id ${developerId} is already a collaborator on widget with id ${widgetId}`
      });
    }

    // Add dev
    await pool.query(`
      INSERT INTO user_widget (user_id, widget_id, role)
      VALUES ($1, $2, 'member')
    `, [developerId, widgetId])

    return res.status(201).json({
      success: true,
      message: `Widget developer with id ${developerId} added to widget with id ${widgetId}`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

// Add collaborator to widget
router.post("/:widgetId/collaborators", requireWidgetOwner, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Look up user by email
    const userQuery = 'SELECT user_id FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email"
      });
    }
    
    const userId = userResult.rows[0].user_id;

    // Check if widget exists
    const widgetExists = await pool.query('SELECT widget_id FROM widgets WHERE widget_id = $1', [widgetId]);
    if (widgetExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if user is already a collaborator
    const checkQuery = `
      SELECT * FROM user_widget 
      WHERE user_id = $1 AND widget_id = $2
    `;
    const checkResult = await pool.query(checkQuery, [userId, widgetId]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User is already a collaborator"
      });
    }

    // Add collaborator
    const query = `
      INSERT INTO user_widget (user_id, widget_id, role)
      VALUES ($1, $2, 'member')
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, widgetId]);
    
    // Get the user's email for the response
    const userDetails = await pool.query(
      'SELECT email FROM users WHERE user_id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      message: "Collaborator added successfully",
      data: {
        ...result.rows[0],
        email: userDetails.rows[0].email
      }
    });
  } catch (error) {
    console.error('Error adding collaborator:', error);
    res.status(500).json({
      success: false,
      message: `Error adding collaborator: ${error.message}`
    });
  }
});

// Get widget collaborators
router.get("/:widgetId/collaborators", requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    
    if (!widgetId) {
      return res.status(400).json({
        success: false,
        message: "widgetId is required"
      });
    }
    
    const query = `
      SELECT u.user_id, u.email, uw.role
      FROM user_widget uw
      JOIN users u ON u.user_id = uw.user_id
      WHERE uw.widget_id = $1
    `;
    
    const result = await pool.query(query, [widgetId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    res.status(500).json({
      success: false,
      message: `Error fetching collaborators: ${error.message}`
    });
  }
});

// Get teams with access to a widget
router.get("/:widgetId/teams", requireAuth, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Get all teams with access to this widget - using "team" instead of "teams"
    const teamsResult = await pool.query(
      `SELECT t.* 
       FROM team t
       JOIN widget_team_access wta ON t.team_id = wta.team_id
       WHERE wta.widget_id = $1`,
      [widgetId]
    );

  
  
    // Return the raw team_id values without modification to preserve UUID format
    res.status(200).json({
      success: true,
      message: "Teams retrieved successfully",
      data: teamsResult.rows
    });
  } catch (error) {
    console.error(`Error getting teams for widget ${req.params.widgetId}:`, error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Update teams with access to a widget
router.put("/:widgetId/teams", requireWidgetOwnership, async (req, res) => {
  try {
    const widgetId = parseInt(req.params.widgetId);
    const { teamIds } = req.body;

    if (!Array.isArray(teamIds)) {
      return res.status(400).json({
        success: false,
        message: "teamIds must be an array"
      });
    }

    // Check if widget exists
    const widgetExists = await pool.query(selectWidgetById, [widgetId]);
    if (widgetExists.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Widget not found"
      });
    }

    // Check if widget is private
    const widgetVisibility = widgetExists.rows[0].visibility;
    if (widgetVisibility.toLowerCase() !== 'private') {
      return res.status(400).json({
        success: false,
        message: "Only private widgets can have team access"
      });
    }

    // Start a transaction
    await pool.query('BEGIN');

    // Remove all existing team access for this widget
    await pool.query(
      `DELETE FROM widget_team_access WHERE widget_id = $1`,
      [widgetId]
    );

    // Add new team access - using individual inserts to handle errors better
    if (teamIds.length > 0) {
      for (const teamId of teamIds) {
        try {
          await pool.query(
            `INSERT INTO widget_team_access (widget_id, team_id) 
             VALUES ($1, $2) 
             ON CONFLICT (widget_id, team_id) DO NOTHING`,
            [widgetId, teamId]
          );
        } catch (insertError) {
          console.error(`Error adding team ${teamId}:`, insertError.message);
          // Continue with next team instead of failing completely
        }
      }
    }

    // Commit transaction
    await pool.query('COMMIT');

    res.status(200).json({
      success: true,
      message: "Widget team access updated successfully"
    });
  } catch (error) {
    // Rollback if error occurs
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    
    console.error(`Error updating team access for widget ${req.params.widgetId}:`, error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

// Get all pending widget requests
router.get("/pending", requireSiteAdmin, async (req, res) => {
  try {
    const pendingWidgets = await getPendingWidgets();
    
    res.status(200).json({
      success: true,
      message: "Pending widgets retrieved successfully",
      data: pendingWidgets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching pending widgets: ${error.message}`
    });
  }
});

// Approve a pending widget request
router.post("/pending/:requestId/approve", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const result = await createApprovedWidget(requestId);
    
    res.status(200).json({
      success: true,
      message: result.message,
      data: { widgetId: result.widgetId }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error approving widget: ${error.message}`
    });
  }
});

// Decline a pending widget request
router.post("/pending/:requestId/decline", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const result = await removeRequest(requestId);
    
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error declining widget: ${error.message}`
    });
  }
});

export default router;
