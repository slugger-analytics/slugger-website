import pool from "../db.js";

// Registers the Lineup Optimization widget in the SLUGGER dashboard.
// Run once against the production database:
//
//   node backend/db/seed-lineup-optim.js
//
// The widget will then appear in the dashboard and open at
// https://www.alpb-analytics.com/widgets/lineup in an iframe.

async function seedLineupOptimWidget() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT widget_id FROM widgets WHERE widget_name = $1`,
      ["Lineup Optimization"]
    );

    let widgetId;
    const description =
      "Build and optimize game-day lineups using advanced analytics. Leverage player statistics and matchup data to maximize run production.";

    if (existing.rowCount > 0) {
      widgetId = existing.rows[0].widget_id;
      await client.query(
        `UPDATE widgets
         SET description = $1,
             redirect_link = $2,
             visibility = 'public',
             status = 'approved'
         WHERE widget_id = $3`,
        [description, "https://www.alpb-analytics.com/widgets/lineup/", widgetId]
      );
      console.log(`Lineup Optimization widget already existed (widget_id: ${widgetId}) — updated.`);
    } else {
      const result = await client.query(
        `INSERT INTO widgets (widget_name, description, visibility, status, redirect_link, created_at)
         VALUES ($1, $2, 'public', 'approved', $3, NOW())
         RETURNING widget_id`,
        ["Lineup Optimization", description, "https://www.alpb-analytics.com/widgets/lineup/"]
      );
      widgetId = result.rows[0].widget_id;
      console.log(`Lineup Optimization widget inserted with widget_id: ${widgetId}.`);
    }

    const categoryResult = await client.query(
      `SELECT id FROM categories WHERE name = ANY($1)`,
      [["Analytics", "Strategy"]]
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
      "Done. Lineup Optimization widget is now visible in the SLUGGER dashboard at /widgets/lineup."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding Lineup Optimization widget:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedLineupOptimWidget();
