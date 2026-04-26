# Database Design - Service Marketplace Platform

## Overview

This document explains the complete database design of the Service Marketplace Platform, the reasoning behind every decision, how each table was conceived, why relationships were structured the way they are, and how the schema supports the real-world business logic of the application.

---

## 1. Design Philosophy & Thinking Process

Before writing a single line of SQL, the design process started by asking one fundamental question: **what are the real-world entities in this system, and how do they interact with each other?**

The application has a clear purpose. Customers post jobs, providers respond with quotes, one quote gets accepted, the job gets done, and the customer leaves a review. Every table in this schema exists to represent one of these real-world things or one of these real-world interactions.

The design follows three guiding principles:

1. **Represent reality accurately** - the schema should mirror how the business works, not how it is convenient to code. If two things are genuinely different concepts in the real world (a user's identity vs. a provider's business profile), they live in separate tables.
2. **Enforce rules at the database level** - business rules like "a rating must be between 1 and 5" or "budget minimum cannot exceed budget maximum" are enforced with constraints, not just in application code. The database is the last line of defence.
3. **Optimise for the queries that will actually run** - indexes are placed on exactly the columns that the application queries against, not added blindly everywhere.

---

## 2. The Schema Namespace

All tables live inside a dedicated PostgreSQL schema called `marketplace`, rather than the default `public` schema.

**Why a dedicated schema?**
- It creates a clean logical namespace, isolating all application tables from any default or system tables
- It allows the database server to potentially host multiple applications or schemas without naming conflicts
- It maps cleanly to Hibernate's `spring.jpa.properties.hibernate.default_schema=marketplace` configuration, so the ORM layer automatically targets the right schema without any per-query qualification

---

## 3. The Core Entity Identification

The first step in database design is identifying the **nouns** in the system, the things that need to be stored. Walking through the application's purpose:

| Real-World Concept | Table |
|---|---|
| A person using the system | `users` |
| Extra info specific to a customer | `customer_profiles` |
| Extra info specific to a service provider | `service_provider_profiles` |
| A type of service offered | `service_categories` |
| A job posted by a customer | `tasks` |
| A price proposal from a provider | `quotations` |
| The record of who was alerted about a job | `task_notifications` |
| A customer's rating and feedback | `reviews` |
| A token to verify an email address | `email_verification_tokens` |
| A token to reset a password | `password_reset_tokens` |

This gave a starting point of 10 tables,each representing one clearly distinct concept.

---

## 4. Table-by-Table Design Rationale

### 4.1 `users`  The Single Identity Table

```sql
CREATE TABLE marketplace.users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type     VARCHAR(50)  NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone_number  VARCHAR(20),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active         BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_user_type CHECK (user_type IN ('CUSTOMER', 'SERVICE_PROVIDER'))
);
```

**Why one table for both customers and providers?**

The first design decision was whether to have separate `customers` and `service_providers` tables, or one unified `users` table. The single-table approach was chosen because:

- Both roles share identical identity data: email, password, name, phone
- Authentication works the same way regardless of role, the login endpoint doesn't need to know which table to check
- JWT token generation, email verification, and password reset all operate on a user identity, not a role-specific record
- Keeping identity in one place avoids duplicating the email uniqueness constraint across two tables

The `user_type` column (`CUSTOMER` or `SERVICE_PROVIDER`) acts as a discriminator. A CHECK constraint enforces that only these two valid values can ever be stored. The database rejects any other string at the engine level, not just the application level.

`is_email_verified` and `is_active` are kept here because they are properties of the identity itself. A user cannot log in without a verified email, and a deactivated user should be blocked regardless of their role.

`BIGSERIAL` was chosen as the primary key type rather than plain `INTEGER` because service platforms grow over time  a 64-bit auto-incrementing integer ensures there is no practical ceiling on the number of users.

---

### 4.2 `customer_profiles` & `service_provider_profiles`  The Profile Extension Pattern

