# HTTPS Setup Guide - Connect Platform

**Date**: October 11, 2025
**Phase**: Beta Week 1 Day 2 - Priority 2
**Goal**: Enable HTTPS on connectplt.kr with green padlock
**Duration**: 2 hours

---

## Overview

This guide walks through setting up HTTPS for Connect Platform using:
- **Nginx**: Reverse proxy server
- **Let's Encrypt**: Free SSL certificates
- **Certbot**: Automated certificate management

**Architecture**:
```
Internet → Cloudflare DNS → Your Server (59.21.170.6)
                             ├─ Nginx (port 80/443)
                             └─ Next.js (port 3000)
```

---

## Prerequisites

**Before starting, verify**:

1. ✅ DNS is working: `connectplt.kr` → `59.21.170.6`
2. ✅ Next.js is running on port 3000 (on Linux server)
3. ✅ Port 80 and 443 are open (firewall/security groups)
4. ✅ You have root/sudo access to the Linux server

**Check from your MacBook**:
```bash
# Test DNS resolution
dig connectplt.kr +short
# Should return: 59.21.170.6

# Test if Next.js is accessible (if server firewall allows)
curl http://59.21.170.6:3000/api/health
# Should return: {"status":"ok"}
```

---

## Option A: Automated Setup (Recommended)

**Time**: 10-15 minutes

### Step 1: Copy Script to Server

From your MacBook:
```bash
# Copy the setup script to the server
scp scripts/setup-https.sh paul@59.21.170.6:~/

# SSH to the server
ssh paul@59.21.170.6
```

### Step 2: Run Setup Script

On the Linux server:
```bash
# Make script executable (if needed)
chmod +x setup-https.sh

# Run with sudo
sudo bash setup-https.sh
```

The script will:
1. ✅ Check if Next.js is running (port 3000)
2. ✅ Install Nginx and Certbot
3. ✅ Create Nginx configuration
4. ✅ Enable and restart Nginx
5. ✅ Obtain SSL certificate from Let's Encrypt
6. ✅ Configure HTTP → HTTPS redirect
7. ✅ Test HTTPS access
8. ✅ Verify auto-renewal

**If successful**, skip to "Step 3: Verify HTTPS" below.

---

## Option B: Manual Setup (Step-by-Step)

**Time**: 20-30 minutes

### Step 1: Connect to Server

```bash
# From your MacBook
ssh paul@59.21.170.6
```

### Step 2: Verify Next.js is Running

```bash
# Check if Next.js is listening on port 3000
lsof -i :3000

# Should show something like:
# COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
# node    1234 paul   21u  IPv4  12345      0t0  TCP *:3000 (LISTEN)

# Test the API
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}
```

### Step 3: Install Nginx and Certbot

```bash
# Update package list
sudo apt update

# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 4: Create Nginx Configuration

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/connectplt.kr
```

**Paste this configuration**:
```nginx
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
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Enable Site and Test Configuration

```bash
# Enable the site (create symbolic link)
sudo ln -s /etc/nginx/sites-available/connectplt.kr /etc/nginx/sites-enabled/

# Remove default site (if exists)
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Should see:
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Step 6: Start Nginx

```bash
# Start Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx

# Should show: active (running)
```

### Step 7: Test HTTP Access

```bash
# Test from server
curl -I http://connectplt.kr

# Should return HTTP/1.1 200 OK (or 301/302 if redirecting)

# Check Nginx logs if issues
sudo tail -f /var/log/nginx/error.log
```

### Step 8: Obtain SSL Certificate

```bash
# Run Certbot with Nginx plugin
sudo certbot --nginx -d connectplt.kr -d www.connectplt.kr

# You'll be asked:
# 1. Email address (for urgent renewal notices): paul@connectplt.kr
# 2. Agree to Terms of Service: Y
# 3. Share email with EFF: N (optional)
# 4. Redirect HTTP to HTTPS: 2 (Yes, redirect)
```

**Certbot will**:
- Validate domain ownership (checks DNS)
- Obtain SSL certificate from Let's Encrypt
- Modify Nginx config to enable HTTPS
- Configure HTTP → HTTPS redirect
- Set up auto-renewal (cron job)

### Step 9: Verify HTTPS

