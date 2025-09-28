# Connect Platform - Complete Deployment Guide
*From MacBook Pro M4 Max to Linux Server*

## Prerequisites Setup

### 1. SSH Key Setup (One-time)
```bash
# On your MacBook
ssh-keygen -t ed25519 -C "connect-deployment"
# Press Enter for default location
# Set a passphrase or leave empty

# Copy public key to server
ssh-copy-id your-username@your-server-ip
# Enter your server password when prompted

# Test connection
ssh your-username@your-server-ip
# Should connect without password
```

### 2. Server Directory Structure
```bash
# On your Linux server (via SSH)
sudo mkdir -p /opt/connect
sudo chown $USER:$USER /opt/connect
cd /opt/connect

# Create necessary directories
mkdir -p {config,data,logs,backup,ssl}
```

## Deployment Method 1: Simple Docker Image Transfer

### Step 1: Build Production Image Locally
```bash
# On your MacBook (in Connect project directory)
# Create production Dockerfile
cat > Dockerfile.production << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
EOF

# Build the image
docker build -f Dockerfile.production -t connect:latest .
```

### Step 2: Transfer Image to Server
```bash
# Save Docker image to file
docker save connect:latest | gzip > connect-latest.tar.gz

# Transfer to server
scp connect-latest.tar.gz your-username@your-server-ip:/opt/connect/

# Load image on server
ssh your-username@your-server-ip "cd /opt/connect && gunzip -c connect-latest.tar.gz | docker load"
```

### Step 3: Deploy on Server
```bash
# Create production docker-compose.yml on server
cat > /opt/connect/docker-compose.production.yml << 'EOF'
version: '3.8'

networks:
  connect_net:
    driver: bridge

volumes:
  postgres_data:
  redis_cache_data:
  redis_queue_data:

services:
  nginx:
    image: nginx:alpine
    container_name: connect_nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - connect_net
    depends_on:
      - app1
      - app2

  app1:
    image: connect:latest
    container_name: connect_app1
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://connect:${DB_PASSWORD}@postgres:5432/connect
      REDIS_CACHE_URL: redis://redis-cache:6379
      REDIS_QUEUE_URL: redis://redis-queue:6380
    networks:
      - connect_net
    depends_on:
      - postgres
      - redis-cache

  app2:
    image: connect:latest
    container_name: connect_app2
    restart: always
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: postgresql://connect:${DB_PASSWORD}@postgres:5432/connect
      REDIS_CACHE_URL: redis://redis-cache:6379
      REDIS_QUEUE_URL: redis://redis-queue:6380
    networks:
      - connect_net
    depends_on:
      - postgres
      - redis-cache

  postgres:
    image: postgres:15-alpine
    container_name: connect_postgres
    restart: always
    environment:
      POSTGRES_DB: connect
      POSTGRES_USER: connect
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - connect_net
    command: >
      postgres
      -c max_connections=300
      -c shared_buffers=10GB
      -c effective_cache_size=30GB

  redis-cache:
    image: redis:7-alpine
    container_name: connect_redis_cache
    restart: always
    command: redis-server --maxmemory 15gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_cache_data:/data
    networks:
      - connect_net

  redis-queue:
    image: redis:7-alpine
    container_name: connect_redis_queue
    restart: always
    command: redis-server --port 6380 --maxmemory 4gb
    volumes:
      - redis_queue_data:/data
    networks:
      - connect_net
EOF

# Create environment file
cat > /opt/connect/.env << 'EOF'
NODE_ENV=production
DB_PASSWORD=your_secure_database_password
JWT_SECRET=your_jwt_secret_here
TOSS_PAYMENTS_KEY=your_payment_key
EOF

# Start services
cd /opt/connect
docker-compose -f docker-compose.production.yml up -d
```

## Deployment Method 2: Automated Script (Recommended)

### Create Deployment Script on MacBook
```bash
# Create deploy.sh script
cat > deploy.sh << 'EOF'
#!/bin/bash

# Configuration
SERVER_USER="your-username"
SERVER_IP="your-server-ip"
SERVER_PATH="/opt/connect"
IMAGE_NAME="connect"
IMAGE_TAG="latest"

echo "🚀 Starting Connect deployment..."

# Step 1: Build production image
echo "📦 Building production image..."
docker build -f Dockerfile.production -t ${IMAGE_NAME}:${IMAGE_TAG} .

# Step 2: Save and compress image
echo "💾 Saving Docker image..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > connect-${IMAGE_TAG}.tar.gz

# Step 3: Transfer to server
echo "📤 Transferring to server..."
scp connect-${IMAGE_TAG}.tar.gz ${SERVER_USER}@${SERVER_IP}:${SERVER_PATH}/

# Step 4: Deploy on server
echo "🏗️  Deploying on server..."
ssh ${SERVER_USER}@${SERVER_IP} << DEPLOY_SCRIPT
cd ${SERVER_PATH}

# Load new image
echo "Loading Docker image..."
gunzip -c connect-${IMAGE_TAG}.tar.gz | docker load

# Stop existing services
echo "Stopping existing services..."
docker-compose -f docker-compose.production.yml down

# Start services with new image
echo "Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Health check
echo "Performing health check..."
curl -f http://localhost/api/health || echo "Warning: Health check failed"

# Cleanup
rm connect-${IMAGE_TAG}.tar.gz

echo "✅ Deployment complete!"
DEPLOY_SCRIPT

# Cleanup local files
rm connect-${IMAGE_TAG}.tar.gz

echo "🎉 Connect deployment finished successfully!"
EOF

# Make script executable
chmod +x deploy.sh
```

