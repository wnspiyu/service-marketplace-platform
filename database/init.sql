-- Initialize custom schema for Service Marketplace Platform
-- This script creates the marketplace schema and sets it as default

-- Create the marketplace schema
CREATE SCHEMA IF NOT EXISTS marketplace;

-- Set the search path to use marketplace schema by default
ALTER DATABASE service_marketplace_db SET search_path TO marketplace, public;

-- Grant privileges to marketplace_admin user
GRANT ALL PRIVILEGES ON SCHEMA marketplace TO marketplace_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA marketplace TO marketplace_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA marketplace TO marketplace_admin;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace GRANT ALL PRIVILEGES ON TABLES TO marketplace_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace GRANT ALL PRIVILEGES ON SEQUENCES TO marketplace_admin;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Marketplace schema initialized successfully!';
END $$;
