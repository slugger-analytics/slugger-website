import pool from '../db.js'
import { faker } from '@faker-js/faker'

async function seedWidgets() {
  // Baseball-related keywords to help generate relevant content
  const baseballTerms = [
    'batting', 'pitching', 'fielding', 'analytics', 'statistics',
    'metrics', 'performance', 'average', 'slugging', 'OPS',
    'ERA', 'strikeouts', 'hits', 'runs', 'RBI',
    'defense', 'offense', 'player', 'team', 'game',
    'velocity', 'spin rate', 'launch angle', 'exit velocity', 'WAR'
  ];

  const categories = ['Hitting', 'Pitching', 'Finance', 'Scouting', 'Reports'];

  try {
    // Generate 5 baseball analytics widgets with faker
    const widgets = Array.from({ length: 5 }, () => {
      // Get 2-3 random baseball terms for more relevant names/descriptions
      const nameTerms = faker.helpers.arrayElements(baseballTerms, { min: 1, max: 2 });
      const descTerms = faker.helpers.arrayElements(baseballTerms, { min: 2, max: 3 });
      
      return {
        name: `${nameTerms.join(' ')} ${faker.helpers.arrayElement(['Dashboard', 'Analytics', 'Tracker', 'Visualizer', 'Calculator'])}`,
        description: `SAMPLE WIDGET. ${descTerms.join(' ')} ${faker.helpers.arrayElement(['analysis', 'visualization', 'tracking', 'metrics', 'insights'])} with ${faker.helpers.arrayElement(['interactive charts', 'real-time updates', 'historical comparisons', 'predictive modeling', 'advanced statistics'])}`
      };
    });

    // Insert the generated widgets
    const widgetInsertResults = await pool.query(`
      INSERT INTO widgets (widget_name, description, visibility, status)
      VALUES 
        ($1, $2, 'public', 'approved'),
        ($3, $4, 'public', 'approved'),
        ($5, $6, 'public', 'approved'),
        ($7, $8, 'public', 'approved'),
        ($9, $10, 'public', 'approved')
      RETURNING widget_id;
    `, widgets.flatMap(w => [w.name, w.description]));

    const widgetIds = widgetInsertResults.rows.map(row => row.widget_id);

    // Link all widgets to user 10 in the user_widget table
    await pool.query(`
      WITH existing_key AS (
        SELECT api_key FROM user_widget WHERE user_id = $1 LIMIT 1
      )
      INSERT INTO user_widget (user_id, widget_id, api_key)
      SELECT $1, unnest($2::int[]), (SELECT api_key FROM existing_key)
      ON CONFLICT (user_id, widget_id) DO NOTHING;
    `, [10, widgetIds]);

    // Get category IDs
    const categoryResults = await pool.query(
      `SELECT id, name FROM categories WHERE name = ANY($1)`,
      [categories]
    );
    const categoryMap = Object.fromEntries(
      categoryResults.rows.map(row => [row.name, row.id])
    );

    // Add 1-3 random categories to each widget
    for (const widgetId of widgetIds) {
      const numCategories = faker.number.int({ min: 1, max: 3 });
      const selectedCategories = faker.helpers.arrayElements(categories, numCategories);
      
      for (const category of selectedCategories) {
        await pool.query(
          `INSERT INTO widget_categories (widget_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT (widget_id, category_id) DO NOTHING`,
          [widgetId, categoryMap[category]]
        );
      }
    }

    console.log('Successfully seeded widgets and categories');
  } catch (error) {
    console.error('Error seeding widgets:', error);
  }
}

seedWidgets();
