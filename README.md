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
# Development
npm run dev                    # Start app (uses .env.local for local DB)
export $(cat .env | xargs) && npm run dev  # Use cloud RDS instead

# Database
npm run db:local:start         # Start local PostgreSQL
npm run db:local:stop          # Stop local PostgreSQL
./pull-rds-data.sh             # Refresh with latest production data

# Database access
docker exec -it slugger-postgres-local psql -U postgres -d slugger_local
```

### Environment Files

- **`.env`**: Production RDS credentials (for pulling data)
- **`.env.local`**: Local database settings (for development)

```env
# .env.local
DB_HOST=localhost
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=slugger_local
DB_PORT=5432
```

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
