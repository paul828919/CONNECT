# Session 7 Handoff Prompt - Docker Deployment (October 11, 2025)

**Copy this entire block to your new Claude Code session after running `/compact`**

---

I'm Paul Kim, founder of Connect - Korea's R&D Commercialization Operating System. Continuing Beta Week 1 Day 2 execution after /compact command.

## What Was Completed in Session 6 (October 11, 2025)

### ✅ SSH Connection Established (20 minutes)

**Goal**: Test SSH scripts and connect to production server

**Accomplishments**:
1. **Installed sshpass** via Homebrew for password-based SSH
2. **Successfully connected** to production server (user@221.164.102.253)
3. **Server environment checked**: Node.js v12.22.9, npm 8.5.1, Nginx running
4. **Docker infrastructure verified**: Docker 24.0.7, Docker Compose v2.24.0 installed

**SSH Working Method**:
```bash
# Password-based authentication (working)
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@221.164.102.253 '<command>'
```

---

### ✅ Docker Deployment Analysis Complete (15 minutes)

**Goal**: Review Docker configuration and plan deployment

**Key Discoveries**:

#### **1. Port Conflicts Identified**

**Port 3000 Conflict:**
```
aqua_labs-backend-1  → Running on port 3000 (12 months old, up 2 months)
aqua_labs-db-1       → PostgreSQL 16 running (healthy)
aqua_labs-nginx-1    → Exited (5 months ago)
aqua_labs-frontend-1 → Exited (5 months ago)
```

**Ports 80/443 Conflict:**
```
System Nginx       → Listening on 80/443 with SSL certificates ✅
Docker Nginx       → Wants ports 80/443 (docker-compose.yml) ❌
```

#### **2. Missing Application Files**
- `/opt/connect` directory doesn't exist
- Connect project files not deployed yet
- Node.js v12 installed (need v18+ for Next.js 14)

#### **3. Complete Docker Configuration Found**

**Files Reviewed**:
- `docker-compose.production.yml` (493 lines) - 9 services
- `scripts/deploy.sh` (375 lines) - Zero-downtime deployment script
- `Dockerfile.production` (85 lines) - Multi-stage build
- `.env.production.example` (173 lines) - Environment template

**Docker Services Architecture**:
```
1. nginx (connect_nginx)         - Ports 80/443, Load balancer
2. app1 (connect_app1)           - Port 3001, Next.js instance 1
3. app2 (connect_app2)           - Port 3002, Next.js instance 2
4. pgbouncer (connect_pgbouncer) - Port 6432, Connection pooler
5. postgres (connect_postgres)   - Port 5432, PostgreSQL 15
6. redis-cache                   - Port 6379, LRU cache
7. redis-queue                   - Port 6380, Bull queue
8. scraper (connect_scraper)     - Background worker
9. grafana (connect_grafana)     - Port 3100, Monitoring
```

---

## 🔍 Current Situation

### **Infrastructure Status**:
- ✅ Docker + Docker Compose installed
- ✅ System Nginx running with SSL certificates (expires Jan 8, 2026)
- ✅ HTTP → HTTPS redirect configured
- ⚠️ Old "aqua_labs" project using port 3000
- ⚠️ System Nginx using ports 80/443 (conflicts with Docker Nginx)
- ❌ Connect project files not deployed
- ❌ No .env.production file configured

### **Architecture Decision Made**:

**Use Hybrid Architecture** (System Nginx + Docker Application Stack):

```
Internet → Cloudflare DNS → System Nginx (ports 80/443, SSL termination)
                                 ↓ proxy_pass to upstream
                          ┌──────┴──────┐
                          │             │
                    Docker App1    Docker App2
                    (port 3001)    (port 3002)
                          │             │
                          └──────┬──────┘
                                 ↓
                      PostgreSQL + Redis + Scraper
                      (Docker internal network)
```

