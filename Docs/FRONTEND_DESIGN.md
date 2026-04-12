# Frontend Design - Service Marketplace Platform

## Overview

This document explains the complete frontend design of the Service Marketplace Platform, the reasoning behind every decision, how each part of the UI was conceived, why the architecture was structured the way it is, and how the code supports the real-world experience of both customers and service providers.

---

## 1. Design Philosophy & Thinking Process

Before writing a single line of React, the design process started with one fundamental question: **what does each type of user need to do, and what is the simplest interface that lets them do it?**

The application serves two very different roles. A customer needs to describe a job, pick a location, set a budget, and then wait for quotes to come in. A service provider needs to see nearby jobs, decide whether to quote, and track the status of their submissions. These are completely separate workflows. The frontend is structured to reflect this separation clearly.

Three guiding principles:

1. **Role-based separation:** customers and providers never share the same pages or navigation. Each role has its own URL namespace, its own dashboard, and its own set of actions. There is no ambiguity about which interface a user is looking at.
2. **Keep state minimal:** the only global state is the authenticated user. Everything else (task lists, quotation data, notifications) is fetched fresh when the relevant page loads. This avoids complex synchronisation problems and keeps the codebase straightforward.
3. **Let the backend enforce rules:** the frontend validates forms for usability (empty fields, bad email format), but business rules (a provider cannot quote without being notified, a review requires a completed task) are enforced on the server. The frontend simply surfaces the error message the backend returns.

---

## 2. Technology Stack

| Technology | Version | Role |
|---|---|---|
| React | 18.2.0 | UI framework |
| TypeScript | 4.9.5 | Type safety across the codebase |
| React Router DOM | 6.20.1 | Client-side routing and navigation |
| Axios | 1.6.2 | HTTP client for all API calls |
| React Hook Form | 7.48.2 | Form state management and validation |
| Leaflet | 1.9.4 | Interactive map rendering |
| React Leaflet | 4.2.1 | React bindings for Leaflet |
| Create React App | - | Build toolchain and dev server |

**Why React with TypeScript?**
TypeScript catches mismatches between what the API returns and what the component expects, before the code runs. In a marketplace application where a missing field (for example, a `null` provider rating) can silently break a UI card, having the compiler enforce the shape of every API response is a significant safety net.

**Why React Hook Form over controlled inputs?**
Forms like task creation and provider registration have many fields. Managing each field with `useState` produces verbose, repetitive code. React Hook Form tracks field values in an uncontrolled manner (using refs), which means fewer re-renders on each keystroke and less boilerplate per field.

**Why Leaflet over Google Maps?**
Leaflet with OpenStreetMap tiles requires no API key and has no usage-based billing. For a university project or early-stage application, this removes a dependency on paid services entirely. The Leaflet API is also well-suited to the two map use cases here: picking a location during registration/task creation and displaying a task alongside nearby providers.

---

## 3. Project Structure

