# GitHub Actions CI/CD Guide

## Overview

The Slugger project uses GitHub Actions for automated CI/CD to deploy both frontend and backend services to AWS ECS Fargate.

**Workflow File**: `.github/workflows/ecs-cicd.yml`

## Workflow Triggers

The workflow runs on:
- **Push to `main` branch**: Automatic deployment
- **Manual trigger**: Via GitHub Actions UI (`workflow_dispatch`)

## Prerequisites

### GitHub Secrets Required

Configure these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role ARN for OIDC authentication | `arn:aws:iam::746669223415:role/github-actions-deploy` |
| `SLUGGER_PUBLIC_BASE_URL` | Public ALB DNS for smoke tests | `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com` |

### AWS IAM Role Setup

The GitHub Actions workflow uses OIDC (OpenID Connect) for secure authentication without static credentials.

#### Create IAM Role

1. **Trust Policy** (allows GitHub Actions to assume the role):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::746669223415:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/slugger-website:*"
        }
      }
    }
  ]
}
```

2. **Attach Policies**:
   - `AmazonEC2ContainerRegistryPowerUser` (for ECR push/pull)
   - `AmazonECS_FullAccess` (for ECS deployments)
   - Custom policy for task definition registration

## Workflow Stages

### Stage 1: Build & Push Images

**Job**: `build-and-push`

#### Steps:

1. **Checkout repository**
   - Uses: `actions/checkout@v4`

2. **Set up Node.js**
   - Version: 18
   - Caches npm dependencies

3. **Install dependencies**
   ```bash
   npm ci
   ```

4. **Run linting**
   ```bash
   npm run lint --workspaces
   ```

5. **Configure AWS credentials**
   - Uses OIDC role assumption
   - No static credentials required

6. **Login to Amazon ECR**
   - Authenticates Docker with ECR

7. **Set up Docker Buildx**
   - Required for multi-platform builds

8. **Build container images**
   - **Critical**: Builds with `--platform linux/amd64` for ECS Fargate compatibility
   - Tags: `${{ github.sha }}` and `latest`
   - Separate builds for frontend and backend

9. **Push images to ECR**
   - Pushes both tags for each service

10. **Export image URIs**
    - Outputs for deployment job

### Stage 2: Deploy to ECS

**Job**: `deploy`

**Environment**: `production` (requires manual approval if configured)

#### Steps:

1. **Checkout repository**
   - Needed for task definition files

2. **Configure AWS credentials**
   - Same OIDC authentication

3. **Render backend task definition**
   - Injects new image URI into task definition
   - Uses: `aws-actions/amazon-ecs-render-task-definition@v2`

4. **Render frontend task definition**
   - Same process for frontend

5. **Deploy backend service**
   - Updates ECS service with new task definition
   - Waits for service stability (health checks pass)
   - Uses: `aws-actions/amazon-ecs-deploy-task-definition@v2`

6. **Deploy frontend service**
   - Same deployment process

7. **Smoke test endpoints**
   - Tests frontend: `GET /`
   - Tests backend: `GET /api/health`
   - Fails workflow if endpoints don't respond

## Platform Compatibility Fix

### Issue
ECS Fargate requires `linux/amd64` platform. Building on Apple Silicon (M1/M2) Macs produces `linux/arm64` images by default, causing deployment failures:

```
CannotPullContainerError: image Manifest does not contain descriptor matching platform 'linux/amd64'
```

### Solution
Always use Docker Buildx with explicit platform:

```bash
docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile.prod \
  -t IMAGE_URI:TAG \
  --load \
  backend
```

The `--load` flag loads the image into local Docker for subsequent push operations.

## Common Build Issues

### Frontend: Package Lock Sync
If `npm ci` fails with lockfile sync errors, the Dockerfile uses `npm install --legacy-peer-deps` to handle Next.js peer dependency conflicts.

### Backend: TypeScript Files
Backend uses JavaScript (`.js`) files only. If you add TypeScript files, either:
- Convert them to JavaScript, or
- Add a TypeScript compilation step to the Dockerfile

## Monitoring Workflow Runs

### Via GitHub UI

1. Navigate to **Actions** tab in repository
2. Select **ECS Fargate CI/CD** workflow
3. View run history and logs

### Via GitHub CLI

```bash
# List recent workflow runs
gh run list --workflow=ecs-cicd.yml