**Why Hybrid?**
- ✅ Keep existing SSL certificates (no migration needed)
- ✅ System Nginx handles SSL/TLS (battle-tested)
- ✅ Docker manages application stack (easy updates/rollback)
- ✅ No port conflicts (Docker apps use 3001/3002)

---

## 🎯 What Needs to Be Done in Session 7

### **Phase 1: Cleanup & Preparation** (15 minutes)

#### **Task 1.1: Stop aqua_labs Containers** (5 min)

**Question for user**: Do you need any data from the aqua_labs project?
- If YES: We'll backup the database first
- If NO: We can safely stop and remove the containers

**Commands (after user confirms)**:
```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Check aqua_labs status
docker ps -a | grep aqua_labs

# Stop and remove containers (if user approves)
docker stop aqua_labs-backend-1
docker rm aqua_labs-backend-1

# Optional: Keep database or remove it
# docker stop aqua_labs-db-1 && docker rm aqua_labs-db-1

# Verify port 3000 is free
lsof -i :3000
```

#### **Task 1.2: Modify Docker Compose for Hybrid Architecture** (5 min)

**Changes needed in `docker-compose.production.yml`**:

**Option A: Remove Docker Nginx Entirely** (Recommended - Simpler)
```yaml
# Comment out or remove the nginx service (lines 27-65)
# System Nginx will handle all traffic
```

**Option B: Make Docker Nginx Internal-Only** (Advanced)
```yaml
nginx:
  # Remove these lines:
  # ports:
  #   - "80:80"
  #   - "443:443"

  # Keep for internal load balancing only
  networks:
    connect_net:
      ipv4_address: 172.25.0.10
```

**Recommended**: Option A (remove Docker Nginx)

#### **Task 1.3: Update System Nginx Configuration** (5 min)

**File**: `/etc/nginx/sites-available/connectplt.kr`

**Add upstream load balancing**:
```nginx
# Before server block, add:
upstream connect_backend {
    least_conn;  # Use least connections algorithm
    server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    server_name connectplt.kr www.connectplt.kr;

    # Proxy settings
    location / {
        proxy_pass http://connect_backend;  # Changed from localhost:3000
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

    # Health check (use app1 as primary)
    location /api/health {
        proxy_pass http://127.0.0.1:3001/api/health;
        access_log off;
    }

    # ... rest of existing configuration (SSL, static files) ...
}
```

**Commands**:
```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Backup current config
sudo cp /etc/nginx/sites-available/connectplt.kr /etc/nginx/sites-available/connectplt.kr.backup

# Edit config (we'll do this together)
sudo nano /etc/nginx/sites-available/connectplt.kr

# Test config
sudo nginx -t

# Reload Nginx (only if test passes)
sudo systemctl reload nginx
```

---

### **Phase 2: Deploy Project Files** (20 minutes)

#### **Task 2.1: Create Project Directory on Server** (2 min)

```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Create directory
sudo mkdir -p /opt/connect
sudo chown user:user /opt/connect

# Create subdirectories
mkdir -p /opt/connect/{logs,uploads,backups,data,config}
mkdir -p /opt/connect/logs/{app1,app2,postgres,scraper}

# Verify
ls -la /opt/connect
```

#### **Task 2.2: Copy Project Files from MacBook** (10 min)

**From your MacBook** (`/Users/paulkim/Downloads/connect`):

```bash
# Method A: Using rsync (recommended - excludes unnecessary files)
rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='logs' \
  --exclude='uploads' \
  --exclude='backups' \
  --exclude='data' \
  --exclude='.env.local' \
  --exclude='.env' \
  /Users/paulkim/Downloads/connect/ \
  user@221.164.102.253:/opt/connect/

# Method B: Using sshpass + rsync
sshpass -p 'iw237877^^' rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  /Users/paulkim/Downloads/connect/ \
  user@221.164.102.253:/opt/connect/
```

**Verify files copied**:
```bash
sshpass -p 'iw237877^^' ssh user@221.164.102.253 'ls -la /opt/connect'
sshpass -p 'iw237877^^' ssh user@221.164.102.253 'ls -la /opt/connect/scripts'
```

