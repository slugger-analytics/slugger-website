import pool from "../db.js";

// Registers the Player Portal widget in the SLUGGER dashboard.
// Run once against the production database:
//
//   node backend/db/seed-player-portal.js
//
// The widget will then appear in the dashboard and open at
// https://alpb-analytics.com/widgets/player-portal in an iframe.

async function seedPlayerPortalWidget() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT widget_id FROM widgets WHERE widget_name = $1`,
      ["Player Portal"]
    );

    let widgetId;
    const description =
      "Browse and discover available ALPB players. View transaction history, batting statistics, and pitching performance by player.";

    if (existing.rowCount > 0) {
      widgetId = existing.rows[0].widget_id;
      await client.query(
        `UPDATE widgets
         SET description = $1,
             redirect_link = $2,
             visibility = 'public',
             status = 'approved'
         WHERE widget_id = $3`,
        [description, "https://www.alpb-analytics.com/widgets/player-portal/dashboard", widgetId]
      );
      console.log(`Player Portal widget already existed (widget_id: ${widgetId}) — updated.`);
    } else {
      const result = await client.query(
        `INSERT INTO widgets (widget_name, description, visibility, status, redirect_link, created_at)
         VALUES ($1, $2, 'public', 'approved', $3, NOW())
         RETURNING widget_id`,
        ["Player Portal", description, "https://www.alpb-analytics.com/widgets/player-portal/dashboard"]
      );
      widgetId = result.rows[0].widget_id;
      console.log(`Player Portal widget inserted with widget_id: ${widgetId}.`);
    }

    // Link to relevant categories if they exist in this environment
    const categoryResult = await client.query(
      `SELECT id FROM categories WHERE name = ANY($1)`,
      [["Analytics", "Scouting", "Reports"]]
    );

    for (const row of categoryResult.rows.slice(0, 2)) {
      await client.query(
        `INSERT INTO widget_categories (widget_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT (widget_id, category_id) DO NOTHING`,
        [widgetId, row.id]
      );
    }

    await client.query("COMMIT");
    console.log(
      "Done. Player Portal widget is now visible in the SLUGGER dashboard at /widgets/player-portal."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding Player Portal widget:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedPlayerPortalWidget();