```bash
# Test HTTPS access
curl -I https://connectplt.kr

# Should return: HTTP/2 200

# Check certificate details
sudo certbot certificates

# Should show:
# Certificate Name: connectplt.kr
# Domains: connectplt.kr www.connectplt.kr
# Expiry Date: [90 days from now]
# Certificate Path: /etc/letsencrypt/live/connectplt.kr/fullchain.pem
```

### Step 10: Test Auto-Renewal

```bash
# Dry run renewal test
sudo certbot renew --dry-run

# Should see: Congratulations, all renewals succeeded
```

---

## Step 3: Verify HTTPS (from MacBook)

After setup completes, test from your MacBook:

```bash
# Test HTTPS access
curl -I https://connectplt.kr

# Should return: HTTP/2 200

# Test HTTP → HTTPS redirect
curl -I http://connectplt.kr

# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://connectplt.kr/

# Test WWW subdomain
curl -I https://www.connectplt.kr

# Should work (may redirect to non-www)
```

**Browser Test**:
1. Open: https://connectplt.kr
2. Look for 🔒 green padlock in address bar
3. Click padlock → Certificate → Should show "Let's Encrypt" issuer

---

## Troubleshooting

### Issue 1: "Next.js not running on port 3000"

**Solution**:
```bash
# On Linux server, check if Next.js is running
lsof -i :3000

# If not running, start it
cd /path/to/connect
npm run dev

# For production (keeps running after logout)
# Install PM2 first: npm install -g pm2
pm2 start npm --name "connect" -- start
pm2 save
pm2 startup
```

### Issue 2: "Connection refused" when testing HTTP

**Check firewall**:
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443

# Check if ports are listening
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### Issue 3: Certbot fails with "DNS problem: NXDOMAIN"

**DNS not propagated yet**:
```bash
# Wait 5-10 minutes for DNS propagation
# Verify DNS from server
dig connectplt.kr +short

# Should return: 59.21.170.6
```

### Issue 4: "nginx: configuration test failed"

**Syntax error in config**:
```bash
# Check detailed error
sudo nginx -t

# View config file
sudo cat /etc/nginx/sites-available/connectplt.kr

# Common issues:
# - Missing semicolon (;)
# - Typo in directive name
# - Mismatched braces {}
```

### Issue 5: SSL certificate error in browser

**Mixed content warning**:
- Ensure all assets (images, CSS, JS) use HTTPS URLs
- Check `next.config.js` for any hardcoded HTTP URLs

**Certificate not trusted**:
- Clear browser cache
- Check certificate chain: `openssl s_client -connect connectplt.kr:443 -showcerts`

---

## Post-Setup Verification Checklist

**On Linux Server**:
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] Nginx enabled on boot: `sudo systemctl is-enabled nginx`
- [ ] Certificate auto-renewal: `sudo certbot renew --dry-run`
- [ ] Certificate expiry: `sudo certbot certificates` (should be ~90 days)

**From Browser**:
- [ ] https://connectplt.kr loads with green padlock
- [ ] https://www.connectplt.kr works (may redirect)
- [ ] http://connectplt.kr redirects to HTTPS
- [ ] Certificate issuer: Let's Encrypt
- [ ] Certificate valid for: connectplt.kr, www.connectplt.kr

**API Tests**:
- [ ] https://connectplt.kr/api/health returns 200
- [ ] Auth flow works (Kakao/Naver OAuth redirects work with HTTPS)
- [ ] Dashboard loads correctly

---

## Nginx Useful Commands

```bash
# Test configuration
sudo nginx -t

# Reload (graceful, no downtime)
sudo systemctl reload nginx

# Restart (brief downtime)
sudo systemctl restart nginx

# Stop
sudo systemctl stop nginx

# View error logs
sudo tail -f /var/log/nginx/error.log

# View access logs
sudo tail -f /var/log/nginx/access.log

# Check status
sudo systemctl status nginx
```

---

## Certbot Useful Commands

```bash
# View all certificates
sudo certbot certificates

# Renew all certificates (auto-renews if <30 days to expiry)
sudo certbot renew

# Force renewal (for testing)
sudo certbot renew --force-renewal

# Dry run renewal test
sudo certbot renew --dry-run

# Revoke certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/connectplt.kr/cert.pem

# Delete certificate
sudo certbot delete --cert-name connectplt.kr
```

---

