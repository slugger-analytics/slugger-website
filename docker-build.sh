#!/bin/bash
# Docker build script for npm workspaces monorepo
# Must be run from the monorepo root (/slugger-website)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo -e "${RED}Error: This script must be run from the monorepo root (/slugger-website)${NC}"
    exit 1
fi

# Parse arguments
SERVICE=$1
TAG=${2:-latest}

build_frontend() {
    echo -e "${YELLOW}Building frontend Docker image...${NC}"
    docker build \
        -f frontend/Dockerfile.prod \
        --build-context root=. \
        -t slugger-frontend:${TAG} \
        frontend/
    echo -e "${GREEN}✓ Frontend image built: slugger-frontend:${TAG}${NC}"
}

build_backend() {
    echo -e "${YELLOW}Building backend Docker image...${NC}"
    docker build \
        -f backend/Dockerfile.prod \
        --build-context root=. \
        -t slugger-backend:${TAG} \
        backend/
    echo -e "${GREEN}✓ Backend image built: slugger-backend:${TAG}${NC}"
}

# Main logic
case "$SERVICE" in
    frontend)
        build_frontend
        ;;
    backend)
        build_backend
        ;;
    all)
        build_frontend
        build_backend
        ;;
    *)
        echo "Usage: $0 {frontend|backend|all} [tag]"
        echo ""
        echo "Examples:"
        echo "  $0 frontend          # Build frontend with 'latest' tag"
        echo "  $0 backend v1.0.0    # Build backend with 'v1.0.0' tag"
        echo "  $0 all               # Build both services with 'latest' tag"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Build complete!${NC}"