```
frontend/
├── public/
│   └── index.html                    <- HTML shell, contains <div id="root">
└── src/
    ├── App.tsx                        <- Router setup, all route definitions
    ├── index.tsx                      <- React entry point, mounts AuthProvider
    ├── index.css                      <- Global styles, shared utility classes
    ├── context/
    │   └── AuthContext.tsx            <- Global auth state, useAuth hook
    ├── services/
    │   ├── api.ts                     <- Axios instance, JWT interceptor, 401 handler
    │   ├── authService.ts             <- Registration, login, password reset, verify email
    │   ├── taskService.ts             <- Task CRUD + category fetching
    │   ├── quotationService.ts        <- Quotation submit, accept, reject, withdraw
    │   ├── notificationService.ts     <- Provider notification read/decline/count
    │   ├── reviewService.ts           <- Review submit and fetch
    │   └── nominatimService.ts        <- Address search and reverse geocoding
    ├── types/
    │   ├── user.ts                    <- LoginResponse, RegisterCustomerRequest, RegisterProviderRequest
    │   ├── task.ts                    <- Task, CreateTaskRequest, ServiceCategory
    │   ├── quotation.ts               <- Quotation, ServiceProvider, CreateQuotationRequest
    │   └── notification.ts            <- Notification type
    ├── components/
    │   ├── Navbar.tsx                 <- Role-aware navigation bar
    │   ├── ProtectedRoute.tsx         <- Auth and role guard for routes
    │   ├── LocationPicker.tsx         <- Interactive map for location selection
    │   └── TaskMap.tsx                <- Map showing task location and nearby providers
    └── pages/
        ├── LoginPage.tsx
        ├── RegisterPage.tsx
        ├── VerifyEmailPage.tsx
        ├── ForgotPasswordPage.tsx     <- Email entry form for password reset
        ├── ResetPasswordPage.tsx      <- New password form (reads ?token= from URL)
        ├── customer/
        │   ├── Dashboard.tsx          <- Customer task list
        │   ├── CreateTask.tsx         <- Task creation form
        │   └── TaskDetails.tsx        <- Task detail, quotations, map, review
        └── provider/
            ├── Dashboard.tsx          <- Provider stats with clickable tab panels
            ├── Notifications.tsx      <- Task notification list with inline actions
            └── TaskDetail.tsx         <- Single task detail with quotation form
```

**Why split pages into `customer/` and `provider/` subfolders?**
Both roles have a `Dashboard.tsx` file. Without the subfolder separation, the filenames would collide and the intent of each file would be unclear. The folder structure mirrors the URL structure (`/customer/*` and `/provider/*`), making it easy to navigate from a route definition straight to the file that handles it.

---

## 4. Entry Point and App Shell

### 4.1 `index.tsx`

```tsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

`AuthProvider` wraps the entire application so that any component at any depth can access the current user's identity without prop drilling. `React.StrictMode` enables additional development-time warnings.

### 4.2 `App.tsx`

`App.tsx` defines the complete route table. It contains no business logic and no state. Its only responsibility is mapping URL paths to the correct page component, wrapped in a `ProtectedRoute` where authentication or a specific role is required.

```tsx
<BrowserRouter>
  <Navbar />
  <Routes>
    <Route path="/login"                 element={<LoginPage />} />
    <Route path="/register"              element={<RegisterPage />} />
    <Route path="/verify-email/:token"   element={<VerifyEmailPage />} />
    <Route path="/forgot-password"       element={<ForgotPasswordPage />} />
    <Route path="/reset-password"        element={<ResetPasswordPage />} />

    <Route path="/customer/dashboard"    element={<ProtectedRoute requiredRole="CUSTOMER"><CustomerDashboard /></ProtectedRoute>} />
    <Route path="/customer/create-task"  element={<ProtectedRoute requiredRole="CUSTOMER"><CreateTask /></ProtectedRoute>} />
    <Route path="/customer/tasks/:taskId" element={<ProtectedRoute requiredRole="CUSTOMER"><TaskDetails /></ProtectedRoute>} />

    <Route path="/provider/dashboard"    element={<ProtectedRoute requiredRole="SERVICE_PROVIDER"><ProviderDashboard /></ProtectedRoute>} />
    <Route path="/provider/notifications" element={<ProtectedRoute requiredRole="SERVICE_PROVIDER"><Notifications /></ProtectedRoute>} />
    <Route path="/provider/tasks/:notificationId" element={<ProtectedRoute requiredRole="SERVICE_PROVIDER"><ProviderTaskDetail /></ProtectedRoute>} />

    <Route path="/" element={<Navigate to="/login" />} />
  </Routes>
