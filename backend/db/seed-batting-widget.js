import pool from "../db.js";

// Registers the Batting Widget in the SLUGGER dashboard.
// The app itself is hosted like the pitching widget, at /widgets/batting/.
//
//   node backend/db/seed-batting-widget.js

async function seedBattingWidget() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT widget_id FROM widgets WHERE widget_name = $1`,
      ["Batting Widget"]
    );

    let widgetId;
    const description =
      "Season batting line, slugging heatmaps, and spray charts for ALPB batters.";
    const redirectLink = "https://www.alpb-analytics.com/widgets/batting/";

    if (existing.rowCount > 0) {
      widgetId = existing.rows[0].widget_id;
      await client.query(
        `UPDATE widgets
         SET description = $1,
             redirect_link = $2,
             visibility = 'Public',
             status = 'approved'
         WHERE widget_id = $3`,
        [description, redirectLink, widgetId]
      );
      console.log(`Batting Widget already existed (widget_id: ${widgetId}) — updated.`);
    } else {
      const result = await client.query(
        `INSERT INTO widgets (widget_name, description, visibility, status, redirect_link, created_at)
         VALUES ($1, $2, 'Public', 'approved', $3, NOW())
         RETURNING widget_id`,
        ["Batting Widget", description, redirectLink]
      );
      widgetId = result.rows[0].widget_id;
      console.log(`Batting Widget inserted with widget_id: ${widgetId}.`);
    }

    const categoryResult = await client.query(
      `SELECT id FROM categories WHERE name = 'Hitting'`
    );
    for (const row of categoryResult.rows) {
      await client.query(
        `INSERT INTO widget_categories (widget_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT (widget_id, category_id) DO NOTHING`,
        [widgetId, row.id]
      );
    }

    await client.query("COMMIT");
    console.log("Done. Batting Widget opens at /widgets/batting/.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding Batting Widget:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedBattingWidget();
