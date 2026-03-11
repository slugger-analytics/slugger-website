# SuperWidget Setup Guide

## Quick Start

### Prerequisites
- **Node.js v20+** (v18 causes backend crash: `File is not defined`)
- PostgreSQL running (local Docker or RDS via `.env`)
- Port 3000 (frontend) and 3001 (backend) available

### Option A: Run both from root (recommended)
```bash
cd /Users/nancy/slugger-website
export $(cat .env | grep -v '^#' | xargs) && npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Option B: Run backend and frontend separately

**Backend:**
```bash
cd backend
npm install
export $(cat ../.env | grep -v '^#' | xargs) && npm run dev
```
Server runs at `http://localhost:3001`

**Frontend** (in another terminal):
```bash
cd frontend
npm install
export $(cat ../.env | grep -v '^#' | xargs) && npm run dev
```
App runs at `http://localhost:3000`

## Access SuperWidget

- **Main Analyzer**: http://localhost:3000/super-widget
- **Parameterized Analysis**: http://localhost:3000/super-widget/parameterized
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

**Backend crashes with `ReferenceError: File is not defined`?**
- Upgrade to Node 20+: `nvm install 20 && nvm use 20` (or install from nodejs.org)

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
SuperWidget is merged into `main`. No branch switch needed.