</BrowserRouter>
```

`Navbar` sits outside `<Routes>` so it renders persistently on every page. The default route (`/`) redirects to `/login` for unauthenticated visitors.

---

## 5. Authentication and State Management

### 5.1 `AuthContext.tsx`

Authentication is the only piece of truly global state in the application. It is managed by a React Context provider.

**State:**
- `user: LoginResponse | null` stores the full login response (JWT token, userId, email, first name, last name, userType)
- `loading: boolean` is `true` only during the initial mount while the context checks localStorage for an existing session

**Methods exposed on the context:**
- `login(email, password)` calls the auth service, stores the response in both state and localStorage, and returns
- `logout()` clears localStorage and resets `user` to `null`
- `setUser(user)` allows a page to manually update the stored user (used after email verification)

**Computed properties:**
- `isAuthenticated` returns `true` when `user` is not null
- `isCustomer` returns `true` when `user.userType === 'CUSTOMER'`
- `isProvider` returns `true` when `user.userType === 'SERVICE_PROVIDER'`

**Persistence:**
The JWT token and the serialised user object are written to `localStorage` on login and read back on page load. This means the user stays logged in across browser refreshes without needing to call the server again.

**Why Context API instead of Redux or Zustand?**
The only shared state is the identity of the logged-in user. A full state management library (Redux, Zustand) solves problems that do not exist here: complex multi-slice state, time-travel debugging, middleware pipelines. Context API is sufficient and adds no extra dependencies.

### 5.2 `useAuth()` Custom Hook

```tsx
const { user, login, logout, isAuthenticated, isCustomer, isProvider } = useAuth();
```

`useAuth()` is exported from `AuthContext.tsx` and wraps `useContext(AuthContext)`. Every component that needs to know who is logged in calls this hook. No component imports or reads from localStorage directly.

---

## 6. API Layer

### 6.1 `api.ts` - The Axios Instance

A single Axios instance is created with a base URL of `http://localhost:8080/api`. All service files import this instance rather than calling `axios.create()` themselves. This ensures that every HTTP call in the application goes through the same configuration.

**Request interceptor:**
Before every outgoing request, the interceptor reads the JWT token from `localStorage` and attaches it as the `Authorization: Bearer <token>` header. This means individual service functions never need to handle token attachment manually.

**Response interceptor:**
When any API call returns a `401 Unauthorized` response, the interceptor clears `localStorage` (removing the stale token) and redirects the browser to `/login`. This handles token expiry transparently: the user is sent back to login regardless of which page they were on.

**Why a centralised interceptor instead of per-request token attachment?**
If each service function attached the token manually, forgetting to add it in one place would cause a silent authorisation failure. A single interceptor applied to all requests means the token is always present on every call without any per-function effort.

### 6.2 Service Files

Each service file contains functions that map directly to backend endpoint groups. No service file contains UI logic.

**`authService.ts`**

| Function | Method | Endpoint |
|---|---|---|
| `registerCustomer(data)` | POST | `/auth/register/customer` |
| `registerProvider(data)` | POST | `/auth/register/provider` |
| `login(email, password)` | POST | `/auth/login` |
| `forgotPassword(email)` | POST | `/auth/forgot-password` |
| `resetPassword(token, newPassword)` | POST | `/auth/reset-password` |
| `verifyEmail(token)` | GET | `/auth/verify-email/{token}` |

**`taskService.ts`**

| Function | Method | Endpoint |
|---|---|---|
| `getAllCategories()` | GET | `/categories` |
| `getCategoryById(id)` | GET | `/categories/{id}` |
| `createTask(data)` | POST | `/customer/tasks` |
| `getMyTasks()` | GET | `/customer/tasks` |
| `getTaskById(id)` | GET | `/customer/tasks/{id}` |
| `updateTaskStatus(taskId, status)` | PUT | `/customer/tasks/{taskId}/status` |
| `getNotifiedProviders(taskId)` | GET | `/customer/tasks/{taskId}/providers` |
| `deleteTask(taskId)` | DELETE | `/customer/tasks/{taskId}` |

**`quotationService.ts`**

