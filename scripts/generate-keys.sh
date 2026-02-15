#!/bin/bash
# =============================================
# Festivalim CRM - Generate Supabase Keys
# =============================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Festivalim CRM - Generate Supabase Keys  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo -e "\n${GREEN}JWT_SECRET=${NC}"
echo "$JWT_SECRET"

# Generate Postgres Password
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr '+/' '-_')
echo -e "\n${GREEN}POSTGRES_PASSWORD=${NC}"
echo "$POSTGRES_PASSWORD"

# Generate Realtime Encryption Key
REALTIME_ENC_KEY=$(openssl rand -base64 32 | tr -d '\n')
echo -e "\n${GREEN}REALTIME_ENC_KEY=${NC}"
echo "$REALTIME_ENC_KEY"

# Generate Realtime Secret Key Base
REALTIME_SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')
echo -e "\n${GREEN}REALTIME_SECRET_KEY_BASE=${NC}"
echo "$REALTIME_SECRET_KEY_BASE"

echo -e "\n${YELLOW}=== Supabase JWT Keys ===${NC}"
echo -e "${YELLOW}To generate SUPABASE_ANON_KEY and SUPABASE_SERVICE_KEY:${NC}"
echo -e "1. Go to: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys"
echo -e "2. Or use this Node.js script:"
echo ""
echo -e "${BLUE}// Save as generate-jwt.js and run with: node generate-jwt.js${NC}"
cat << 'EOF'
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'YOUR_JWT_SECRET_HERE';

// Anon key (public)
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};
console.log('SUPABASE_ANON_KEY:');
console.log(jwt.sign(anonPayload, JWT_SECRET));

// Service role key (secret)
const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};
console.log('\nSUPABASE_SERVICE_KEY:');
console.log(jwt.sign(servicePayload, JWT_SECRET));
EOF

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Keys Generated Successfully!       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e "\n${YELLOW}Copy these values to your .env.production file${NC}"
