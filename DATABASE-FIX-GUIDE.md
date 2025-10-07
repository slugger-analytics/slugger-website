# Database Connectivity Issue - Root Cause Analysis & Fix

## Problem Summary

Your ECS Fargate deployment is experiencing database connectivity issues:
1. `/api/health` endpoint returns "healthy" even when database is down
2. Standings and stat leaders on team pages don't load
3. Database queries are failing silently

## Root Causes Identified

### 1. Health Check Always Returns 200 OK ✅ FIXED
**Problem**: The health check endpoint in `backend/server.js` was returning HTTP 200 even when the database was disconnected.

```javascript
// OLD CODE - WRONG
res.status(200).json(health); // Always 200, even if DB is down
```

**Fix Applied**: Updated to return 503 when database is unavailable:
```javascript
// NEW CODE - CORRECT
if (database connected) {
  res.status(200).json(health);  // Healthy
} else {
  res.status(503).json(health);  // Unhealthy - triggers ALB health check failure
}
```

### 2. Missing RDS Security Group Rule ⚠️ NEEDS FIXING
**Problem**: The RDS database security group doesn't allow incoming connections from ECS tasks on port 5432 (PostgreSQL).

**Current State**:
- ECS Tasks Security Group: `sg-0c985525970ae7372`
- RDS Database: `alpb-1` cluster
- RDS Security Group: Unknown (need to query)

**Required Fix**: Add security group ingress rule to RDS:
```bash
# Allow PostgreSQL (port 5432) from ECS tasks security group
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SECURITY_GROUP_ID> \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0c985525970ae7372 \
  --region us-east-2
```

## Manual Fix Steps

### Step 1: Find RDS Security Group ID
```bash
aws rds describe-db-clusters \
  --db-cluster-identifier alpb-1 \
  --region us-east-2 \
  --query 'DBClusters[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text
```

Save the output (e.g., `sg-xxxxxxxxx`)

### Step 2: Check if Rule Already Exists
```bash
RDS_SG="<paste-security-group-id-here>"
ECS_SG="sg-0c985525970ae7372"

aws ec2 describe-security-groups \
  --group-ids $RDS_SG \
  --region us-east-2 \
  --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\`]"
```

Look for a rule with `UserIdGroupPairs` containing `sg-0c985525970ae7372`.

### Step 3: Add Security Group Rule (if missing)
```bash
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG \
  --region us-east-2
```

### Step 4: Deploy Updated Backend Code
```bash
cd /Users/leduckien/personalproject/SLUGGER/slugger-website
git add backend/server.js
git commit -m "Fix health check to return 503 when database is unavailable"
git push origin main
```

This will trigger GitHub Actions to:
1. Build new Docker image
2. Push to ECR
3. Deploy to ECS Fargate
4. ECS will perform rolling deployment

### Step 5: Monitor Deployment
```bash
# Watch GitHub Actions workflow
gh run watch

# Or check ECS service status
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service \
  --region us-east-2 \
  --query 'services[0].events[0:5]'
```

### Step 6: Verify Database Connectivity
```bash
# Test health endpoint
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health | jq

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "...",
#   "uptime": ...,
#   "database": "connected"
# }
```

### Step 7: Check CloudWatch Logs
```bash
# If still having issues, check logs
aws logs tail /ecs/slugger-backend --follow --region us-east-2
```

Look for:
- "Database connection failed" messages
- Connection timeout errors
- Any PostgreSQL-related errors

## Why This Happened

During the migration from SSH-based EC2 deployment to ECS Fargate:
1. The old EC2 instance was likely in the same security group as RDS, allowing direct access
2. When ECS tasks were created in a new security group, the RDS security group rules weren't updated
3. The health check was masking the problem by always returning 200 OK

## Expected Behavior After Fix

1. **Healthy State**:
   - `/api/health` returns 200 with `"database": "connected"`
   - ALB health checks pass
   - Team pages load standings and stat leaders

2. **Unhealthy State** (if database goes down):
   - `/api/health` returns 503 with `"database": "disconnected"`
   - ALB health checks fail
   - ECS stops routing traffic to unhealthy tasks
   - CloudWatch logs show detailed error messages

## Additional Debugging Commands

```bash
# Check if ECS tasks can resolve DNS
aws ecs execute-command \
  --cluster slugger-cluster \
  --task <TASK_ID> \
  --container backend \
  --command "nslookup alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com" \
  --interactive

# Test PostgreSQL connection from ECS task
aws ecs execute-command \
  --cluster slugger-cluster \
  --task <TASK_ID> \
  --container backend \
  --command "nc -zv alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com 5432" \
  --interactive
```

## Files Modified

- ✅ `/backend/server.js` - Fixed health check endpoint
- ⚠️ AWS Security Group - Needs manual update (cannot be done via code)

## Next Steps

1. Run Step 1-3 above to fix RDS security group
2. Deploy the code changes (Step 4)
3. Verify everything works (Step 6)
4. Update AWS-INFRASTRUCTURE.md with the new security group rule

## Contact

If issues persist after following these steps:
1. Check CloudWatch logs for detailed error messages
2. Verify SSM parameters are correct (especially DB_HOST)
3. Ensure RDS cluster is in "available" state
4. Check VPC/subnet configuration matches between ECS and RDS