| Function | Method | Endpoint |
|---|---|---|
| `getTaskQuotations(taskId)` | GET | `/customer/tasks/{taskId}/quotations` |
| `acceptQuotation(quotationId)` | PUT | `/customer/quotations/{quotationId}/accept` |
| `rejectQuotation(quotationId)` | PUT | `/customer/quotations/{quotationId}/reject` |
| `submitQuotation(data)` | POST | `/provider/quotations` |
| `getMyQuotations()` | GET | `/provider/quotations` |
| `withdrawQuotation(quotationId)` | PUT | `/provider/quotations/{quotationId}/withdraw` |

**`notificationService.ts`**

| Function | Method | Endpoint |
|---|---|---|
| `getNotifications()` | GET | `/provider/notifications` |
| `getUnviewedNotifications()` | GET | `/provider/notifications/unviewed` |
| `getUnviewedCount()` | GET | `/provider/notifications/unviewed-count` |
| `markAsViewed(notificationId)` | PUT | `/provider/notifications/{notificationId}/view` |
| `declineTask(notificationId)` | PUT | `/provider/notifications/{notificationId}/decline` |

**`reviewService.ts`**

| Function | Method | Endpoint |
|---|---|---|
| `createReview(data)` | POST | `/customer/reviews` |
| `getTaskReview(taskId)` | GET | `/customer/reviews/task/{taskId}` |
| `getMyReviews()` | GET | `/provider/reviews` |

**`nominatimService.ts`**

This service does not call the backend. It calls the OpenStreetMap Nominatim API for geolocation features.

| Function | Purpose |
|---|---|
| `searchPlaces(query)` | Text search returning up to 5 place results (1 second debounce) |
| `reverseGeocode(lat, lon)` | Convert GPS coordinates into a human-readable address |
| `geocodeAddress(address)` | Convert a text address into GPS coordinates |
| `formatAddress(addressObj)` | Parse and format Nominatim address components into a single string |

A custom `User-Agent` header is set on all Nominatim requests as required by the Nominatim usage policy.

---

## 7. TypeScript Types

All API request and response shapes are defined as TypeScript interfaces in the `types/` folder.

### `user.ts`
- `LoginResponse` - JWT token, userId, email, firstName, lastName, userType
- `RegisterCustomerRequest` - email, password, firstName, lastName, phoneNumber, address
- `RegisterProviderRequest` - extends customer fields with categoryId, businessName, bio, yearsOfExperience, latitude, longitude, address, serviceRadiusKm
- `UserType` - enum: `'CUSTOMER'` | `'SERVICE_PROVIDER'`

### `task.ts`
- `Task` - full task object as returned by the API (id, title, description, status, coordinates, budget, quotation count, etc.)
- `CreateTaskRequest` - fields required to create a task
- `ServiceCategory` - id, name, description, iconUrl

### `quotation.ts`
- `Quotation` - full quotation object with provider details (name, rating, reviews) and status
- `ServiceProvider` - provider profile including location, rating, and distance
- `CreateQuotationRequest` - taskId, price, estimatedDuration, message
- `QuotationStatus` - enum: `'PENDING'` | `'ACCEPTED'` | `'REJECTED'` | `'WITHDRAWN'`

### `notification.ts`
- `Notification` - task summary, coordinates, budget, distance, isViewed, isDeclined, hasQuotation

**Why define types separately from service files?**
Types are imported by both service files (to type return values) and by page components (to type state variables). If they lived inside service files, components importing a type would also implicitly depend on the service file, which is the wrong dependency direction.

---

## 8. Component Design

### 8.1 `ProtectedRoute.tsx`

```tsx
<ProtectedRoute requiredRole="CUSTOMER">
  <CustomerDashboard />
</ProtectedRoute>
```

`ProtectedRoute` wraps any route that requires authentication. It reads `loading`, `isAuthenticated`, and `user` from `useAuth()`.

- While `loading` is true: renders a spinner (prevents flashing the login redirect on page refresh)
- If not authenticated: redirects to `/login`
- If `requiredRole` is provided and the user's role does not match: redirects to their correct dashboard
- Otherwise: renders `children`

