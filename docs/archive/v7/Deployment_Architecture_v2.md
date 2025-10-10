# Connect Platform - Production Deployment Architecture v2.0

*Optimized Single-Server Deployment for i9-12900K Hardware*

---

## Executive Summary

This document provides comprehensive technical specifications for deploying Connect platform on a high-performance single server. The architecture is optimized for the i9-12900K (16-core) server with 128GB RAM, emphasizing performance, reliability, and operational simplicity.

**Key Design Principles:**
- Native services over containerization for maximum performance
- Atomic deployments with zero downtime
- Production-grade monitoring and alerting
- Comprehensive backup and disaster recovery

---

## 1. Hardware & System Specifications

### 1.1 Target Server Configuration

**Hardware Specifications:**
```
CPU: Intel i9-12900K
- 16 cores (8 P-cores + 8 E-cores)
- Base: 3.2 GHz, Boost: 5.2 GHz
- 30MB L3 Cache

Memory: 128GB DDR4
- High-speed modules (3200+ MHz)
- ECC recommended for production

Storage: 1TB NVMe SSD
- High-performance NVMe (3500+ MB/s read)
- Enterprise-grade for reliability

Network: Fixed IP with high-speed connection
- Minimum 1 Gbps upload/download
- Low latency connection (<20ms to major Korean ISPs)
```

**Operating System:**
```
Ubuntu 22.04.3 LTS (Jammy Jellyfish)
- Kernel: 5.15.0 or later
- 64-bit x86_64 architecture
- Minimal server installation
```

### 1.2 Performance Capacity Planning

**Expected Load Handling:**
- **Concurrent Users**: 10,000+
- **Database Records**: 100,000+ funding programs
- **API Requests**: 50,000+ per hour during peak
- **Data Processing**: 500+ agency scrapes per day
- **Storage Growth**: ~100GB annually

---

## 2. System Architecture Overview

### 2.1 Service Stack Layout

```
┌─────────────────────────────────────────────────────┐
│                Load Balancer                        │
│  Nginx (native systemd) - Port 80/443              │
│  ├── SSL termination (Let's Encrypt)               │
│  ├── Rate limiting & security headers              │
│  └── Unix socket connection to app layer           │
└─────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────┐
│            Application Layer                        │
│  PM2 Cluster Manager                               │
│  ├── 8-12 Node.js processes (cluster mode)         │
│  ├── Managed by systemd service                    │
│  ├── Auto-restart & load balancing                 │
│  └── Memory limit: 2-3GB per process               │
└─────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────┐
│          Connection Management                      │
│  PgBouncer (Transaction Pooling)                   │
│  ├── 500 client connections → 50 PG connections    │
│  ├── Transaction-level pooling                     │
│  └── Connection lifecycle management               │
└─────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────┐
│              Database Layer                         │
│  PostgreSQL 15 (native installation)               │
│  ├── Optimized for 128GB RAM + NVMe SSD           │
│  ├── Automated backups via pgBackRest             │
│  └── Performance monitoring & alerting             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Caching Layer                          │
│  Redis Cache (port 6379)     Redis Queue (6380)    │
│  ├── LRU eviction policy     ├── No eviction       │
│  ├── No persistence          ├── AOF persistence   │
│  └── 15GB memory limit       └── 4GB memory limit  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│         Monitoring & Operations                     │
│  Prometheus + Grafana + SystemD                    │
│  ├── System metrics (CPU, RAM, Disk, Network)      │
│  ├── Application metrics (response time, errors)   │
│  ├── Database metrics (connections, queries)       │
│  └── Custom business metrics (scraping, matches)   │
└─────────────────────────────────────────────────────┘
```

### 2.2 Directory Structure

