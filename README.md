# Service Marketplace Platform

A full-stack web application that connects customers who need home services with skilled local service providers. Customers post jobs, nearby providers get notified and submit competitive quotes, the customer picks one, and after the work is done they leave a review.

Built as an MSc final year project.

---

## What It Does

**For customers:**
- Post a service task with location, budget, and preferred date
- Receive quotations from providers within their search radius
- Compare quotes side by side (price, duration, provider rating)
- Accept one quote, mark the task complete, and leave a review

**For service providers:**
- Register with a service category, location, and coverage radius
- Get automatically notified when a matching task is posted nearby
- Submit a quotation with price, estimated duration, and a message
- Build a public rating and review history over time

**Supported service categories:** Plumbing, Electrical Work, House Painting, Carpentry, Landscaping, Cleaning Services, HVAC, Roofing, Pest Control, Moving Services

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, React Router, Axios, Leaflet |
| Backend | Spring Boot 3, Java 17, Spring Security, Spring Data JPA |
| Database | PostgreSQL 15 |
| Auth | JWT (HMAC-SHA256, 24-hour expiry) |
| Maps | Leaflet + OpenStreetMap (Nominatim geocoding) |
| Email | Gmail SMTP via Spring Mail |
| Deployment | Docker Compose |

---

## Architecture

Three-tier architecture, fully containerised:

```
Browser (React SPA)
      ↕  REST API (JSON)
Spring Boot API  (port 8080)
      ↕  JPA / SQL
PostgreSQL 15    (port 5432)
```

All three services run in Docker containers connected through a private bridge network (`marketplace_network`). The backend waits for the database health check before starting to avoid race conditions.

---

## Running with Docker

The fastest way to run the entire platform:

**1. Create a `.env` file in the project root:**

```env
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_min_32_chars
MAIL_USERNAME=your_gmail@gmail.com
MAIL_PASSWORD=your_gmail_app_password
APP_BASE_URL=http://localhost:3000
```

> Gmail requires an [App Password](https://myaccount.google.com/apppasswords) (not your account password). 2FA must be enabled on the Google account.

**2. Start everything:**

```bash
docker compose -f docker-compose.demo.yml up
```

**3. Open the app:**

```
http://localhost:3000
```

The database schema and seed data (service categories) are loaded automatically on first startup.

---

## Running Locally (Development)

**Prerequisites:** Java 17, Node.js 18, PostgreSQL 15, Maven

**Database:**
```bash
psql -U postgres -f database/init.sql
psql -U postgres -f database/schema.sql
psql -U postgres -f database/seed-data.sql
```

**Backend:**
```bash
cd backend
# Set environment variables or edit src/main/resources/application.properties
mvn spring-boot:run
# Runs on http://localhost:8080
```

**Frontend:**
```bash
cd frontend
npm install
npm start
# Runs on http://localhost:3000
```

---

## Key Features

- **Location-based matching** - Haversine formula calculates real-world distances between task and provider GPS coordinates. Only providers whose service radius overlaps the task location are notified.
- **JWT authentication** - Stateless, role-based access control. CUSTOMER and SERVICE_PROVIDER roles are encoded in the token. All protected routes are enforced on both the frontend (`ProtectedRoute`) and backend (Spring Security path rules).
- **Email verification** - Accounts cannot log in until the verification link is clicked. Tokens expire after 24 hours.
- **Password reset** - Single-use tokens sent by email, expire after 1 hour.
- **Auto-reject on accept** - When a customer accepts one quotation, all other pending quotations for that task are automatically rejected and the providers are notified by email.
- **Provider reputation** - Average rating and review count are updated automatically by a PostgreSQL trigger after each review is submitted.
- **Interactive maps** - Leaflet + OpenStreetMap for location picking during registration and task creation, and for visualising task location alongside nearby providers.

---

## Project Structure

```
service-marketplace-platform/
├── backend/                    Spring Boot REST API
│   └── src/main/java/com/marketplace/
│       ├── controller/         REST endpoints
│       ├── service/            Business logic
│       ├── entity/             JPA entities
│       ├── repository/         Spring Data interfaces
│       ├── security/           JWT filter, UserDetails
│       └── dto/                Request / response DTOs
├── frontend/                   React TypeScript SPA
│   └── src/
│       ├── pages/              customer/ and provider/ pages
│       ├── components/         Navbar, LocationPicker, TaskMap, ProtectedRoute
│       ├── services/           API call functions (one file per resource)
│       ├── context/            AuthContext (global auth state)
│       └── types/              TypeScript interfaces for all API shapes
├── database/
│   ├── schema.sql              All table definitions, constraints, indexes, triggers
│   ├── seed-data.sql           10 service categories
│   ├── init.sql                Schema/role initialisation
│   └── reset-test-data.sql     Clears test data, resets provider stats
├── docs/                       Design documentation
│   ├── AUTH_FLOW.md
│   ├── BACKEND_DESIGN.md
│   ├── DATABASE_DESIGN.md
│   ├── DISTANCE_CALCULATION.md
│   └── FRONTEND_DESIGN.md
└── docker-compose.demo.yml     Full stack deployment
```

---

## API Overview

| Prefix | Access | Description |
|---|---|---|
| `POST /api/auth/**` | Public | Register, login, verify email, password reset |
| `GET /api/categories/**` | Public | List service categories |
| `* /api/customer/**` | CUSTOMER role | Tasks, quotations, reviews |
| `* /api/provider/**` | SERVICE_PROVIDER role | Notifications, quotations, reviews |

Full endpoint reference is in `docs/BACKEND_DESIGN.md`.

---

## Database

10 tables in the `marketplace` PostgreSQL schema:

`users` · `customer_profiles` · `service_provider_profiles` · `service_categories` · `tasks` · `task_notifications` · `quotations` · `reviews` · `email_verification_tokens` · `password_reset_tokens`

Three automated triggers handle: `updated_at` timestamps, provider average rating recalculation, and completed task counter.

Full schema design rationale is in `docs/DATABASE_DESIGN.md`.

---

## Docker Images

Pre-built images on Docker Hub:

| Service | Image |
|---|---|
| Backend | `nipuniit/service-market-place:backend-latest` |
| Frontend | `nipuniit/service-market-place:frontend-latest` |
| Database | `postgres:15-alpine` (official) |