This component is the single place in the entire application where route-level auth and role checks live. Individual page components do not repeat these checks.

### 8.2 `Navbar.tsx`

The navigation bar is rendered on every page. It reads the auth state from `useAuth()` and renders different links depending on the result.

- Unauthenticated: Login and Register links
- Customer: Dashboard and Create Task links, plus the user's name and a logout button
- Provider: Dashboard and Notifications links, plus the user's name and a logout button

Logout calls `authContext.logout()` and navigates to `/login`.

### 8.3 `LocationPicker.tsx`

Used on the provider registration form and the task creation form. It allows the user to specify a location in three ways:

1. **Current location button:** calls `navigator.geolocation.getCurrentPosition()`, then uses `nominatimService.reverseGeocode()` to turn the coordinates into a readable address
2. **Address search box:** debounced input that calls `nominatimService.searchPlaces()` and displays a dropdown of results
3. **Click on map:** a Leaflet click handler picks up the clicked coordinates and reverse-geocodes them

When any of these methods produces a location, the `onLocationChange(lat, lon, address)` callback is called, passing the values up to the parent form. The picker also accepts a `radiusKm` prop: when provided, it renders a circle on the map showing the search or service radius, which gives the user a visual sense of coverage.

**Why put the location picker in a shared component rather than in each form?**
Both provider registration and task creation need location input. Duplicating the map setup, geocoding logic, and UI in two places would make any future changes (for example, switching from Nominatim to a different geocoding service) require two edits. One component means one change.

### 8.4 `TaskMap.tsx`

Used on the `TaskDetails` page. It takes a `task` object and an optional `providers` array and renders a Leaflet map showing:

- A red marker at the task's location with a popup showing the task title and address
- A circle representing the task's search radius
- Green markers for each notified provider, with popups showing provider name, rating, business name, and distance from the task
- A map legend explaining the marker colours

The distance shown in each provider popup is calculated client-side using the same Haversine formula as the backend, applied to the task coordinates and the provider coordinates returned in the API response.

---

## 9. Pages

### 9.1 `LoginPage.tsx`

Renders an email and password form. On submit, calls `authContext.login()`. On success, redirects to the correct dashboard based on `user.userType`. On failure, displays the error message from the API response.

A centred "Forgot password?" link below the Login button navigates to `/forgot-password`. If the user arrives here after successfully resetting their password, a success message is shown (passed via React Router navigation state).

### 9.2 `RegisterPage.tsx`

Renders a toggle between two registration forms: Customer and Provider. The title and role-selection buttons are only shown while the form is visible; they are hidden once registration succeeds.

**Customer form fields:** email, password, first name, last name, phone number, address

**Provider form fields:** all customer fields plus category (dropdown loaded from `GET /categories`), business name, bio, years of experience, service radius, and a `LocationPicker` component for setting the provider's location.

On successful registration, the form and header are replaced with a success message showing the email address and instructions to verify. No login link is shown on the success screen; the user navigates away manually.

### 9.2a `ForgotPasswordPage.tsx`

Accessible at `/forgot-password`. Renders a single email input. On submit, calls `authService.forgotPassword(email)`. On success, replaces the form with a confirmation message. The backend sends the reset link even if the email is not found (to prevent email enumeration), so success is shown regardless.

### 9.2b `ResetPasswordPage.tsx`

Accessible at `/reset-password?token=<uuid>`. Reads the token from the URL query string using `useSearchParams`. Renders new password and confirm password fields. On submit, calls `authService.resetPassword(token, newPassword)`. On success, navigates to `/login` with a success message in router state.

### 9.3 `VerifyEmailPage.tsx`

This page is reached when the user clicks the verification link in their email. The token is extracted from the URL parameter. On mount, it calls `authService.verifyEmail(token)` automatically. It shows a loading spinner while the request is in progress, a success message with a redirect to login on completion, or an error message if the token is invalid or expired.