```
/opt/connect/
├── current -> releases/2024-12-15T10-30-00/  # Symlink to active release
├── releases/                                  # Deployment history
│   ├── 2024-12-15T10-30-00/                 # Current active release
│   ├── 2024-12-14T15-20-00/                 # Previous release (rollback ready)
│   └── ...                                   # Keep 5 most recent
├── shared/                                    # Shared across releases
│   ├── config/
│   │   ├── .env.production
│   │   ├── ecosystem.config.js
│   │   └── nginx.conf
│   ├── logs/                                 # Application logs
│   ├── uploads/                              # User uploaded files
│   └── ssl/                                  # SSL certificates
├── backup/                                    # Database backups
├── scripts/                                   # Operational scripts
│   ├── deploy.sh
│   ├── rollback.sh
│   ├── health-check.sh
│   └── maintenance.sh
└── monitoring/                               # Monitoring configs
    ├── prometheus.yml
    ├── grafana-dashboards/
    └── alertmanager.yml
```

---

## 3. Detailed Service Configurations

### 3.1 PostgreSQL Configuration

**Installation & Setup:**
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-client-15 postgresql-contrib-15

# Create connect database and user
sudo -u postgres createuser connect
sudo -u postgres createdb connect --owner=connect
sudo -u postgres psql -c "ALTER USER connect WITH PASSWORD 'secure_password_here';"
```

**Optimized postgresql.conf:**
```conf
# /etc/postgresql/15/main/postgresql.conf

# Connection & Memory
max_connections = 200                    # PgBouncer handles multiplexing
shared_buffers = 24GB                   # 19% of total RAM (conservative)
effective_cache_size = 80GB             # 62% of total RAM
work_mem = 64MB                         # Safe per-operation limit
maintenance_work_mem = 2GB              # For VACUUM, INDEX operations

# Performance Tuning for NVMe SSD
random_page_cost = 1.1                  # NVMe performance characteristic
effective_io_concurrency = 256          # NVMe high concurrency capability
max_wal_size = 64GB                     # Large WAL for performance
checkpoint_timeout = 15min              # Longer checkpoint intervals
checkpoint_completion_target = 0.9      # Spread checkpoint I/O

# WAL & Reliability
wal_compression = on                     # Reduce I/O bandwidth
wal_level = replica                      # Enable point-in-time recovery
archive_mode = on                        # Enable WAL archiving
archive_command = 'pgbackrest archive-push %p'

# Query Performance
default_statistics_target = 100         # Better query planning
constraint_exclusion = partition        # Optimize partitioned tables

# Logging & Monitoring
log_statement = 'mod'                   # Log data modifications
log_min_duration_statement = 1000      # Log slow queries (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### 3.2 PgBouncer Configuration

**Installation:**
```bash
sudo apt install pgbouncer
```

**Configuration (/etc/pgbouncer/pgbouncer.ini):**
```ini
[databases]
connect = host=localhost port=5432 dbname=connect user=connect

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool configuration
pool_mode = transaction                  # Optimal for web applications
default_pool_size = 50                  # PostgreSQL connections per database
max_client_conn = 500                   # Total client connections
reserve_pool_size = 10                  # Emergency connections

# Connection lifecycle
server_lifetime = 3600                  # Rotate connections hourly
server_idle_timeout = 600               # Close idle server connections
client_idle_timeout = 0                 # No client timeout
query_timeout = 0                       # No query timeout

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

### 3.3 Redis Configuration

**Redis Cache Instance (port 6379):**
```conf
# /etc/redis/redis-cache.conf
bind 127.0.0.1
port 6379
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-cache.pid
logfile /var/log/redis/redis-cache.log

# Memory & Eviction
maxmemory 15gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Performance
tcp-keepalive 300
timeout 0
databases 1                              # Single database for simplicity

# Disable persistence for cache
save ""
appendonly no

# Security
requirepass cache_redis_password_here
```

**Redis Queue Instance (port 6380):**
```conf
# /etc/redis/redis-queue.conf
bind 127.0.0.1
port 6380
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-queue.pid
logfile /var/log/redis/redis-queue.log

# Memory (no eviction - preserve queue data)
maxmemory 4gb
maxmemory-policy noeviction

# Persistence for queue reliability
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Performance
tcp-keepalive 300
timeout 0
databases 16                             # Multiple DBs for different queue types

