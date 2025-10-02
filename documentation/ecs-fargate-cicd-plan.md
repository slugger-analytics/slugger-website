# ECS Fargate Multi-Container CI/CD Task Plan

## Feasibility Snapshot

- **Monorepo structure**: `package.json` uses npm workspaces (`frontend`, `backend`), enabling independent build contexts for each service. Both services already expose ports `3000` and `3001`, matching the `docker-compose.yml` topology.

## Task Breakdown

### 1. Containerization Updates

- **Separate Dockerfiles**: Create `frontend/Dockerfile.prod` and `backend/Dockerfile.prod` with production builds (`npm ci`, `npm run build`, distinct `CMD`). Parameterize via build arguments for environment-specific settings. _Completed via `frontend/Dockerfile.prod` (multi-stage Next.js build using `npm install --legacy-peer-deps` to handle lockfile drift) and `backend/Dockerfile.prod` (lean Express runtime with `npm ci --omit=dev`). See `documentation/DOCKER-BUILD-NOTES.md` for lockfile resolution details._
- **Runtime entrypoints**: Add lightweight start scripts (e.g., `backend/start.sh`, `frontend/start.sh`) if necessary to apply runtime migrations or load environment variables before launching the service. _Current commands in the new Dockerfiles cover existing needs; reassess once database migrations or seed logic require orchestration._
- **Shared environment audit**: Catalog env vars in `.env.example`; decide which belong in task definition vs. AWS Secrets Manager. Remove frontend consumption of backend-only secrets (use `NEXT_PUBLIC_*` only for client exposure).
- **Local parity**: Update `docker-compose.yml` to optionally consume the production Dockerfiles behind a profile (`fargate-build`) to ensure deterministic builds before pushing to ECR.

### 2. AWS Infrastructure Prerequisites
{{ ... }}

- **Networking**: Confirm VPC, public subnets, NAT/IGW alignment for Internet-accessible ALB + private subnets for tasks. Document security group ingress (`80/443` to ALB, ALB to backend on `3001` if needed internally).
- **ECS cluster & capacity**: Create ECS cluster targeting Fargate. Define capacity providers and service discovery if intra-service DNS is required.
- **Load balancing**: Decide between single Application Load Balancer with path-based routing vs. separate target groups. Configure health checks on `/api/health` (backend) and `/` (frontend static).
- **Stateful dependencies**: Ensure RDS endpoints, external APIs, and Cognito configuration are reachable from Fargate subnets; update security groups as required.
- ~~**Task definition template**: Maintain `aws/task-definition-backend.json` & `aws/task-definition-frontend.json` or a combined family with two containers. Use GitHub Actions to inject new image tags via `aws-actions/amazon-ecs-render-task-definition`.~~ _Draft JSON templates added with placeholder ARNs, secret references, and health checks; replace with account-specific values before deploy._
- **Configuration catalog**: Document mapping of `.env.example` variables to ECS task `environment`/`secrets`, noting which parameters move to AWS Secrets Manager vs. SSM Parameter Store for each service.

#### Env Mapping Snapshot

- **Backend (`aws/task-definition-backend.json`)**
  - `DB_HOST` → SSM parameter `/slugger/backend/db_host`
  - `DB_USERNAME`, `DB_PASSWORD`, `SESSION_SECRET`, `TOKEN_SECRET`, `AWS_ACCESS_KEY`, `AWS_SECRET_ACCESS_KEY` → Secrets Manager under `slugger/...`
  - `COGNITO_APP_CLIENT_ID` → SSM parameter `/slugger/backend/cognito_client_id`
  - `PORT`, `NODE_ENV` remain plaintext environment values.
- **Frontend (`aws/task-definition-frontend.json`)**
  - `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_COGNITO_APP_CLIENT_ID` → SSM parameters under `/slugger/frontend/*`
  - `PORT`, `NODE_ENV` remain plaintext environment values.
- **Shared**
  - Remaining `.env.example` keys (e.g., `POINTSTREAK_*`, `JSON_BUCKET_NAME`) need classification; add to Secrets Manager if sensitive, otherwise SSM. Update this list as services integrate them.

### 3. CI Pipeline (GitHub Actions)

- ~~**Workflow scaffold**: Add `.github/workflows/ecs-cicd.yml` triggered on `main` and PRs for test-only path.~~ _Implemented new workflow with `push` (`main`) and manual trigger in `.github/workflows/ecs-cicd.yml`._
- ~~**Build phase**:~~
  - ~~Check out repository, configure AWS credentials via `aws-actions/configure-aws-credentials` assuming role stored in GitHub secrets.~~
  - ~~Run lint/tests (`npm run lint`, targeted backend/frontend tests) before image builds.~~
  - ~~Build images using `docker build` pointed at `frontend/Dockerfile.prod` and `backend/Dockerfile.prod` with tags `${{ github.sha }}` and `latest`.~~
- ~~**Push to ECR**: Authenticate with `aws ecr get-login-password`. Push both tags per service; output image URIs for use in deployment job.~~ _Covered with ECR login, build, tag, and push steps; image URIs exported for downstream jobs._
- ~~**Artifact sharing**: Persist rendered `taskdef.json` and container image URIs with `actions/upload-artifact` to feed deploy stage.~~ _Rendered task definitions via `aws-actions/amazon-ecs-render-task-definition` in deploy job, leveraging action outputs instead of manual artifacts._

### 4. CD Pipeline (Deploy to ECS Fargate)

- **Task definition template**: Maintain `aws/task-definition-backend.json` & `aws/task-definition-frontend.json` or a combined family with two containers. Use GitHub Actions to inject new image tags via `aws-actions/amazon-ecs-render-task-definition`.
- **Deployment job**:
  - Depends on successful build job.
  - Use `aws-actions/amazon-ecs-deploy-task-definition` to update the ECS service. Enable `wait-for-service-stability` for rollback on failure.
- **Blue/green readiness**: Optionally integrate AWS CodeDeploy for canary/linear traffic shifting if zero downtime is required.
- **Post-deploy smoke tests**: Trigger synthetic checks (e.g., `npm run test:e2e` pointing at the ALB) or ping health endpoints to validate rollout before marking workflow success.

### 5. Configuration & Operations

- **Secrets management**: Store sensitive values in AWS Secrets Manager/SSM Parameter Store. Map them into the task definition environment; expose public config as plaintext env vars.
- **Logging & metrics**: Configure AWS FireLens or default CloudWatch Logs log drivers per container. Ensure log groups exist with retention policies.
- **Scaling policies**: Define ECS service auto scaling rules (CPU/Memory thresholds). Document manual scale-up procedure.
- **Cost & limit guardrails**: Set CloudWatch alarms for task failures, throttle AWS budgets, and ensure GitHub Actions concurrency limits are noted.
- **Rollback procedure**: Outline manual rollback (redeploy previous task definition revision) and automate by retaining prior image tags (`latest`, `stable`).

## Acceptance Checklist

- **[ ]** Docker images build reproducibly for both services and run using production commands.
- **[ ]** AWS infrastructure (ECR, ECS, networking, load balancing) provisioned and documented.
- **[ ]** GitHub Actions workflow builds, tests, and publishes images to ECR.
- **[ ]** Deployment step updates ECS service with zero-downtime rollout and health checks.
- **[ ]** Secrets, logging, scaling, and rollback strategies formalized and tested.
