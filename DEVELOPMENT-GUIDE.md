# SLUGGER Development Guide

## Local Database Development Explained

### Why Use a Local Database?

**Speed & Cost**
- Queries execute instantly (no network latency)
- Zero RDS charges during development (~$70/month savings)
- Faster iteration cycles

**Safety & Flexibility**
- Can't accidentally corrupt production data
- Test destructive operations (DROP, TRUNCATE) safely
- Work offline without internet connection
- Each developer has isolated environment

### Development Workflow

```
┌─────────────────────────────────────────────────────────┐
│ INITIAL SETUP (One-time)                                │
├─────────────────────────────────────────────────────────┤
│ 1. npm run db:local:start                               │
│    └─ Starts PostgreSQL in Docker container             │
│                                                          │
│ 2. ./pull-rds-data.sh                                   │
│    └─ Clones production schema + data to local          │
│                                                          │
│ 3. export $(cat .env.local | xargs) && npm run dev      │
│    └─ Starts app connected to local database            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ DAILY DEVELOPMENT                                       │
├─────────────────────────────────────────────────────────┤
│ • Make code changes                                     │
│ • Test features locally                                 │
│ • Add/modify test data in local DB                      │
│ • Fast feedback loop (no network delays)                │
│                                                          │
│ Local DB State: Your test data accumulates             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ REFRESH DATA (When Needed)                              │
├─────────────────────────────────────────────────────────┤
│ ./pull-rds-data.sh                                      │
│                                                          │
│ When to refresh:                                        │
│ • Need latest production data                           │
│ • Local DB got messy from testing                       │
│ • New teams/widgets added in production                 │
│ • Want fresh start with clean data                      │
│                                                          │
│ ⚠️  This OVERWRITES your local database completely      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ DEPLOY CODE (Not Data)                                  │
├─────────────────────────────────────────────────────────┤
│ git add .                                               │
│ git commit -m "Add new feature"                         │
│ git push origin main                                    │
│                                                          │
│ What happens:                                           │
│ • GitHub Actions builds & deploys code                  │
│ • Production app updated with new code                  │
│ • Production database UNCHANGED                         │
│ • Your local test data stays local                      │
└─────────────────────────────────────────────────────────┘
```

### Important Concepts

**Data Flow is One-Way**
```
Production RDS ──pull-rds-data.sh──> Local PostgreSQL
                                      (for testing only)
```

- Production data flows TO local (for testing)
- Local data NEVER flows to production
- Code changes deploy via Git, not database

**What Gets Deployed**
- ✅ Code changes (frontend/backend)
- ✅ Schema migrations (if you create them)
- ❌ Test data you created locally
- ❌ Local database modifications

**When to Pull Fresh Data**
- After someone adds new teams/widgets in production
- When your local DB gets cluttered with test data
- Before testing features that depend on specific data
- After a long break from development

## Common Scenarios

### Scenario 1: Adding a New Feature

```bash
# 1. Start with fresh data (optional)
./pull-rds-data.sh

# 2. Start development
export $(cat .env.local | xargs) && npm run dev

# 3. Make code changes
# Edit files in frontend/ or backend/

# 4. Test locally
# Create test data, try different scenarios

# 5. Deploy when ready
git add .
git commit -m "Add new analytics widget"
git push origin main
```

### Scenario 2: Testing with Latest Production Data

```bash
# Pull fresh data
./pull-rds-data.sh

# Verify data
docker exec -it slugger-postgres-local psql -U postgres -d slugger_local
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM widgets;
\q

# Start testing
export $(cat .env.local | xargs) && npm run dev
```

### Scenario 3: Database Schema Changes

```bash
# 1. Create migration file
# backend/db/migrations/001_add_new_column.sql

# 2. Test migration locally
docker exec -i slugger-postgres-local psql -U postgres -d slugger_local < backend/db/migrations/001_add_new_column.sql

# 3. Update code to use new schema
# Make necessary code changes

# 4. Test thoroughly locally

# 5. Deploy (migration runs automatically in production)
git add .
git commit -m "Add new column for feature X"
git push origin main
```

## Quick Reference

### Start Development

```bash
# First time
npm run db:local:start
./pull-rds-data.sh
export $(cat .env.local | xargs) && npm run dev

# Daily
export $(cat .env.local | xargs) && npm run dev
```

### Database Commands

```bash
# Access local database
docker exec -it slugger-postgres-local psql -U postgres -d slugger_local

# Useful queries
\dt                              # List tables
\d users                         # Describe users table
SELECT COUNT(*) FROM users;      # Count users
SELECT * FROM widgets LIMIT 5;   # View widgets
\q                               # Exit
```

### Refresh Data

```bash
./pull-rds-data.sh               # Clone production to local
```

### Deploy

```bash
git push origin main             # Auto-deploys via CI/CD
```

### Troubleshooting

```bash
# Port already in use
lsof -ti :3000 :3001 | xargs kill -9

# Database won't start
docker ps                        # Check running containers
docker logs slugger-postgres-local  # Check logs
npm run db:local:stop            # Stop and restart
npm run db:local:start

# Can't connect to database
docker exec -it slugger-postgres-local psql -U postgres -d slugger_local -c 'SELECT 1;'
```

## Environment Files

### `.env` (Production Credentials)

Used for:
- Pulling data from RDS
- Connecting to cloud services

```env
DB_HOST=alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com
DB_USERNAME=postgres
DB_PASSWORD=your_rds_password
DB_NAME=postgres
```

### `.env.local` (Local Development)

Used for:
- Daily development
- Local database connection

```env
DB_HOST=localhost
DB_USERNAME=postgres
DB_PASSWORD=localpassword
DB_NAME=slugger_local
DB_PORT=5432
```

## Best Practices

1. **Pull fresh data regularly** - Stay in sync with production
2. **Don't commit `.env` files** - Keep credentials secure
3. **Test locally before pushing** - Catch issues early
4. **Use feature branches** - Keep main stable
5. **Run linting** - `npm run lint --workspaces`
6. **Monitor deployments** - Watch GitHub Actions

## FAQ

**Q: Do I need to pull data every time I start development?**  
A: No, only when you want fresh production data or your local DB is messy.

**Q: Will my local test data go to production?**  
A: No, only code changes deploy. Data stays local.

**Q: Can I work offline?**  
A: Yes, once you have local data. You only need internet to pull fresh data or deploy.

**Q: What if I accidentally corrupt my local database?**  
A: Just run `./pull-rds-data.sh` to restore from production.

**Q: How do I add production data (like a new team)?**  
A: Add it directly in production RDS, or create a migration script that runs in production.

**Q: Can multiple developers work on the same local database?**  
A: No, each developer has their own isolated local database.
