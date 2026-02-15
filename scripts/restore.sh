#!/bin/bash
# =============================================
# Festivalim CRM - Restore Script
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Festivalim CRM - Restore Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Usage: $0 <backup_file.tar.gz>${NC}"
    echo -e "\nAvailable backups:"
    ls -la /backups/festivalim_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
TEMP_DIR=$(mktemp -d)

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load environment
cd "$(dirname "$0")/.."
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

echo -e "\n${YELLOW}⚠ WARNING: This will overwrite current data!${NC}"
read -p "Are you sure you want to restore from $(basename $BACKUP_FILE)? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

echo -e "\n${BLUE}[1/5] Extracting backup archive...${NC}"
tar xzf "$BACKUP_FILE" -C "$TEMP_DIR"
echo -e "${GREEN}✓ Archive extracted${NC}"

echo -e "\n${BLUE}[2/5] Stopping application...${NC}"
docker-compose stop app nginx supabase-kong supabase-rest
echo -e "${GREEN}✓ Application stopped${NC}"

echo -e "\n${BLUE}[3/5] Restoring PostgreSQL database...${NC}"
DB_DUMP=$(find "$TEMP_DIR" -name "*_db.dump" | head -1)
if [ -f "$DB_DUMP" ]; then
    docker-compose exec -T postgres pg_restore \
        -U ${POSTGRES_USER:-postgres} \
        -d ${POSTGRES_DB:-festivalim} \
        --clean \
        --if-exists \
        < "$DB_DUMP"
    echo -e "${GREEN}✓ Database restored${NC}"
else
    echo -e "${YELLOW}⚠ No database dump found in backup${NC}"
fi

echo -e "\n${BLUE}[4/5] Restoring storage files...${NC}"
STORAGE_ARCHIVE=$(find "$TEMP_DIR" -name "*_storage.tar.gz" | head -1)
if [ -f "$STORAGE_ARCHIVE" ]; then
    docker run --rm \
        -v festivalim-crm-v2_storage_data:/data \
        -v "$STORAGE_ARCHIVE":/backup/storage.tar.gz:ro \
        alpine sh -c "rm -rf /data/* && tar xzf /backup/storage.tar.gz -C /data"
    echo -e "${GREEN}✓ Storage restored${NC}"
else
    echo -e "${YELLOW}⚠ No storage archive found in backup${NC}"
fi

echo -e "\n${BLUE}[5/5] Starting application...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Application started${NC}"

# Cleanup
rm -rf "$TEMP_DIR"

# Health check
echo -e "\n${BLUE}Running health check...${NC}"
sleep 10
if curl -f -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Application is healthy!${NC}"
else
    echo -e "${YELLOW}⚠ Health check failed. Check logs with: docker-compose logs app${NC}"
fi

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Restore Complete!                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
