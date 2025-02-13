import pkg from "aws-sdk";
const { APIGateway } = pkg;
const apiGateway = new APIGateway({ region: "us-east-2" });
import pool from "../db.js"; // PostgreSQL connection setup
import { logWithFunctionName } from "../utils/logging.js";

const selectWidgetById = `
    SELECT *
    FROM WIDGETS
    WHERE widget_id = $1
`;

const DEBUG = true;

// Function to register a widget
export async function registerWidget(
  userId,
  widgetName,
  description,
  visibility,
  widgetProps,
) {
  const query = `
        INSERT INTO requests (user_id, widget_name, description, visibility, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;
  try {
    // Add a pending widget to the 'requests' table
    const status = "pending";
    const result = await pool.query(query, [
      userId,
      widgetName,
      description,
      visibility,
      status,
    ]);
    const requestedWidget = result.rows[0];

    return requestedWidget;
  } catch (error) {
    console.error("Error registering widget:", error);
    throw new Error("Failed to register widget");
  }
}

export async function updateWidget({
  id,
  name,
  description,
  redirectLink,
  visibility,
  imageUrl,
  publicId,
  restrictedAccess
}) {
  const updates = [];
  const values = [];
  let index = 1;

  // Dynamically construct query based on which parameters are defined
  if (name !== undefined) {
    updates.push(`widget_name = $${index++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(description);
  }
  if (redirectLink !== undefined) {
    updates.push(`redirect_link = $${index++}`);
    values.push(redirectLink);
  }
  if (visibility !== undefined) {
    updates.push(`visibility = $${index++}`);
    values.push(visibility);
  }
  if (imageUrl !== undefined) {
    updates.push(`image_url = $${index++}`);
    values.push(imageUrl);
  }
  if (publicId !== undefined) {
    updates.push(`public_id = $${index++}`);
    values.push(publicId);
  }
  if (restrictedAccess !== undefined) {
    console.log({restrictedAccess})
    updates.push(`restricted_access = $${index++}`);
    values.push(restrictedAccess);
  }

  values.push(id);

  const editQuery = `
        UPDATE widgets
        SET ${updates.join(", ")}
        WHERE widget_id = $${index}
        RETURNING *
    `;

  try {
    let updatedWidget;
    if (updates.length === 0) {
      // There are no fields to update
      const res = await pool.query(selectWidgetById, [id]);
      updatedWidget = res.rows[0];
    } else {
      const res = await pool.query(editQuery, values);
      updatedWidget = res.rows[0];
    }
    return updatedWidget;
  } catch (error) {
    console.error("Error updating widget:", error);
    throw new Error("Failed to update widget");
  }
}

export async function removeRequest(requestId) {
  const query = `DELETE FROM requests WHERE request_id = $1 RETURNING *;`;

  try {
    const result = await pool.query(query, [requestId]);
    if (result.rowCount === 0) {
      console.log("Debug A");
      throw new Error("Pending widget not found");
    }
    return result.rows[0]; // Return the deleted request data if necessary
  } catch (error) {
    console.error("Error deleting request:", error);
    throw error;
  }
}

export async function createUserWidgetRelation(
  user_id,
  widgetId,
  apiKey,
  role = "owner",
) {
  try {
    const query = `
            INSERT INTO user_widget (user_id, widget_id, api_key, role, joined_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *;
        `;
    const result = await pool.query(query, [user_id, widgetId, apiKey, role]);
    return result.rows[0]; // Return the newly created relation
  } catch (error) {
    console.error("Error creating user-widget relation:", error.message);
    throw error;
  }
}

export async function generateApiKeyForUser(user_id, email) {
  const params = {
    name: `ApiKey-${user_id}`,
    description: `API key for ${email}`,
    enabled: true,
    generateDistinctId: true,
    stageKeys: [], // You can specify stages if needed
  };

  DEBUG && logWithFunctionName(params);

  try {
    const apiKey = await apiGateway.createApiKey(params).promise();
    console.log(apiKey)
    DEBUG && logWithFunctionName(apiKey);
    if (!apiKey.id) {
      throw new Error("Failed to generate API key: no ID returned");
    }
    await associateApiKeyWithUsagePlan(apiKey.id, process.env.USAGE_PLAN_ID);
    await saveApiKeyToDatabase(user_id, apiKey.id);
    return apiKey.id;
  } catch (err) {
    DEBUG && logWithFunctionName(err);
    throw new Error("Failed to generate API key");
  }
}

export async function associateApiKeyWithUsagePlan(apiKeyId, usagePlanId) {
  const params = {
    keyId: apiKeyId,
    keyType: "API_KEY",
    usagePlanId: usagePlanId,
  };
  DEBUG && logWithFunctionName(params);
  try {
    await apiGateway.createUsagePlanKey(params).promise();
    console.log("API Key associated with Usage Plan");
  } catch (err) {
    console.error("Error associating API Key with Usage Plan:", err);
  }
}

