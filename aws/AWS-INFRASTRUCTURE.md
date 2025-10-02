# AWS Infrastructure Configuration

**Account ID**: `746669223415`  
**Region**: `us-east-2`  
**Created**: 2025-10-01

## Summary

This document catalogs all AWS resources provisioned for the Slugger ECS Fargate multi-container deployment.

---

## IAM Roles

### Execution Role
- **Name**: `slugger-ecs-execution`
- **ARN**: `arn:aws:iam::746669223415:role/slugger-ecs-execution`
- **Purpose**: Allows ECS tasks to pull images from ECR and retrieve secrets from SSM/Secrets Manager
- **Policies**:
  - `AmazonECSTaskExecutionRolePolicy` (AWS managed)
  - Inline policy `slugger-ssm-secrets-access` granting:
    - `ssm:GetParameters`, `ssm:GetParameter` on `arn:aws:ssm:us-east-2:746669223415:parameter/slugger/*`
    - `secretsmanager:GetSecretValue` on `arn:aws:secretsmanager:us-east-2:746669223415:secret:slugger/*`

### Backend Task Role
- **Name**: `slugger-backend-task`
- **ARN**: `arn:aws:iam::746669223415:role/slugger-backend-task`
- **Purpose**: Runtime permissions for backend container to access AWS services
- **Policies**:
  - Inline policy `slugger-backend-aws-access` granting:
    - S3: `GetObject`, `PutObject`, `ListBucket` on all buckets
    - DynamoDB: `*` on all resources
    - Cognito IDP: `*` on all resources

### Frontend Task Role
- **Name**: `slugger-frontend-task`
- **ARN**: `arn:aws:iam::746669223415:role/slugger-frontend-task`
- **Purpose**: Minimal runtime permissions for frontend container
- **Policies**: None (placeholder for future needs)

---

## ECR Repositories

| Repository Name       | URI                                                              | Status   |
|-----------------------|------------------------------------------------------------------|----------|
| `slugger-frontend`    | `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend` | ✅ Exists |
| `slugger-backend`     | `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend`  | ✅ Exists |
| `slugger-app`         | `746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-app`      | ✅ Exists (legacy) |

---

## ECS Resources

### Cluster
- **Name**: `slugger-cluster`
- **ARN**: `arn:aws:ecs:us-east-2:746669223415:cluster/slugger-cluster`
- **Capacity Provider**: Fargate

### Services
- **Frontend Service**: `slugger-frontend-service` ✅
  - ARN: `arn:aws:ecs:us-east-2:746669223415:service/slugger-cluster/slugger-frontend-service`
  - Task Definition: `slugger-frontend:3`
  - Desired Count: 1
- **Backend Service**: `slugger-backend-service` ✅
  - ARN: `arn:aws:ecs:us-east-2:746669223415:service/slugger-cluster/slugger-backend-service`
  - Task Definition: `slugger-backend:4` (Updated 2025-10-02)
  - Desired Count: 1

### Task Definitions
- **Backend**: `slugger-backend` (defined in `aws/task-definition-backend.json`)
  - CPU: 512, Memory: 1024
  - Container: `backend` on port 3001
- **Frontend**: `slugger-frontend` (defined in `aws/task-definition-frontend.json`)
  - CPU: 512, Memory: 1024
  - Container: `frontend` on port 3000

---

## Networking

### VPC
- **VPC ID**: `vpc-030c8d613fc104199`
- **CIDR**: (existing VPC)

### Subnets
| Subnet ID                  | Availability Zone | CIDR           |
|----------------------------|-------------------|----------------|
| `subnet-00b1945e1c7f15475` | us-east-2a        | 172.30.0.0/24  |
| `subnet-0ea95576538bbc82b` | us-east-2b        | 172.30.1.0/24  |
| `subnet-0b9ca73e2fdfde13d` | us-east-2c        | 172.30.2.0/24  |

### Security Groups

#### ALB Security Group
- **Name**: `slugger-alb-sg`
- **ID**: `sg-0c35c445084f80855`
- **Inbound Rules**:
  - Port 80 (HTTP) from `0.0.0.0/0`
  - Port 443 (HTTPS) from `0.0.0.0/0`

#### ECS Tasks Security Group
- **Name**: `slugger-ecs-tasks-sg`
- **ID**: `sg-0c985525970ae7372`
- **Inbound Rules**:
  - Port 3000 from `sg-0c35c445084f80855` (ALB → Frontend)
  - Port 3001 from `sg-0c35c445084f80855` (ALB → Backend) ✅ **FIXED 2025-10-02**
  - Port 3001 from `sg-0c985525970ae7372` (Frontend → Backend inter-task communication)

---

## Load Balancer

### Application Load Balancer
- **Name**: `slugger-alb`
- **ARN**: `arn:aws:elasticloadbalancing:us-east-2:746669223415:loadbalancer/app/slugger-alb/09d85a00869374c7`
- **DNS**: `slugger-alb-1518464736.us-east-2.elb.amazonaws.com`
- **Scheme**: Internet-facing
- **Subnets**: All three AZs (us-east-2a, us-east-2b, us-east-2c)
- **Security Group**: `sg-0c35c445084f80855`

### Target Groups

#### Frontend Target Group
- **Name**: `slugger-frontend-tg`
- **ARN**: `arn:aws:elasticloadbalancing:us-east-2:746669223415:targetgroup/slugger-frontend-tg/80c66902da424d2a`
- **Port**: 3000
- **Protocol**: HTTP
- **Target Type**: IP
- **Health Check**: `GET /` every 30s