#### **Task 2.3: Create Production Environment File** (8 min)

**Generate secure secrets** (on MacBook):
```bash
# DB Password
openssl rand -base64 32

# JWT Secret
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32

# Encryption Key (64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Grafana Password
openssl rand -base64 16
```

**Create `.env.production` on server**:
```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Navigate to project
cd /opt/connect

# Copy example file
cp .env.production.example .env.production

# Edit with generated secrets
nano .env.production
```

**Critical values to fill in**:
```bash
# Database
DB_PASSWORD=<generated_password>

# Auth
JWT_SECRET=<generated_jwt_secret>
NEXTAUTH_SECRET=<generated_nextauth_secret>
NEXTAUTH_URL=https://connectplt.kr

# Encryption (PIPA compliance)
ENCRYPTION_KEY=<generated_64_hex_chars>
ENCRYPTION_KEY_CREATED=2025-10-11
ENCRYPTION_KEY_NEXT_ROTATION=2026-01-11

# OAuth (if you have keys, otherwise comment out)
# KAKAO_CLIENT_ID=your_kakao_id
# KAKAO_CLIENT_SECRET=your_kakao_secret
# NAVER_CLIENT_ID=your_naver_id
# NAVER_CLIENT_SECRET=your_naver_secret

# Grafana
GRAFANA_PASSWORD=<generated_grafana_password>

# App URL
NEXT_PUBLIC_APP_URL=https://connectplt.kr
```

---

### **Phase 3: Docker Deployment** (20-25 minutes)

#### **Task 3.1: Build Docker Images** (10 min)

```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Navigate to project
cd /opt/connect

# Build images (this will take time)
docker compose -f docker-compose.production.yml build --no-cache

# Verify images built
docker images | grep connect
```

**Expected images**:
- `connect-app1`
- `connect-app2`
- `connect-scraper`

#### **Task 3.2: Start Database Services First** (5 min)

```bash
# Start PostgreSQL and Redis first
docker compose -f docker-compose.production.yml up -d postgres redis-cache redis-queue

# Wait 30 seconds for services to start
sleep 30

# Check services
docker compose -f docker-compose.production.yml ps

# Verify PostgreSQL is healthy
docker compose -f docker-compose.production.yml exec postgres pg_isready -U connect

# Verify Redis
docker compose -f docker-compose.production.yml exec redis-cache redis-cli ping
docker compose -f docker-compose.production.yml exec redis-queue redis-cli ping
```

#### **Task 3.3: Run Database Migrations** (5 min)

```bash
# Generate Prisma Client
docker compose -f docker-compose.production.yml run --rm app1 npx prisma generate

# Push database schema (first time setup)
docker compose -f docker-compose.production.yml run --rm app1 npx prisma db push

# Verify database
docker compose -f docker-compose.production.yml exec postgres \
  psql -U connect -d connect -c "\dt"
```

#### **Task 3.4: Start Application Services** (5 min)

```bash
# Start PgBouncer
docker compose -f docker-compose.production.yml up -d pgbouncer

# Wait 10 seconds
sleep 10

# Start application instances
docker compose -f docker-compose.production.yml up -d app1 app2

# Wait 30 seconds for apps to start
sleep 30

# Check all services
docker compose -f docker-compose.production.yml ps
```

**Expected output**:
```
NAME                  STATUS              PORTS
connect_app1          Up (healthy)        3001/tcp
connect_app2          Up (healthy)        3002/tcp
connect_pgbouncer     Up                  6432/tcp
connect_postgres      Up (healthy)        5432/tcp
connect_redis_cache   Up (healthy)        6379/tcp
connect_redis_queue   Up (healthy)        6380/tcp
```

#### **Task 3.5: Start Background Services** (2 min)

```bash
# Start scraper and Grafana
docker compose -f docker-compose.production.yml up -d scraper grafana

# Check final status
docker compose -f docker-compose.production.yml ps
```

---

