#!/bin/bash
# =============================================
# Festivalim CRM - Backup Script
# Run daily via cron: 0 3 * * * /path/to/backup.sh
# =============================================

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="festivalim_backup_${TIMESTAMP}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Festivalim CRM - Backup Script       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Load environment
cd "$(dirname "$0")/.."
if [ -f .env.production ]; then
    export $(cat .env.production | grep -v '^#' | xargs)
fi

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo -e "\n${BLUE}[1/4] Backing up PostgreSQL database...${NC}"
docker-compose exec -T postgres pg_dump \
    -U ${POSTGRES_USER:-postgres} \
    -d ${POSTGRES_DB:-festivalim} \
    --format=custom \
    --compress=9 \
    > "${BACKUP_DIR}/${BACKUP_NAME}_db.dump"

if [ -f "${BACKUP_DIR}/${BACKUP_NAME}_db.dump" ]; then
    DB_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}_db.dump" | cut -f1)
    echo -e "${GREEN}✓ Database backup complete (${DB_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠ Database backup may have failed${NC}"
fi

echo -e "\n${BLUE}[2/4] Backing up storage files...${NC}"
docker run --rm \
    -v festivalim-crm-v2_storage_data:/data:ro \
    -v ${BACKUP_DIR}:/backup \
    alpine tar czf /backup/${BACKUP_NAME}_storage.tar.gz -C /data .
echo -e "${GREEN}✓ Storage backup complete${NC}"

echo -e "\n${BLUE}[3/4] Backing up configuration...${NC}"
tar czf "${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='backups' \
    .env.production \
    docker/ \
    docker-compose.yml \
    2>/dev/null || true
echo -e "${GREEN}✓ Configuration backup complete${NC}"

echo -e "\n${BLUE}[4/4] Creating combined archive...${NC}"
cd "${BACKUP_DIR}"
tar czf "${BACKUP_NAME}.tar.gz" \
    "${BACKUP_NAME}_db.dump" \
    "${BACKUP_NAME}_storage.tar.gz" \
    "${BACKUP_NAME}_config.tar.gz"

# Cleanup individual files
rm -f "${BACKUP_NAME}_db.dump" \
      "${BACKUP_NAME}_storage.tar.gz" \
      "${BACKUP_NAME}_config.tar.gz"

FINAL_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
echo -e "${GREEN}✓ Combined archive created (${FINAL_SIZE})${NC}"

# Upload to S3 (if configured)
if [ -n "${S3_BACKUP_BUCKET}" ]; then
    echo -e "\n${BLUE}Uploading to S3...${NC}"
    aws s3 cp "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" \
        "s3://${S3_BACKUP_BUCKET}/backups/${BACKUP_NAME}.tar.gz"
    echo -e "${GREEN}✓ Uploaded to S3${NC}"
fi

# Cleanup old backups
echo -e "\n${BLUE}Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "festivalim_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
REMAINING=$(ls -1 "${BACKUP_DIR}"/festivalim_backup_*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ ${REMAINING} backups retained${NC}"

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Backup Complete!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
