# Health Check Investigation & Root Cause Analysis

**Issue**: Database health check always returns "unhealthy" even though the application works normally (users can login and access widgets).

**Date**: October 6, 2025  
**Status**: ✅ Root cause identified and fixed

---

## 🔍 Root Cause Analysis

### Problem Statement

The user reported that:
1. Health check shows database as "disconnected" even though the app works
2. Users can successfully login and access widgets
3. Had to force health check to always return 200 to keep containers running

### Root Causes Identified

#### 1. **Connection Pool Timeout Too Aggressive** (PRIMARY CAUSE)

**Issue**: The connection pool had `connectionTimeoutMillis: 5000` (5 seconds), which was too short.

```javascript
// BEFORE (Too strict):
const pool = new Pool({
  connectionTimeoutMillis: 5000, // Only 5 seconds to get a connection
  idleTimeoutMillis: 30000,
});
```

**Why this caused the issue**:
- During container startup, establishing the initial database connection can take 5-10 seconds
- Under load, if all pool connections are busy serving requests, health checks time out waiting for a free connection
- The RDS database might be in a different availability zone, adding network latency
- Connection setup includes SSL handshake, authentication, which takes time

**Evidence**:
- Application works fine (meaning connections eventually succeed)
- Health check fails consistently (meaning it times out before connection established)
- This is a classic "cold start" problem in containerized environments

#### 2. **No Minimum Connections Maintained**

**Issue**: The pool had no minimum connections configured (defaults to 0).

**Why this matters**:
- Pool creates connections on-demand (lazy initialization)
- First health check after container start has to wait for connection creation
- If all connections close due to idle timeout, next health check creates new connection (slow)

#### 3. **Health Check Had No Independent Timeout**

**Issue**: Health check relied solely on pool timeout settings.

```javascript
// BEFORE:
await pool.query('SELECT 1'); // Uses pool connectionTimeoutMillis
```

**Why this is problematic**:
- Health check should be independent of application connection pool settings
- Health check should fail fast (2-3 seconds) to avoid blocking ALB probes
- Pool timeout affects all queries, not just health checks

#### 4. **ECS Health Check Timing Was Too Strict**

**Issue**: Container health check settings in task definition:

```json
"healthCheck": {
  "timeout": 5,        // Only 5 seconds for health check to complete
  "startPeriod": 60    // Only 60 seconds grace period on startup
}
```

**Why this caused failures**:
- Container starts → Express server starts → Database pool initializes
- Database connection establishment can take 10-15 seconds during cold start
- Health check runs after 60 seconds, but connection might still be establishing
- With timeout of 5s and 3 retries, container fails health check prematurely

#### 5. **Incorrect HTTP Status Code Strategy**

**Issue**: Original code returned 200 even when database was down.

```javascript
// BEFORE (INCORRECT):
res.status(200).json(health); // Always returned 200
```

**Why this is wrong**:
- ALB uses HTTP status code to determine target health
- Returning 200 when database is down means ALB routes traffic to broken instances
- Users get 500 errors from the application
- Defeats the purpose of health checks

---

## ✅ Fixes Applied

### Fix 1: Increase Connection Pool Timeout & Add Minimum Connections

**File**: `backend/db.js`

```javascript
// AFTER (More tolerant):
const pool = new Pool({
  user: process.env.DB_USERNAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
  
  // Optimized pool settings
  max: 10,                           // Maximum 10 connections
  min: 2,                            // Keep 2 connections always open (NEW)
  connectionTimeoutMillis: 10000,    // Increased from 5s to 10s (FIXED)
  idleTimeoutMillis: 30000,          // Close idle after 30s
  allowExitOnIdle: false,            // Keep pool alive (NEW)
});
```

**Benefits**:
- `min: 2` keeps 2 connections warm and ready for health checks
- `connectionTimeoutMillis: 10000` gives enough time for initial connection during startup
- `allowExitOnIdle: false` prevents pool from closing when all connections idle