# Security
requirepass queue_redis_password_here
```

### 3.4 PM2 Configuration

**Ecosystem Configuration (/opt/connect/ecosystem.config.js):**
```javascript
module.exports = {
  apps: [{
    name: 'connect',
    script: './server.js',
    instances: 'max',                    // Use all available CPU cores
    exec_mode: 'cluster',

    env: {
      NODE_ENV: 'production',
      PORT: 0,                          // Use Unix socket instead
      SOCKET_PATH: '/run/connect.sock',

      // Database connections
      DATABASE_URL: 'postgresql://connect:password@localhost:6432/connect',
      REDIS_CACHE_URL: 'redis://:cache_password@localhost:6379',
      REDIS_QUEUE_URL: 'redis://:queue_password@localhost:6380',

      // Application settings
      JWT_SECRET: 'your_jwt_secret_here',
      ENCRYPTION_KEY: 'your_encryption_key_here',

      // External service APIs
      KAKAO_CLIENT_ID: 'your_kakao_client_id',
      KAKAO_CLIENT_SECRET: 'your_kakao_client_secret',
      NAVER_CLIENT_ID: 'your_naver_client_id',
      NAVER_CLIENT_SECRET: 'your_naver_client_secret',
      TOSS_CLIENT_KEY: 'your_toss_client_key',
      TOSS_SECRET_KEY: 'your_toss_secret_key'
    },

    // Resource limits
    node_args: '--max-old-space-size=2048',  // 2GB per process
    max_memory_restart: '3G',                // Restart if memory exceeds 3GB

    // Logging
    out_file: '/opt/connect/shared/logs/out.log',
    error_file: '/opt/connect/shared/logs/error.log',
    merge_logs: true,
    time: true,

    // Process management
    kill_timeout: 10000,                     // 10s graceful shutdown
    wait_ready: true,                        // Wait for ready signal
    listen_timeout: 10000,                   // 10s startup timeout
    restart_delay: 1000,                     // 1s delay between restarts

    // Health monitoring
    min_uptime: '10s',                       // Minimum uptime before considering stable
    max_restarts: 10,                        // Max restarts within window
    autorestart: true
  }]
};
```

**SystemD Service (/etc/systemd/system/connect.service):**
```ini
[Unit]
Description=Connect Platform (PM2-managed Node.js cluster)
Documentation=https://pm2.keymetrics.io/
After=network.target postgresql.service redis-cache.service redis-queue.service
Wants=postgresql.service redis-cache.service redis-queue.service

[Service]
Type=forking
User=connect
Group=connect

# Environment
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=PM2_HOME=/home/connect/.pm2
EnvironmentFile=/opt/connect/shared/config/.env.production

# PM2 management
ExecStart=/usr/local/bin/pm2 resurrect
ExecReload=/usr/local/bin/pm2 reload ecosystem.config.js
ExecStop=/usr/local/bin/pm2 kill

# Process management
Restart=always
RestartSec=5
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=30

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/connect /run /tmp

# Resource limits
LimitNOFILE=65536
LimitNPROC=32768

[Install]
WantedBy=multi-user.target
```

### 3.5 Nginx Configuration

**Main Configuration (/etc/nginx/nginx.conf):**
```nginx
user www-data;
worker_processes auto;                   # Auto-detect CPU cores
pid /run/nginx.pid;