```sql
CREATE TABLE marketplace.customer_profiles (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    address TEXT,
    ...
);

CREATE TABLE marketplace.service_provider_profiles (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT UNIQUE NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    category_id          BIGINT NOT NULL REFERENCES marketplace.service_categories(id),
    business_name        VARCHAR(255),
    bio                  TEXT,
    years_of_experience  INTEGER,
    latitude             DECIMAL(10, 8) NOT NULL,
    longitude            DECIMAL(11, 8) NOT NULL,
    address              TEXT NOT NULL,
    service_radius_km    INTEGER DEFAULT 50,
    average_rating       DECIMAL(3, 2) DEFAULT 0.00,
    total_reviews        INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    ...
    CONSTRAINT check_rating CHECK (average_rating >= 0 AND average_rating <= 5),
    CONSTRAINT check_radius CHECK (service_radius_km > 0 AND service_radius_km <= 200)
);
```

**Why separate profile tables instead of adding columns to `users`?**

This is a classic database normalisation decision. The `users` table would become bloated and confusing if every provider-specific field was added directly to it columns like `latitude`, `longitude`, `service_radius_km`, and `business_name` mean nothing for a customer row, and `address` in the customer sense means nothing for a provider. Storing them together would result in many NULL values for rows where the column is irrelevant, which is a sign of poor schema design.

The **one-to-one extension pattern** is used instead:
- Each profile table has a `user_id` with a `UNIQUE` constraint. This enforces the one-to-one relationship at the database level. It is impossible to accidentally create two provider profiles for the same user.
- `ON DELETE CASCADE` means if a user account is deleted, their profile is automatically deleted too. No orphaned rows.

**Provider-specific design decisions:**

- `latitude` and `longitude` use `DECIMAL(10,8)` and `DECIMAL(11,8)` respectively. GPS coordinates require high precision  8 decimal places give sub-centimetre accuracy which is more than sufficient for location-based matching
- `service_radius_km` defines how far a provider is willing to travel. This is stored on the provider profile so each provider can set their own preference. Default is 50 km. Constrained to 1–200 km. 0 makes no sense, and values above 200 km are not realistic for a local service marketplace
- `average_rating` and `total_reviews` are **denormalised aggregates**. Technically they can be calculated by querying the `reviews` table every time, but this would be an expensive operation on every dashboard load. By storing these as running totals, updated automatically by a database trigger, every query for a provider's rating is an instant column read rather than an aggregation over potentially thousands of reviews

---

### 4.3 `service_categories`  The Lookup Table

```sql
CREATE TABLE marketplace.service_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url    VARCHAR(255),
    is_active   BOOLEAN DEFAULT TRUE,
    ...
);
```

**Why a separate table for categories instead of a string column on tasks?**

Free-text category strings on tasks would create inconsistency. "Plumbing", "plumbing", "PLUMBING", and "plumbing services" would all be treated as different things. More importantly, the location-based matching algorithm needs to find all providers in the **same category as the task**. This requires a consistent, shared identifier, a foreign key to a `service_categories` row.

`is_active` allows categories to be retired without deleting them (and losing historical data integrity), just by flipping a flag.

The seed data pre-populates 10 categories. Using `ON CONFLICT (name) DO NOTHING` in the seed script makes the insertion idempotent. Running the seed script multiple times never creates duplicate categories.

---

### 4.4 `tasks`  The Central Business Entity

```sql
CREATE TABLE marketplace.tasks (
    id                  BIGSERIAL PRIMARY KEY,
    customer_id         BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    category_id         BIGINT NOT NULL REFERENCES marketplace.service_categories(id),
    title               VARCHAR(255) NOT NULL,
    description         TEXT NOT NULL,
    latitude            DECIMAL(10, 8) NOT NULL,
    longitude           DECIMAL(11, 8) NOT NULL,
    address             TEXT NOT NULL,
    search_radius_km    INTEGER NOT NULL,
    budget_min          DECIMAL(10, 2),
    budget_max          DECIMAL(10, 2),
    preferred_date      DATE,
    status              VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    selected_quotation_id BIGINT,
    completed_at        TIMESTAMP,
    ...
    CONSTRAINT check_search_radius CHECK (search_radius_km > 0 AND search_radius_km <= 200),
    CONSTRAINT check_budget CHECK (budget_min IS NULL OR budget_max IS NULL OR budget_min <= budget_max),
    CONSTRAINT check_task_status CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);
```