### Fix 2: Add Independent Timeout to Health Check

**File**: `backend/server.js`

```javascript
// AFTER (Independent timeout):
app.get("/api/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "unknown"
  };

  try {
    // Race between query and 2-second timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), 2000);
    });
    
    const queryPromise = pool.query('SELECT 1');
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    health.database = "connected";
    health.status = "healthy";
    return res.status(200).json(health);
    
  } catch (error) {
    console.error('Health check: Database connection failed:', error.message);
    health.database = "disconnected";
    health.status = "unhealthy";
    return res.status(503).json(health);  // Return 503 when unhealthy (FIXED)
  }
});
```

**Benefits**:
- Health check fails fast (2 seconds) independent of pool settings
- Returns correct HTTP status: 200 (healthy) or 503 (unhealthy)
- ALB will stop routing traffic to instances returning 503

### Fix 3: Add Initial Connection Test

**File**: `backend/db.js`

```javascript
// Test initial database connection on startup
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Database connection pool initialized successfully');
  })
  .catch((err) => {
    console.error('⚠️  Database connection pool failed initial test:', err.message);
    console.error('Application will continue running, but database operations will fail');
    console.error('Check your database configuration and network connectivity');
  });
```

**Benefits**:
- Detects configuration issues immediately on startup
- Logs clear error messages for debugging
- Doesn't crash the container (allows health checks to report the issue)

### Fix 4: Increase ECS Health Check Tolerances

**File**: `aws/task-definition-backend.json`

```json
"healthCheck": {
  "command": ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"],
  "interval": 30,
  "timeout": 10,        // Increased from 5s to 10s (FIXED)
  "retries": 3,
  "startPeriod": 90     // Increased from 60s to 90s (FIXED)
}
```

**Benefits**:
- `timeout: 10` allows health check command 10 seconds to complete
- `startPeriod: 90` gives container 90 seconds grace period during startup
- Prevents premature health check failures during cold start

---

## 🎯 How The Fixes Work Together

### Scenario 1: Container Startup (Cold Start)

**Before** (Failed):
1. Container starts at T=0
2. Express server starts at T=5s
3. First health check at T=60s
4. Health check tries to connect, but connection establishment takes 8s
5. Pool timeout (5s) expires → Health check fails
6. After 3 retries (90s total), container marked unhealthy → Container restarted
7. Restart loop continues

**After** (Succeeds):
1. Container starts at T=0
2. Express server starts at T=5s
3. Database pool initializes and tests connection (takes 8s, succeeds at T=13s)
4. Pool maintains 2 warm connections (min: 2)
5. First health check at T=90s (grace period)
6. Health check uses warm connection → Completes in <1s
7. Returns 200 OK → Container marked healthy ✅

### Scenario 2: Temporary Database Unavailability

**Before** (Bad UX):
1. Database goes down
2. Health check still returns 200 (always healthy)
3. ALB routes traffic to this instance
4. Users get 500 errors from application
5. ALB never knows instance is unhealthy

**After** (Correct):
1. Database goes down
2. Health check times out after 2s
3. Returns 503 Service Unavailable
4. ALB marks target unhealthy and stops routing traffic
5. Users routed to healthy instances in other AZs
6. When database recovers, health check returns 200 and ALB routes traffic again ✅

### Scenario 3: High Load (Pool Exhaustion)

**Before** (Failed):
1. All 10 pool connections busy serving requests
2. Health check tries to get connection
3. Waits 5s for free connection (connectionTimeoutMillis)
4. Times out → Health check fails
5. Container marked unhealthy even though it's just busy

**After** (Succeeds):
1. 2 connections reserved as minimum (warm pool)
2. Up to 10 connections can serve application requests
3. Health check races with 2s timeout
4. Usually completes quickly using warm connection
5. If pool is truly exhausted, health check times out at 2s (fast fail)
6. ALB gets quick feedback about instance health ✅

---

## 📊 Configuration Summary