# View specific run
gh run view RUN_ID

# Watch live logs
gh run watch RUN_ID
```

## Manual Deployment

### Trigger via GitHub UI

1. Go to **Actions** → **ECS Fargate CI/CD**
2. Click **Run workflow**
3. Select branch (usually `main`)
4. Click **Run workflow** button

### Trigger via GitHub CLI

```bash
gh workflow run ecs-cicd.yml --ref main
```

## Troubleshooting

### Build Failures

**Lint errors**:
```bash
# Run locally to fix before pushing
npm run lint --workspaces
```

**Platform mismatch**:
- Ensure workflow uses `docker buildx build --platform linux/amd64`
- Check Docker Buildx is set up: `docker buildx ls`

### Deployment Failures

**Service stability timeout**:
- Check ECS service events: `aws ecs describe-services --cluster slugger-cluster --services slugger-backend-service`
- View task logs: `aws logs tail /ecs/slugger-backend --follow`
- Check target group health: `aws elbv2 describe-target-health --target-group-arn ARN`

**Health check failures**:
- Verify `/api/health` endpoint responds: `curl http://ALB_DNS/api/health`
- Check security groups allow ALB → ECS traffic
- Review container logs for startup errors

**Image pull errors**:
- Verify ECR repository exists
- Check IAM role has ECR permissions
- Confirm image was pushed successfully

### Smoke Test Failures

**Frontend test fails**:
```bash
# Test manually
curl -v http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/
```

**Backend test fails**:
```bash
# Test manually
curl -v http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/health
```

## Rollback Procedure

### Automatic Rollback

ECS automatically rolls back if:
- New tasks fail health checks
- Service doesn't reach stability within timeout

### Manual Rollback

```bash
# List task definition revisions
aws ecs list-task-definitions --family-prefix slugger-backend

# Rollback to previous revision
aws ecs update-service \
  --cluster slugger-cluster \
  --service slugger-backend-service \
  --task-definition slugger-backend:3 \
  --region us-east-2

# Monitor rollback
aws ecs describe-services \
  --cluster slugger-cluster \
  --services slugger-backend-service \
  --region us-east-2
```

## Best Practices

### Before Pushing to Main

1. **Test locally**:
   ```bash
   # Run lint
   npm run lint --workspaces
   
   # Build Docker images locally
   docker buildx build --platform linux/amd64 \
     -f backend/Dockerfile.prod \
     -t test-backend:local \
     backend
   ```

2. **Verify changes**:
   - Review task definition changes
   - Check environment variables
   - Confirm secret references are correct

3. **Use feature branches**:
   - Create feature branch for changes
   - Test thoroughly before merging to `main`
   - Consider PR reviews for production changes

### Monitoring Deployments

1. **Watch workflow progress** in GitHub Actions
2. **Monitor ECS service** during deployment
3. **Check CloudWatch logs** for errors
4. **Verify endpoints** after deployment completes

### Security

- **Never commit AWS credentials** to repository
- **Use OIDC** for GitHub Actions authentication
- **Store secrets** in AWS Secrets Manager/SSM
- **Rotate credentials** regularly
- **Review IAM policies** for least privilege

## Cost Optimization

- **Concurrent workflow runs**: Limited by GitHub plan
- **ECS task costs**: Charged per second while running
- **ECR storage**: Clean up old images periodically
- **CloudWatch logs**: Set retention policies

## Next Steps

### Recommended Enhancements

1. **Add unit tests** to build phase
2. **Implement integration tests** before deployment
3. **Set up staging environment** for pre-production testing
4. **Configure CloudWatch alarms** for deployment failures
5. **Add Slack/email notifications** for workflow status
6. **Implement blue/green deployments** with CodeDeploy
7. **Add performance testing** post-deployment

### Monitoring & Observability

1. **CloudWatch Dashboards**: Create dashboards for ECS metrics
2. **X-Ray Tracing**: Add distributed tracing
3. **Custom Metrics**: Publish application metrics to CloudWatch
4. **Log Aggregation**: Consider centralized logging solution

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
