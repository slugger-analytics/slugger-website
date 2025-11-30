# AWS Infrastructure Configuration

**Account ID**: `746669223415`  
**Region**: `us-east-2`  
**Last Verified**: November 28, 2025 (via AWS CLI)

---

## Architecture Overview

```
GitHub (main) → GitHub Actions → ECR → ECS Fargate → ALB → Users
                                           │
                                           ├── Frontend (port 3000)
                                           └── Backend (port 3001) → Aurora PostgreSQL
                                                      │
                                                      └── Lambda Functions
```

**Production URL**: `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`

---

## ECS Fargate (Primary Compute)

### Cluster
| Property | Value |
|----------|-------|
| Name | `slugger-cluster` |
| Status | **ACTIVE** |
| Running Tasks | 2 |
| Capacity Provider | Fargate |

### Services
| Service | Status | Running | Task Definition |
|---------|--------|---------|----------------|
| `slugger-frontend-service` | ACTIVE | 1/1 | `slugger-frontend:15` |
| `slugger-backend-service` | ACTIVE | 1/1 | `slugger-backend:23` |

### Task Definitions
- **Backend** (`task-definition-backend.json`): CPU 512, Memory 1024, Port 3001
- **Frontend** (`task-definition-frontend.json`): CPU 512, Memory 1024, Port 3000

---

## ECR Repositories

| Repository | URI | Status |
|------------|-----|--------|
| `slugger-frontend` | `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend` | ✅ Active |
| `slugger-backend` | `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend` | ✅ Active |
| `cdk-*` | CDK bootstrap assets | ✅ Used by Lambda CDK |

---

## Database

### Aurora PostgreSQL (Production)
| Property | Value |
|----------|-------|
| Cluster ID | `alpb-1` |
| Status | **available** |
| Engine | aurora-postgresql |
| Writer Endpoint | `alpb-1.cluster-cx866cecsebt.us-east-2.rds.amazonaws.com` |
| Reader Endpoint | `alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com` |
| Instance | `alpb-1-instance-1` (db.t3.medium) |

### Other RDS Instances
| Instance | Status | Purpose | Action |
|----------|--------|---------|--------|
| `alpbb-dev` | available | Dev database | 🟡 Consider deleting if unused |

---

## Load Balancer

### Application Load Balancer
| Property | Value |
|----------|-------|
| Name | `slugger-alb` |
| DNS | `slugger-alb-1518464736.us-east-2.elb.amazonaws.com` |
| State | **active** |
| Type | application |
| ARN | `arn:aws:elasticloadbalancing:us-east-2:746669223415:loadbalancer/app/slugger-alb/09d85a00869374c7` |

### Target Groups
| Name | Port | Protocol | Health Check |
|------|------|----------|-------------|
| `slugger-frontend-tg` | 3000 | HTTP | `GET /` |
| `slugger-backend-tg` | 3001 | HTTP | `GET /api/health` |

### Routing Rules
- `/api/*` → `slugger-backend-tg`
- `/*` (default) → `slugger-frontend-tg`

---

## Networking

### VPC
- **VPC ID**: `vpc-030c8d613fc104199`
- **Subnets**: 3 AZs (us-east-2a/b/c)

### Security Groups
| Name | ID | Purpose |
|------|----|---------|
| `slugger-alb-sg` | `sg-0c35c445084f80855` | ALB - allows 80/443 from internet |
| `slugger-ecs-tasks-sg` | `sg-0c985525970ae7372` | ECS tasks - allows 3000/3001 from ALB |

---

## IAM Roles

| Role | ARN | Purpose |
|------|-----|---------|
| `slugger-ecs-execution` | `arn:aws:iam::746669223415:role/slugger-ecs-execution` | ECS task execution (ECR pull, SSM access) |
| `slugger-backend-task` | `arn:aws:iam::746669223415:role/slugger-backend-task` | Backend runtime (S3, Cognito) |
| `slugger-frontend-task` | `arn:aws:iam::746669223415:role/slugger-frontend-task` | Frontend runtime (minimal) |
| `github-actions-deploy` | `arn:aws:iam::746669223415:role/github-actions-deploy` | GitHub OIDC CI/CD |
| `codebuild-slugger-service-role` | Service role | CodeBuild (if used) |

---

## Lambda Functions

### Production API Endpoints
| Function | Runtime | Last Modified |
|----------|---------|---------------|
| `pitches_endpoint` | python3.11 | 2025-03-06 |
| `players_endpoint` | python3.11 | 2025-03-06 |
| `games_endpoint` | python3.11 | 2025-03-05 |
| `teams_endpoint` | python3.11 | 2025-04-28 |
| `ballpark_endpoint` | python3.11 | 2025-03-05 |
| `validate_token_endpoint` | nodejs22.x | 2025-04-11 |