### 9.4 Customer `Dashboard.tsx`

Loads all tasks for the logged-in customer using `taskService.getMyTasks()` on mount. Renders a list of task cards, each showing the title, category, status badge, creation date, and budget range. Each card links to `TaskDetails`. A delete button on each card calls `taskService.deleteTask()` after a browser confirmation dialog, then removes the task from the local list without re-fetching.

### 9.5 Customer `CreateTask.tsx`

A multi-field form for creating a task. Categories are loaded from `GET /categories` when the page mounts and populated into a dropdown. The location field uses the `LocationPicker` component. Budget fields are optional. On submit, calls `taskService.createTask()` and navigates to the customer dashboard on success.

**Why load categories on the create-task page rather than caching them globally?**
Categories change infrequently, but fetching them fresh on each form load ensures the list is always accurate. Given that this is a form page the user opens deliberately, a small network request on mount is not a performance concern.

### 9.6 Customer `TaskDetails.tsx`

The most data-rich page in the customer interface. On mount it loads:
- Task data (`GET /customer/tasks/{taskId}`)
- Quotations for the task (`GET /customer/tasks/{taskId}/quotations`)
- Notified providers (`GET /customer/tasks/{taskId}/providers`) for the map
- Existing review if the task is completed (`GET /customer/reviews/task/{taskId}`)

The page renders:
- Task information panel (title, description, status, location, budget, preferred date)
- `TaskMap` component showing the task location and all notified providers
- Quotations list with each provider's name, rating, price, duration estimate, and message; with Accept and Reject buttons when the task is `OPEN`
- A status update button to mark the task as `COMPLETED` once it is `IN_PROGRESS`
- A review form (rating 1-5 and optional comment) after the task is completed and no review exists yet

Accepting a quotation refreshes the task data and scrolls to the top of the page so the customer can immediately see the updated status and the "Mark as Completed" button.

Marking a task as completed keeps the user on the same page, auto-opens the review form, and smoothly scrolls down to the review section. Leaving a review is optional.

The Delete Task button is hidden for tasks with `COMPLETED` status — completed tasks cannot be deleted.

### 9.7 Provider `Dashboard.tsx`

Loads provider quotations, reviews, and all notifications on mount. Displays four clickable stat cards at the top:

| Card | Colour | Detail panel when clicked |
|---|---|---|
| New Notifications | Blue | Open tasks with no quotation submitted yet |
| Pending Quotations | Orange | All quotations with status `PENDING` |
| Accepted Quotations | Green | All quotations with status `ACCEPTED` |
| Total Reviews | Red | All reviews received |

Clicking a card toggles a detail panel below the stat cards. Clicking the same card again collapses it. Active cards are highlighted with a blue border.

When no card is active (default view), two summary sections appear below the stats:
- **Recent Quotations** — the two most recent quotations with task name, price, and status badge
- **Recent Reviews** — the two most recent reviews with customer name and rating

These summary sections are hidden while any tab panel is open.

Clicking a task in the New Notifications panel navigates to `/provider/tasks/:notificationId` with the notification data passed via router state.

### 9.8 Provider `Notifications.tsx`

Loads all notifications on mount using `notificationService.getNotifications()`. Renders a list of notification cards, each showing:
- Task title, category, description, address, budget range, preferred date
- Distance from the provider to the task
- Time the notification was created
- Status badges: `QUOTATION SUBMITTED` or `DECLINED`
- For actionable tasks: a **Submit Quote** button and a **Decline** button

Clicking **Submit Quote** navigates to `/provider/tasks/:notificationId` passing the notification as router state, where the quotation form is shown on a dedicated page.

Clicking **Decline** calls `notificationService.declineTask()` immediately (no confirmation dialog) and reloads the list. The card then shows the `DECLINED` badge with a disabled button.

Unread notifications are highlighted with a blue left border and a light blue background.

### 9.9 Provider `TaskDetail.tsx`

