# Super Widget Analyzer

An AI-powered widget that analyzes multiple baseball analytics widgets to provide combined insights, usage patterns, and recommendations.

## Features

- **Multi-Widget Selection**: Choose from available widgets to analyze
- **AI-Powered Insights**: Generate intelligent analysis based on widget metadata and metrics
- **Combined Analytics**: View aggregated metrics across selected widgets
- **Smart Recommendations**: Get actionable suggestions for widget portfolio optimization

## Setup Instructions

### 1. Register the Super Widget

Since this is a built-in widget, you need to register it manually in the database or through the admin interface:

**Widget Registration Data:**
- **Name**: Super Widget Analyzer
- **Description**: AI-powered analysis tool for combining insights from multiple baseball analytics widgets
- **Visibility**: Public (or Private for team-restricted access)
- **Redirect Link**: `http://localhost:3000/super-widget` (for local dev) or production URL
- **Categories**: Analytics, AI, Dashboard
- **Image URL**: (optional - can use a default analytics icon)

### 2. Database Registration (Alternative)

If you have database access, you can insert the widget directly:

```sql
INSERT INTO widgets (
  widget_name,
  description,
  visibility,
  status,
  redirect_link,
  image_url,
  category_ids
) VALUES (
  'Super Widget Analyzer',
  'AI-powered analysis tool for combining insights from multiple baseball analytics widgets',
  'public',
  'approved',
  'http://localhost:3000/super-widget',
  '/analytics-icon.png',
  ARRAY[1, 2, 3] -- Replace with actual category IDs
);
```

### 3. Update Production URLs

When deploying to production, update the redirect link to:
```
http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/super-widget
```

## How It Works

1. **Widget Discovery**: Fetches all available widgets via the `/api/widgets` endpoint
2. **User Selection**: Allows users to select multiple widgets for analysis
3. **AI Analysis**: Generates insights based on:
   - Widget metadata (names, descriptions, categories)
   - Usage metrics (launches, uniques, engagement patterns)
   - Category distribution and popularity
4. **Results Display**: Shows comprehensive analysis with recommendations

## AI Analysis Features

### Summary Generation
- Total widget count and combined metrics
- Average engagement levels
- Dominant categories

### Key Insights
- Portfolio composition analysis
- Engagement pattern recognition
- Most popular widgets identification
- Category distribution analysis

### Recommendations
- Tool consolidation suggestions
- Performance optimization advice
- Privacy/public access recommendations
- Cross-widget integration opportunities

## Technical Implementation

- **Frontend**: Next.js React component with TypeScript
- **Styling**: TailwindCSS with Radix UI components
- **State Management**: Nano Stores for local state
- **API Integration**: Uses existing widget and user APIs
- **AI Logic**: Client-side analysis algorithms (can be enhanced with external AI services)

## Future Enhancements

1. **External AI Integration**: Connect to OpenAI, Claude, or other AI services for more sophisticated analysis
2. **Real-time Data**: Include live usage data and trends
3. **Custom Analysis Types**: Allow users to specify analysis focus areas
4. **Export Capabilities**: Generate reports or share analysis results
5. **Widget Comparison**: Side-by-side performance comparisons

## Usage

1. Access the Super Widget through the main dashboard
2. Select 2+ widgets to analyze
3. Click "Generate AI Analysis"
4. Review insights, metrics, and recommendations
5. Use findings to optimize widget portfolio</content>
<parameter name="filePath">/Users/chenyuang/projects/slugger-website/frontend/src/app/super-widget/README.md