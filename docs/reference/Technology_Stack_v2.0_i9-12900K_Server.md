# CONNECT Technology Stack v2.0 - Optimized for i9-12900K Server

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Internet (KT Fiber)                    │
│                  164 Mbps Up / 325 Mbps Down            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Cloudflare (Free Tier)                      │
│         DDoS Protection + CDN + DNS + Analytics         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Your Static IP (KT Business)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  i9-12900K Server                        │
│                    128GB RAM                             │
│                    1TB NVMe SSD                          │
├──────────────────────────────────────────────────────────┤
│  Docker Containers:                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Nginx (Port 80/443) - 2 CPU, 2GB RAM           │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │ App Instance 1 (Port 3001) - 4 CPU, 12GB RAM   │    │
│  │ App Instance 2 (Port 3002) - 4 CPU, 12GB RAM   │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │ PgBouncer (Port 6432) - 1 CPU, 1GB RAM         │    │
│  └─────────────────┬───────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼───────────────────────────────┐    │
│  │ PostgreSQL 15 (Port 5432) - 6 CPU, 40GB RAM    │    │
│  │ Redis Cache (Port 6379) - 2 CPU, 16GB RAM      │    │
│  │ Redis Queue (Port 6380) - 1 CPU, 4GB RAM       │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Monitoring Stack - 1 CPU, 4GB RAM               │    │
│  │ (Prometheus + Grafana + Uptime Kuma)            │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

## Server Specifications

- **CPU**: Intel Core i9-12900K (16 cores, 24 threads)
- **RAM**: 128GB DDR4
- **Storage**: 1TB NVMe SSD
- **Network**: KT Fiber (164 Mbps upload / 325 Mbps download)
- **OS**: Linux (Ubuntu/Debian recommended)

## Capacity Specifications

- **Concurrent Users**: 800-1,500
- **Daily Active Users**: 8,000-15,000
- **Monthly Active Users**: 50,000-100,000
- **Requests per Second**: 500-1,000
- **Database Connections**: 300 max
- **Response Time**: P95 < 1s, P99 < 2s

## Complete Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

networks:
  connect_net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
  redis_cache_data:
  redis_queue_data:
  nginx_cache:
  prometheus_data:
  grafana_data:
  backup_data:

services:
  # Load Balancer / Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: connect_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./config/nginx/ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
      - ./static:/usr/share/nginx/static:ro
    networks:
      connect_net:
        ipv4_address: 172.20.0.10
    mem_limit: 2g
    cpus: 2
    depends_on:
      - app1
      - app2
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Application Instance 1
  app1:
    build: 
      context: .
      dockerfile: Dockerfile.production
    container_name: connect_app1
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3001
      INSTANCE_ID: 1
      DATABASE_URL: postgresql://connect:${DB_PASSWORD}@pgbouncer:6432/connect?schema=public
      REDIS_CACHE_URL: redis://redis-cache:6379
      REDIS_QUEUE_URL: redis://redis-queue:6380
      JWT_SECRET: ${JWT_SECRET}
      TOSS_PAYMENTS_KEY: ${TOSS_PAYMENTS_KEY}
    volumes:
      - ./uploads:/app/uploads
    networks:
      connect_net:
        ipv4_address: 172.20.0.21
    mem_limit: 12g
    cpus: 4
    depends_on:
      - pgbouncer
      - redis-cache
      - redis-queue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Application Instance 2
  app2:
    build: 
      context: .
      dockerfile: Dockerfile.production
    container_name: connect_app2
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3002
      INSTANCE_ID: 2
      DATABASE_URL: postgresql://connect:${DB_PASSWORD}@pgbouncer:6432/connect?schema=public
      REDIS_CACHE_URL: redis://redis-cache:6379
      REDIS_QUEUE_URL: redis://redis-queue:6380
      JWT_SECRET: ${JWT_SECRET}
      TOSS_PAYMENTS_KEY: ${TOSS_PAYMENTS_KEY}
    volumes:
      - ./uploads:/app/uploads
    networks:
      connect_net:
        ipv4_address: 172.20.0.22
    mem_limit: 12g
    cpus: 4
    depends_on:
      - pgbouncer
      - redis-cache
      - redis-queue
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Database Connection Pooler
  pgbouncer:
    image: edoburu/pgbouncer:latest
    container_name: connect_pgbouncer
    restart: always
    environment:
      DATABASES_HOST: postgres
      DATABASES_PORT: 5432
      DATABASES_DBNAME: connect
      DATABASES_USER: connect
      DATABASES_PASSWORD: ${DB_PASSWORD}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 25
      RESERVE_POOL_SIZE: 5
      RESERVE_POOL_TIMEOUT: 3
      LOG_CONNECTIONS: 0
      LOG_DISCONNECTIONS: 0
    networks:
      connect_net:
        ipv4_address: 172.20.0.30
    mem_limit: 1g
    cpus: 1
    depends_on:
      - postgres

  # Primary Database
  postgres:
    image: postgres:15-alpine
    container_name: connect_postgres
    restart: always
    environment:
      POSTGRES_DB: connect
      POSTGRES_USER: connect
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
      POSTGRES_HOST_AUTH_METHOD: md5
    command: >
      postgres
      -c max_connections=300
      -c shared_buffers=10GB
      -c effective_cache_size=30GB
      -c maintenance_work_mem=2GB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c work_mem=10MB
      -c min_wal_size=1GB
      -c max_wal_size=4GB
      -c max_worker_processes=16
      -c max_parallel_workers_per_gather=8
      -c max_parallel_workers=16
      -c max_parallel_maintenance_workers=4
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      connect_net:
        ipv4_address: 172.20.0.40
    mem_limit: 40g
    cpus: 6
    shm_size: 1g
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U connect"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Cache Layer
  redis-cache:
    image: redis:7-alpine
    container_name: connect_redis_cache
    restart: always
    command: >
      redis-server
      --maxmemory 15gb
      --maxmemory-policy allkeys-lru
      --save 60 1000
      --appendonly yes
      --appendfilename "cache.aof"
    volumes:
      - redis_cache_data:/data
    networks:
      connect_net:
        ipv4_address: 172.20.0.50
    mem_limit: 16g
    cpus: 2

  # Queue Layer
  redis-queue:
    image: redis:7-alpine
    container_name: connect_redis_queue
    restart: always
    command: >
      redis-server
      --maxmemory 4gb
      --maxmemory-policy noeviction
      --save 60 1000
      --appendonly yes
      --appendfilename "queue.aof"
    volumes:
      - redis_queue_data:/data
    networks:
      connect_net:
        ipv4_address: 172.20.0.51
    mem_limit: 4g
    cpus: 1

  # Background Worker
  worker:
    build: 
      context: .
      dockerfile: Dockerfile.production
    container_name: connect_worker
    restart: always
    command: node dist/worker.js
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://connect:${DB_PASSWORD}@pgbouncer:6432/connect?schema=public
      REDIS_QUEUE_URL: redis://redis-queue:6380
    networks:
      connect_net:
        ipv4_address: 172.20.0.60
    mem_limit: 8g
    cpus: 2
    depends_on:
      - pgbouncer
      - redis-queue

  # Monitoring - Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: connect_prometheus
    restart: always
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    volumes:
      - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      connect_net:
        ipv4_address: 172.20.0.70
    mem_limit: 2g
    cpus: 0.5

  # Monitoring - Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: connect_grafana
    restart: always
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
      GF_INSTALL_PLUGINS: redis-datasource
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    networks:
      connect_net:
        ipv4_address: 172.20.0.71
    mem_limit: 1g
    cpus: 0.5
    depends_on:
      - prometheus

  # Uptime Monitor
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: connect_uptime
    restart: always
    volumes:
      - ./data/uptime-kuma:/app/data
    networks:
      connect_net:
        ipv4_address: 172.20.0.72
    mem_limit: 1g
    cpus: 0.5

  # Backup Service
  backup:
    image: postgres:15-alpine
    container_name: connect_backup
    restart: always
    environment:
      PGPASSWORD: ${DB_PASSWORD}
    volumes:
      - backup_data:/backup
      - ./scripts/backup.sh:/backup.sh:ro
    entrypoint: ["/bin/sh", "-c", "while true; do /backup.sh; sleep 86400; done"]
    networks:
      connect_net:
        ipv4_address: 172.20.0.80
    mem_limit: 2g
    cpus: 1
    depends_on:
      - postgres

  # Cloudflare Tunnel (Standby - not normally running)
  # Uncomment during failover scenarios
  # cloudflared:
  #   image: cloudflare/cloudflared:latest
  #   container_name: connect_tunnel
  #   restart: always
  #   command: tunnel run
  #   volumes:
  #     - ./config/cloudflared:/etc/cloudflared:ro
  #   networks:
  #     connect_net:
  #       ipv4_address: 172.20.0.90
```

## Deployment Scripts

### Main Deployment Script

```bash
#!/bin/bash
# deploy.sh - Main deployment script

# Load environment variables
source .env

# Pre-deployment health check
echo "Checking system resources..."
free -h
df -h
docker ps

# Build and deploy
echo "Building application..."
docker-compose build --parallel

echo "Starting services..."
docker-compose up -d

# Wait for services
echo "Waiting for services to be healthy..."
sleep 30

# Run migrations
echo "Running database migrations..."
docker exec connect_app1 npm run migrate

# Health check
echo "Performing health checks..."
curl -f http://localhost/api/health || exit 1

echo "Deployment complete!"
```

### Emergency Failover Script

```bash
#!/bin/bash
# failover.sh - Emergency failover script

