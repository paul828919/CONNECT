#!/bin/sh
set -e

echo "🚀 Starting Connect Platform..."
echo "Container: $HOSTNAME"
echo "Instance: ${INSTANCE_ID:-unknown}"

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
