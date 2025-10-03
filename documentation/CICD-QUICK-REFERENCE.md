# CI/CD Quick Reference

## 🚀 Deployment Flow

```
Push to main → Build Images → Push to ECR → Deploy to ECS → Smoke Tests → ✅
Pull Request → Build Images → Push to ECR → ✅ (No deployment)
```

## 🧪 Testing on Feature Branches

### Option 1: Manual Trigger (Recommended)
```bash
# Trigger workflow on your current branch
gh workflow run ecs-cicd.yml --ref your-branch-name

# Watch the run
gh run watch
```

Or via GitHub UI: **Actions** → **ECS Fargate CI/CD** → **Run workflow** → Select your branch

### Option 2: Open a Pull Request
Opening a PR to `main` will automatically:
- ✅ Run linting
- ✅ Build Docker images
- ✅ Push to ECR (tagged with commit SHA)
- ❌ Skip deployment (only builds/tests)

Deployment only happens when merged to `main`.

## 📋 Pre-Deployment Checklist

- [ ] Code passes linting: `npm run lint --workspaces`
- [ ] Local Docker build succeeds
- [ ] Environment variables updated in AWS SSM/Secrets Manager
- [ ] Task definitions reviewed for changes
- [ ] Security groups allow required traffic

## 🔑 Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `AWS_DEPLOY_ROLE_ARN` | `arn:aws:iam::746669223415:role/github-actions-deploy` |
| `SLUGGER_PUBLIC_BASE_URL` | `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com` |

## 🐳 Build Commands

### Local Testing (with correct platform)

```bash
# Backend
docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile.prod \
  -t slugger-backend:test \
  backend

# Frontend
docker buildx build --platform linux/amd64 \
  -f frontend/Dockerfile.prod \
  -t slugger-frontend:test \
  frontend
```

### Manual ECR Push

```bash
# Login
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  746669223415.dkr.ecr.us-east-2.amazonaws.com

# Build & Push Backend
docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile.prod \
  -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest \
  backend --push

# Build & Push Frontend
docker buildx build --platform linux/amd64 \
  -f frontend/Dockerfile.prod \
  -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest \
  frontend --push
```

## 🔄 Deployment Commands

### Trigger GitHub Actions

```bash
# Via CLI
gh workflow run ecs-cicd.yml --ref main

# Via Git
git push origin main
```

### Manual ECS Deployment

```bash
# Register new task definition
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition-backend.json \
  --region us-east-2

# Update service
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --task-definition slugger-backend:4 \
  --force-new-deployment \
  --region us-east-2
```

## 🔍 Monitoring Commands

### Check Service Status

```bash
# Service overview
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service slugger-frontend-service \
  --region us-east-2

# Running tasks
aws ecs list-tasks \
  --cluster slugger-cluster \
  --service-name slugger-backend-service \
  --region us-east-2
```

### View Logs

```bash
# Backend logs (live)
aws logs tail /ecs/slugger-backend --follow --region us-east-2

# Frontend logs (live)
aws logs tail /ecs/slugger-frontend --follow --region us-east-2

# Last 30 minutes
aws logs tail /ecs/slugger-backend --since 30m --region us-east-2
```

### Check Target Health

```bash
# Backend target group
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-2:746669223415:targetgroup/slugger-backend-tg/fb24053697a67d14 \
  --region us-east-2

# Frontend target group
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-2:746669223415:targetgroup/slugger-frontend-tg/80c66902da424d2a \
  --region us-east-2
```

### Test Endpoints

```bash
# Frontend
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/

# Backend health
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health

# Pretty print JSON
curl -s http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health | jq .
```

## 🔙 Rollback Commands

### List Available Revisions

```bash
# Backend
aws ecs list-task-definitions \
  --family-prefix slugger-backend \
  --region us-east-2

# Frontend
aws ecs list-task-definitions \
  --family-prefix slugger-frontend \
  --region us-east-2
```

### Rollback to Previous Version