#### Backend Target Group
- **Name**: `slugger-backend-tg`
- **ARN**: `arn:aws:elasticloadbalancing:us-east-2:746669223415:targetgroup/slugger-backend-tg/fb24053697a67d14`
- **Port**: 3001
- **Protocol**: HTTP
- **Target Type**: IP
- **Health Check**: `GET /` every 30s

### Listener Rules
- **Default (Port 80)**: Forward all traffic to `slugger-frontend-tg`
- **Rule Priority 10**: Path `/api/*` → Forward to `slugger-backend-tg`

---

## CloudWatch Logs

| Log Group              | Retention | Status   |
|------------------------|-----------|----------|
| `/ecs/slugger-backend` | (default) | ✅ Exists |
| `/ecs/slugger-frontend`| (default) | ✅ Exists |

---

## Configuration (SSM Parameter Store)

All parameters use **flat naming** (`/slugger/<key>`), not hierarchical paths.

### Backend Parameters
| Parameter Name                        | Type   | Description                          |
|---------------------------------------|--------|--------------------------------------|
| `/slugger/cognito-app-client-id`     | String | Cognito app client ID (backend)      |
| `/slugger/cognito-user-pool-id`      | String | Cognito user pool ID                 |
| `/slugger/db-host`                    | String | RDS database host                    |
| `/slugger/db-name`                    | String | Database name                        |
| `/slugger/db-username`                | String | Database username                    |
| `/slugger/db-password`                | String | Database password                    |
| `/slugger/db-port`                    | String | Database port (5432)                 |
| `/slugger/session-secret`             | String | Express session secret               |
| `/slugger/jwt-secret`                 | String | JWT signing secret                   |
| `/slugger/token-secret`               | String | Token secret                         |
| `/slugger/aws-access-key`             | String | AWS access key for backend services  |
| `/slugger/aws-secret-access-key`      | String | AWS secret access key                |
| `/slugger/aws-region`                 | String | AWS region (us-east-2)               |
| `/slugger/lambda-api-base-url`        | String | Lambda API Gateway base URL          |

### Frontend Parameters
| Parameter Name                           | Type   | Description                          |
|------------------------------------------|--------|--------------------------------------|
| `/slugger/api-url`                       | String | Backend API URL (for browser)        |
| `/slugger/cognito-app-client-id-public` | String | Cognito app client ID (public)       |

### Shared/Optional Parameters
| Parameter Name                | Type   | Description                          |
|-------------------------------|--------|--------------------------------------|
| `/slugger/json-bucket-name`   | String | S3 bucket for JSON storage           |
| `/slugger/pointstreak-base`   | String | Pointstreak API base URL             |
| `/slugger/usage-plan-id`      | String | API Gateway usage plan ID            |

---

## GitHub Actions Secrets Required

The CI/CD workflow (`.github/workflows/ecs-cicd.yml`) requires these secrets:

| Secret Name                  | Description                                      |
|------------------------------|--------------------------------------------------|
| `AWS_DEPLOY_ROLE_ARN`        | IAM role ARN for GitHub OIDC authentication      |
| `SLUGGER_PUBLIC_BASE_URL`    | Public ALB DNS for smoke tests (e.g., `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`) |

**Note**: The workflow uses OIDC (`role-to-assume`), not static credentials.

---

## Next Steps

### ✅ Completed

1. ~~**Register Task Definitions**~~ - Backend revision 2, Frontend revision 3 registered
2. ~~**Create ECS Services**~~ - Both services created and active

### 🔄 Remaining Actions

1. **Configure GitHub OIDC Role**: Create an IAM role with trust policy allowing GitHub Actions from your repository, attach `AmazonEC2ContainerRegistryPowerUser` and `AmazonECS_FullAccess`, then store ARN in `AWS_DEPLOY_ROLE_ARN` secret.

2. **Update SSM Parameter `/slugger/api-url`**: Set to ALB DNS for backend API access (e.g., `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`). **Important**: For ECS Fargate, frontend browser requests must use the public ALB DNS with `/api/*` path routing to backend, not internal service names.

3. **Build and Push Initial Images**: Before deploying via GitHub Actions, manually build and push images to ECR:
   ```bash
   aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 746669223415.dkr.ecr.us-east-2.amazonaws.com
   
   docker build -f frontend/Dockerfile.prod -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest frontend
   docker push 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-frontend:latest
   
   docker build -f backend/Dockerfile.prod -t 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest backend
   docker push 746669223415.dkr.ecr.us-east-2.amazonaws.com/slugger-backend:latest
   ```

4. **Force Service Update**: After images are pushed, update services to pull the new images:
   ```bash
   aws ecs update-service --cluster slugger-cluster --service slugger-backend-service --force-new-deployment
   aws ecs update-service --cluster slugger-cluster --service slugger-frontend-service --force-new-deployment
   ```

5. **Test Deployment**: Access `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com` to verify frontend, and `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com/api/*` for backend endpoints.

6. **Set Up CI/CD**: Once manual deployment works, configure GitHub Actions workflow and test automated deployments.

---

## Maintenance Commands

### View Service Status
```bash
aws ecs describe-services --cluster slugger-cluster --services slugger-frontend-service slugger-backend-service
```

### View Running Tasks
```bash
aws ecs list-tasks --cluster slugger-cluster --service-name slugger-frontend-service
aws ecs list-tasks --cluster slugger-cluster --service-name slugger-backend-service
```

### View Logs
```bash
aws logs tail /ecs/slugger-frontend --follow
aws logs tail /ecs/slugger-backend --follow
```

### Update Service with New Task Definition
```bash
aws ecs update-service --cluster slugger-cluster --service slugger-backend-service --task-definition slugger-backend:2
```

### Rollback to Previous Task Definition
```bash
aws ecs update-service --cluster slugger-cluster --service slugger-backend-service --task-definition slugger-backend:1
```
