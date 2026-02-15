#!/bin/bash
# =============================================
# Festivalim CRM - SSL Certificate Setup
# =============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Festivalim CRM - SSL Certificate Setup  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Configuration
DOMAIN="crm.festivalim.ru"
EMAIL="admin@festivalim.ru"  # Change this!

cd "$(dirname "$0")/.."

# Create directories
mkdir -p docker/certbot/conf docker/certbot/www

# Check if certificate already exists
if [ -d "docker/certbot/conf/live/${DOMAIN}" ]; then
    echo -e "${YELLOW}Certificate already exists. Use certbot renew to refresh.${NC}"
    exit 0
fi

# Create temporary nginx config for HTTP challenge
echo -e "\n${BLUE}Creating temporary Nginx configuration...${NC}"
cat > docker/nginx/conf.d/default.conf << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name crm.festivalim.ru studio.festivalim.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 "Waiting for SSL certificate...";
        add_header Content-Type text/plain;
    }
}
EOF

# Start Nginx
echo -e "\n${BLUE}Starting Nginx for certificate verification...${NC}"
docker-compose up -d nginx

# Wait for Nginx to start
sleep 5

# Request certificate
echo -e "\n${BLUE}Requesting SSL certificate from Let's Encrypt...${NC}"
docker-compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email ${EMAIL} \
    --agree-tos \
    --no-eff-email \
    -d ${DOMAIN} \
    -d studio.${DOMAIN#crm.}

# Check if certificate was created
if [ -d "docker/certbot/conf/live/${DOMAIN}" ]; then
    echo -e "${GREEN}✓ SSL certificate obtained successfully!${NC}"
    
    # Restore full Nginx config
    echo -e "\n${BLUE}Restoring full Nginx configuration...${NC}"
    git checkout docker/nginx/conf.d/default.conf 2>/dev/null || true
    
    # Reload Nginx
    docker-compose exec nginx nginx -s reload
    
    echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         SSL Setup Complete!                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo -e "\nYour site is now available at:"
    echo -e "  https://${DOMAIN}"
else
    echo -e "${YELLOW}⚠ Certificate not found. Check certbot logs.${NC}"
    docker-compose logs certbot
fi

# Setup auto-renewal cron job
echo -e "\n${BLUE}Setting up automatic certificate renewal...${NC}"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "0 12 * * * cd $(pwd) && docker-compose run --rm certbot renew --quiet && docker-compose exec nginx nginx -s reload") | crontab -
echo -e "${GREEN}✓ Auto-renewal cron job configured${NC}"
