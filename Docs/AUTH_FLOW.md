# Authorization Flow - Service Marketplace Platform

## Overview

This document explains exactly how authentication and authorization work in this application, from the moment a user submits their credentials all the way to each protected API call being allowed or rejected. Every class involved is covered with the actual code logic traced step by step.

---

## 1. The Two Phases of Security

Security in this application works in two distinct phases:

1. **Authentication** - proving who you are (login, registration). This produces a JWT token.
2. **Authorization** - proving you are allowed to do something on each subsequent request. This is done by presenting the JWT token on every API call.

These two phases are completely separate. Authentication happens once. Authorization happens on every single HTTP request after that.

---

## 2. Phase 1: Authentication (Getting a Token)

### 2.1 Registration Flow

When a new user registers, the following happens in `AuthService`:

**Step 1: Email uniqueness check**
```java
if (userRepository.existsByEmail(request.getEmail())) {
    throw new BadRequestException("Email already exists");
}
```
The system checks whether the email is already taken before doing anything else.

**Step 2: Password hashing**
```java
user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
```
The raw password is immediately hashed using `BCryptPasswordEncoder`. The plain-text password is never stored anywhere. BCrypt adds a random salt automatically, so two users with the same password will have different hashes.

**Step 3: Save user and profile**
The `User` row is inserted into `marketplace.users`. A corresponding `CustomerProfile` or `ServiceProviderProfile` row is inserted linked to the same `user_id`.

**Step 4: Email verification token**
```java
String verificationToken = UUID.randomUUID().toString();
EmailVerificationToken emailToken = new EmailVerificationToken();
emailToken.setToken(verificationToken);
emailToken.setExpiresAt(LocalDateTime.now().plusHours(24));
emailVerificationTokenRepository.save(emailToken);
emailService.sendVerificationEmail(user, verificationToken);
```
A random UUID is generated and stored in `marketplace.email_verification_tokens` with a 24-hour expiry. A verification email is sent asynchronously.

**Step 5: JWT is generated immediately**
```java
String jwtToken = tokenProvider.generateTokenFromUserId(user.getId());
```
The user does not need to wait for email verification to get a token. They are logged in immediately. The `is_email_verified` flag controls access to specific actions, not to the token itself.

**Step 6: Response returned**
```java
return new LoginResponse(jwtToken, user.getId(), user.getEmail(), ...);
```
The `LoginResponse` contains the JWT token, user ID, email, name, and user type.

---

### 2.2 Login Flow

```java
Authentication authentication = authenticationManager.authenticate(
    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
);
```

This single line delegates everything to Spring Security's `AuthenticationManager`. Internally it calls `DaoAuthenticationProvider`, which:

1. Calls `UserDetailsServiceImpl.loadUserByUsername(email)` to load the user from the database
2. Checks `user.getIsEmailVerified()` - if false, throws `UsernameNotFoundException` with the message "Email not verified"
3. Uses `BCryptPasswordEncoder.matches(rawPassword, storedHash)` to compare passwords
4. Checks `UserDetailsImpl.isEnabled()` which returns `user.getIsActive()` - if false, rejects login

If all checks pass, authentication succeeds. The service then generates a JWT:

```java
String jwt = tokenProvider.generateToken(authentication);
```

---

### 2.3 JWT Token Structure

```java
@PostConstruct
public void init() {
    this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
}

public String generateToken(Authentication authentication) {
    UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + jwtExpiration);  // 86400000ms = 24 hours

    return Jwts.builder()
            .setSubject(String.valueOf(userPrincipal.getId()))   // userId stored as subject
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(key, SignatureAlgorithm.HS256)             // signed with HMAC SHA256
            .compact();
}
```

The resulting JWT has three base64-encoded parts separated by dots:

```
eyJhbGciOiJIUzI1NiJ9           <- Header: algorithm HS256
.eyJzdWIiOiI0NyIsImlhdC...     <- Payload: sub=userId, iat=issuedAt, exp=expiry
.SflKxwRJSMeKKF2QT4fwp...      <- Signature: HMAC SHA256 of header+payload using the secret key
```

