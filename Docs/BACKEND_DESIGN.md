# Backend Design - Service Marketplace Platform

## Overview

This document explains the complete backend design of the Service Marketplace Platform, the reasoning behind every decision, how each layer was conceived, why the architecture was structured the way it is, and how the code supports the real-world business logic of the application.

---

## 1. Design Philosophy & Thinking Process

Before writing a single line of Java, the design process started with one fundamental question: **how does data flow from an HTTP request all the way to the database and back to the user?**

The application follows a layered architecture where each layer has one clearly defined responsibility. No layer reaches past its neighbour. A controller never touches a repository. A service never builds an HTTP response directly.

Three guiding principles:

1. **Enforce rules in the right layer:** validation of incoming data belongs in the controller (via Bean Validation). Business rules (a provider cannot quote on a task they were not notified about) belong in the service. Data integrity rules belong in the database. Each rule lives once, in one place.
2. **Keep the API contract clean:** controllers only accept DTOs and return DTOs. Entities never leak out of the service layer. This protects the API from changing every time the internal data model changes.
3. **Security is structural, not optional:** Spring Security's filter chain enforces authentication and role-based access before a request reaches any controller method. Individual endpoints do not need to re-check who is calling them.

---

## 2. Technology Stack

| Technology | Version | Role |
|---|---|---|
| Java | 17 | Language |
| Spring Boot | 3.2.0 | Application framework |
| Spring Web (MVC) | Included | REST API layer |
| Spring Security | Included | Authentication & authorisation |
| Spring Data JPA | Included | Database ORM layer |
| Spring Mail | Included | Email notification delivery |
| PostgreSQL Driver | Runtime | Database connectivity |
| Hibernate | Included via JPA | ORM implementation |
| JJWT | 0.11.5 | JWT token generation & validation |
| BCrypt | Included via Security | Password hashing |
| Lombok | Latest | Boilerplate reduction |
| Maven | Latest | Build tool |

**Why Spring Boot?**
Spring Boot provides production-ready defaults out of the box: embedded Tomcat, auto-configured JPA, security filter chains, and a unified properties system. The alternative would be configuring each of these manually, which adds no value to the application's purpose.

**Why JWT over session-based auth?**
The frontend (React) and backend (Spring) are separate processes running on different ports. Sessions require sticky connections or a shared session store. JWT is stateless; the token is verified on every request using a secret key with no database lookup required. This fits the architecture cleanly.

---

## 3. Project Structure

```
backend/
└── src/main/java/com/marketplace/
    ├── MarketplaceApplication.java     ← entry point, enables async
    ├── config/
    │   ├── SecurityConfig.java         ← filter chain, auth rules, CORS
    │   └── CorsConfig.java             ← allowed origins, methods, headers
    ├── controller/
    │   ├── AuthController.java         ← /api/auth/** (public)
    │   ├── ServiceCategoryController.java ← /api/categories/** (public)
    │   ├── CustomerController.java     ← /api/customer/** (CUSTOMER role)
    │   └── ProviderController.java     ← /api/provider/** (SERVICE_PROVIDER role)
    ├── dto/
    │   ├── request/                    ← incoming request bodies
    │   ├── response/                   ← outgoing response bodies
    │   └── ErrorResponse.java          ← standard error envelope
    ├── entity/                         ← JPA-mapped database tables
    ├── exception/                      ← custom exceptions + global handler
    ├── repository/                     ← Spring Data JPA interfaces
    ├── security/                       ← JWT filter, UserDetails, token logic
    └── service/                        ← all business logic
```

**Why this structure?**
The `com.marketplace` root package is split by technical layer (controller, service, repository) rather than by feature. At this application size, layer-based organisation makes it immediately clear where any class lives without needing to know which feature it belongs to. Each layer can be found instantly.

---

## 4. Configuration

### 4.1 `application.properties`

**Server:**
```properties
server.port=8080
server.error.include-message=always
server.error.include-binding-errors=always
```

