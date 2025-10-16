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

# Run database migrations
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Verify migrations succeeded
echo "✓ Verifying migration status..."
npx prisma migrate status

echo "✅ Migrations complete. Starting application..."
echo "---"

# Start the application
exec node server.js