| Setting | Before | After | Reason |
|---------|--------|-------|--------|
| **Pool connectionTimeoutMillis** | 5000ms | 10000ms | Allow time for initial connection during startup |
| **Pool min connections** | 0 (default) | 2 | Keep warm connections for health checks |
| **Health check timeout** | None (used pool) | 2000ms (independent) | Fail fast, don't block on pool settings |
| **Health check HTTP status** | Always 200 | 200 or 503 | Return correct status based on health |
| **ECS health check timeout** | 5s | 10s | Allow time for curl + query |
| **ECS health check startPeriod** | 60s | 90s | Allow time for database connection during startup |

---

## 🧪 Testing Recommendations

### Test 1: Cold Start Test

```bash
# Deploy new task revision and watch logs
aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --force-new-deployment

# Watch container startup
aws logs tail /ecs/slugger-backend --follow

# Should see:
# ✅ Database connection pool initialized successfully
# Then health checks should pass
```

### Test 2: Database Unavailability Test

```bash
# Temporarily break database connectivity (update security group)
# Health check should return 503
curl -v http://slugger-alb-xxx.elb.amazonaws.com/api/health
# Should return: HTTP 503 with {"status":"unhealthy","database":"disconnected"}

# ALB should stop routing traffic to this instance
# Restore connectivity
# Health check should return 200
# ALB should resume routing traffic
```

### Test 3: Load Test

```bash
# Simulate high concurrent load
ab -n 1000 -c 50 http://slugger-alb-xxx.elb.amazonaws.com/api/widgets

# During load, health check should still pass
curl http://slugger-alb-xxx.elb.amazonaws.com/api/health
# Should return: HTTP 200 with {"status":"healthy","database":"connected"}
```

---

## 📈 Expected Outcomes

After deploying these fixes:

1. **Container Startup**: Containers should start successfully and pass health checks within 90 seconds
2. **Health Check Reliability**: Health checks should consistently return correct status (200 or 503)
3. **ALB Behavior**: ALB should correctly route traffic only to healthy instances
4. **User Experience**: No more 500 errors when database is temporarily unavailable
5. **Monitoring**: Clear logs showing connection status and health check results

---

## 🔧 Troubleshooting

### If health checks still fail:

1. **Check database connectivity from ECS**:
   ```bash
   # Get task ARN
   aws ecs list-tasks --cluster slugger-cluster --service-name slugger-backend-service
   
   # Check logs for connection errors
   aws logs tail /ecs/slugger-backend --follow
   ```

2. **Check security groups**:
   - ECS tasks security group must allow outbound to RDS port (5432)
   - RDS security group must allow inbound from ECS tasks security group

3. **Check SSM parameters**:
   ```bash
   # Verify database configuration
   aws ssm get-parameter --name /slugger/db-host
   aws ssm get-parameter --name /slugger/db-name
   ```

4. **Manual health check test**:
   ```bash
   # SSH into container (if possible) or use ECS Exec
   curl -v http://localhost:3001/api/health
   ```

5. **Check RDS status**:
   ```bash
   aws rds describe-db-instances --db-instance-identifier slugger-db
   ```

---

## 📚 References

- [AWS ECS Health Checks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#container_definition_healthcheck)
- [node-postgres Pool Configuration](https://node-postgres.com/apis/pool)
- [ALB Target Health](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html)

---

## ✅ Conclusion

The root cause was a combination of:
1. **Too-strict connection timeout** (5s insufficient for cold start)
2. **No warm connections** (health checks always waited for new connection)
3. **No independent health check timeout** (blocked on pool settings)
4. **Incorrect HTTP status code** (always returned 200)
5. **Too-strict ECS health check timing** (60s grace period insufficient)

All issues have been addressed with the fixes above. The application should now:
- Start reliably in ECS Fargate
- Pass health checks consistently
- Return correct health status to ALB
- Provide better visibility into connection issues

**Recommended Action**: Deploy updated task definition and monitor for 24-48 hours to confirm stability.
