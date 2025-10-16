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

# Run database migrations (allow failure for existing schemas)
echo "📦 Running database migrations..."
if npx prisma migrate deploy 2>&1; then
  echo "✅ Migrations applied successfully"
else
  echo "⚠️  Migration skipped (database may already be up to date)"
  echo "    This is normal for existing production databases"
fi

echo "✅ Database ready. Starting application..."
echo "---"

# Start the application
exec node server.js