**Database:**
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/service_marketplace_db
spring.datasource.username=marketplace_admin
spring.datasource.password=marketplace_pass_2025
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.properties.hibernate.default_schema=marketplace
```

`ddl-auto=validate` means Hibernate checks that the entity classes match the database schema on startup and refuses to start if they do not match. It never modifies the schema. This is deliberate: schema changes are controlled by SQL scripts (`schema.sql`), not by Hibernate auto-generation. This prevents accidental table drops or column renames during development.

`default_schema=marketplace` means every JPA query targets the `marketplace` schema without needing to qualify every table name.

**JWT:**
```properties
jwt.secret=marketplace_secret_key_...  ← minimum 256-bit key for HMAC SHA256
jwt.expiration=86400000                ← 24 hours in milliseconds
```

**Email (Gmail SMTP):**
```properties
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=wnspiyumantha@gmail.com
spring.mail.password=hlnn papt pkpl xrtu   ← Gmail app-specific password
spring.mail.properties.mail.smtp.starttls.enable=true
```

An app-specific password is used rather than the account password. This is a Gmail security requirement when 2-factor authentication is enabled. The app password can be revoked independently without changing the main account credentials.

**Application base URL:**
```properties
app.base-url=http://localhost:3000
```
Used to build clickable links in emails (verification links, reset links) that point to the frontend, not the backend.

---

## 5. Security Architecture

### 5.1 The Filter Chain

Every HTTP request passes through the Spring Security filter chain before reaching any controller. The critical filter is `JwtAuthenticationFilter`.

```
HTTP Request
     ↓
JwtAuthenticationFilter
     ↓
UsernamePasswordAuthenticationFilter
     ↓
SecurityContextHolder (user identity available to all downstream code)
     ↓
