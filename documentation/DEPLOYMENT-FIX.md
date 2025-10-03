# Deployment Fix - Next.js Environment Variables

## Problem Summary

The deployed frontend was trying to connect to `localhost:3001` instead of the ALB URL because:

1. **SSM Parameter Issue**: `/slugger/api-url` was set to placeholder value `https://temp-placeholder.com`
2. **Next.js Build-Time Requirement**: `NEXT_PUBLIC_*` environment variables must be available **during Docker build**, not at runtime. The previous setup only passed them as ECS runtime secrets, which is too late for Next.js to embed them in the static bundle.

## Changes Made

### 1. Updated Frontend Dockerfile (`frontend/Dockerfile.prod`)
- Added `ARG` declarations for `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID`
- Set them as `ENV` variables during the build stage so Next.js can embed them

### 2. Updated CI/CD Workflow (`.github/workflows/ecs-cicd.yml`)
- Added new step to fetch SSM parameters before building
- Pass build arguments to Docker build command for frontend
- Environment variables are now baked into the frontend image at build time

### 3. Updated Task Definition (`aws/task-definition-frontend.json`)
- Removed runtime `secrets` section (no longer needed since values are baked into the image)
- Kept only `NODE_ENV` and `PORT` environment variables

### 4. Fixed SSM Parameter
- Updated `/slugger/api-url` from `https://temp-placeholder.com` to `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`

## IAM Permission Fix (REQUIRED FIRST)

The GitHub Actions role needs permission to read SSM parameters. Run this command:

```bash
aws iam put-role-policy \
  --role-name github-actions-deploy \
  --policy-name SSMParameterReadAccess \
  --policy-document file://github-actions-ssm-policy.json \
  --region us-east-2
```

**Verify the policy was attached**:
```bash
aws iam get-role-policy \
  --role-name github-actions-deploy \
  --policy-name SSMParameterReadAccess \
  --region us-east-2
```

## Deployment Instructions

### Option 1: Trigger GitHub Actions (Recommended)

1. **First, fix IAM permissions** (see above)

2. **Commit and push the changes**:
   ```bash
   git add .
   git commit -m "Fix: Inject Next.js environment variables at build time"
   git push origin main
   ```

3. **Monitor the GitHub Actions workflow**:
   - Go to Actions tab in your repository
   - Watch the "ECS Fargate CI/CD" workflow
   - It will automatically build with the correct environment variables and deploy

### Option 2: Manual Build and Deploy

If you need to deploy immediately without waiting for CI/CD:

1. **Login to ECR**:
   ```bash
   aws ecr get-login-password --region us-east-2 | \
     docker login --username AWS --password-stdin \
     746669223415.dkr.ecr.us-east-2.amazonaws.com
   ```

2. **Fetch the environment variables**:
   ```bash
   export NEXT_PUBLIC_API_URL=$(aws ssm get-parameter \
     --name /slugger/api-url \
     --region us-east-2 \
     --query 'Parameter.Value' \
     --output text)
   
   export NEXT_PUBLIC_COGNITO_APP_CLIENT_ID=$(aws ssm get-parameter \
     --name /slugger/cognito-app-client-id-public \
     --region us-east-2 \
     --query 'Parameter.Value' \
     --output text)
   ```

3. **Build the frontend image with build arguments**:
   ```bash
   docker buildx build --platform linux/amd64 \
     -f frontend/Dockerfile.prod \
     --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
     --build-arg NEXT_PUBLIC_COGNITO_APP_CLIENT_ID="$NEXT_PUBLIC_COGNITO_APP_CLIENT_ID" \
     -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest \
     frontend
   ```

4. **Push the image**:
   ```bash
   docker push 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest
   ```

5. **Force ECS service update**:
   ```bash
   aws ecs update-service \
     --cluster slugger-cluster \
     --service slugger-frontend-service \
     --force-new-deployment \
     --region us-east-2
   ```

6. **Monitor deployment**:
   ```bash
   aws ecs describe-services \
     --cluster slugger-cluster \
     --services slugger-frontend-service \
     --region us-east-2 \
     --query 'services[0].deployments'
   ```

## Verification

After deployment completes (5-10 minutes):

1. **Check the application**:
   - Visit: `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`
   - Try to login - it should now connect to the backend correctly

2. **Check browser console**:
   - The error `localhost:3001/api/users/sign-in: Failed to load resource` should be gone
   - API calls should go to `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/*`

3. **Check CloudWatch logs**:
   ```bash
   aws logs tail /ecs/slugger-frontend --follow --region us-east-2
   ```

## Technical Details

### Why This Fix Works

**Next.js Static Optimization**: Next.js performs static optimization during build time. Any `NEXT_PUBLIC_*` environment variables are embedded into the JavaScript bundle at build time, not runtime. This is why:

- ❌ **Runtime secrets don't work**: ECS task secrets are only available when the container starts, after the build is complete
- ✅ **Build arguments work**: Docker `ARG` and `ENV` during the build stage make variables available to `npm run build`

### Security Considerations

- `NEXT_PUBLIC_API_URL` is safe to embed (it's the public ALB URL)
- `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID` is designed to be public (it's a client-side Cognito app client)
- Both values are visible in the browser anyway, so embedding them in the Docker image is acceptable

### Future Improvements

Consider setting up:
1. **Custom domain** with HTTPS (using Route 53 + ACM certificate)
2. **Environment-specific builds** (dev, staging, prod) with different API URLs
3. **Image tagging strategy** to track which environment variables are in each image
