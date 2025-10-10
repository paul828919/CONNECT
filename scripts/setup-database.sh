#!/bin/bash

###############################################################################
# Database Setup Script
#
# This script sets up PostgreSQL roles, database, and permissions
# for the Connect platform AI monitoring system.
#
# What it does:
# 1. Creates 'paulkim' role (if needed for dev)
# 2. Creates 'connect' role with password
# 3. Creates 'connect' database
# 4. Grants all necessary permissions
# 5. Runs Prisma migration
###############################################################################

set -e  # Exit on error

echo "🔧 Connect Platform - Database Setup"
echo "======================================="
echo ""

# PostgreSQL bin directory
PGBIN="/opt/homebrew/opt/postgresql@15/bin"
PSQL="$PGBIN/psql"

# Check if PostgreSQL is running
echo "1️⃣  Checking PostgreSQL status..."
if ! $PGBIN/pg_ctl -D /opt/homebrew/var/postgresql@15 status > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL is not running. Starting..."
    $PGBIN/pg_ctl -D /opt/homebrew/var/postgresql@15 -l /opt/homebrew/var/log/postgresql@15.log start
    sleep 2
fi
echo "✅ PostgreSQL is running"
echo ""

# Create paulkim superuser role (for dev convenience)
echo "2️⃣  Creating 'paulkim' superuser role..."
$PGBIN/createuser -s paulkim 2>/dev/null || echo "   (Role already exists or need to run as postgres user)"
echo ""

# Create SQL setup script
echo "3️⃣  Generating SQL setup script..."
cat > /tmp/connect_db_setup.sql << 'EOF'
-- Create 'connect' role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'connect') THEN
    CREATE ROLE connect WITH LOGIN PASSWORD 'password';
    RAISE NOTICE 'Created role: connect';
  ELSE
    RAISE NOTICE 'Role already exists: connect';
  END IF;
END
$$;

-- Grant necessary privileges to 'connect' role
ALTER ROLE connect WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE postgres TO connect;

-- Create 'connect' database if it doesn't exist
SELECT 'CREATE DATABASE connect OWNER connect'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'connect')\gexec

-- Connect to 'connect' database and grant schema permissions
\c connect

GRANT ALL PRIVILEGES ON SCHEMA public TO connect;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO connect;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO connect;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO connect;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO connect;

-- Show databases and roles
\echo ''
\echo '✅ Database setup complete!'
\echo ''
\echo 'Databases:'
\l

\echo ''
\echo 'Roles:'
\du
EOF

echo "✅ SQL script created at /tmp/connect_db_setup.sql"
echo ""

# Try to run the SQL script
echo "4️⃣  Executing database setup..."
echo "   Attempting connection as current user..."

# Try different connection methods
if $PSQL postgres -f /tmp/connect_db_setup.sql 2>/dev/null; then
    echo "✅ Database setup successful!"
elif $PSQL -U paulkim postgres -f /tmp/connect_db_setup.sql 2>/dev/null; then
    echo "✅ Database setup successful!"
else
    echo ""
    echo "❌ Automatic setup failed. Manual setup required."
    echo ""
    echo "Please run the following command manually:"
    echo ""
    echo "    $PSQL postgres -f /tmp/connect_db_setup.sql"
    echo ""
    echo "If that doesn't work, you may need to:"
    echo "1. Find your PostgreSQL superuser (usually 'postgres' or your system username)"
    echo "2. Run: $PSQL -U <superuser> postgres -f /tmp/connect_db_setup.sql"
    echo ""
    echo "Or manually execute these commands in psql:"
    echo ""
    cat /tmp/connect_db_setup.sql
    echo ""
    exit 1
fi

echo ""

# Run Prisma migration
echo "5️⃣  Running Prisma migration..."
cd "$(dirname "$0")/.."

export DATABASE_URL="postgresql://connect:password@localhost:5432/connect?schema=public"

echo "   DATABASE_URL: $DATABASE_URL"
echo ""

if npx prisma db push; then
    echo "✅ Prisma migration successful!"
else
    echo "⚠️  Prisma migration failed. You can try manually with:"
    echo ""
    echo "    DATABASE_URL=\"postgresql://connect:password@localhost:5432/connect?schema=public\" npx prisma db push"
    echo ""
fi

echo ""
echo "======================================="
echo "✅ Database setup complete!"
echo ""
echo "You can now:"
echo "1. Run the app: npm run dev"
echo "2. Access dashboard: http://localhost:3000/dashboard/admin/ai-monitoring"
echo "3. Test API: curl http://localhost:3000/api/admin/ai-monitoring/stats"
echo ""
echo "Database connection string:"
echo "postgresql://connect:password@localhost:5432/connect?schema=public"
echo "======================================="