**Why is `userId` stored as the subject, not email?**
Email can be changed by the user. The `userId` (auto-incrementing `BIGSERIAL`) is immutable. A token with an email subject would become invalid if the email changed. With `userId`, the token stays valid regardless.

**Token expiry:** 86400000 milliseconds = exactly 24 hours from issue time.

---

## 3. Phase 2: Authorization (Using a Token)

Every protected API request goes through the `JwtAuthenticationFilter` before reaching any controller.

### 3.1 `JwtAuthenticationFilter`

```java
@Override
protected void doFilterInternal(HttpServletRequest request,
                                HttpServletResponse response,
                                FilterChain filterChain) throws ServletException, IOException {
    try {
        String jwt = getJwtFromRequest(request);

        if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
            Long userId = tokenProvider.getUserIdFromToken(jwt);
            UserDetails userDetails = userDetailsService.loadUserById(userId);

            UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(
                    userDetails, null, userDetails.getAuthorities()
                );
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
    } catch (Exception ex) {
        logger.error("Could not set user authentication in security context", ex);
    }

    filterChain.doFilter(request, response);  // always continues the filter chain
}
```

**Step by step:**

1. `getJwtFromRequest(request)` reads the `Authorization` header and strips the `Bearer ` prefix:
   ```java
   String bearerToken = request.getHeader("Authorization");
   if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
       return bearerToken.substring(7);
   }
   ```

2. `tokenProvider.validateToken(jwt)` verifies the token:
   ```java
   public boolean validateToken(String authToken) {
       try {
           Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
           return true;
       } catch (SecurityException ex)      { logger.error("Invalid JWT signature"); }
       catch (MalformedJwtException ex)    { logger.error("Invalid JWT token"); }
       catch (ExpiredJwtException ex)      { logger.error("Expired JWT token"); }
       catch (UnsupportedJwtException ex)  { logger.error("Unsupported JWT token"); }
       catch (IllegalArgumentException ex) { logger.error("JWT claims string is empty"); }
       return false;
   }
   ```
   If any of these errors occur, `false` is returned and no authentication is set.

3. `tokenProvider.getUserIdFromToken(jwt)` extracts the subject:
   ```java
   Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                       .parseClaimsJws(token).getBody();
   return Long.parseLong(claims.getSubject());
   ```

4. `userDetailsService.loadUserById(userId)` hits the database:
   ```java
   User user = userRepository.findById(id)
       .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
   return UserDetailsImpl.build(user);
   ```
   This database call on every request ensures that a deactivated account (`is_active = false`) is caught immediately even if its token has not yet expired.

5. `SecurityContextHolder.getContext().setAuthentication(authentication)` stores the identity for the rest of the request.

**Important:** The filter calls `filterChain.doFilter()` regardless of whether authentication was set. If the token is missing or invalid, the request continues with no authentication set. The Spring Security path rules then determine whether to allow or reject it.

---

### 3.2 `UserDetailsImpl` - The Identity Object

```java
public static UserDetailsImpl build(User user) {
    Collection<GrantedAuthority> authorities = Collections.singletonList(
        new SimpleGrantedAuthority("ROLE_" + user.getUserType().name())
    );
    return new UserDetailsImpl(
        user.getId(), user.getEmail(), user.getPasswordHash(),
        user.getUserType(), user.getIsActive(), authorities
    );
}

@Override
public boolean isEnabled() {
    return isActive;  // false = account is deactivated
}
```

The authority granted is either `ROLE_CUSTOMER` or `ROLE_SERVICE_PROVIDER`. Spring Security prefixes roles with `ROLE_` by convention, so the path rule `hasRole("CUSTOMER")` checks for the authority `ROLE_CUSTOMER`.

---