Accessible at `/provider/tasks/:notificationId`. Receives the full notification object from router state (passed by the dashboard or the notifications list). If no state is available, fetches all notifications and finds the matching one by ID.

Marks the notification as viewed on mount if not already viewed.

Renders:
- Task details card (category, customer name, location, distance, budget, preferred date, description)
- Quotation form card with fields for price (LKR), estimated duration (days), and optional message; plus **Submit Quotation** and **Decline Task** buttons
- If already quoted: a confirmation message
- If already declined: a declined message

On submit or decline, navigates back using the browser history (`navigate(-1)`), returning the user to whichever page they came from (dashboard or notifications list).

---

## 10. Styling

### 10.1 Approach

The application uses plain CSS in a single global stylesheet (`index.css`). There is no CSS framework, no Tailwind, and no CSS-in-JS library. Component-specific or dynamic styles are applied as inline style objects.

**Why plain CSS?**
For an application of this scope and team size, a full CSS framework adds learning overhead and generated class complexity with little benefit. Plain CSS gives full control over every visual rule without build-time processing.

### 10.2 Colour Palette

| Role | Colour |
|---|---|
| Primary (buttons, links) | `#3498db` (blue) |
| Success (complete, accept) | `#27ae60` (green) |
| Danger (delete, reject) | `#e74c3c` (red) |
| Secondary (neutral actions) | `#95a5a6` (gray) |
| Page background | `#f5f5f5` (light gray) |
| Text and navbar | `#2c3e50` (dark navy) |

### 10.3 Key Global Classes