export async function saveApiKeyToDatabase(user_id, apiKey) {
  const query = `
        UPDATE user_widget
        SET api_key = $1
        WHERE user_id = $2;
    `;
  await pool.query(query, [apiKey, user_id]);
}

export async function getRequestData(request_id) {
  try {
    const query = `
            SELECT * FROM requests WHERE request_id = $1
        `;
    const result = await pool.query(query, [request_id]);

    if (result.rows.length === 0) {
      console.log("Debug B");
      throw new Error("Pending widget not found");
    }

    return result.rows[0]; // Return the request data
  } catch (error) {
    console.error("Error fetching request data:", error.message);
    throw error;
  }
}

export async function getUserData(userId) {
  try {
    const query = `
            SELECT * FROM users WHERE user_id = $1
        `;
    const result = await pool.query(query, [userId]);

    if (result.rowCount === 0) {
      console.log("Debug C");
      throw new Error("User not found");
    }

    return result.rows[0]; // Return the user data
  } catch (error) {
    console.error("Error fetching request data:", error.message);
    throw error;
  }
}

export async function createApprovedWidget({
  widget_name,
  description,
  visibility,
}) {
  try {
    const query = `
            INSERT INTO widgets (widget_name, description, visibility, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING widget_id;
        `;
    const result = await pool.query(query, [
      widget_name,
      description,
      visibility,
      "approved",
    ]);

    return result.rows[0]["widget_id"]; // Return the newly created widget ID
  } catch (error) {
    console.error("Error creating approved widget:", error.message);
    throw error;
  }
}

export async function getPendingWidgets() {
  const query = `
        SELECT * FROM requests`;
  const result = await pool.query(query);
  return result.rows;
}

export async function getAllWidgets(widget_name, categories, page, limit) {
  // When we select * from widgets,
  // need to get all user_ids from user_widget where user_widget.widget_id === widgets.widget_id
const widgetsQuery = `
    SELECT
        w.*,
        ARRAY_AGG(uw.user_id) AS developer_ids,
        COALESCE(
            JSON_AGG(
                DISTINCT JSONB_BUILD_OBJECT('id', c.id, 'name', c.name, 'hex_code', c.hex_code)
            ) FILTER (WHERE c.name IS NOT NULL),
            '[]'
        ) AS categories,
        JSONB_BUILD_OBJECT(
            'weeklyLaunches', COALESCE(MAX(wm_weekly.total_launches), 0),
            'weeklyUniqueLaunches', COALESCE(MAX(wm_weekly.unique_launches), 0),
            'monthlyLaunches', COALESCE(MAX(wm_monthly.total_launches), 0),
            'monthlyUniqueLaunches', COALESCE(MAX(wm_monthly.unique_launches), 0),
            'yearlyLaunches', COALESCE(MAX(wm_yearly.total_launches), 0),
            'yearlyUniqueLaunches', COALESCE(MAX(wm_yearly.unique_launches), 0),
            'allTimeLaunches', COALESCE(MAX(wm_all_time.total_launches), 0),
            'allTimeUniqueLaunches', COALESCE(MAX(wm_all_time.unique_launches), 0)
        ) AS metrics
    FROM
        widgets w
    LEFT JOIN
        user_widget uw ON w.widget_id = uw.widget_id
    LEFT JOIN 
        widget_categories AS wc ON w.widget_id = wc.widget_id
    LEFT JOIN
        categories AS c ON wc.category_id = c.id
    LEFT JOIN
        widget_metrics wm_weekly ON w.widget_id = wm_weekly.widget_id AND wm_weekly.timeframe_type = 'weekly'
    LEFT JOIN
        widget_metrics wm_monthly ON w.widget_id = wm_monthly.widget_id AND wm_monthly.timeframe_type = 'monthly'
    LEFT JOIN
        widget_metrics wm_yearly ON w.widget_id = wm_yearly.widget_id AND wm_yearly.timeframe_type = 'yearly'
    LEFT JOIN
        widget_metrics wm_all_time ON w.widget_id = wm_all_time.widget_id AND wm_all_time.timeframe_type = 'all_time'
    GROUP BY
        w.widget_id;
`;

  // const result = await pool
  //     .select({
  //         widget: widgets,
  //         developer_ids: 'developer_ids',
  //     })
  //     .from(widgets)
  //     .leftJoin()
  const result = await pool.query(widgetsQuery);
  return result.rows;
}

export async function deleteWidget(id) {
  const widgetsQuery = `DELETE FROM widgets WHERE widget_id = $1 RETURNING *`;
  const result = await pool.query(widgetsQuery, [id]);
  console.log(result.rows);
  const deletedWidget = result.rows[0];

  return deletedWidget;
}
