# SLUGGER

The first centralized data analytics platform for the Atlantic League of Professional Baseball. Powered by Trackman radar data and developed in collaboration with the [Johns Hopkins University's Sports Analytics Research Group](https://sports-analytics.cs.jhu.edu/), SLUGGER enables analysts, players, coaches, and more to access interactive analytical tools and game-changing insights.

## Production Deployment

The application is deployed on **AWS ECS Fargate** with automated CI/CD via GitHub Actions.

- **Frontend**: Next.js application
- **Backend**: Express.js API
- **Infrastructure**: Multi-container ECS with Application Load Balancer
- **CI/CD**: Automated builds and deployments on push to `main`

See [`documentation/GITHUB-ACTIONS-GUIDE.md`](documentation/GITHUB-ACTIONS-GUIDE.md) for deployment details.

## Local Development

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- `.env` file with required environment variables (see `.env.example`)

### Quick Start with Docker

```bash
# Clone and navigate to project
git clone <repository-url>
cd slugger-website

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up --build
```

**Access the application:**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:3001>

### Manual Setup (Without Docker)

```bash
# Backend
cd backend
npm install
npm start  # Runs on port 3001

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev  # Runs on port 3000
```

### Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after changes
docker-compose up --build
```

## Documentation

- **[AWS Infrastructure](aws/AWS-INFRASTRUCTURE.md)** - Complete AWS resource catalog
- **[GitHub Actions Guide](documentation/GITHUB-ACTIONS-GUIDE.md)** - CI/CD workflow documentation
- **[Quick Reference](documentation/CICD-QUICK-REFERENCE.md)** - Common deployment commands

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: AWS Cognito
- **Infrastructure**: AWS ECS Fargate, Application Load Balancer, ECR
- **CI/CD**: GitHub Actions