### 3.3 `SecurityConfig` - Path-Level Authorization Rules

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/**").permitAll()
    .requestMatchers("/api/categories/**").permitAll()
    .requestMatchers("/actuator/**").permitAll()
    .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
    .requestMatchers("/api/provider/**").hasRole("SERVICE_PROVIDER")
    .anyRequest().authenticated()
)
```

Rules are evaluated top to bottom and the first match wins:

| Request Path | Rule Applied | Result |
|---|---|---|
| `POST /api/auth/login` | `permitAll()` | Allowed without any token |
| `GET /api/categories` | `permitAll()` | Allowed without any token |
| `POST /api/customer/tasks` | `hasRole("CUSTOMER")` | Requires valid token with `ROLE_CUSTOMER` |
| `GET /api/provider/notifications` | `hasRole("SERVICE_PROVIDER")` | Requires valid token with `ROLE_SERVICE_PROVIDER` |
| Anything else | `authenticated()` | Requires any valid token |


The server never creates or reads an HTTP session. Identity is established entirely from the JWT on every request.

---

## 4. Complete Authorization Flow Diagram

```
Client sends:
POST /api/customer/tasks
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0...

         |
         v
  JwtAuthenticationFilter
    1. Read Authorization header
    2. Strip "Bearer " prefix → raw JWT
    3. validateToken(jwt)
         - Verify HMAC signature using secret key
         - Check token is not expired
         - Check token is well-formed
    4. getUserIdFromToken(jwt) → userId = 47
    5. loadUserById(47) → hit DB, build UserDetailsImpl
         - authorities = [ROLE_CUSTOMER]
         - isEnabled = true (is_active = true)
    6. Set authentication in SecurityContextHolder
         |
         v
  Spring Security path matcher
    - Path: /api/customer/**
    - Rule: hasRole("CUSTOMER")
    - Authentication has ROLE_CUSTOMER → ALLOWED
         |
         v
  CustomerController.createTask()
    - Extracts userId from SecurityContextHolder
    - Calls taskService.createTask(request, userId)
```

---

## 5. Email Verification Flow

After registration, `is_email_verified` is `false`. When the user tries to log in:

```java
// In UserDetailsServiceImpl.loadUserByUsername()
if (!user.getIsEmailVerified()) {
    throw new UsernameNotFoundException(
        "Email not verified. Please check your email and verify your account before logging in."
    );
}
```

The login attempt is rejected with a descriptive error. The user must click the link in their verification email first.

The verification endpoint `GET /api/auth/verify-email/{token}` is public (`permitAll()`). When called:
1. Token is looked up in `marketplace.email_verification_tokens`
2. `verified` flag and expiry are checked
3. `user.setIsEmailVerified(true)` is saved
4. `emailToken.setVerified(true)` is saved to prevent reuse

---

## 6. Password Reset Flow

```
POST /api/auth/forgot-password   { "email": "user@example.com" }

AuthService.forgotPassword():
  1. Look up user by email
  2. Generate UUID reset token
  3. Save PasswordResetToken with 1-hour expiry
  4. Send email with link: http://localhost:3000/reset-password?token=<uuid>

POST /api/auth/reset-password    { "token": "uuid", "newPassword": "newPass123" }

AuthService.resetPassword():
  1. Look up token in password_reset_tokens
  2. Check token.used == false
  3. Check token.expiresAt is in the future
  4. passwordEncoder.encode(newPassword) → new hash
  5. user.setPasswordHash(newHash) → saved
  6. token.setUsed(true) → saved (single-use enforced)
```

---

## 7. Security Properties in `application.properties`

```properties
jwt.secret=marketplace_secret_key_2025_must_be_at_least_256_bits_long_for_hs256_algorithm
jwt.expiration=86400000
```

The secret key is at least 256 bits (32 characters) as required for HMAC SHA256. The expiration is 86,400,000 milliseconds which is exactly 24 hours. After 24 hours, the token is rejected by `validateToken()` with an `ExpiredJwtException` and the user must log in again.