Controller Method
```

### 5.2 `JwtAuthenticationFilter`

- Extracts the `Authorization` header
- Strips the `Bearer ` prefix to get the raw token
- Validates the token using `JwtTokenProvider`
- Extracts the `userId` from the token claims
- Loads the full `UserDetails` from the database using that `userId`
- Sets the `UsernamePasswordAuthenticationToken` in `SecurityContextHolder`
- If any step fails (missing header, expired token, invalid signature), the filter moves on without setting authentication, and the request reaches the controller as unauthenticated and is rejected by the security rules

**Why load UserDetails from the database on every request?**
To ensure a deactivated user (`is_active = false`) cannot continue using a valid token. If authentication were purely token-based with no database check, a deactivated account would keep working until token expiry. Loading UserDetails on each request catches this case.

### 5.3 `JwtTokenProvider`

- Algorithm: HMAC SHA256 (HS256)
- Subject stored in token: the numeric `userId` (not email, not username)
- Token generation: `generateToken(Authentication)` and `generateTokenFromUserId(Long)`
- Token validation: checks signature, expiry, and format; it returns `false` on any failure rather than throwing to avoid leaking error details


### 5.4 `UserDetailsImpl`

Implements Spring Security's `UserDetails` interface. Built from a `User` entity by the static `build(User)` method.

- Assigns one authority based on `UserType`: `ROLE_CUSTOMER` or `ROLE_SERVICE_PROVIDER`
- Implements `isEnabled()` using `user.getIsActive()`; a deactivated user fails the enabled check
- Implements `isCredentialsNonExpired()`, `isAccountNonLocked()`, `isAccountNonExpired()` all returning `true`; these states are managed by `is_active` rather than separate flags

### 5.5 Authorisation Rules

```
/api/auth/**         → PUBLIC  (registration, login, password reset, email verify)
/api/categories/**   → PUBLIC  (browsing categories before login)
/actuator/**         → PUBLIC  (health checks)
/api/customer/**     → CUSTOMER role only
/api/provider/**     → SERVICE_PROVIDER role only
everything else      → authenticated (any valid token)
```

**Why separate URL namespaces by role?**
Grouping all customer endpoints under `/api/customer/` and all provider endpoints under `/api/provider/` means security rules are applied at the path level. There is no risk of a provider calling a customer-only endpoint by guessing the URL; the path prefix itself is protected.

### 5.6 `CorsConfig`

Allowed origins: `http://localhost:3000`

These are the frontend development server addresses. In production, this list would be replaced with the deployed frontend domain.

---

## 6. Entity Layer

Entities are JPA-annotated Java classes that map directly to database tables. They are the only classes that Hibernate interacts with.

### Design Rules Applied to All Entities

- `@Table(schema = "marketplace")` is set on every entity, reinforcing the schema configuration
- `@Column` annotations specify `name`, `nullable`, and `length` explicitly; Hibernate's defaults are not relied upon
- Timestamps use `LocalDateTime`
- Monetary values use `BigDecimal`, not `double` or `float`, as floating point is inappropriate for currency
- GPS coordinates use `BigDecimal` with precision 10,8 (latitude) and 11,8 (longitude)

### 6.1 `User` Entity

Maps to `marketplace.users`. The central identity table.

Relationships:
- `@OneToOne(mappedBy = "user")` to `CustomerProfile`
- `@OneToOne(mappedBy = "user")` to `ServiceProviderProfile`

`userType` is mapped as `@Enumerated(EnumType.STRING)`, stored as `'CUSTOMER'` or `'SERVICE_PROVIDER'` text in the database, not as an integer ordinal. This makes the database human-readable and prevents enum reordering from corrupting stored data.

### 6.2 `CustomerProfile` Entity

Maps to `marketplace.customer_profiles`. Contains the one-to-one link to `User` via `@JoinColumn(name = "user_id", unique = true)`.

### 6.3 `ServiceProviderProfile` Entity

Maps to `marketplace.service_provider_profiles`. The most data-rich entity.

- `@ManyToOne` to `ServiceCategory`, meaning many providers can work in the same category
- `latitude`, `longitude` as `BigDecimal` for high-precision GPS coordinates
- `averageRating`, `totalReviews`, `totalTasksCompleted` are denormalised aggregates maintained by database triggers

### 6.4 `ServiceCategory` Entity

Maps to `marketplace.service_categories`. A lookup/reference table.

- `name` has `unique = true`, enforced at both entity and database level
- `isActive` allows soft-disabling a category without deleting historical data

### 6.5 `Task` Entity

Maps to `marketplace.tasks`. The central business entity.

- `@ManyToOne` to `User` (the customer) via `customer_id`
- `@ManyToOne` to `ServiceCategory` via `category_id`
- `status` mapped as `@Enumerated(EnumType.STRING)`: `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `selectedQuotationId` stored as a plain `Long`, not a `@ManyToOne`, to avoid a circular JPA relationship between `Task` and `Quotation`

### 6.6 `Quotation` Entity

Maps to `marketplace.quotations`.

- `@ManyToOne` to `Task`, where one task receives many quotations
- `@ManyToOne` to `User` (the provider), where one provider submits many quotations
- `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"task_id", "service_provider_id"}))`, enforced at entity level
- `status` as `@Enumerated(EnumType.STRING)`: `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`

### 6.7 `Review` Entity

Maps to `marketplace.reviews`.

- `@OneToOne` to `Task` with `unique = true` on `task_id`, giving one review per task
- Two `@ManyToOne` relationships to `User`: one for the customer, one for the provider; stored directly to avoid expensive joins when loading review lists

### 6.8 `TaskNotification` Entity

Maps to `marketplace.task_notifications`.

- `@ManyToOne` to `Task` and `@ManyToOne` to `User` (provider)
- Composite unique constraint on `(task_id, service_provider_id)`
- `isViewed`, `isDeclined` track the provider's interaction with the notification
- `viewedAt`, `declinedAt` store when those interactions happened

### 6.9 `EmailVerificationToken` & `PasswordResetToken` Entities

Map to their respective token tables. Both follow the same pattern:
- `token` as `VARCHAR(255) UNIQUE`, the random string sent in the email link
- `expiresAt` marks when the token expires and becomes invalid
- Single-use flag (`verified` / `used`) prevents a token from being reused after the first successful use

---

## 7. Repository Layer

Repositories are Spring Data JPA interfaces. No implementation is written; Spring generates the SQL at startup based on method naming conventions and `@Query` annotations.

All repositories extend `JpaRepository<Entity, Long>` which provides `findById`, `findAll`, `save`, `delete`, and `count` automatically.

### Custom Query Methods

| Repository | Method | Purpose |
|---|---|---|
| `UserRepository` | `findByEmail` | Login: look up user by credential |
| `UserRepository` | `existsByEmail` | Registration: check uniqueness before insert |
| `ServiceProviderProfileRepository` | `findByCategoryId` | Find all providers in a category (first step of location matching) |
| `ServiceCategoryRepository` | `findByIsActiveTrue` | Return only usable categories to the frontend |
| `TaskRepository` | `findByCustomerIdOrderByCreatedAtDesc` | Customer dashboard: newest tasks first |
| `QuotationRepository` | `findByTaskIdAndServiceProviderId` | Check if a provider has already quoted on a task |
| `QuotationRepository` | `existsByTaskIdAndServiceProviderId` | Guard check before allowing a new quotation |
| `QuotationRepository` | `findByTaskIdAndStatus` | Get all PENDING quotes when one is accepted (to bulk-reject them) |
| `TaskNotificationRepository` | `countByServiceProviderIdAndIsViewedFalse` | Unread badge count on provider dashboard |
| `TaskNotificationRepository` | `existsByTaskIdAndServiceProviderId` | Verify provider was notified before allowing quotation |
| `ReviewRepository` | `existsByTaskId` | Prevent a second review being submitted for the same task |

Methods annotated with `@Transactional @Modifying` are used for bulk deletes:
- `deleteByTaskId` on `QuotationRepository`, `ReviewRepository`, and `TaskNotificationRepository`, used when a task is deleted to clean up all related records in one statement

---

## 8. Service Layer

Services contain all business logic. They receive data from controllers via DTOs, apply rules, interact with repositories, and return response DTOs. Entities never leave the service layer.

### 8.1 `AuthService`

The most complex service. Handles the full user lifecycle.

**Registration flow:**
1. Check email uniqueness (`userRepository.existsByEmail`)
2. Hash the password with `BCryptPasswordEncoder`
3. Save the `User` entity (`userType` set to CUSTOMER or SERVICE_PROVIDER)
4. Save the corresponding profile entity (`CustomerProfile` or `ServiceProviderProfile`)
5. Generate a random UUID verification token, save as `EmailVerificationToken` with 24-hour expiry
6. Send verification email via `EmailService` (async, so it does not block the registration response)
7. Generate a JWT and return `LoginResponse`; the user is logged in immediately after registering

**Why log in immediately after registration?**
Requiring a second login step after registration adds friction. The user is authenticated immediately so they can use the app. The email verification state controls access to actions that require a verified email.

**Login flow:**
1. Use Spring Security's `AuthenticationManager.authenticate()` to validate credentials
2. If authentication succeeds, generate a JWT from the authenticated principal
3. Return `LoginResponse` with the token and user details

**Delegating authentication to `AuthenticationManager`** is correct because Spring Security handles the BCrypt comparison, the `is_active` check via `UserDetailsImpl.isEnabled()`, and the account-locked check. The service does not re-implement these checks.

**Password reset flow:**
1. Look up user by email (silently succeed even if email not found, which prevents email enumeration attacks)
2. Generate a UUID token, save as `PasswordResetToken` with 1-hour expiry
3. Send reset email (async)
4. On reset: validate token exists, is not expired, is not used; hash new password; mark token as used

### 8.2 `ServiceCategoryService`

Simple read-only service. Fetches active categories and maps entities to `ServiceCategoryResponse` DTOs. No mutation logic.

### 8.3 `TaskService`

Handles the full task lifecycle.

**Task creation flow:**
1. Validate customer identity
2. Look up `ServiceCategory` entity by `categoryId`
3. Save `Task` entity
4. Call `LocationService.findProvidersWithinRadius()` for Haversine distance filtering
5. For each matched provider, save a `TaskNotification` record
6. Send notification email to each provider via `EmailService` (async)

**Task deletion:** Deletes associated notifications, quotations, and reviews before deleting the task. This is done explicitly in the service (using the `deleteByTaskId` repository methods) rather than relying on `ON DELETE CASCADE` in JPA, making the deletion behaviour explicit and visible in code.

**Access control in `getTaskById`:** A task can be viewed by its customer or by any provider who received a notification for it. This is verified by checking both the `customer_id` and the `task_notifications` table before returning the task.

### 8.4 `QuotationService`

Handles quotation submission and the accept/reject workflow.

**Quotation submission guard:**
Before saving a quotation, the service verifies:
1. A `TaskNotification` exists for this `(taskId, providerId)` pair, confirming the provider was actually invited
2. No existing quotation from this provider for this task, preventing duplicate quotes
3. The task is still `OPEN`, preventing quoting on already-assigned tasks

**Accept quotation flow:**
1. Verify the caller is the task's customer
2. Set accepted quotation status to `ACCEPTED`
3. Bulk-update all other `PENDING` quotations for the same task to `REJECTED`
4. Update task `status` to `IN_PROGRESS` and set `selectedQuotationId`
5. Send acceptance email to winning provider (async)
6. Send rejection emails to other providers (async)

**Why bulk-reject all other quotations atomically?**
When a customer accepts one quote, the decision is final. Leaving other quotations in `PENDING` state would be misleading to other providers who are waiting for a response. Bulk-rejecting them immediately keeps the data consistent and triggers the appropriate email notifications.

### 8.5 `ReviewService`

**Pre-conditions before saving a review:**
1. Task must have `COMPLETED` status; providers cannot be reviewed for incomplete work
2. The caller must be the task's customer
3. No review already exists for this task (`reviewRepository.existsByTaskId`); enforces one review per task in application code (the database also enforces this with a `UNIQUE` constraint on `task_id`)

**Why double-enforce in both application code and database?**
The database constraint is the ultimate safety net. The application-level check provides a meaningful error message to the user ("you have already reviewed this task") rather than a generic database constraint violation.

### 8.6 `NotificationService`

Loads `TaskNotification` records for a provider. Applies an additional filter: only returns notifications for tasks that are still `OPEN`. A provider does not need to see notifications for tasks that are already `IN_PROGRESS` (assigned to someone else) or `COMPLETED`.

The `mapToNotificationResponse` method:
- Calculates the distance from the provider's location to the task location using `LocationService`
- Checks whether the provider has already submitted a quotation for this task (`quotationRepository.existsByTaskIdAndServiceProviderId`) and sets `hasQuotation` flag on the response

### 8.7 `EmailService`

All methods are annotated with `@Async`. Emails are sent on a background thread from Spring's task executor pool. The calling service (AuthService, TaskService, etc.) does not wait for the email to send before returning a response to the user.

**Why async email?**
SMTP connections take time. Synchronous email sending would add hundreds of milliseconds to every registration, task creation, and quotation action. Making it async means these API responses are instant from the user's perspective, and email delivery happens in the background.

**Email types:**
- Task notification to providers (contains task title, address, budget, preferred date)
- Quotation submitted notification to customer
- Quotation accepted notification to winning provider
- Quotation rejected notification to declined providers
- Email address verification link
- Password reset link

### 8.8 `LocationService`

**Haversine formula implementation:**

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
c = 2 × atan2(√a, √(1−a))
distance = R × c    (R = 6371 km, Earth's mean radius)
```

`findProvidersWithinRadius(latitude, longitude, radiusKm, categoryId)`:
1. Load all providers with the matching `categoryId` from the database
2. For each provider, calculate Haversine distance between provider location and task location
3. Return only providers where distance is less than or equal to `radiusKm`

**Why load all category providers and filter in Java, not in SQL?**
Haversine requires trigonometric calculations. PostgreSQL can perform these (using the `earth_distance` extension or custom functions), but the current schema does not use PostGIS. The provider set filtered by category is typically small enough that in-memory filtering with Haversine is fast. If provider counts scale significantly, this is a candidate for a PostGIS-based query.

---

## 9. Controller Layer

Controllers are thin. They:
1. Accept validated request DTOs
2. Extract the authenticated user identity from `SecurityContextHolder`
3. Call one service method
4. Return a `ResponseEntity` with the appropriate HTTP status

Controllers do not contain business logic, data transformation logic, or repository calls.

### 9.1 `AuthController` - `/api/auth/**` (Public)

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/register/customer` | `RegisterCustomerRequest` | `LoginResponse` | 201 |
| POST | `/register/provider` | `RegisterProviderRequest` | `LoginResponse` | 201 |
| POST | `/login` | `LoginRequest` | `LoginResponse` | 200 |
| POST | `/forgot-password` | `ForgotPasswordRequest` | `ApiResponse` | 200 |
| POST | `/reset-password` | `ResetPasswordRequest` | `ApiResponse` | 200 |
| GET | `/verify-email/{token}` | Path variable | `ApiResponse` | 200 |

### 9.2 `ServiceCategoryController` - `/api/categories/**` (Public)

| Method | Path | Response | Status |
|---|---|---|---|
| GET | `/` | `List<ServiceCategoryResponse>` | 200 |
| GET | `/{id}` | `ServiceCategoryResponse` | 200 |

### 9.3 `CustomerController` - `/api/customer/**` (CUSTOMER role required)

**Task Management:**

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/tasks` | `CreateTaskRequest` | `TaskResponse` | 201 |
| GET | `/tasks` | - | `List<TaskResponse>` | 200 |
| GET | `/tasks/{taskId}` | - | `TaskResponse` | 200 |
| PUT | `/tasks/{taskId}/status` | `?status=` (query param) | `ApiResponse` | 200 |
| DELETE | `/tasks/{taskId}` | - | `ApiResponse` | 200 |
| GET | `/tasks/{taskId}/providers` | - | `List<ServiceProviderResponse>` | 200 |

**Quotation Management:**

| Method | Path | Response | Status |
|---|---|---|---|
| GET | `/tasks/{taskId}/quotations` | `List<QuotationResponse>` | 200 |
| PUT | `/quotations/{quotationId}/accept` | `ApiResponse` | 200 |
| PUT | `/quotations/{quotationId}/reject` | `ApiResponse` | 200 |

**Review Management:**

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/reviews` | `CreateReviewRequest` | `ReviewResponse` | 201 |
| GET | `/reviews/task/{taskId}` | - | `ReviewResponse` | 200 |

### 9.4 `ProviderController` - `/api/provider/**` (SERVICE_PROVIDER role required)

**Notification Management:**

| Method | Path | Response | Status |
|---|---|---|---|
| GET | `/notifications` | `List<NotificationResponse>` | 200 |
| GET | `/notifications/unviewed` | `List<NotificationResponse>` | 200 |
| GET | `/notifications/unviewed-count` | `Long` | 200 |
| PUT | `/notifications/{notificationId}/view` | `ApiResponse` | 200 |
| PUT | `/notifications/{notificationId}/decline` | `ApiResponse` | 200 |

**Quotation Management:**

| Method | Path | Request | Response | Status |
|---|---|---|---|---|
| POST | `/quotations` | `CreateQuotationRequest` | `QuotationResponse` | 201 |
| GET | `/quotations` | - | `List<QuotationResponse>` | 200 |
| PUT | `/quotations/{quotationId}/withdraw` | - | `ApiResponse` | 200 |

**Review Management:**

| Method | Path | Response | Status |
|---|---|---|---|
| GET | `/reviews` | `List<ReviewResponse>` | 200 |

---

## 10. DTO Design

DTOs (Data Transfer Objects) are plain Java classes used as the API contract. They separate the API shape from the database entity shape.

### Request DTOs: Incoming Data

All request DTOs use Bean Validation annotations (`@NotBlank`, `@Email`, `@NotNull`, `@Size`, `@Min`, `@Max`, `@DecimalMin`, `@DecimalMax`). Invalid requests are rejected by Spring MVC before reaching the service layer, and the `GlobalExceptionHandler` returns structured field-level error details.

| DTO | Key Validations |
|---|---|
| `LoginRequest` | `@Email` on email, `@NotBlank` on password |
| `RegisterCustomerRequest` | `@Email`, `@Size(min=6)` on password |
| `RegisterProviderRequest` | `@DecimalMin/Max` on lat/lon, `@Min(1) @Max(200)` on radius |
| `CreateTaskRequest` | `@DecimalMin/Max` on coordinates, `@Min(1) @Max(200)` on search radius |
| `CreateQuotationRequest` | `@DecimalMin("0.01")` on price; zero or negative price is rejected at validation |
| `CreateReviewRequest` | `@Min(1) @Max(5)` on rating; scale is enforced before reaching the service |

### Response DTOs: Outgoing Data

Response DTOs are constructed by the service layer from entity data. They include computed or joined fields that are not stored in a single table.

| DTO | Notable Fields |
|---|---|
| `LoginResponse` | JWT token and user identity in one response |
| `QuotationResponse` | Provider's `averageRating` and `totalReviews`, joined from `ServiceProviderProfile` |
| `NotificationResponse` | `distanceKm` computed by Haversine at response time; `hasQuotation` checked against the quotation table |
| `TaskResponse` | `quotationCount`, the count of quotations submitted for this task |
| `ServiceProviderResponse` | `distanceKm`, distance from task to provider, included when listing notified providers |

**Why include computed fields in response DTOs instead of making the frontend calculate them?**
`distanceKm` requires the provider's GPS coordinates and the task's GPS coordinates plus the Haversine formula. Sending raw coordinates and having the frontend do the math is possible, but it duplicates business logic. The backend computes it once and sends the ready-to-display value.

---

## 11. Exception Handling

A single `@RestControllerAdvice` class (`GlobalExceptionHandler`) intercepts all exceptions thrown from any controller and converts them to a consistent `ErrorResponse` JSON structure.

```json
{
  "status": 404,
  "error": "Not Found",
  "message": "Task not found with id: 42",
  "path": "/api/customer/tasks/42"
}
```

### Custom Exception Classes

| Exception | HTTP Status | When Thrown |
|---|---|---|
| `ResourceNotFoundException` | 404 | Entity not found by ID |
| `BadRequestException` | 400 | Business rule violation (already reviewed, task not OPEN, etc.) |
| `UnauthorizedException` | 401 | Caller does not own the resource they are trying to act on |

### Framework Exception Mappings

| Exception | HTTP Status | Scenario |
|---|---|---|
| `BadCredentialsException` | 401 | Wrong password at login |
| `UsernameNotFoundException` | 404 | Email not found at login |
| `MethodArgumentNotValidException` | 400 | Bean Validation failure; returns per-field error list |

**Why a centralised exception handler?**
Without it, every service method and controller method would need try/catch blocks to return proper HTTP responses. With `@RestControllerAdvice`, exception handling is defined once. Services throw semantically meaningful exceptions and the handler converts them to HTTP responses.

---

## 12. The Full Request Lifecycle

Tracing a complete example: **a customer creates a task**.

```
POST /api/customer/tasks
Authorization: Bearer <jwt>
Body: { "title": "Fix leaking pipe", "categoryId": 2, "latitude": 6.9271, "longitude": 79.8612,
        "address": "...", "searchRadiusKm": 30, "budgetMin": 5000, "budgetMax": 15000 }

1. JwtAuthenticationFilter
   - Extracts JWT, validates signature & expiry
   - Loads UserDetailsImpl for userId=1 from database
   - Sets authentication in SecurityContextHolder

2. Spring Security path matcher
   - Path /api/customer/** requires ROLE_CUSTOMER
   - Principal has ROLE_CUSTOMER → allowed

3. CustomerController.createTask()
   - @Valid triggers Bean Validation on CreateTaskRequest
   - Extracts userId=1 from SecurityContextHolder
   - Calls taskService.createTask(request, 1)

4. TaskService.createTask()
   - Loads User entity for userId=1
   - Loads ServiceCategory for categoryId=2
   - Saves Task entity (status=OPEN)
   - Calls locationService.findProvidersWithinRadius(6.9271, 79.8612, 30, 2)

5. LocationService.findProvidersWithinRadius()
   - Loads all ServiceProviderProfiles with categoryId=2
   - Applies Haversine formula to each
   - Returns List<ServiceProviderProfile> within 30km

6. TaskService (continued)
   - For each provider: saves TaskNotification record
   - For each provider: calls emailService.sendTaskNotificationEmail() [async]

7. EmailService (background thread)
   - Connects to Gmail SMTP
   - Sends HTML email to each provider

8. CustomerController (back on main thread)
   - Returns ResponseEntity<TaskResponse>(HTTP 201)
   - Response includes taskId, status=OPEN, matching provider count

Total synchronous time: database writes + location calculation
Email delivery: background, does not block response
```

---

## 13. The Business Workflow Through the Backend

**Step 1: Registration**
`POST /api/auth/register/customer` or `/register/provider` → `AuthService.registerCustomer/Provider()` → saves `User` + profile → sends verification email → returns JWT

**Step 2: Task Creation**
`POST /api/customer/tasks` → `TaskService.createTask()` → saves `Task` → finds providers via `LocationService` → saves `TaskNotification` per provider → sends emails

**Step 3: Provider Checks Notifications**
`GET /api/provider/notifications` → `NotificationService.getProviderNotifications()` → returns OPEN tasks with distance and quotation status

**Step 4: Provider Submits Quotation**
`POST /api/provider/quotations` → `QuotationService.submitQuotation()` → validates notification exists → saves `Quotation` → notifies customer by email

**Step 5: Customer Reviews Quotations**
`GET /api/customer/tasks/{taskId}/quotations` → `QuotationService.getQuotationsByTask()` → returns all quotations with provider ratings

**Step 6: Customer Accepts Quotation**
`PUT /api/customer/quotations/{quotationId}/accept` → `QuotationService.acceptQuotation()` → updates accepted quotation → bulk-rejects others → updates task to IN_PROGRESS → emails all providers

**Step 7: Customer Marks Task Complete**
`PUT /api/customer/tasks/{taskId}/status?status=COMPLETED` → `TaskService.updateTaskStatus()` → updates task status (database trigger fires: increments provider's total_tasks_completed, sets completed_at)

**Step 8: Customer Submits Review**
`POST /api/customer/reviews` → `ReviewService.createReview()` → validates task is COMPLETED → saves `Review` (database trigger fires: recalculates provider's average_rating)

---

## 14. `MarketplaceApplication` Entry Point

```java
@SpringBootApplication
@EnableAsync
public class MarketplaceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MarketplaceApplication.class, args);
    }
}
```

`@EnableAsync` activates Spring's asynchronous method execution. Without this annotation, `@Async` on `EmailService` methods has no effect; they would execute synchronously on the calling thread. This single annotation is what makes email sending non-blocking.

---

## 15. Summary of Design Decisions

| Decision | Rationale |
|---|---|
| Layered architecture (Controller, Service, Repository) | Each layer has one responsibility; layers are independently testable |
| JWT stateless auth | No session store needed; works across separate frontend/backend processes |
| `userId` as JWT subject | Email can change; user ID is immutable |
| `ddl-auto=validate` | Schema controlled by SQL scripts, not auto-generated; prevents accidental data loss |
| `@Enumerated(EnumType.STRING)` | Human-readable database values; safe against enum reordering |
| Entities never cross service boundary | API shape and database shape change independently |
| Bean Validation on request DTOs | Invalid input rejected before reaching business logic |
| Centralised `@RestControllerAdvice` | Consistent error response format; no per-controller try/catch |
| Async email via `@EnableAsync` | API responses are not delayed by SMTP latency |
| Haversine in Java, not SQL | No PostGIS dependency; acceptable at current provider scale |
| Explicit `deleteByTaskId` before task delete | Deletion behaviour visible in code, not hidden in cascade annotations |
| Separate `ErrorResponse` DTO | Uniform error shape for all failures; frontend can parse predictably |
