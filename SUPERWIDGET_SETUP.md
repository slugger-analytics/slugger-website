# SuperWidget Setup Guide

## Quick Start

### Prerequisites
- Node.js v18+ and npm v9+
- PostgreSQL running locally
- Port 3000 (frontend) and 3001 (backend) available

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

Server runs at `http://localhost:3001`

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`

## Access SuperWidget


- **Parameterized Analysis**: `http://localhost:3000/super-widget/parameterized`
  - Select teams and players
  - Run widgets with custom parameters
  - See results from Pointstreak integration

## Key Files

**Frontend:**
- `frontend/src/api/widget.ts` - Widget fetching functions
- `frontend/src/app/super-widget/page.tsx` - Main page
- `frontend/src/app/super-widget/parameterized/page.tsx` - Parameterized page

**Backend:**
- `backend/api/widgets.js` - Widget execution endpoints
- `backend/api/super-widget-parameterized.js` - Parameterized analysis endpoint
- `backend/services/pointstreakService.js` - Baseball stats API

## API Endpoints

### Widget Execution
```bash
GET /api/widgets/:widgetId/execute?teamIds=1&playerIds=2
```

### Parameterized Analysis
```bash
POST /api/super-widget/parameterized-analysis
Content-Type: application/json

{
  "teamIds": ["1"],
  "playerIds": [],
  "analysisType": "group"
}
```

## Troubleshooting

**Port already in use?**
```bash
lsof -ti:3001 | xargs kill -9
```

**Database connection error?**
- Verify PostgreSQL is running
- Check `backend/db.js` for connection settings

**Widget outputs not showing?**
- Check browser console for errors
- Verify backend server is running
- Try refreshing the page

## Git Branch
Current implementation is on the `superwidget` branch. To view changes:
```bash
git checkout superwidget
git diff main
```