### **Phase 4: Verification** (10 minutes)

#### **Task 4.1: Check Docker Container Health** (3 min)

```bash
# SSH to server
sshpass -p 'iw237877^^' ssh user@221.164.102.253

# Check all containers
docker compose -f /opt/connect/docker-compose.production.yml ps

# Check logs for app1
docker compose -f /opt/connect/docker-compose.production.yml logs --tail=50 app1

# Check logs for app2
docker compose -f /opt/connect/docker-compose.production.yml logs --tail=50 app2

# Test health endpoint directly
docker exec connect_app1 wget --quiet --tries=1 --spider http://localhost:3001/api/health
docker exec connect_app2 wget --quiet --tries=1 --spider http://localhost:3002/api/health
```

#### **Task 4.2: Test System Nginx Proxying** (2 min)

```bash
# From server
curl -I http://localhost:3001/api/health  # Should return 200
curl -I http://localhost:3002/api/health  # Should return 200

# Test through system Nginx
curl -I http://localhost/api/health       # Should return 200
```

#### **Task 4.3: Verify HTTPS in Browser** (5 min)

**From MacBook browser**:
1. Open: https://connectplt.kr
   - ✅ Should show: Green padlock
   - ✅ Should load: Next.js application

2. Open: http://connectplt.kr
   - ✅ Should: Redirect to https://connectplt.kr

3. Check certificate:
   - Click padlock → Certificate
   - Issuer: Let's Encrypt
   - Expires: January 8, 2026

**From MacBook terminal**:
```bash
# Test HTTPS
curl -I https://connectplt.kr
# Should return: HTTP/2 200

# Test API
curl https://connectplt.kr/api/health
# Should return: {"status":"ok"}

# Test redirect
curl -I http://connectplt.kr
# Should return: HTTP/1.1 301 Moved Permanently
# Location: https://connectplt.kr/
```

---

## 📊 Deployment Checklist

Use this checklist to track progress:

### **Phase 1: Cleanup & Preparation**
- [ ] User confirmed aqua_labs can be removed
- [ ] aqua_labs containers stopped and removed
- [ ] Port 3000 is free (verified with `lsof -i :3000`)
- [ ] docker-compose.production.yml modified (Docker Nginx removed)
- [ ] System Nginx config updated with upstream load balancing
- [ ] Nginx config tested (`sudo nginx -t`)
- [ ] Nginx reloaded successfully

### **Phase 2: Deploy Project Files**
- [ ] /opt/connect directory created with correct permissions
- [ ] Project files copied from MacBook to server
- [ ] Files verified on server (package.json, docker-compose.yml exist)
- [ ] Secure secrets generated (DB password, JWT, encryption key)
- [ ] .env.production created with all required values
- [ ] Environment file verified (no placeholder values)

### **Phase 3: Docker Deployment**
- [ ] Docker images built successfully (app1, app2, scraper)
- [ ] PostgreSQL started and healthy
- [ ] Redis cache and queue started and healthy
- [ ] Database migrations applied (prisma db push)
- [ ] Database tables created (verified with \dt)
- [ ] PgBouncer started
- [ ] App1 container running and healthy
- [ ] App2 container running and healthy
- [ ] Scraper and Grafana started

### **Phase 4: Verification**
- [ ] All Docker containers running (docker compose ps)
- [ ] App1 health check passing (port 3001)
- [ ] App2 health check passing (port 3002)
- [ ] System Nginx proxying working (localhost/api/health)
- [ ] HTTPS working with green padlock (browser)
- [ ] HTTP redirects to HTTPS
- [ ] API endpoints responding correctly
- [ ] No errors in container logs

---

## 🚨 Troubleshooting Reference

### **Problem: Docker containers won't start**

**Check logs**:
```bash
docker compose -f /opt/connect/docker-compose.production.yml logs app1
docker compose -f /opt/connect/docker-compose.production.yml logs app2
```

**Common issues**:
- Missing environment variables → Check .env.production
- Database connection failed → Check PostgreSQL is running
- Port already in use → Check aqua_labs containers removed

