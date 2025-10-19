#!/bin/sh
set -e

echo "🚀 Connect Platform - Development Startup"
echo "=========================================="

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until pg_isready -h postgres -p 5432 -U connect; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

# Generate Prisma Client (in case of schema changes)
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "✅ Database setup complete!"
echo "🎯 Starting Next.js development server..."
echo ""

# Execute the main command
exec "$@"