**The task is the pivot of the entire platform.** Every other entity either feeds into a task or comes out of one.

**Key design decisions:**

- `customer_id` references `users(id)` rather than `customer_profiles(id)`. This is intentional. The task is owned by the user identity, not the profile. If a profile is ever updated, the task ownership relationship is unchanged.

- `latitude` and `longitude` are stored on the task itself. This is the location where the service is needed, which may be different from the customer's home address. A customer might own a rental property they need painted. The task location and customer address are independent.

- `search_radius_km` is set by the customer when creating the task. This determines how wide a net to cast when finding providers to notify. A customer needing an electrician urgently might set a wider radius.

- `budget_min` and `budget_max` are both nullable. Some customers may have no budget in mind. The CHECK constraint `budget_min <= budget_max` only fires when both values are present (the `IS NULL` guards prevent the constraint from failing on partial or no budget).

- `status` follows a defined lifecycle: `OPEN` → `IN_PROGRESS` → `COMPLETED` (or `CANCELLED` from OPEN). The CHECK constraint ensures no invalid status can ever be stored.

- `selected_quotation_id` records which quotation was accepted. This creates a logical reference to the quotation but is not a hard foreign key constraint (to avoid circular dependency between tasks and quotations). It is populated when a customer accepts a quotation and is used by the completion trigger to know which provider completed the job.

- `completed_at` is NULL until the task reaches COMPLETED status, at which point a database trigger automatically fills it in.

---

### 4.5 `task_notifications`  The Provider Notification Junction Table

```sql
CREATE TABLE marketplace.task_notifications (
    id                  BIGSERIAL PRIMARY KEY,
    task_id             BIGINT NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    is_viewed           BOOLEAN DEFAULT FALSE,
    is_declined         BOOLEAN DEFAULT FALSE,
    viewed_at           TIMESTAMP,
    declined_at         TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, service_provider_id)
);
```

**Why does this table exist?**

When a task is created, the system notifies every provider within radius who covers the right category. This is a many-to-many relationship between tasks and providers. One task can notify many providers, and one provider can be notified about many tasks. Many-to-many relationships always require a junction table in relational design.

But this table does more than just record the relationship. It also tracks **the state of each notification**:

- `is_viewed` - has the provider seen this notification in their dashboard?
- `is_declined` - has the provider explicitly said they are not interested?
- `viewed_at` / `declined_at` - when did these actions happen?

**Why store these states here and not on the task?**

Because these states are per-provider per-task. Provider A viewing a notification does not affect whether Provider B has seen it. The notification record belongs to the relationship between one specific provider and one specific task.

**The `UNIQUE(task_id, service_provider_id)` composite constraint** ensures a provider can only ever have one notification record per task. The system cannot accidentally notify the same provider twice for the same task. The database will reject the duplicate insert.

---

### 4.6 `quotations`  Provider Price Proposals

```sql
CREATE TABLE marketplace.quotations (
    id                  BIGSERIAL PRIMARY KEY,
    task_id             BIGINT NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    price               DECIMAL(10, 2) NOT NULL,
    estimated_duration  VARCHAR(100),
    message             TEXT,
    status              VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    ...
    UNIQUE(task_id, service_provider_id),
    CONSTRAINT check_price CHECK (price > 0),
    CONSTRAINT check_quotation_status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'))
);
```

**Relationship to `task_notifications`:**

A provider can only submit a quotation if they were notified about the task (enforced in application logic). A notification and a quotation are deliberately kept as two separate records, a notification does not automatically become a quotation. The provider must make an active decision to submit a quote.

**The `UNIQUE(task_id, service_provider_id)` constraint** mirrors the same constraint on `task_notifications`. A provider can only submit one quotation per task. They cannot spam multiple quotes.

