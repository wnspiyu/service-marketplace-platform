-- Seed Data for Service Marketplace Platform
-- Initial service categories

SET search_path TO marketplace;

-- Insert service categories
INSERT INTO marketplace.service_categories (name, description, icon_url, is_active) VALUES
    ('House Painting', 'Professional house painting services for interior and exterior', 'paint-roller', true),
    ('Plumbing', 'Residential and commercial plumbing services', 'wrench', true),
    ('Electrical Work', 'Licensed electrical repair and installation services', 'lightning-bolt', true),
    ('Carpentry', 'Custom carpentry and woodworking services', 'hammer', true),
    ('Landscaping', 'Garden design, maintenance, and landscaping services', 'tree', true),
    ('Cleaning Services', 'Professional residential and commercial cleaning', 'broom', true),
    ('HVAC Services', 'Heating, ventilation, and air conditioning services', 'fan', true),
    ('Roofing', 'Roof repair, replacement, and maintenance', 'home', true),
    ('Pest Control', 'Pest inspection and extermination services', 'bug', true),
    ('Moving Services', 'Professional moving and relocation services', 'truck', true)
ON CONFLICT (name) DO NOTHING;

-- Success message
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM marketplace.service_categories;
    RAISE NOTICE 'Seed data inserted successfully! Total categories: %', category_count;
END $$;