| Class | Purpose |
|---|---|
| `.container` | Max-width 1200px, horizontally centred, 2rem padding |
| `.card` | White background, rounded corners, drop shadow, 2rem padding |
| `.form-group` | Form field wrapper with label styling |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger` | Button variants |
| `.badge-open`, `.badge-in-progress`, `.badge-completed`, `.badge-cancelled` | Coloured status pills |
| `.error-message`, `.success-message`, `.warning-message` | Alert boxes |
| `.task-card` | Task list item layout |
| `.grid` | Auto-fill responsive grid (minimum 300px columns) |

---

## 11. Routing and Navigation

### 11.1 Route Table

| Path | Component | Access |
|---|---|---|
| `/login` | `LoginPage` | Public |
| `/register` | `RegisterPage` | Public |
| `/verify-email/:token` | `VerifyEmailPage` | Public |
| `/forgot-password` | `ForgotPasswordPage` | Public |
| `/reset-password` | `ResetPasswordPage` | Public |
| `/customer/dashboard` | `CustomerDashboard` | CUSTOMER role |
| `/customer/create-task` | `CreateTask` | CUSTOMER role |
| `/customer/tasks/:taskId` | `TaskDetails` | CUSTOMER role |
| `/provider/dashboard` | `ProviderDashboard` | SERVICE_PROVIDER role |
| `/provider/notifications` | `Notifications` | SERVICE_PROVIDER role |
| `/provider/tasks/:notificationId` | `ProviderTaskDetail` | SERVICE_PROVIDER role |
| `/` | Redirects to `/login` | - |

### 11.2 Navigation After Login

When a user logs in successfully, the application reads `user.userType` from the login response and navigates with React Router's `useNavigate`:
- `CUSTOMER` users are sent to `/customer/dashboard`
- `SERVICE_PROVIDER` users are sent to `/provider/dashboard`

The same logic applies after registration, since the backend returns a JWT immediately on registration.

### 11.3 Navigation After Logout

Logout clears the auth context and localStorage, then navigates to `/login`. The Axios response interceptor also triggers this navigation automatically when a `401` response is received, handling token expiry without requiring the user to manually log out.

---

## 12. Geolocation Integration

Geolocation is used in two places: setting a location (registration, task creation) and displaying locations (task map on the details page).

### 12.1 Nominatim (OpenStreetMap)

The `nominatimService.ts` wraps the Nominatim API for all text-to-coordinates and coordinates-to-text conversions. Nominatim was chosen because it is free and requires no API key.

- **Address search** is called with a 1-second debounce to avoid sending a request on every keystroke
- **Reverse geocoding** is called when the user clicks the map or uses the browser geolocation button, to turn raw coordinates into a readable address that can be stored and displayed
- The Nominatim usage policy requires a descriptive `User-Agent` header, which is set on all requests

### 12.2 Browser Geolocation

The `LocationPicker` component calls `navigator.geolocation.getCurrentPosition()` when the user presses the current location button. The browser displays its standard permission prompt. If the user allows it, the coordinates are passed to Nominatim for reverse geocoding. If the user denies it, the error is caught and no change is made.

### 12.3 Haversine on the Client

`TaskMap.tsx` calculates the distance between the task and each provider for display in the provider popup. It applies the Haversine formula directly in the component using the coordinates from the API responses. This mirrors the calculation the backend does during provider matching, so the displayed distance is consistent with the radius-based filtering logic.

---

## 13. The Full User Journey Through the Frontend

**Customer journey:**

1. `/register` (RegisterPage): fills customer form, submits; success screen shows with email verification prompt
2. `/verify-email/:token` (VerifyEmailPage): clicks link in email, token is verified automatically
3. `/login` (LoginPage): logs in after verifying email
4. `/customer/create-task` (CreateTask): fills task form including location via `LocationPicker`, submits
5. `/customer/dashboard` (Dashboard): sees task appear in list with status `OPEN`
6. `/customer/tasks/:taskId` (TaskDetails): opens task, sees `TaskMap` with notified providers, waits for quotations
7. `/customer/tasks/:taskId` (TaskDetails): quotations arrive, reviews each provider's rating and price, accepts one; page scrolls to top to show `IN_PROGRESS` status
8. `/customer/tasks/:taskId` (TaskDetails): work is done, marks task as `COMPLETED`; page scrolls to review section automatically
9. `/customer/tasks/:taskId` (TaskDetails): optionally submits a rating and comment

**Provider journey:**

1. `/register` (RegisterPage): fills provider form including category, location via `LocationPicker`, service radius, submits
2. `/provider/notifications` (Notifications): new task notification appears, reads task details and distance
3. `/provider/tasks/:notificationId` (TaskDetail): clicks Submit Quote, sees full task details and quotation form on a dedicated page
4. `/provider/tasks/:notificationId` (TaskDetail): fills price, duration, and message; submits; returns to previous page
5. `/provider/dashboard` (Dashboard): accepted quotation count increments when customer accepts
6. `/provider/dashboard` (Dashboard): review appears in recent reviews list after customer submits one

---

## 14. Summary of Design Decisions

| Decision | Rationale |
|---|---|
| React Context for auth only | No shared UI state beyond identity; Context is sufficient without Redux overhead |
| localStorage for session persistence | Keeps users logged in across page refreshes without an extra server call |
| Single Axios instance with interceptors | Token attachment and 401 handling in one place; no per-function repetition |
| Service files per resource | Clear mapping from API endpoint group to function; pages do not call Axios directly |
| TypeScript interfaces for all API shapes | Compiler catches shape mismatches between API responses and component expectations |
| Separate `types/` folder | Types used by both services and components; no circular import dependency |
| `ProtectedRoute` component | Auth and role checks in one place; individual pages do not repeat them |
| `LocationPicker` as shared component | Used in both registration and task creation; one place to change geocoding logic |
| Nominatim over Google Maps | No API key, no billing, suitable for a local-service marketplace at this scale |
| Plain CSS over Tailwind/CSS-in-JS | Full visual control with no build-time processing or framework learning curve |
| Role-based URL namespaces | Security rules applied at path level on both frontend routing and backend Spring Security |
| Fetch-on-mount, no global cache | Simple to reason about; no stale data synchronisation problems |
| React Hook Form | Fewer re-renders and less boilerplate for multi-field forms compared to controlled inputs |
