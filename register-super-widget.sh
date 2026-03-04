#!/bin/bash

# Super Widget Registration Script
# This script helps register the Super Widget Analyzer in the SLUGGER system

echo "🧠 Super Widget Analyzer Registration Script"
echo "=========================================="

# Check if we're in the project root
if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo ""
echo "📋 Super Widget Details:"
echo "Name: Super Widget Analyzer"
echo "Description: AI-powered analysis tool for combining insights from multiple baseball analytics widgets"
echo "Visibility: public"
echo "Categories: Analytics, AI, Dashboard"
echo ""

echo "🔧 To register the Super Widget, you have two options:"
echo ""

echo "Option 1: Manual Registration via Web Interface"
echo "----------------------------------------------"
echo "1. Go to the widget registration page as a widget developer"
echo "2. Fill in the following details:"
echo "   - Widget Name: Super Widget Analyzer"
echo "   - Description: AI-powered analysis tool for combining insights from multiple baseball analytics widgets"
echo "   - Visibility: Public"
echo "   - Categories: Select Analytics, AI, Dashboard (create if needed)"
echo "   - Redirect Link: http://localhost:3000/super-widget"
echo "3. Submit the registration"
echo ""

echo "Option 2: Direct Database Insertion"
echo "----------------------------------"
echo "If you have database access, run this SQL (update category IDs as needed):"
echo ""
cat << 'EOF'
INSERT INTO widgets (
  widget_name,
  description,
  visibility,
  status,
  redirect_link,
  image_url,
  category_ids,
  created_at
) VALUES (
  'Super Widget Analyzer',
  'AI-powered analysis tool for combining insights from multiple baseball analytics widgets',
  'public',
  'approved',
  'http://localhost:3000/super-widget',
  '/analytics-icon.png',
  ARRAY[1, 2, 3], -- Update with actual category IDs
  NOW()
) RETURNING widget_id;
EOF

echo ""
echo "📝 Next Steps:"
echo "1. Register the widget using one of the methods above"
echo "2. Test the widget by accessing it from the dashboard"
echo "3. For production, update the redirect link to the production URL"
echo ""

echo "✅ Super Widget registration information displayed above."
echo "📖 See frontend/src/app/super-widget/README.md for detailed documentation."