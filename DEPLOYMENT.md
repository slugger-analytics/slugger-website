# Deployment Guide

## Overview

SLUGGER is deployed on **AWS ECS Fargate** with automated CI/CD via GitHub Actions.

- **Production URL**: `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`
- **Region**: `us-east-2` (Ohio)
- **CI/CD**: Automated on push to `main` branch

## Quick Deploy

```bash
# Push to main triggers automatic deployment
git push origin main

# Or manually trigger via GitHub Actions UI
# Actions → ECS Fargate CI/CD → Run workflow
```

## Architecture

```
┌─────────────┐
│   GitHub    │
│   Actions   │ ← Push to main
└──────┬──────┘
       │ Build & Push
       ▼
┌─────────────┐
│     ECR     │
│   Images    │
└──────┬──────┘
       │ Deploy
       ▼
┌─────────────┐     ┌──────────────┐
│     ALB     │────▶│  ECS Fargate │
│             │     │  - Frontend  │
│ Port 80/443 │     │  - Backend   │
└─────────────┘     └──────────────┘
```

## Prerequisites

### GitHub Secrets

Configure in repository settings → Secrets and variables → Actions:

| Secret                    | Value                                                       |
| ------------------------- | ----------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`     | `arn:aws:iam::746669223415:role/github-actions-deploy`      |
| `SLUGGER_PUBLIC_BASE_URL` | `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com` |

### IAM Role Permissions

The `github-actions-deploy` role must have:

- `AmazonEC2ContainerRegistryPowerUser` (ECR push/pull)
- `AmazonECS_FullAccess` (ECS deployments)
- SSM read access for `/slugger/*` parameters

## Deployment Process

### Automatic (Recommended)

1. **Push to main**:

   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Monitor**: GitHub Actions → ECS Fargate CI/CD workflow

3. **Verify**: Check application at production URL

### Manual Deployment

If you need to deploy without CI/CD:

```bash
# 1. Login to ECR
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  746669223415.dkr.ecr.us-east-2.amazonaws.com

# 2. Fetch environment variables
export NEXT_PUBLIC_API_URL=$(aws ssm get-parameter \
  --name /slugger/api-url --region us-east-2 \
  --query 'Parameter.Value' --output text)

export NEXT_PUBLIC_COGNITO_APP_CLIENT_ID=$(aws ssm get-parameter \
  --name /slugger/cognito-app-client-id-public --region us-east-2 \
  --query 'Parameter.Value' --output text)

# 3. Build images
docker buildx build --platform linux/amd64 \
  -f frontend/Dockerfile.prod \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_COGNITO_APP_CLIENT_ID="$NEXT_PUBLIC_COGNITO_APP_CLIENT_ID" \
  -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest \
  frontend

docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile.prod \
  -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest \
  backend

# 4. Push images
docker push 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest
docker push 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest

# 5. Update ECS services
aws ecs update-service --cluster slugger-cluster \
  --service slugger-frontend-service --force-new-deployment --region us-east-2

aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --force-new-deployment --region us-east-2
```

## Monitoring

### Service Status

```bash
# Check service health
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-frontend-service slugger-backend-service \
  --region us-east-2 \
  --query 'services[*].{name:serviceName,status:status,running:runningCount,desired:desiredCount}'
```

### Logs

```bash
# Backend logs (live)
aws logs tail /ecs/slugger-backend --follow --region us-east-2

# Frontend logs (live)
aws logs tail /ecs/slugger-frontend --follow --region us-east-2

# Last 30 minutes
aws logs tail /ecs/slugger-backend --since 30m --region us-east-2
```

### Health Checks

```bash
# Backend health
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health

# Frontend
curl http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/
```

## Rollback

### List Available Versions

```bash
# Backend revisions
aws ecs list-task-definitions --family-prefix slugger-backend --region us-east-2

# Frontend revisions
aws ecs list-task-definitions --family-prefix slugger-frontend --region us-east-2
```

### Rollback to Previous Version

```bash
# Backend (replace :6 with desired revision)
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --task-definition slugger-backend:5 \
  --region us-east-2

# Frontend (replace :3 with desired revision)
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-frontend-service \
  --task-definition slugger-frontend:2 \
  --region us-east-2
```

## Troubleshooting

### Build Failures

**Platform mismatch error**:

```
image Manifest does not contain descriptor matching platform 'linux/amd64'
```

**Fix**: Always use `--platform linux/amd64` with Docker Buildx (ECS Fargate requires amd64)

### Deployment Failures

**Service won't stabilize**:

1. Check service events: `aws ecs describe-services --cluster slugger-cluster --services slugger-backend-service --region us-east-2 --query 'services[0].events[:5]'`
2. Check container logs: `aws logs tail /ecs/slugger-backend --since 10m --region us-east-2`
3. Check target health: `aws elbv2 describe-target-health --target-group-arn <ARN> --region us-east-2`

**Health check failures**:

- Verify security groups allow ALB → ECS traffic (port 3000, 3001)
- Check container logs for startup errors
- Ensure environment variables are set correctly in SSM

### Environment Variables

**Frontend shows localhost errors**:

The frontend requires `NEXT_PUBLIC_*` variables at **build time**, not runtime. They must be passed as Docker build arguments:

```bash
--build-arg NEXT_PUBLIC_API_URL="http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com"
--build-arg NEXT_PUBLIC_COGNITO_APP_CLIENT_ID="<value>"
```

**Update environment variables**:

```bash
# Update SSM parameter
aws ssm put-parameter --name /slugger/db-host \
  --value "new-value" --overwrite --region us-east-2

# Force new deployment to pick up changes
aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --force-new-deployment --region us-east-2
```

## Infrastructure

### ECS Resources

- **Cluster**: `slugger-cluster`
- **Backend Service**: `slugger-backend-service` (Task: `slugger-backend:6`)
- **Frontend Service**: `slugger-frontend-service` (Task: `slugger-frontend:3`)

### Load Balancer

- **DNS**: `slugger-alb-1518464736.us-east-2.elb.amazonaws.com`
- **Routing**:
  - `/api/*` → Backend (port 3001)
  - `/*` → Frontend (port 3000)

### ECR Repositories

- `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend`
- `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend`

### Security Groups

- **ALB**: `sg-0c35c445084f80855` (allows 80, 443 from internet)
- **ECS Tasks**: `sg-0c985525970ae7372` (allows 3000, 3001 from ALB)

For complete infrastructure details, see [`aws/AWS-INFRASTRUCTURE.md`](aws/AWS-INFRASTRUCTURE.md).

## Best Practices

1. **Test locally first**: Run `npm run dev` with local database before pushing
2. **Run linting**: `npm run lint --workspaces` before committing
3. **Monitor deployments**: Watch GitHub Actions workflow
4. **Check logs**: Review CloudWatch logs after deployment
5. **Use feature branches**: Test on branches before merging to main
6. **Keep secrets in SSM**: Never commit credentials to repository

## Common Tasks

### Scale Services

```bash
# Scale up to 2 instances
aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --desired-count 2 --region us-east-2

# Scale down to 1 instance
aws ecs update-service --cluster slugger-cluster \
  --service slugger-backend-service --desired-count 1 --region us-east-2
```

### View Task Details

```bash
# List running tasks
aws ecs list-tasks --cluster slugger-cluster \
  --service-name slugger-backend-service --region us-east-2

# Get task details
aws ecs describe-tasks --cluster slugger-cluster \
  --tasks <TASK_ARN> --region us-east-2
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