## Certificate Auto-Renewal

**How it works**:
- Certbot installs a systemd timer: `/etc/systemd/system/certbot.timer`
- Runs twice daily: Checks if certificates expire in <30 days
- If yes: Automatically renews
- Nginx reloaded automatically after renewal

**Verify auto-renewal**:
```bash
# Check timer status
sudo systemctl status certbot.timer

# Check timer schedule
sudo systemctl list-timers | grep certbot

# View renewal logs
sudo journalctl -u certbot.service
```

**Manual renewal** (if needed):
```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## Next Steps After HTTPS Setup

1. **Update Environment Variables**:
   - Set `NEXTAUTH_URL=https://connectplt.kr` in production `.env`
   - Update OAuth redirect URIs (Kakao, Naver) to use HTTPS

2. **Test OAuth Login**:
   - Kakao: https://connectplt.kr/auth/signin
   - Naver: https://connectplt.kr/auth/signin
   - Ensure redirect_uri matches new HTTPS URL

3. **Enable HSTS** (HTTP Strict Transport Security):
   - Already configured in Nginx (see security headers)
   - Forces browsers to always use HTTPS

4. **Security Hardening** (Priority 3 - Next session):
   - Add Content Security Policy (CSP)
   - Run `npm audit` and fix vulnerabilities
   - Add rate limiting to Nginx

5. **Monitoring**:
   - Set up certificate expiry alerts (email from Let's Encrypt)
   - Monitor Nginx logs for SSL errors
   - Add uptime monitoring (e.g., UptimeRobot)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Internet (Browser/Client)                               │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │ HTTPS (443) / HTTP (80)
                    │
┌───────────────────▼─────────────────────────────────────┐
│  Cloudflare DNS                                          │
│  connectplt.kr → 59.21.170.6                        │
└───────────────────┬─────────────────────────────────────┘
                    │
                    │
┌───────────────────▼─────────────────────────────────────┐
│  Linux Server (59.21.170.6)                         │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Nginx (Reverse Proxy)                          │   │
│  │  - SSL/TLS Termination                          │   │
│  │  - Port 80 → 443 redirect                       │   │
│  │  - Security headers                              │   │
│  │  - Static file caching                           │   │
│  └───────────────────┬─────────────────────────────┘   │
│                      │                                    │
│                      │ HTTP (localhost:3000)             │
│                      │                                    │
│  ┌───────────────────▼─────────────────────────────┐   │
│  │  Next.js Application                            │   │
│  │  - API routes                                    │   │
│  │  - SSR pages                                     │   │
│  │  - Static assets                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘

SSL Certificate:
/etc/letsencrypt/live/connectplt.kr/
├── fullchain.pem  (Certificate + Intermediate)
├── privkey.pem    (Private key)
└── cert.pem       (Certificate only)
```

---

## Success Criteria

**HTTPS Setup Complete When**:

✅ **Nginx running**: `sudo systemctl status nginx` shows "active (running)"
✅ **HTTPS working**: Browser shows green padlock on https://connectplt.kr
✅ **HTTP redirects**: http://connectplt.kr → https://connectplt.kr (301)
✅ **Certificate valid**: Issued by Let's Encrypt, valid for 90 days
✅ **WWW works**: https://www.connectplt.kr accessible
✅ **Auto-renewal**: `sudo certbot renew --dry-run` succeeds
✅ **API working**: https://connectplt.kr/api/health returns 200
✅ **No mixed content**: Browser console shows no SSL warnings

---

## Time Estimate

- **Automated script**: 10-15 minutes
- **Manual setup**: 20-30 minutes
- **Troubleshooting buffer**: 30-60 minutes
- **Total**: 1-2 hours

---

## Related Documentation

- **Beta Test Execution Plan**: `docs/plans/BETA-TEST-EXECUTION-PLAN.md`
- **Master Progress Tracker**: `docs/plans/progress/MASTER-PROGRESS-TRACKER.md`
- **Deployment Architecture**: `docs/current/Deployment_Architecture_v3.md`
- **Load Testing Guide**: `docs/guides/LOAD_TESTING.md`

---

**Status**: Ready to execute
**Priority**: P2 (after authentication, before security hardening)
**Blocking**: None
**Blocked by**: DNS setup (✅ complete)

---

*Last updated: October 11, 2025*
