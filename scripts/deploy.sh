#!/bin/bash
# =============================================
# Festivalim CRM - Deployment Script
# =============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Festivalim CRM - Deployment Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Warning: Not running as root. Some operations may require sudo.${NC}"
fi

# Load environment variables
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded .env.production${NC}"
else
    echo -e "${RED}✗ .env.production not found!${NC}"
    echo -e "${YELLOW}  Copy .env.production.example to .env.production and configure it.${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required tools
echo -e "\n${BLUE}Checking required tools...${NC}"
for cmd in docker docker-compose; do
    if command_exists $cmd; then
        echo -e "${GREEN}✓ $cmd is installed${NC}"
    else
        echo -e "${RED}✗ $cmd is not installed${NC}"
        exit 1
    fi
done

# Create necessary directories
echo -e "\n${BLUE}Creating directories...${NC}"
mkdir -p docker/certbot/conf docker/certbot/www
mkdir -p backups logs
echo -e "${GREEN}✓ Directories created${NC}"

# Pull latest images
echo -e "\n${BLUE}Pulling latest images...${NC}"
docker-compose pull

# Build application
echo -e "\n${BLUE}Building application...${NC}"
docker-compose build --no-cache app

# Stop existing containers
echo -e "\n${BLUE}Stopping existing containers...${NC}"
docker-compose down || true

# Start infrastructure first (DB, Redis)
echo -e "\n${BLUE}Starting infrastructure...${NC}"
docker-compose up -d postgres redis
echo -e "${YELLOW}Waiting for database to be ready...${NC}"
sleep 10

# Check database health
until docker-compose exec -T postgres pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-festivalim}; do
    echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Run database migrations
echo -e "\n${BLUE}Running database migrations...${NC}"
docker-compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-festivalim} -f /docker-entrypoint-initdb.d/01-schema.sql || true
for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
    echo -e "${YELLOW}  Running migration: $(basename $migration)${NC}"
    docker-compose exec -T postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-festivalim} -f "$migration" || true
done
echo -e "${GREEN}✓ Migrations completed${NC}"

# Start Supabase services
echo -e "\n${BLUE}Starting Supabase services...${NC}"
docker-compose up -d supabase-meta supabase-auth supabase-rest supabase-realtime supabase-storage supabase-imgproxy supabase-kong
sleep 5

# Start application
echo -e "\n${BLUE}Starting application...${NC}"
docker-compose up -d app
sleep 5

# Start Nginx
echo -e "\n${BLUE}Starting Nginx...${NC}"
docker-compose up -d nginx

# Health check
echo -e "\n${BLUE}Running health check...${NC}"
sleep 5
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${RED}✗ Application health check failed${NC}"
    echo -e "${YELLOW}Checking logs...${NC}"
    docker-compose logs --tail=50 app
fi

# Show status
echo -e "\n${BLUE}Container status:${NC}"
docker-compose ps

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deployment Complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Access points:${NC}"
echo -e "  • Application: https://crm.festivalim.ru"
echo -e "  • Supabase API: https://crm.festivalim.ru/supabase/"
echo -e "  • Supabase Studio: https://studio.festivalim.ru (if configured)"
echo -e "\n${YELLOW}Don't forget to set up SSL certificates with:${NC}"
echo -e "  ./scripts/ssl-init.sh"