events {
    worker_connections 8192;             # High concurrency
    use epoll;                          # Linux-specific optimization
    multi_accept on;                    # Accept multiple connections
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_names_hash_bucket_size 128;

    # MIME types
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/javascript
        application/json
        application/xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;

    # Upstream configuration
    upstream connect_backend {
        server unix:/run/connect.sock;
        keepalive 64;
        keepalive_requests 100;
        keepalive_timeout 60s;
    }

    include /etc/nginx/sites-enabled/*;
}
```

**Site Configuration (/etc/nginx/sites-available/connect):**
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS production server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss:;" always;

    # Health check endpoint (no logging)
    location = /api/health {
        access_log off;
        proxy_pass http://connect_backend;
        proxy_set_header Connection "";
        proxy_http_version 1.1;
    }

    # API endpoints with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;

        proxy_pass http://connect_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Authentication endpoints with stricter rate limiting
    location ~ ^/api/(auth|login|register) {
        limit_req zone=login_limit burst=20 nodelay;

        proxy_pass http://connect_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static assets with aggressive caching
    location /_next/static/ {
        proxy_pass http://connect_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Cache-Status "STATIC";
    }

    # Uploaded files
    location /uploads/ {
        proxy_pass http://connect_backend;
        expires 30d;
        add_header Cache-Control "public";
    }

    # All other requests
    location / {
        proxy_pass http://connect_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Client request body size (for file uploads)
        client_max_body_size 100M;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 4. Backup & Recovery Strategy

### 4.1 PostgreSQL Backup with pgBackRest

**Installation:**
```bash
sudo apt install pgbackrest
```

**Configuration (/etc/pgbackrest/pgbackrest.conf):**
```ini
[global]
repo1-type=posix
repo1-path=/opt/connect/backup/pgbackrest
repo1-retention-full=7
repo1-retention-diff=4
repo1-retention-archive=7

log-level-console=info
log-level-file=debug
log-path=/var/log/pgbackrest

[connect]
pg1-path=/var/lib/postgresql/15/main
pg1-port=5432
pg1-socket-path=/var/run/postgresql
```

**Automated Backup Schedule:**
```bash
# /etc/cron.d/pgbackrest
# Full backup weekly on Sunday at 2 AM
0 2 * * 0 postgres pgbackrest backup --stanza=connect --type=full

# Differential backup daily at 2 AM (except Sunday)
0 2 * * 1-6 postgres pgbackrest backup --stanza=connect --type=diff

# Archive WAL files continuously (handled by PostgreSQL archive_command)
```

### 4.2 Application Backup Strategy

**File System Backup:**
```bash
#!/bin/bash
# /opt/connect/scripts/backup-system.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/connect/backup/system"

# Create backup directory
mkdir -p $BACKUP_DIR/$BACKUP_DATE

# Backup application releases (keep current + previous)
cp -r /opt/connect/releases $BACKUP_DIR/$BACKUP_DATE/

# Backup shared configuration
cp -r /opt/connect/shared/config $BACKUP_DIR/$BACKUP_DATE/

# Backup uploaded files
cp -r /opt/connect/shared/uploads $BACKUP_DIR/$BACKUP_DATE/

# Backup monitoring configurations
cp -r /opt/connect/monitoring $BACKUP_DIR/$BACKUP_DATE/

# Compress backup
cd $BACKUP_DIR
tar -czf connect_system_$BACKUP_DATE.tar.gz $BACKUP_DATE/
rm -rf $BACKUP_DATE/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "connect_system_*.tar.gz" -mtime +30 -delete

echo "System backup completed: connect_system_$BACKUP_DATE.tar.gz"
```

### 4.3 Disaster Recovery Procedures

**Database Recovery:**
```bash
#!/bin/bash
# Recovery from pgBackRest backup

# Stop all services
sudo systemctl stop connect nginx
sudo systemctl stop postgresql

# Restore database from latest backup
sudo -u postgres pgbackrest restore --stanza=connect --type=immediate

# Start PostgreSQL
sudo systemctl start postgresql

# Verify database integrity
sudo -u postgres psql connect -c "SELECT COUNT(*) FROM funding_programs;"

# Start application services
sudo systemctl start connect nginx
```

**Application Recovery:**
```bash
#!/bin/bash
# Emergency application recovery

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Stop application
sudo systemctl stop connect

# Extract backup
cd /opt/connect/backup/system
tar -xzf $BACKUP_FILE

# Restore configuration
cp -r $(basename $BACKUP_FILE .tar.gz)/config/* /opt/connect/shared/config/

# Restore releases
cp -r $(basename $BACKUP_FILE .tar.gz)/releases/* /opt/connect/releases/

# Update current symlink to latest working release
cd /opt/connect
LATEST_RELEASE=$(ls -t releases/ | head -n1)
ln -sfn releases/$LATEST_RELEASE current

# Start application
sudo systemctl start connect

echo "Application restored from backup: $BACKUP_FILE"
```

---

## 5. Monitoring & Alerting

### 5.1 Prometheus Configuration

**Installation:**
```bash
# Create prometheus user
sudo useradd --system --shell /bin/false prometheus

# Download and install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.40.0/prometheus-2.40.0.linux-amd64.tar.gz
tar -xzf prometheus-2.40.0.linux-amd64.tar.gz
sudo mv prometheus-2.40.0.linux-amd64/prometheus /usr/local/bin/
sudo mv prometheus-2.40.0.linux-amd64/promtool /usr/local/bin/

# Create directories
sudo mkdir -p /etc/prometheus /var/lib/prometheus
sudo chown prometheus:prometheus /etc/prometheus /var/lib/prometheus
```

**Configuration (/etc/prometheus/prometheus.yml):**
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - localhost:9093

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # System metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  # PostgreSQL metrics
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

  # Redis metrics
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']

  # Nginx metrics
  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['localhost:9113']

  # Application metrics
  - job_name: 'connect-app'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/api/metrics'
```

**Alert Rules (/etc/prometheus/rules/connect.yml):**
```yaml
groups:
  - name: connect.rules
    rules:
      # High-priority alerts
      - alert: DatabaseDown
        expr: up{job="postgres-exporter"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL database is down"
          description: "PostgreSQL database has been down for more than 30 seconds"

      - alert: ApplicationDown
        expr: up{job="connect-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Connect application is down"
          description: "Connect application has been unreachable for more than 1 minute"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 90
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for more than 5 minutes"

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High disk usage detected"
          description: "Disk usage is above 85% for more than 5 minutes"

      # Application-specific alerts
      - alert: HighAPILatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="connect-app"}[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "95th percentile API latency is above 1 second for more than 5 minutes"

      - alert: ScrapingFailure
        expr: increase(scraping_failures_total[1h]) > 10
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "High scraping failure rate"
          description: "More than 10 scraping failures in the last hour"
```

### 5.2 Grafana Dashboard Setup

**Installation:**
```bash
# Install Grafana
sudo apt-get install -y software-properties-common
sudo add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add -
sudo apt-get update
sudo apt-get install grafana

# Enable and start
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

**Key Dashboard Panels:**
1. **System Overview**: CPU, Memory, Disk, Network usage
2. **Database Health**: Connection count, query performance, cache hit ratio
3. **Application Metrics**: Request rate, response time, error rate
4. **Business Metrics**: User registrations, funding matches, scraping success
5. **Security Monitoring**: Failed login attempts, rate limit hits

---

## 6. Security Hardening

### 6.1 System Security

**SSH Hardening (/etc/ssh/sshd_config):**
```conf
# Basic security
Port 22
Protocol 2
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
AllowUsers connect

# Connection limits
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60

# Disable unused features
PermitEmptyPasswords no
PermitUserEnvironment no
AllowAgentForwarding no
AllowTcpForwarding no
X11Forwarding no
```

**Firewall Configuration (UFW):**
```bash
# Reset firewall
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential services
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Deny database ports (local only)
sudo ufw deny 5432/tcp   # PostgreSQL
sudo ufw deny 6379/tcp   # Redis Cache
sudo ufw deny 6380/tcp   # Redis Queue
sudo ufw deny 6432/tcp   # PgBouncer

# Enable firewall
sudo ufw enable
```

**fail2ban Configuration (/etc/fail2ban/jail.local):**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 7200
maxretry = 10

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
```

### 6.2 Application Security

**Environment Variables Security:**
```bash
# /opt/connect/shared/config/.env.production
# Permissions: 600 (owner read/write only)

NODE_ENV=production

# Database
DATABASE_URL=postgresql://connect:secure_db_password@localhost:6432/connect

# Redis
REDIS_CACHE_URL=redis://:secure_cache_password@localhost:6379
REDIS_QUEUE_URL=redis://:secure_queue_password@localhost:6380

# Application secrets
JWT_SECRET=your_very_long_jwt_secret_here_64_chars_minimum
ENCRYPTION_KEY=your_32_char_encryption_key_here

# External APIs (production keys)
KAKAO_CLIENT_ID=your_production_kakao_client_id
KAKAO_CLIENT_SECRET=your_production_kakao_client_secret
NAVER_CLIENT_ID=your_production_naver_client_id
NAVER_CLIENT_SECRET=your_production_naver_client_secret
TOSS_CLIENT_KEY=your_production_toss_client_key
TOSS_SECRET_KEY=your_production_toss_secret_key

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

---

## 7. Operational Procedures

### 7.1 Deployment Workflow

**Pre-deployment Checklist:**
```bash
#!/bin/bash
# pre-deployment-check.sh

echo "🔍 Pre-deployment verification..."

# 1. Test connectivity to server
ssh connect@$SERVER_IP "echo 'SSH connection successful'" || exit 1

# 2. Check server resources
ssh connect@$SERVER_IP "df -h && free -h && uptime"

# 3. Verify services are running
ssh connect@$SERVER_IP "systemctl is-active postgresql redis-cache redis-queue nginx"

# 4. Check disk space
DISK_USAGE=$(ssh connect@$SERVER_IP "df / | tail -1 | awk '{print \$5}' | sed 's/%//'")
if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️  Warning: Disk usage is $DISK_USAGE%"
    exit 1
fi

# 5. Verify backup integrity
ssh connect@$SERVER_IP "pgbackrest info --stanza=connect"

echo "✅ Pre-deployment checks passed"
```

**Deployment Script:**
```bash
#!/bin/bash
# deploy.sh - Production deployment with safety checks

set -euo pipefail

# Configuration
SERVER_IP="${SERVER_IP:-your.server.ip}"
SERVER_USER="${SERVER_USER:-connect}"
DEPLOY_TIMEOUT="${DEPLOY_TIMEOUT:-300}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
log "Starting Connect deployment..."
./scripts/pre-deployment-check.sh || error "Pre-deployment checks failed"

# Build application
log "Building application for production..."
npm run test || error "Tests failed"
npm run lint || error "Linting failed"
npm run type-check || error "Type checking failed"
npm run build || error "Build failed"

# Create deployment package
log "Creating deployment package..."
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
PACKAGE_NAME="connect-${TIMESTAMP}.tar.gz"

tar -czf $PACKAGE_NAME \
    .next \
    public \
    package.json \
    package-lock.json \
    prisma \
    server.js \
    ecosystem.config.js \
    --exclude=node_modules

# Upload to server
log "Uploading to server..."
scp $PACKAGE_NAME $SERVER_USER@$SERVER_IP:/tmp/

# Deploy on server
log "Deploying on server..."
ssh $SERVER_USER@$SERVER_IP bash -s << 'DEPLOY_SCRIPT'
set -euo pipefail

BASE="/opt/connect"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE_DIR="$BASE/releases/$TIMESTAMP"

# Create release directory
mkdir -p $RELEASE_DIR
cd $RELEASE_DIR

# Extract package
tar -xzf /tmp/connect-*.tar.gz
rm /tmp/connect-*.tar.gz

# Install dependencies for correct architecture
npm ci --production --no-audit

# Database migrations
DATABASE_URL="postgresql://connect@localhost:6432/connect" \
    npx prisma migrate deploy

# Health check before switching
echo "Performing health check..."
PORT=3001 pm2 start ecosystem.config.js --name health-check
sleep 15

# Health check
if ! curl -f http://localhost:3001/api/health; then
    pm2 delete health-check
    echo "Health check failed, aborting deployment"
    exit 1
fi

pm2 delete health-check

# Atomic switch
echo "Switching to new version..."
ln -sfn $RELEASE_DIR $BASE/current

# Reload application
pm2 reload ecosystem.config.js

# Wait for reload to complete
sleep 10

# Final health check
if ! curl -f http://localhost/api/health; then
    echo "Final health check failed, initiating rollback..."
    # Rollback logic would go here
    exit 1
fi

# Cleanup old releases (keep 5)
cd $BASE/releases
ls -t | tail -n +6 | xargs -r rm -rf

echo "Deployment completed successfully"
DEPLOY_SCRIPT

# Cleanup local package
rm $PACKAGE_NAME

log "🎉 Deployment completed successfully!"
log "🔍 Running post-deployment verification..."

# Post-deployment verification
sleep 30
curl -f http://$SERVER_IP/api/health || warn "Health check failed after deployment"

log "✅ Connect deployed and verified"
```

### 7.2 Monitoring & Maintenance

**Health Check Script:**
```bash
#!/bin/bash
# health-check.sh - Comprehensive system health verification

echo "🏥 Connect Platform Health Check"
echo "================================"

# System resources
echo "📊 System Resources:"
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
echo "Load: $(uptime | awk -F'load average:' '{print $2}')"
echo

# Service status
echo "🔧 Service Status:"
services=("postgresql" "redis-cache" "redis-queue" "nginx" "connect")
for service in "${services[@]}"; do
    if systemctl is-active --quiet $service; then
        echo "✅ $service: Running"
    else
        echo "❌ $service: Not running"
    fi
done
echo

# Database health
echo "🗄️  Database Health:"
PG_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;")
echo "PostgreSQL connections: $PG_CONNECTIONS"

PG_UPTIME=$(sudo -u postgres psql -t -c "SELECT date_trunc('second', now() - pg_postmaster_start_time());")
echo "PostgreSQL uptime: $PG_UPTIME"
echo

# Redis health
echo "📦 Redis Health:"
REDIS_CACHE_MEMORY=$(redis-cli -p 6379 INFO memory | grep used_memory_human | cut -d: -f2)
REDIS_QUEUE_MEMORY=$(redis-cli -p 6380 INFO memory | grep used_memory_human | cut -d: -f2)
echo "Cache Redis memory: $REDIS_CACHE_MEMORY"
echo "Queue Redis memory: $REDIS_QUEUE_MEMORY"
echo

# Application health
echo "🚀 Application Health:"
PM2_STATUS=$(pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status)"')
echo "$PM2_STATUS"
echo

# API health check
echo "🌐 API Health:"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health)
if [ "$API_RESPONSE" = "200" ]; then
    echo "✅ API responding normally"
else
    echo "❌ API not responding (HTTP $API_RESPONSE)"
fi
echo

# Log file sizes
echo "📝 Log File Sizes:"
find /opt/connect/shared/logs -name "*.log" -exec du -h {} \; 2>/dev/null
echo

# Recent errors
echo "🚨 Recent Errors (last 1 hour):"
ERROR_COUNT=$(journalctl --since "1 hour ago" --priority=err --no-pager | wc -l)
echo "System errors: $ERROR_COUNT"

APP_ERRORS=$(tail -100 /opt/connect/shared/logs/error.log | grep "$(date '+%Y-%m-%d %H')" | wc -l 2>/dev/null || echo "0")
echo "Application errors: $APP_ERRORS"

echo
echo "Health check completed: $(date)"
```

**Maintenance Script:**
```bash
#!/bin/bash
# maintenance.sh - Regular maintenance tasks

echo "🔧 Starting Connect platform maintenance..."

# 1. Log rotation and cleanup
echo "📝 Rotating logs..."
logrotate -f /etc/logrotate.d/connect

# 2. Database maintenance
echo "🗄️  Database maintenance..."
sudo -u postgres psql connect -c "VACUUM ANALYZE;"

# 3. Clear temporary files
echo "🗑️  Cleaning temporary files..."
find /tmp -name "connect-*" -mtime +1 -delete
find /opt/connect/shared/uploads -name "*.tmp" -mtime +1 -delete

# 4. Redis cleanup
echo "📦 Redis maintenance..."
redis-cli -p 6379 FLUSHEXPIRED >/dev/null 2>&1 || true

# 5. Check SSL certificate expiry
echo "🔒 Checking SSL certificate..."
SSL_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/*/cert.pem | cut -d= -f2)
SSL_EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (SSL_EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "⚠️  SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
fi

# 6. Update system packages (security only)
echo "🔄 Updating security packages..."
apt list --upgradable 2>/dev/null | grep -i security | wc -l

# 7. Backup verification
echo "💾 Verifying recent backups..."
LAST_BACKUP=$(pgbackrest info --stanza=connect --output=json | jq -r '.[] | .backup[] | select(.type=="full") | .timestamp.stop' | tail -1)
echo "Last full backup: $LAST_BACKUP"

echo "✅ Maintenance completed: $(date)"
```

---

## 8. Troubleshooting Guide

### 8.1 Common Issues and Solutions

**Issue: High Memory Usage**
```bash
# Check memory usage by service
sudo systemctl status postgresql redis-cache redis-queue connect

# Check PostgreSQL connections
sudo -u postgres psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Check PM2 processes
pm2 monit

# Solution: Adjust PostgreSQL work_mem or PM2 instance limits
```

**Issue: Slow Database Queries**
```bash
# Enable slow query logging
sudo -u postgres psql -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
sudo systemctl reload postgresql

# Check slow queries
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Solution: Add indexes, optimize queries, or increase work_mem
```

**Issue: Deployment Failures**
```bash
# Check deployment logs
journalctl -u connect -f

# Check PM2 logs
pm2 logs connect

# Check disk space
df -h

# Solution: Fix disk space, check permissions, or rollback deployment
```

### 8.2 Emergency Procedures

**Emergency Rollback:**
```bash
#!/bin/bash
# emergency-rollback.sh

PREVIOUS_RELEASE=$(ls -t /opt/connect/releases | head -n2 | tail -n1)

if [ -z "$PREVIOUS_RELEASE" ]; then
    echo "No previous release found"
    exit 1
fi

echo "Rolling back to: $PREVIOUS_RELEASE"

# Stop application
pm2 stop ecosystem.config.js

# Switch to previous release
ln -sfn /opt/connect/releases/$PREVIOUS_RELEASE /opt/connect/current

# Start application
pm2 start ecosystem.config.js

echo "Rollback completed"
```

**Service Recovery:**
```bash
#!/bin/bash
# service-recovery.sh

SERVICE=$1

case $SERVICE in
    postgresql)
        sudo systemctl restart postgresql
        sleep 10
        sudo -u postgres psql -c "SELECT 1;" || echo "PostgreSQL recovery failed"
        ;;
    redis)
        sudo systemctl restart redis-cache redis-queue
        sleep 5
        redis-cli ping || echo "Redis recovery failed"
        ;;
    nginx)
        sudo nginx -t && sudo systemctl restart nginx || echo "Nginx config error"
        ;;
    connect)
        pm2 restart ecosystem.config.js
        sleep 10
        curl -f http://localhost/api/health || echo "Application recovery failed"
        ;;
    *)
        echo "Usage: $0 {postgresql|redis|nginx|connect}"
        ;;
esac
```

---

## Conclusion

This deployment architecture provides a production-ready, high-performance foundation for the Connect platform. The single-server design maximizes the capabilities of the i9-12900K hardware while maintaining operational simplicity and reliability.

**Key Benefits:**
- **Performance**: Native services optimize hardware utilization
- **Reliability**: Comprehensive monitoring and automated backups
- **Security**: Multi-layered security hardening
- **Maintainability**: Clear operational procedures and troubleshooting guides
- **Scalability**: Architecture can handle 10,000+ concurrent users

The architecture is ready for immediate implementation and December 2024 production launch.

---

**Document Version**: 2.0
**Last Updated**: 2025-09-28
**Next Review**: 2025-01-15