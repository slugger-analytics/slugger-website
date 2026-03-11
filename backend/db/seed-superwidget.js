/**
 * Inserts or updates the SuperWidget Analyzer widget so that
 * its redirect_link points to the parameterized analysis page
 * at `/super-widget/parameterized`.
 *
 * Run from the backend folder:
 *   node db/seed-superwidget.js
 */
import pool from "../db.js";

async function seedSuperWidget() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if SuperWidget already exists
    const existing = await client.query(
      `SELECT widget_id FROM widgets WHERE widget_name = $1`,
      ['Super Widget Analyzer']
    );

    let widgetId;
    const description =
      "AI-powered analysis tool for combining insights from multiple baseball analytics widgets. Select teams and players for targeted parameterized analysis.";

    if (existing.rowCount > 0) {
      // Update existing widget to point to the parameterized page
      widgetId = existing.rows[0].widget_id;
      await client.query(
        `UPDATE widgets
         SET description = $1,
             redirect_link = $2,
             visibility = 'public',
             status = 'approved'
         WHERE widget_id = $3`,
        [description, "/super-widget/parameterized", widgetId],
      );
      console.log(
        "SuperWidget already existed (widget_id:",
        widgetId,
        ") — updated redirect_link to /super-widget/parameterized.",
      );
    } else {
      // Insert the widget
      const result = await client.query(
        `INSERT INTO widgets (widget_name, description, visibility, status, redirect_link, created_at)
         VALUES ($1, $2, 'public', 'approved', $3, NOW())
         RETURNING widget_id`,
        ["Super Widget Analyzer", description, "/super-widget/parameterized"],
      );

      widgetId = result.rows[0].widget_id;
      console.log("SuperWidget inserted with widget_id:", widgetId);
    }

    // Link to the Analytics / Reports category if it exists
    const categoryResult = await client.query(
      `SELECT id FROM categories WHERE name = ANY($1)`,
      [['Analytics', 'Reports', 'Hitting']]
    );

    for (const row of categoryResult.rows.slice(0, 2)) {
      await client.query(
        `INSERT INTO widget_categories (widget_id, category_id)
         VALUES ($1, $2)
         ON CONFLICT (widget_id, category_id) DO NOTHING`,
        [widgetId, row.id]
      );
    }

    await client.query('COMMIT');
    console.log(
      "Done. SuperWidget now redirects to /super-widget/parameterized and is visible in the Widgets section.",
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error seeding SuperWidget:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedSuperWidget();
