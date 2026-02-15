#!/bin/bash
# =============================================
# Festivalim CRM - Development Environment
# =============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Festivalim CRM - Development Environment  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

cd "$(dirname "$0")/.."

# Start development services
echo -e "\n${BLUE}Starting development services...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for PostgreSQL
echo -e "\n${BLUE}Waiting for PostgreSQL...${NC}"
until docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres -d festivalim; do
    sleep 1
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Run migrations
echo -e "\n${BLUE}Running migrations...${NC}"
for migration in database/migrations/*.sql; do
    echo "  Running: $(basename $migration)"
    docker-compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d festivalim -f "/docker-entrypoint-initdb.d/migrations/$(basename $migration)" 2>/dev/null || true
done

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      Development Environment Ready!        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e "\n${BLUE}Services:${NC}"
echo -e "  • PostgreSQL: localhost:5432"
echo -e "  • Redis:      localhost:6379"
echo -e "  • Supabase Studio: http://localhost:3001"
echo -e "\n${BLUE}To start the app:${NC}"
echo -e "  npm run dev"
echo -e "\n${BLUE}To stop services:${NC}"
echo -e "  docker-compose -f docker-compose.dev.yml down"