# Step 1: Start cloud instance (AWS/GCP)
echo "Starting cloud backup instance..."
# aws ec2 start-instances --instance-ids i-xxxxx

# Step 2: Sync latest backup
echo "Syncing latest backup to cloud..."
rsync -avz ./backup/ cloud-server:/backup/

# Step 3: Start Cloudflare tunnel
echo "Activating Cloudflare tunnel..."
docker-compose up -d cloudflared

# Step 4: Update DNS
echo "Update DNS in Cloudflare dashboard manually"
echo "Failover complete - system accessible via Cloudflare tunnel"
```

### Backup Script

```bash
#!/bin/bash
# backup.sh - Daily backup script

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="connect"

# Database backup
pg_dump -h postgres -U connect $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

# Sync to remote storage (optional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/
```

## Environment Configuration

```env
# .env file
NODE_ENV=production
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
TOSS_PAYMENTS_KEY=your_payment_key
GRAFANA_PASSWORD=your_monitoring_password

# Redis settings
REDIS_MAX_MEMORY=15gb
REDIS_QUEUE_MAX_MEMORY=4gb

# Performance tuning
NODE_OPTIONS=--max-old-space-size=10240
UV_THREADPOOL_SIZE=16

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

## Nginx Configuration

```nginx
# nginx.conf
user nginx;
worker_processes 2;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log combined buffer=32k;
    error_log /var/log/nginx/error.log warn;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 100;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Cache
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=cache:100m max_size=1g inactive=60m;
    proxy_temp_path /var/cache/nginx/temp;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Upstream
    upstream app_cluster {
        ip_hash;
        server app1:3001 weight=1 max_fails=3 fail_timeout=30s;
        server app2:3002 weight=1 max_fails=3 fail_timeout=30s;
        keepalive 64;
    }

    server {
        listen 80;
        server_name connect.kr;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name connect.kr;

        # SSL
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Connection limits
        limit_conn addr 50;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=100 nodelay;
            
            proxy_pass http://app_cluster;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Caching for GET requests
            proxy_cache cache;
            proxy_cache_valid 200 1m;
            proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        }

        # Static files
        location /_next/static/ {
            proxy_pass http://app_cluster;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # WebSocket support
        location /ws {
            proxy_pass http://app_cluster;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
        }

        # Monitoring (internal only)
        location /grafana/ {
            proxy_pass http://grafana:3000/;
            allow 192.168.0.0/16;
            deny all;
        }
    }
}
```

## Monitoring Dashboard Metrics

### Performance Metrics
- **Response Time P95**: < 1000ms
- **Response Time P99**: < 2000ms
- **Error Rate**: < 0.1%
- **Requests per Second**: Track trend

### Capacity Metrics
- **Concurrent Connections**: < 1200
- **Database Connections**: < 250
- **Memory Usage**: < 80%
- **CPU Usage**: < 70%

### Network Metrics
- **Bandwidth Upload**: < 130 Mbps (80% of 164)
- **Bandwidth Download**: < 260 Mbps (80% of 325)
- **Packet Loss**: < 0.01%

### Business Metrics
- **Active Users**: Track daily/monthly
- **Conversion Rate**: Track Free→Pro
- **Payment Success Rate**: > 99%
- **Near-miss to Top Upgrade Rate**: > 35%

## Directory Structure

```
connect/
├── docker-compose.yml
├── .env
├── Dockerfile.production
├── package.json
├── src/
│   ├── app/
│   ├── api/
│   ├── lib/
│   └── worker.ts
├── config/
│   ├── nginx/
│   │   ├── nginx.conf
│   │   └── ssl/
│   ├── postgres/
│   │   └── init.sql
│   ├── prometheus/
│   │   └── prometheus.yml
│   ├── grafana/
│   │   └── dashboards/
│   └── cloudflared/
│       └── config.yml
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   └── failover.sh
├── data/
│   └── uptime-kuma/
└── uploads/
```

## Quick Start Guide

1. **Clone repository**
   ```bash
   git clone https://github.com/yourusername/connect.git
   cd connect
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   ```

4. **Deploy**
   ```bash
   ./scripts/deploy.sh
   ```

5. **Monitor**
   - Application: http://localhost
   - Grafana: http://localhost/grafana
   - Uptime: http://localhost:3001

## Scaling Milestones

| Users | Infrastructure | Monthly Cost |
|-------|---------------|--------------|
| 0-500 | Current Setup | $50 |
| 500-1,500 | Current Setup + CDN Pro | $70 |
| 1,500-5,000 | Add Cloud Support | $500 |
| 5,000+ | Full Cloud Migration | $2,000+ |

## Support and Documentation

- **Monitoring**: Grafana dashboards at `/grafana`
- **Backups**: Daily automated backups to `/backup`
- **Logs**: Container logs via `docker logs [container_name]`
- **Health Check**: `curl http://localhost/api/health`

---

*Version: 2.0 | Last Updated: 2025-09-25*