### **Problem: Nginx 502 Bad Gateway**

**Diagnose**:
```bash
# Check if apps are running
docker ps | grep connect_app

# Test apps directly
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health

# Check Nginx error logs
sudo tail -n 50 /var/log/nginx/error.log
```

**Common causes**:
- Apps not started yet (wait 30-60 seconds)
- Incorrect upstream configuration
- Apps crashed (check Docker logs)

### **Problem: Database migration failed**

**Check**:
```bash
# Test database connection
docker compose -f /opt/connect/docker-compose.production.yml exec postgres \
  psql -U connect -d connect -c "SELECT 1"

# Check Prisma schema
docker compose -f /opt/connect/docker-compose.production.yml run --rm app1 \
  npx prisma validate
```

**Fix**:
- Verify DATABASE_URL in .env.production
- Ensure PostgreSQL is running and healthy
- Check firewall rules (if any)

### **Problem: Can't access from browser**

**Check**:
```bash
# Is Nginx running?
sudo systemctl status nginx

# Are Docker apps running?
docker ps | grep connect_app

# Test from server itself
curl -I http://localhost/api/health
```

**DNS Check**:
```bash
# Verify DNS resolution (from MacBook)
dig connectplt.kr
nslookup connectplt.kr

# Should point to: 221.164.102.253
```

---

## 📝 Session Status

**Session 6 End Status**:
- Overall Progress: 62% (unchanged - deployment not started)
- Beta Week 1 Day 2: 57% (HTTPS infrastructure ready, application pending)
- Days to Launch: 82 days (January 1, 2026)

**Session 7 Goals**:
- Complete Docker deployment (Phases 1-4)
- Verify HTTPS working with green padlock
- Update progress: 62% → 64%
- Create completion report

**Estimated Time for Session 7**: 60-75 minutes total
- Phase 1: 15 min
- Phase 2: 20 min
- Phase 3: 20-25 min
- Phase 4: 10 min
- Documentation: 10 min

---

## 🔗 Quick Reference

### **SSH Connection**
```bash
# Direct SSH
sshpass -p 'iw237877^^' ssh -o StrictHostKeyChecking=no user@221.164.102.253

# Execute remote command
sshpass -p 'iw237877^^' ssh user@221.164.102.253 '<command>'
```

### **Server Credentials**
- Host: 221.164.102.253
- User: user
- Password: iw237877^^
- Project Path: /opt/connect

### **Docker Commands**
```bash
# All commands run from /opt/connect
cd /opt/connect

# View status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f app1

# Restart service
docker compose -f docker-compose.production.yml restart app1

# Stop all
docker compose -f docker-compose.production.yml down

# Start all
docker compose -f docker-compose.production.yml up -d
```

### **Key Files on Server**
- Docker Compose: `/opt/connect/docker-compose.production.yml`
- Environment: `/opt/connect/.env.production`
- Nginx Config: `/etc/nginx/sites-available/connectplt.kr`
- SSL Certs: `/etc/letsencrypt/live/connectplt.kr/`

### **Key URLs**
- Production: https://connectplt.kr
- Health Check: https://connectplt.kr/api/health
- Grafana: http://221.164.102.253:3100

---

## 💬 What to Tell Me When Starting Session 7

When you start the new session, paste this prompt:

**"Deployment plan analysis complete. Ready to start Phase 1."**

Then I will:
1. Ask if you're ready to remove aqua_labs containers
2. Guide you through each phase step-by-step
3. Verify each step before moving to the next
4. Handle any errors that occur
5. Verify HTTPS working with green padlock
6. Create completion report

---

**Ready to deploy!** The infrastructure is prepared, the plan is clear, and all configuration files are reviewed. Session 7 will execute the deployment step by step. 🚀

**Days to Launch**: 82 days
**Current Progress**: 62% → Will be 64% after HTTPS verification
**Phase**: Beta Week 1 Day 2 - Docker Deployment