**Status lifecycle for a quotation:**
- `PENDING` - submitted, awaiting customer decision
- `ACCEPTED` - customer chose this quotation; the task moves to IN_PROGRESS
- `REJECTED` - customer declined this quotation (happens automatically to all other pending quotations when one is accepted)
- `WITHDRAWN` - provider changed their mind and pulled the quote before a decision

`price CHECK (price > 0)` ensures no zero or negative price can be stored.

`DECIMAL(10,2)` for price gives up to 8 digits before the decimal point, more than sufficient for any realistic service fee.

---

### 4.7 `reviews`  Customer Feedback

```sql
CREATE TABLE marketplace.reviews (
    id                  BIGSERIAL PRIMARY KEY,
    task_id             BIGINT UNIQUE NOT NULL REFERENCES marketplace.tasks(id) ON DELETE CASCADE,
    customer_id         BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    service_provider_id BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    rating              INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment             TEXT,
    ...
);
```

**Why does `task_id` have a `UNIQUE` constraint?**

A review is tied to one completed task. There should only ever be one review per task. The customer cannot review the same job twice. The `UNIQUE` constraint on `task_id` enforces this at the database level.

**Why store both `customer_id` and `service_provider_id` directly on the review?**

While both could technically be derived by joining through the task and the accepted quotation, storing them directly:
- Makes queries significantly faster, fetching all reviews for a provider is a single-table scan with an index, not a multi-join query
- Preserves the review record even if some indirect relationship changes in the future

**Why is `comment` nullable?**

A customer must provide a rating (1–5) but a written comment is optional. Some users simply want to leave a star rating without writing anything. The schema accommodates both.

---

### 4.8 `email_verification_tokens` & `password_reset_tokens`  Security Token Tables

