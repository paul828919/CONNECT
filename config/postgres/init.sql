-- Connect Platform - PostgreSQL Initialization Script
-- Run on first database creation

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation

-- Note: Prisma will create the actual schema
-- This file is for extensions and optimizations only

-- Create custom functions for common operations

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function for Korean text search (if needed)
CREATE OR REPLACE FUNCTION korean_to_tsquery(text)
RETURNS tsquery AS $$
BEGIN
    RETURN to_tsquery('korean', $1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Performance monitoring view
CREATE OR REPLACE VIEW slow_queries AS
SELECT
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    max_exec_time,
    stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 50;

-- Grant permissions
GRANT SELECT ON slow_queries TO connect;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'Connect Platform database initialized successfully';
    RAISE NOTICE 'Extensions enabled: pg_stat_statements, pg_trgm, uuid-ossp';
    RAISE NOTICE 'Custom functions created: update_updated_at_column, korean_to_tsquery';
END
$$;