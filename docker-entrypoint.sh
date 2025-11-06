#!/bin/sh
set -e

echo "🚀 Starting Connect Platform..."
echo "Container: $HOSTNAME"
echo "Instance: ${INSTANCE_ID:-unknown}"

# Set npm cache to writable temporary directory
export npm_config_cache=/tmp/.npm
export npm_config_loglevel=error

# Create npm cache directory with proper permissions
mkdir -p /tmp/.npm
chmod 777 /tmp/.npm

# Sync database schema with Prisma schema
echo "📦 Syncing database schema..."
if npx prisma db push --skip-generate --accept-data-loss 2>&1; then
  echo "✅ Database schema synchronized"
else
  echo "❌ Failed to sync database schema"
  exit 1
fi

# Note: Prisma Client was generated during Docker build and is already available
# Runtime regeneration is not needed since schema changes trigger new builds
echo "✅ Using build-time Prisma Client. Database ready. Starting application..."
echo "---"

# Start the application
exec node server.js
