-- Service Marketplace Platform Database Schema
-- Schema: marketplace

SET search_path TO marketplace;

-- ============================================
-- ENUM VALUES (Using VARCHAR for Hibernate compatibility)
-- ============================================
-- User Types: 'CUSTOMER', 'SERVICE_PROVIDER'
-- Task Status: 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
-- Quotation Status: 'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'

-- ============================================
-- TABLES
-- ============================================

-- Users Table (Both Customers and Service Providers)
CREATE TABLE IF NOT EXISTS marketplace.users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_type CHECK (user_type IN ('CUSTOMER', 'SERVICE_PROVIDER'))
);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS marketplace.password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Verification Tokens
CREATE TABLE IF NOT EXISTS marketplace.email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Categories
CREATE TABLE IF NOT EXISTS marketplace.service_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Service Provider Profiles
CREATE TABLE IF NOT EXISTS marketplace.service_provider_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES marketplace.service_categories(id),
    business_name VARCHAR(255),
    bio TEXT,
    years_of_experience INTEGER,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    service_radius_km INTEGER DEFAULT 50,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_rating CHECK (average_rating >= 0 AND average_rating <= 5),
    CONSTRAINT check_radius CHECK (service_radius_km > 0 AND service_radius_km <= 200)
);

-- Customer Profiles
CREATE TABLE IF NOT EXISTS marketplace.customer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS marketplace.tasks (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES marketplace.service_categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    search_radius_km INTEGER NOT NULL,
    budget_min DECIMAL(10, 2),
    budget_max DECIMAL(10, 2),
    preferred_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    selected_quotation_id BIGINT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_search_radius CHECK (search_radius_km > 0 AND search_radius_km <= 200),
    CONSTRAINT check_budget CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
    CONSTRAINT check_task_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- Task Notifications (Track who was notified)
CREATE TABLE IF NOT EXISTS marketplace.task_notifications (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    is_viewed BOOLEAN DEFAULT FALSE,
    is_declined BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP,
    declined_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, service_provider_id)
);

-- Quotations
CREATE TABLE IF NOT EXISTS marketplace.quotations (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    estimated_duration VARCHAR(100),
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, service_provider_id),
    CONSTRAINT check_price CHECK (price > 0),
    CONSTRAINT check_quotation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'))
);

-- Reviews
CREATE TABLE IF NOT EXISTS marketplace.reviews (
    id BIGSERIAL PRIMARY KEY,
    task_id BIGINT UNIQUE NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    customer_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON marketplace.users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON marketplace.users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON marketplace.users(is_active);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON marketplace.password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON marketplace.password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON marketplace.email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON marketplace.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_service_categories_name ON marketplace.service_categories(name);
CREATE INDEX IF NOT EXISTS idx_service_categories_active ON marketplace.service_categories(is_active);

CREATE INDEX IF NOT EXISTS idx_service_provider_profiles_category ON marketplace.service_provider_profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_profiles_location ON marketplace.service_provider_profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_service_provider_profiles_user ON marketplace.service_provider_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_user ON marketplace.customer_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_customer ON marketplace.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON marketplace.tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON marketplace.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON marketplace.tasks(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON marketplace.tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_task_notifications_task ON marketplace.task_notifications(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_provider ON marketplace.task_notifications(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_viewed ON marketplace.task_notifications(is_viewed);

CREATE INDEX IF NOT EXISTS idx_quotations_task ON marketplace.quotations(task_id);
CREATE INDEX IF NOT EXISTS idx_quotations_provider ON marketplace.quotations(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON marketplace.quotations(status);

CREATE INDEX IF NOT EXISTS idx_reviews_provider ON marketplace.reviews(service_provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer ON marketplace.reviews(customer_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION marketplace.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
DROP TRIGGER IF EXISTS update_users_updated_at ON marketplace.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON marketplace.users
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_provider_profiles_updated_at ON marketplace.service_provider_profiles;
CREATE TRIGGER update_service_provider_profiles_updated_at
    BEFORE UPDATE ON marketplace.service_provider_profiles
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customer_profiles_updated_at ON marketplace.customer_profiles;
CREATE TRIGGER update_customer_profiles_updated_at
    BEFORE UPDATE ON marketplace.customer_profiles
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON marketplace.tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON marketplace.tasks
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotations_updated_at ON marketplace.quotations;
CREATE TRIGGER update_quotations_updated_at
    BEFORE UPDATE ON marketplace.quotations
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON marketplace.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON marketplace.reviews
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_categories_updated_at ON marketplace.service_categories;
CREATE TRIGGER update_service_categories_updated_at
    BEFORE UPDATE ON marketplace.service_categories
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_updated_at_column();

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update provider average rating after review insert/update
CREATE OR REPLACE FUNCTION marketplace.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE marketplace.service_provider_profiles
    SET
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM marketplace.reviews
            WHERE service_provider_id = NEW.service_provider_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM marketplace.reviews
            WHERE service_provider_id = NEW.service_provider_id
        )
    WHERE user_id = NEW.service_provider_id;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_provider_rating ON marketplace.reviews;
CREATE TRIGGER trigger_update_provider_rating
    AFTER INSERT OR UPDATE ON marketplace.reviews
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.update_provider_rating();

-- Function to increment completed tasks when task is marked as completed
CREATE OR REPLACE FUNCTION marketplace.update_completed_tasks_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Get the selected provider from the accepted quotation
        UPDATE marketplace.service_provider_profiles
        SET total_tasks_completed = total_tasks_completed + 1
        WHERE user_id = (
            SELECT service_provider_id
            FROM marketplace.quotations
            WHERE id = NEW.selected_quotation_id
        );

        -- Set completed_at timestamp
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_completed_tasks ON marketplace.tasks;
CREATE TRIGGER trigger_update_completed_tasks
    BEFORE UPDATE ON marketplace.tasks
    FOR EACH ROW
    WHEN (NEW.status::text = 'COMPLETED')
    EXECUTE FUNCTION marketplace.update_completed_tasks_count();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully in marketplace schema!';
END $$;
