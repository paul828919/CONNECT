#!/bin/bash

# Connect Platform - HTTPS Setup Script
# Installs Nginx, configures reverse proxy, and obtains SSL certificate
# Run on Linux server: sudo bash setup-https.sh

set -e  # Exit on any error

echo "=================================="
echo "Connect HTTPS Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="connectplt.kr"
WWW_DOMAIN="www.connectplt.kr"
APP_PORT=3000
EMAIL="paul@connectplt.kr"  # Change this to your email

echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root: sudo bash setup-https.sh${NC}"
    exit 1
fi

# Check if Next.js is running
if lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Next.js is running on port $APP_PORT${NC}"
else
    echo -e "${RED}❌ Next.js is not running on port $APP_PORT${NC}"
    echo "Please start Next.js first: npm run dev (or pm2 start for production)"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Installing Nginx and Certbot...${NC}"
echo ""

# Update package list
apt update

# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

echo -e "${GREEN}✅ Nginx and Certbot installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Creating Nginx configuration...${NC}"
echo ""

# Create Nginx configuration
cat > /etc/nginx/sites-available/$DOMAIN << 'EOF'
# Connect Platform - Nginx Configuration
# HTTP server block (will be upgraded to HTTPS by Certbot)

server {
    listen 80;
    listen [::]:80;
    server_name connectplt.kr www.connectplt.kr;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000/api/health;
        access_log off;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000/_next/static;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Client max body size (for file uploads)
    client_max_body_size 10M;
}
EOF

echo -e "${GREEN}✅ Nginx configuration created${NC}"
echo ""

echo -e "${YELLOW}Step 4: Enabling site and testing configuration...${NC}"
echo ""

# Enable site (create symbolic link)
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
echo ""

echo -e "${YELLOW}Step 5: Restarting Nginx...${NC}"
echo ""

# Restart Nginx
systemctl restart nginx
systemctl enable nginx  # Enable on boot

echo -e "${GREEN}✅ Nginx restarted and enabled${NC}"
echo ""

echo -e "${YELLOW}Step 6: Testing HTTP access...${NC}"
echo ""

# Test HTTP access
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTP access working (Status: $HTTP_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTP Status: $HTTP_STATUS (may be OK if Next.js redirects)${NC}"
fi

echo ""
echo -e "${YELLOW}Step 7: Obtaining SSL certificate...${NC}"
echo ""
echo -e "${YELLOW}Note: Certbot will ask for your email and agreement to Terms of Service${NC}"
echo ""

# Obtain SSL certificate
# --nginx: Use Nginx plugin (auto-configures HTTPS)
# --agree-tos: Agree to Let's Encrypt Terms of Service
# --redirect: Automatically redirect HTTP to HTTPS
# --non-interactive: Run without prompts (will fail if email not provided)
certbot --nginx -d $DOMAIN -d $WWW_DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

echo ""
echo -e "${GREEN}✅ SSL certificate obtained and installed${NC}"
echo ""

echo -e "${YELLOW}Step 8: Testing HTTPS access...${NC}"
echo ""

# Test HTTPS access
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
if [ "$HTTPS_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ HTTPS access working (Status: $HTTPS_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️  HTTPS Status: $HTTPS_STATUS${NC}"
fi

echo ""
echo -e "${YELLOW}Step 9: Verifying SSL certificate auto-renewal...${NC}"
echo ""

# Test certificate renewal (dry run)
certbot renew --dry-run

echo -e "${GREEN}✅ SSL auto-renewal is configured${NC}"
echo ""

echo "=================================="
echo -e "${GREEN}🎉 HTTPS Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Open browser: https://$DOMAIN"
echo "2. Verify green padlock appears"
echo "3. Test that HTTP redirects to HTTPS"
echo ""
echo "Certificate details:"
echo "  - Domain: $DOMAIN, $WWW_DOMAIN"
echo "  - Issuer: Let's Encrypt"
echo "  - Auto-renewal: Enabled (runs daily)"
echo "  - Certificate location: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "Nginx commands:"
echo "  - Test config: sudo nginx -t"
echo "  - Reload: sudo systemctl reload nginx"
echo "  - Restart: sudo systemctl restart nginx"
echo "  - Logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "Certbot commands:"
echo "  - Renew: sudo certbot renew"
echo "  - Status: sudo certbot certificates"
echo ""