```sql
CREATE TABLE marketplace.email_verification_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified   BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE marketplace.password_reset_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES marketplace.users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Why separate tables for these tokens instead of columns on `users`?**

If the token were a column on `users`, only one token could exist at a time per user. In practice, a user might request a password reset twice, the second request should generate a fresh token without invalidating the previous one immediately (the `expires_at` and `used` flags handle expiry and single-use enforcement naturally). A separate table accommodates multiple outstanding tokens.

**Why are they in separate tables rather than one combined token table?**

Email verification and password reset tokens have different lifecycles and different business meanings. Keeping them separate makes the intent clear and prevents any possibility of a reset token accidentally being accepted as a verification token or vice versa.

`ON DELETE CASCADE` on `user_id` ensures all tokens for a user are cleaned up if the user account is ever deleted.

---

## 5. Relationships & Interconnections

### Entity Relationship Summary

```
users ──────────────── customer_profiles         (1-to-1)
users ──────────────── service_provider_profiles  (1-to-1)
users ──────────────── email_verification_tokens  (1-to-many)
users ──────────────── password_reset_tokens      (1-to-many)
service_categories ─── service_provider_profiles  (1-to-many)
service_categories ─── tasks                      (1-to-many)
users (customer) ───── tasks                      (1-to-many)
tasks ──────────────── task_notifications          (1-to-many)
users (provider) ───── task_notifications          (1-to-many)
tasks ──────────────── quotations                  (1-to-many)
users (provider) ───── quotations                  (1-to-many)
tasks ──────────────── reviews                     (1-to-1)
users (customer) ───── reviews                     (1-to-many)
users (provider) ───── reviews                     (1-to-many)
```

### How the Core Workflow Flows Through the Schema

**Step 1 - Registration**
A new user row is created in `users`. Depending on `user_type`, either a `customer_profiles` or `service_provider_profiles` row is created with the same `user_id`. An `email_verification_tokens` row is created and the token is emailed to the user.

**Step 2 - Task Creation**
A customer creates a task. A row is inserted into `tasks` with `customer_id` pointing to their `users` row, `category_id` pointing to the chosen `service_categories` row, and GPS coordinates for the job location.

**Step 3 - Provider Matching & Notification**
The application queries `service_provider_profiles` filtering by `category_id = task.category_id`. For each matching provider, the Haversine formula is applied using the provider's `(latitude, longitude)` and the task's `(latitude, longitude)`. Providers within the task's `search_radius_km` are selected. For each matched provider, a `task_notifications` row is inserted (task_id + service_provider_id). An email is sent to each provider.

**Step 4 - Quotation Submission**
A provider opens their notifications and submits a quote. A `quotations` row is inserted with `task_id` and `service_provider_id`. The application verifies a `task_notifications` row exists for this pair (the provider was actually notified) before allowing the insert.

**Step 5 - Quotation Acceptance**
The customer accepts a quotation. The accepted `quotations` row has its `status` updated to `ACCEPTED`. All other `quotations` rows for the same `task_id` are updated to `REJECTED`. The `tasks` row has `status` updated to `IN_PROGRESS` and `selected_quotation_id` set to the accepted quotation's `id`.

**Step 6 - Task Completion**
The customer marks the task complete. The `tasks` row has `status` updated to `COMPLETED`. The database trigger `trigger_update_completed_tasks` fires: it reads `selected_quotation_id` on the task, looks up the `service_provider_id` from the `quotations` table, and increments `total_tasks_completed` on that provider's `service_provider_profiles` row. The `completed_at` timestamp is also set automatically.

**Step 7 - Review**
The customer submits a review. A `reviews` row is inserted with `task_id`, `customer_id`, `service_provider_id`, and `rating`. The database trigger `trigger_update_provider_rating` fires: it recalculates `AVG(rating)` across all reviews for that provider and updates `average_rating` and `total_reviews` on `service_provider_profiles`.

---

## 6. Normalisation

The schema is designed to **Third Normal Form (3NF)**:

- **1NF** - every column contains atomic values; there are no repeating groups or arrays. Tags and categories are stored as separate rows in `service_categories`, not as comma-separated strings.
- **2NF** - every non-key attribute in every table depends on the full primary key. There are no partial dependencies (which only become relevant for composite keys, used in `task_notifications` and `quotations` UNIQUE constraints).
- **3NF** - no transitive dependencies. A provider's average rating is technically derivable from the `reviews` table, but it is stored as a denormalised aggregate for read performance. This is a deliberate, justified exception to strict 3NF, documented and maintained automatically by a trigger.

---

## 7. Constraints  Enforcing Business Rules at the Database Level

| Table | Constraint | Business Rule Enforced |
|---|---|---|
| `users` | `CHECK (user_type IN (...))` | Only valid roles allowed |
| `users` | `UNIQUE (email)` | One account per email address |
| `service_provider_profiles` | `CHECK (average_rating >= 0 AND <= 5)` | Ratings stay in valid range |
| `service_provider_profiles` | `CHECK (service_radius_km > 0 AND <= 200)` | Radius must be meaningful and realistic |
| `service_provider_profiles` | `UNIQUE (user_id)` | One profile per provider |
| `customer_profiles` | `UNIQUE (user_id)` | One profile per customer |
| `tasks` | `CHECK (status IN (...))` | Only valid status transitions allowed |
| `tasks` | `CHECK (budget_min <= budget_max)` | Budget range must be logically valid |
| `task_notifications` | `UNIQUE (task_id, service_provider_id)` | No duplicate notifications |
| `quotations` | `UNIQUE (task_id, service_provider_id)` | One quote per provider per task |
| `quotations` | `CHECK (price > 0)` | Price must be positive |
| `quotations` | `CHECK (status IN (...))` | Only valid quotation states |
| `reviews` | `UNIQUE (task_id)` | One review per completed task |
| `reviews` | `CHECK (rating >= 1 AND <= 5)` | Rating scale enforced |

---

## 8. Indexing Strategy

Indexes are placed on columns that are **searched, filtered, or joined against** in the application's most frequent queries.

### Authentication & Token Lookups
- `idx_users_email` - every login request looks up a user by email; this must be fast
- `idx_password_reset_tokens_token` - reset links are validated by token value
- `idx_email_verification_tokens_token` - verification links are validated by token value

### Dashboard & List Queries
- `idx_tasks_customer` - customer dashboard loads all tasks where `customer_id = ?`
- `idx_tasks_status` - filtering open/active tasks
- `idx_quotations_task` - task detail page loads all quotations for a given task
- `idx_quotations_provider` - provider dashboard loads all quotations they submitted
- `idx_reviews_provider` - provider profile loads all reviews they received
- `idx_task_notifications_provider` - notifications page loads all alerts for a provider
- `idx_task_notifications_viewed` - unviewed notification count

### Location-Based Matching (Performance Critical)
- `idx_service_provider_profiles_location` - composite index on `(latitude, longitude)` allows the database to quickly retrieve all providers to run the Haversine distance calculation against, rather than doing a full table scan
- `idx_service_provider_profiles_category` - narrows the provider set by category before distance filtering
- `idx_tasks_location` - composite index on `(latitude, longitude)` for any reverse-proximity queries

---

## 9. Database Automation  Triggers & Functions

### 9.1 `update_updated_at_column()` - Automatic Timestamp Management

Applied to: `users`, `customer_profiles`, `service_provider_profiles`, `service_categories`, `tasks`, `quotations`, `reviews`

```sql
CREATE OR REPLACE FUNCTION marketplace.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

