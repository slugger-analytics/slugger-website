# SLUGGER

The first centralized data analytics platform for the Atlantic League of Professional Baseball. Powered by Trackman radar data and developed in collaboration with the [Johns Hopkins University's Sports Analytics Research Group](https://sports-analytics.cs.jhu.edu/), SLUGGER enables analysts, players, coaches, and more to access interactive analytical tools and game-changing insights.

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: AWS Cognito
- **Infrastructure**: AWS ECS Fargate, Application Load Balancer, ECR
- **CI/CD**: GitHub Actions

## Production

**URL**: `http://slugger-alb-1518464736.us-east-2.elb.amazonaws.com`

Deployed on AWS ECS Fargate with automated CI/CD. Push to `main` triggers automatic deployment.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for deployment guide.

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

- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment and CI/CD
- **[AWS Infrastructure](aws/AWS-INFRASTRUCTURE.md)** - Complete AWS resource catalog
