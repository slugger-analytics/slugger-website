# SLUGGER

The first centralized data analytics platform for the Atlantic League of Professional Baseball. Powered by Trackman radar data and developed in collaboration with the [Johns Hopkins University's Sports Analytics Research Group](https://sports-analytics.cs.jhu.edu/), SLUGGER enables analysts, players, coaches, and more to access interactive analytical tools and game-changing insights.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (AWS RDS for production, Docker for local)
- **Authentication**: AWS Cognito
- **Infrastructure**: AWS ECS Fargate, Application Load Balancer, ECR
- **CI/CD**: GitHub Actions

## Production

**URL**: `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`

Deployed on AWS ECS Fargate with automated CI/CD. Push to `main` triggers automatic deployment.

## Why Local Database?

**Benefits:**
- ⚡ **Fast**: No network latency, instant queries
- 💰 **Cost-effective**: No RDS charges during development
- 🔒 **Safe**: Can't corrupt production data
- 🌐 **Offline**: Work without internet
- 🧪 **Experimental**: Test destructive operations safely

**Development Workflow:**
```
1. Initial Setup (once)
   └─ Start local DB → Clone production data

2. Daily Development
   └─ Code changes → Test locally → Fast iteration

3. Refresh Data (when needed)
   └─ Pull latest production data → Continue testing

4. Deploy (code only)
   └─ git push → CI/CD deploys → Production updated
```

**Important**: Local DB is for testing. Production data stays in RDS.

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker Desktop**
- **AWS credentials** (in `.env` file)

### Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local PostgreSQL
npm run db:local:start

# 3. Clone production data (first time only)
./pull-rds-data.sh

# 4. Start the application
export $(cat .env.local | grep -v '^#' | xargs) && npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Essential Commands

```bash
# Development with LOCAL database (default)
npm run dev                    # Uses .env.local (local PostgreSQL)

# Development with PRODUCTION database (when needed)
export $(cat .env | grep -v '^#' | xargs) && npm run dev  # Uses production RDS

# Database Management
npm run db:local:start         # Start local PostgreSQL
npm run db:local:stop          # Stop local PostgreSQL
./pull-rds-data.sh             # Refresh local DB with latest production data

# Database Access
docker exec -it slugger-postgres-local psql -U postgres -d slugger_local  # Local DB
# For production DB access, use AWS RDS console or approved tools
```

### Environment Files

- **`.env.local`**: Local database settings (default for `npm run dev`)
- **`.env`**: Production RDS settings (for working with prod DB locally)

```env
# .env.local - Local Development (default)
DB_HOST=localhost
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=slugger_local
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env - Production DB Access (when needed)
DB_HOST=db host name
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=postgres
LOCAL_DEV=true  # ← Ensures cookies work with http://localhost
NEXT_PUBLIC_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
# Note: Do NOT set NODE_ENV=production - it breaks Next.js dev server
```

**Important**:

- `LOCAL_DEV=true` ensures cookies work with `http://localhost` (no secure flag, sameSite=lax)
- Never set `NODE_ENV=production` when running `npm run dev` - it breaks Next.js build
- The backend defaults to development mode, which is correct for localhost

## Docker Build (for CI/CD)

This monorepo uses npm workspaces. The Dockerfiles are configured to work with the workspace structure:

```bash
# Build using the helper script (recommended)
./docker-build.sh frontend        # Build frontend image
./docker-build.sh backend         # Build backend image
./docker-build.sh all             # Build both images

# Or build manually with proper context
docker build -f frontend/Dockerfile.prod --build-context root=. -t slugger-frontend:latest frontend/
docker build -f backend/Dockerfile.prod --build-context root=. -t slugger-backend:latest backend/
```

**Important**: Docker builds must be run from the monorepo root (`/slugger-website`) because the workspaces share a single `package-lock.json` at the root level.

See [`.documentation/bugs/2025-11-13-docker-npm-workspaces-fix.md`](../.documentation/bugs/2025-11-13-docker-npm-workspaces-fix.md) for technical details.

## Deployment

```bash
# Automatic deployment (recommended)
git push origin main           # CI/CD auto-deploys to production

# Monitor deployment
# GitHub Actions → ECS Fargate CI/CD workflow
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for advanced deployment options.

## Documentation

- **[DEVELOPMENT-GUIDE.md](DEVELOPMENT-GUIDE.md)** - Complete development workflow and best practices
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment, monitoring, rollback
- **[aws/AWS-INFRASTRUCTURE.md](aws/AWS-INFRASTRUCTURE.md)** - Complete AWS resource catalog