**Why?** Manually updating `updated_at` in every application update query is error-prone.  A `BEFORE UPDATE` trigger guarantees it is always accurate regardless of how the row was updated, whether from the application, a migration script, or a direct SQL command.

### 9.2 `update_provider_rating()` - Automatic Rating Recalculation

Fired: `AFTER INSERT OR UPDATE` on `reviews`

```sql
UPDATE marketplace.service_provider_profiles
SET
    average_rating = (SELECT COALESCE(AVG(rating), 0) FROM marketplace.reviews
                      WHERE service_provider_id = NEW.service_provider_id),
    total_reviews  = (SELECT COUNT(*) FROM marketplace.reviews
                      WHERE service_provider_id = NEW.service_provider_id)
WHERE user_id = NEW.service_provider_id;
```

**Why?** Every time a review is inserted or updated, the provider's aggregate statistics on their profile need to reflect the new data. Running this as a trigger means the `service_provider_profiles` table always has accurate, pre-computed rating stats. The `COALESCE(..., 0)` handles the edge case where a provider has no reviews yet. `AVG()` of an empty set returns NULL, which would be incorrect.

### 9.3 `update_completed_tasks_count()` - Task Completion Counter

Fired: `BEFORE UPDATE` on `tasks` when new status is `COMPLETED`

```sql
IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    UPDATE marketplace.service_provider_profiles
    SET total_tasks_completed = total_tasks_completed + 1
    WHERE user_id = (
        SELECT service_provider_id FROM marketplace.quotations
        WHERE id = NEW.selected_quotation_id
    );
    NEW.completed_at = CURRENT_TIMESTAMP;
END IF;
```

**Why?** When a task is marked complete, the provider who did the job deserves credit on their profile. The trigger uses `selected_quotation_id` on the task to look up which provider was assigned, then increments their `total_tasks_completed`. The `IF OLD.status != 'COMPLETED'` guard ensures this only fires once, marking an already-completed task as completed again will not double-increment the counter.

The `completed_at` timestamp is also set here inside a `BEFORE` trigger so the value is captured in the same atomic operation.

---

## 10. Security Considerations in the Schema

- **Passwords are never stored in plain text.** The `password_hash` column stores only the BCrypt hash. The database has no knowledge of any user's actual password.
- **Tokens are stored as random strings with expiry.** Both token tables include `expires_at` and a single-use flag (`used` / `verified`). Even if the database were compromised, a token is only valid until it expires or is used.
- **`ON DELETE CASCADE`** on all token and profile foreign keys ensures that deleting a user account completely removes all associated sensitive data. No orphaned rows with personal information.
- **Schema isolation** means the `marketplace` schema can have its own access-control policies, separating it from any other schemas on the same database server.

---