```bash
# Backend (replace :4 with desired revision)
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --task-definition slugger-backend:3 \
  --region us-east-2

# Frontend
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-frontend-service \
  --task-definition slugger-frontend:2 \
  --region us-east-2
```

## 🐛 Troubleshooting

### Platform Mismatch Error

**Error**: `image Manifest does not contain descriptor matching platform 'linux/amd64'`

**Fix**: Always use `--platform linux/amd64` with Docker Buildx

### Health Check Failures

```bash
# Check container logs
aws logs tail /ecs/slugger-backend --since 10m --region us-east-2

# Check task details
aws ecs describe-tasks \
  --cluster slugger-cluster \
  --tasks TASK_ARN \
  --region us-east-2
```

### Service Won't Stabilize

```bash
# Check service events
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service \
  --region us-east-2 \
  --query 'services[0].events[:10]'

# Check security groups
aws ec2 describe-security-groups \
  --group-ids sg-0c985525970ae7372 \
  --region us-east-2
```

### Connection Timeouts

1. **Check security groups**: Ensure ALB can reach ECS tasks
2. **Check target health**: Verify targets are healthy
3. **Check container logs**: Look for startup errors
4. **Test from within VPC**: Rule out network issues

## 📊 Current Infrastructure

### ECS Cluster
- **Name**: `slugger-cluster`
- **Region**: `us-east-2`

### Services
- **Backend**: `slugger-backend-service` (Task: `slugger-backend:4`)
- **Frontend**: `slugger-frontend-service` (Task: `slugger-frontend:3`)

### Load Balancer
- **DNS**: `slugger-alb-1518464736.us-east-2.elb.amazonaws.com`
- **Backend Path**: `/api/*` → Port 3001
- **Frontend Path**: `/*` → Port 3000

### ECR Repositories
- `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend`
- `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend`

## 🔐 Security Groups

### ALB Security Group
- **ID**: `sg-0c35c445084f80855`
- **Inbound**: 80, 443 from `0.0.0.0/0`

### ECS Tasks Security Group
- **ID**: `sg-0c985525970ae7372`
- **Inbound**:
  - Port 3000 from ALB SG (Frontend)
  - Port 3001 from ALB SG (Backend)
  - Port 3001 from itself (Inter-task)

## 📝 Common Workflows

### Deploy Code Changes

```bash
# 1. Make changes
# 2. Test locally
npm run lint --workspaces

# 3. Commit and push
git add .
git commit -m "Your changes"
git push origin main

# 4. Monitor deployment
gh run watch
```

### Update Environment Variables

```bash
# 1. Update SSM parameter
aws ssm put-parameter \
  --name /slugger/db-host \
  --value "new-value" \
  --overwrite \
  --region us-east-2

# 2. Force new deployment (picks up new values)
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --force-new-deployment \
  --region us-east-2
```

### Scale Services

```bash
# Scale up
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --desired-count 2 \
  --region us-east-2

# Scale down
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --desired-count 1 \
  --region us-east-2
```

## 🎯 Success Indicators

✅ **Healthy Deployment**:
- GitHub Actions workflow completes successfully
- ECS service shows `RUNNING` status
- Target groups show all targets `healthy`
- Smoke tests pass (200 OK responses)
- CloudWatch logs show no errors
- Application accessible via ALB DNS

❌ **Failed Deployment**:
- Workflow fails at any stage
- Tasks fail health checks
- Target groups show `unhealthy` targets
- Smoke tests fail (non-200 responses)
- Container logs show errors
- Service stuck in `DRAINING` or `PENDING`

## 📚 Documentation Links

- [AWS Infrastructure](../aws/AWS-INFRASTRUCTURE.md)
- [GitHub Actions Guide](./GITHUB-ACTIONS-GUIDE.md)
- [Deployment Summary](../DEPLOYMENT-SUMMARY-2025-10-02.md)
- [CI/CD Plan](./ecs-fargate-cicd-plan.md)