### Use the Deployment Script
```bash
# Deploy with single command
./deploy.sh
```

## Deployment Method 3: Git-based Deployment

### Setup Git Repository on Server
```bash
# On server
cd /opt/connect
git init
git remote add origin https://github.com/yourusername/connect.git

# Create deployment script
cat > deploy-from-git.sh << 'EOF'
#!/bin/bash
echo "🔄 Pulling latest code..."
git pull origin main

echo "📦 Building image..."
docker build -f Dockerfile.production -t connect:latest .

echo "🔄 Restarting services..."
docker-compose -f docker-compose.production.yml down
docker-compose -f docker-compose.production.yml up -d

echo "✅ Git deployment complete!"
EOF

chmod +x deploy-from-git.sh
```

### Deploy from Git
```bash
# On your MacBook - push code
git add .
git commit -m "Deploy to production"
git push origin main

# On server - deploy
ssh your-username@your-server-ip "cd /opt/connect && ./deploy-from-git.sh"
```

## Database Migration During Deployment

### Migration Script
```bash
# Create migration runner
cat > migrate.sh << 'EOF'
#!/bin/bash

echo "🗄️  Running database migrations..."

# Wait for database to be ready
docker exec connect_postgres pg_isready -U connect

# Run migrations
docker exec connect_app1 npm run migrate

echo "✅ Migrations complete!"
EOF

chmod +x migrate.sh
```

## Monitoring Deployment

### Health Check Script
```bash
# Create health check
cat > health-check.sh << 'EOF'
#!/bin/bash

echo "🔍 Checking Connect health..."

# Check container status
echo "Container Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check application health
echo -e "\nApplication Health:"
curl -s http://localhost/api/health | jq '.' || echo "API not responding"

# Check database connection
echo -e "\nDatabase Status:"
docker exec connect_postgres pg_isready -U connect

# Check Redis cache
echo -e "\nRedis Cache Status:"
docker exec connect_redis_cache redis-cli ping

# Check system resources
echo -e "\nSystem Resources:"
free -h
df -h

echo "✅ Health check complete!"
EOF

chmod +x health-check.sh
```

## Rollback Procedure

### Rollback Script
```bash
# Create rollback script
cat > rollback.sh << 'EOF'
#!/bin/bash

BACKUP_TAG=${1:-"previous"}

echo "⏪ Rolling back to ${BACKUP_TAG}..."

# Stop current services
docker-compose -f docker-compose.production.yml down

# Load backup image
docker load < connect-${BACKUP_TAG}.tar.gz

# Update docker-compose to use backup tag
sed -i "s/connect:latest/connect:${BACKUP_TAG}/g" docker-compose.production.yml

# Start services
docker-compose -f docker-compose.production.yml up -d

echo "✅ Rollback to ${BACKUP_TAG} complete!"
EOF

chmod +x rollback.sh
```

## SSL/HTTPS Setup

### Let's Encrypt Setup
```bash
# Install certbot on server
sudo apt update
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Create nginx SSL config
cat > /opt/connect/config/nginx.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    location / {
        proxy_pass http://app1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
```

## Complete Deployment Checklist

### Pre-deployment (MacBook)
- [ ] Code tested locally
- [ ] Environment variables configured
- [ ] Database migrations prepared
- [ ] Docker image builds successfully

### Deployment (Server)
- [ ] SSH access confirmed
- [ ] Docker and docker-compose installed
- [ ] Firewall configured (ports 80, 443)
- [ ] SSL certificate obtained
- [ ] Environment file created
- [ ] Services started successfully

### Post-deployment
- [ ] Health check passes
- [ ] Database accessible
- [ ] SSL certificate working
- [ ] Monitoring setup
- [ ] Backup script configured

## Quick Deployment Commands

```bash
# Complete deployment in one command
./deploy.sh && ssh your-username@your-server-ip "cd /opt/connect && ./health-check.sh"

# Emergency rollback
ssh your-username@your-server-ip "cd /opt/connect && ./rollback.sh previous"

# Check logs
ssh your-username@your-server-ip "cd /opt/connect && docker-compose logs -f"
```

This deployment process will get your Connect platform from local development to production server with minimal manual intervention.