### Scheduled Jobs
| Function | Runtime | Last Modified |
|----------|---------|---------------|
| `update_standings` | nodejs22.x | 2025-04-24 |
| `update_league_leaders` | nodejs22.x | 2025-04-24 |
| `update_scoreboard` | nodejs24.x | 2025-11-26 |
| `widget_metrics_job` | python3.11 | 2025-04-24 |

### Data Processing
| Function | Runtime | Last Modified |
|----------|---------|---------------|
| `ProcessTrackmanStack-DockerFunc*` | Container | 2025-10-23 |
| `trackman_ftp` | python3.13 | 2025-04-24 |


---

## SSM Parameter Store

| Parameter | Type |
|-----------|------|
| `/slugger/api-url` | String |
| `/slugger/cognito-app-client-id` | SecureString |
| `/slugger/cognito-app-client-id-public` | String |
| `/slugger/cognito-user-pool-id` | SecureString |
| `/slugger/db-host` | SecureString |
| `/slugger/db-name` | SecureString |
| `/slugger/db-password` | SecureString |
| `/slugger/db-port` | String |
| `/slugger/db-username` | SecureString |
| `/slugger/frontend-url` | String |
| `/slugger/json-bucket-name` | String |
| `/slugger/jwt-secret` | SecureString |
| `/slugger/lambda-api-base-url` | String |
| `/slugger/pointstreak-base` | String |
| `/slugger/session-secret` | SecureString |
| `/slugger/token-secret` | SecureString |
| `/slugger/usage-plan-id` | String |

---

## S3 Buckets

| Bucket | Purpose |
|--------|---------|
| `alpb-jsondata` | JSON data storage |
| `alpb-lambda` | Lambda deployment packages |
| `alpb-ftp-test` | FTP test data |

---

## Cognito

| Property | Value |
|----------|-------|
| User Pool | `ALPBAnalyticsWidgetDevs` |
| Pool ID | `us-east-2_tG7IQQ6G7` |

---

## CloudWatch Logs

| Log Group | Stored Bytes |
|-----------|--------------|
| `/ecs/slugger-backend` | ~408 KB |
| `/ecs/slugger-frontend` | ~398 KB |

---

## Remaining Resources (Optional Cleanup)

### EC2 Instances
| Instance | Name | State | IP | Notes |
|----------|------|-------|----|-------|
| `i-0aa27a9f9e0452fd5` | slugger-staging-server | running | 3.136.19.153 | 🟡 Evaluate if needed |

### Elastic IPs
| IP | Allocation ID | Status |
|----|---------------|--------|
| 3.22.227.7 | `eipalloc-0757b2c08b22feae4` | ⚠️ Unattached (requires org permissions to release) |

---

## Cleanup Completed (November 28, 2025)

| Resource | Action | Status |
|----------|--------|--------|
| EC2 `i-0d9e61823f997d9fc` (ALPB Website) | Terminated | ✅ Done |
| Elastic IP `3.140.204.112` | Released | ✅ Done |
| ECR `slugger-app` | Deleted | ✅ Done |
| `DEV_pitches_endpoint` | Deleted | ✅ Done |
| `DEV_players_endpoint` | Deleted | ✅ Done |
| `DEV_games_endpoint` | Deleted | ✅ Done |
| `DEV_teams_endpoint` | Deleted | ✅ Done |
| `DEV_ballpark_endpoint` | Deleted | ✅ Done |
| Elastic Beanstalk | Already cleaned | ✅ Done |

---

## GitHub Actions Secrets

| Secret | Description |
|--------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::746669223415:role/github-actions-deploy` |
| `SLUGGER_PUBLIC_BASE_URL` | `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com` |

---

## Quick Commands

### Check Service Health
```bash
aws ecs describe-services --cluster slugger-cluster \
  --services slugger-frontend-service slugger-backend-service \
  --region us-east-2 \
  --query 'services[*].{name:serviceName,status:status,running:runningCount}'
```

### View Logs
```bash
aws logs tail /ecs/slugger-backend --follow --region us-east-2
aws logs tail /ecs/slugger-frontend --follow --region us-east-2
```

### Force Redeploy
```bash
aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --force-new-deployment --region us-east-2
aws ecs update-service --cluster slugger-cluster \
  --service slugger-frontend-service --force-new-deployment --region us-east-2
```

### Health Check
```bash
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health
```

---

## Optional Cleanup Commands

### Terminate Staging Server (if not needed)
```bash
aws ec2 terminate-instances --instance-ids i-0aa27a9f9e0452fd5 --region us-east-2
```
