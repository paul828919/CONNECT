#!/bin/bash
set -e

echo "🚀 Starting Connect Scraper..."

# Display container information
CONTAINER_ID=$(hostname)
echo "Container: $CONTAINER_ID"

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not set"
  exit 1
fi

if [ -z "$REDIS_QUEUE_URL" ]; then
  echo "❌ ERROR: REDIS_QUEUE_URL not set"
  exit 1
fi

echo "✅ Environment variables validated"

# Wait for database to be ready
echo "⏳ Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✓ Database connected'); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; then
    echo "✅ Database ready"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Attempt $RETRY_COUNT/$MAX_RETRIES: Database not ready yet..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Database connection timeout"
  exit 1
fi

# Wait for Redis to be ready
echo "⏳ Waiting for Redis..."
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx tsx -e "import Redis from 'ioredis'; const redis = new Redis(process.env.REDIS_QUEUE_URL); redis.ping().then(() => { console.log('✓ Redis connected'); redis.quit(); process.exit(0); }).catch(() => process.exit(1));" 2>/dev/null; then
    echo "✅ Redis ready"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Attempt $RETRY_COUNT/$MAX_RETRIES: Redis not ready yet..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Redis connection timeout"
  exit 1
fi

# Start scraper worker
echo "✅ All services ready. Starting scraper worker..."
exec npx tsx lib/scraping/worker.ts
