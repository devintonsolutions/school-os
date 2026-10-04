# School OS — Authentication & Authorization

This document describes the authentication and authorization system implemented in the School OS backend.

## 1. Authentication Overview

School OS uses:

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Zod for request validation
- bcryptjs for password hashing
- JSON Web Tokens (JWT) for access tokens
- Database-backed refresh tokens
- Role-Based Access Control (RBAC)

### User Roles

```text
STUDENT
TEACHER
ADMIN
```

Public signup creates **STUDENT** accounts only.

Teacher and Admin roles should be assigned through an administrative process rather than being selected during public signup.

---

# 2. Authentication Flow

## Signup

```text
Client
  ↓
POST /api/auth/signup
  ↓
Validation Middleware
  ↓
Auth Controller
  ↓
Auth Service
  ↓
Hash Password
  ↓
Create User
  ↓
PostgreSQL
```

## Login

```text
Client
  ↓
POST /api/auth/login
  ↓
Validation Middleware
  ↓
Auth Controller
  ↓
Auth Service
  ↓
Find User
  ↓
Verify Password
  ↓
Generate Access Token
  ↓
Generate Refresh Token
  ↓
Store Refresh Token Hash
  ↓
Return Tokens
```

## Protected Request

```text
Client
  ↓
Authorization: Bearer <accessToken>
  ↓
authenticate Middleware
  ↓
Verify JWT
  ↓
req.user
  ↓
Controller
```

## Role-Protected Request

```text
Client
  ↓
authenticate
  ↓
authorize(...)
  ↓
Controller
```

---

# 3. API Base URL

Development:

```text
http://localhost:4000
```

Authentication base path:

```text
/api/auth
```

---

# 4. Authentication Endpoints

## POST `/api/auth/signup`

Creates a new student account.

### Request

```json
{
  "firstName": "Sufyan",
  "lastName": "Malik",
  "email": "sufyan@example.com",
  "password": "Password123"
}
```

### Validation Rules

`firstName`:

- Minimum 2 characters
- Maximum 50 characters

`lastName`:

- Minimum 2 characters
- Maximum 50 characters

`email`:

- Must be a valid email
- Converted to lowercase
- Trimmed

`password`:

- Minimum 8 characters
- Maximum 128 characters

### Role

The user is automatically created as:

```text
STUDENT
```

The client cannot choose:

```json
{
  "role": "ADMIN"
}
```

to become an administrator.

### Successful Response

HTTP `201 Created`

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "user-id",
    "firstName": "Sufyan",
    "lastName": "Malik",
    "email": "sufyan@example.com",
    "role": "STUDENT",
    "emailVerifiedAt": null
  }
}
```

### Possible Errors

`400 Bad Request`

Invalid request data.

`409 Conflict`

Email is already registered.

---

# 5. POST `/api/auth/login`

Authenticates an existing user.

### Request

```json
{
  "email": "sufyan@example.com",
  "password": "Password123"
}
```

### Successful Response

HTTP `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-id",
      "firstName": "Sufyan",
      "lastName": "Malik",
      "email": "sufyan@example.com",
      "role": "STUDENT",
      "emailVerifiedAt": null
    },
    "accessToken": "JWT_ACCESS_TOKEN",
    "refreshToken": "REFRESH_TOKEN"
  }
}
```

### Authentication Rules

The backend:

1. Finds the user by email.
2. Verifies the password using bcrypt.
3. Checks whether the account is active.
4. Generates an access token.
5. Generates a refresh token.
6. Stores a hash of the refresh token.
7. Updates `lastLoginAt`.

### Possible Errors

`401 Unauthorized`

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

`403 Forbidden`

```json
{
  "success": false,
  "message": "Account is inactive"
}
```

---

# 6. GET `/api/auth/me`

Returns information about the currently authenticated user.

This endpoint requires a valid access token.

### Request

Header:

```text
Authorization: Bearer <accessToken>
```

### Successful Response

HTTP `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "firstName": "Sufyan",
    "lastName": "Malik",
    "email": "sufyan@example.com",
    "role": "STUDENT",
    "emailVerifiedAt": null
  }
}
```

### Authentication Flow

```text
Authorization Header
        ↓
authenticate middleware
        ↓
JWT verification
        ↓
Extract user ID + role
        ↓
req.user
        ↓
getCurrentUser()
```

### Possible Errors

`401 Unauthorized`

Access token is missing, invalid, or expired.

`403 Forbidden`

Account is inactive.

`404 Not Found`

User no longer exists.

---

# 7. POST `/api/auth/refresh`

Generates a new access token using a valid refresh token.

### Request

```json
{
  "refreshToken": "CURRENT_REFRESH_TOKEN"
}
```

### Successful Response

HTTP `200 OK`

```json
{
  "success": true,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "NEW_ACCESS_TOKEN",
    "refreshToken": "NEW_REFRESH_TOKEN"
  }
}
```

### Refresh Token Rotation

The old refresh token is revoked and a new one is created.

```text
Old Refresh Token
        ↓
      Revoke
        ↓
New Refresh Token
```

### Validation

The backend checks:

- Token exists
- Token has not been revoked
- Token has not expired
- Associated user is active

### Possible Errors

`401 Unauthorized`

```text
Invalid refresh token
```

```text
Refresh token has been revoked
```

```text
Refresh token has expired
```

`403 Forbidden`

```text
Account is inactive
```

---

# 8. POST `/api/auth/logout`

Logs the user out by revoking the refresh token.

### Request

```json
{
  "refreshToken": "CURRENT_REFRESH_TOKEN"
}
```

### Successful Response

HTTP `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Logout Process

```text
Refresh Token
      ↓
Hash token
      ↓
Find token in database
      ↓
Set revokedAt
      ↓
Token cannot be refreshed again
```

The access token is not stored in the database.

Because the access token is short-lived, it expires naturally.

Current lifetime:

```text
Access Token  → 15 minutes
Refresh Token → 7 days
```

---

# 9. Authentication Header

Protected API requests use:

```http
Authorization: Bearer <accessToken>
```

Example:

```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

---

# 10. Authentication Middleware

File:

```text
src/middleware/auth.middleware.ts
```

Purpose:

- Read the Authorization header
- Extract the Bearer token
- Verify the JWT
- Extract the user ID and role
- Attach the authenticated user to `req.user`

Result:

```ts
req.user = {
  id: "...",
  role: "STUDENT",
};
```

---

# 11. Authorization Middleware

File:

```text
src/middleware/role.middleware.ts
```

Purpose:

Restrict endpoints based on user role.

Example:

```ts
authorize("ADMIN");
```

Only Admin users are allowed.

Example:

```ts
authorize("TEACHER", "ADMIN");
```

Teachers and Admins are allowed.

### Authentication vs Authorization

```text
Authentication
    ↓
Who are you?

Authorization
    ↓
What are you allowed to do?
```

---

# 12. Example Protected Routes

### Teacher/Admin

```ts
router.post("/", authenticate, authorize("TEACHER", "ADMIN"), createCourse);
```

### Admin Only

```ts
router.delete("/:id", authenticate, authorize("ADMIN"), deleteCourse);
```

### Student Only

```ts
router.get("/my-courses", authenticate, authorize("STUDENT"), getMyCourses);
```

---

# 13. Validation Middleware

File:

```text
src/middleware/validation.middleware.ts
```

Purpose:

Validate incoming request data using Zod before the controller runs.

Example:

```ts
router.post("/signup", validate(signUpSchema), signup);
```

Flow:

```text
Request
  ↓
Zod Validation
  ↓
Valid?
 ├── No → Error Middleware
 └── Yes
       ↓
   Controller
```

---

# 14. Global Error Middleware

File:

```text
src/middleware/error.middleware.ts
```

Purpose:

Handle application errors in one place.

It handles:

- Zod validation errors
- Custom `AppError`
- Unexpected server errors

Example validation response:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "path": ["email"],
      "message": "Invalid email"
    }
  ]
}
```

Example application error:

```json
{
  "success": false,
  "message": "Forbidden"
}
```

---

# 15. Async Handler

File:

```text
src/utils/async-handler.ts
```

Purpose:

Pass errors from asynchronous route handlers to the global error middleware.

Usage:

```ts
router.post("/login", validate(loginSchema), asyncHandler(login));
```

---

# 16. Custom Application Error

File:

```text
src/utils/app-error.ts
```

Used for controlled application errors.

Example:

```ts
throw new AppError("Invalid email or password", 401);
```

The error contains:

```text
message
statusCode
```

---

# 17. Password Utility

File:

```text
src/utils/password.ts
```

Responsibilities:

- Hash passwords
- Compare passwords

Functions:

```ts
hashPassword(password);
```

```ts
comparePassword(password, passwordHash);
```

Passwords are never stored as plain text.

Database:

```text
passwordHash
```

Not:

```text
password
```

---

# 18. JWT Utility

File:

```text
src/utils/jwt.ts
```

Responsibilities:

- Create access tokens
- Verify access tokens
- Validate token payload

Functions:

```ts
createAccessToken(userId, role);
```

```ts
verifyAccessToken(token);
```

Access token payload:

```json
{
  "sub": "user-id",
  "role": "STUDENT"
}
```

Current access token lifetime:

```text
15 minutes
```

JWT secret is read from:

```env
JWT_SECRET_KEY="your-secret"
```

---

# 19. Authentication Schemas

File:

```text
src/modules/auth/auth.schema.ts
```

Contains:

```text
signUpSchema
loginSchema
refreshTokenSchema
```

### Signup Schema

```text
firstName
lastName
email
password
```

### Login Schema

```text
email
password
```

### Refresh Token Schema

```text
refreshToken
```

---

# 20. Authentication Controller

File:

```text
src/modules/auth/auth.controller.ts
```

Responsibilities:

Handle HTTP requests and responses.

Functions:

```text
signup()
login()
me()
refresh()
logout()
```

The controller should not contain database or password logic.

Example:

```text
Controller
   ↓
Auth Service
```

---

# 21. Authentication Service

File:

```text
src/modules/auth/auth.service.ts
```

Contains the main authentication business logic.

Responsibilities:

- Find users
- Create users
- Hash passwords
- Compare passwords
- Create access tokens
- Create refresh tokens
- Store refresh token hashes
- Refresh tokens
- Revoke tokens
- Update last login
- Fetch current user

Functions:

```text
signup()
login()
getCurrentUser()
refreshAccessToken()
logout()
```

---

# 22. Authentication Router

File:

```text
src/routes/auth.router.ts
```

Current routes:

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/logout
```

Router responsibilities:

- Define endpoints
- Attach middleware
- Call controllers

Example:

```ts
router.post("/signup", validate(signUpSchema), asyncHandler(signup));
```

---

# 23. Express Type Declaration

File:

```text
src/types/express.d.ts
```

Adds the authenticated user to Express's `Request` type.

Allows:

```ts
req.user?.id;
```

and:

```ts
req.user?.role;
```

Example type:

```ts
user?: {
  id: string;
  role: UserRole;
};
```

---

# 24. Authentication Types

File:

```text
src/types/auth.ts
```

Defines the allowed application roles:

```ts
export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";
```

---

# 25. Prisma Authentication Models

File:

```text
prisma/schema.prisma
```

## Role

```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
}
```

## User

```text
User
├── id
├── email
├── passwordHash
├── firstName
├── lastName
├── role
├── isActive
├── emailVerifiedAt
├── lastLoginAt
├── createdAt
└── updatedAt
```

## RefreshToken

```text
RefreshToken
├── id
├── tokenHash
├── expiresAt
├── revokedAt
├── createdAt
└── userId
```

Relationship:

```text
User 1 ──────── * RefreshToken
```

---

# 26. Database Configuration

File:

```text
src/config/database.ts
```

Responsible for creating the Prisma Client and connecting it to PostgreSQL through the PostgreSQL adapter.

Conceptually:

```text
Express
   ↓
Prisma Client
   ↓
PostgreSQL Adapter
   ↓
Supabase PostgreSQL
```

---

# 27. Prisma Configuration

File:

```text
prisma.config.ts
```

Contains Prisma's database configuration and seed command.

Example:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

The `seed` command tells Prisma how to execute the database seed script.

---

# 28. Database Seeding

The project uses a Prisma seed script to create the **initial Admin account**.

The seed is intended for bootstrapping trusted system data such as the first administrator.

## Seed File

```text
prisma/seed.ts
```

Example:

```ts
import "dotenv/config";

import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database.js";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not defined in .env");
  }

  if (!adminPassword) {
    throw new Error("ADMIN_PASSWORD is not defined in .env");
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },

    update: {},

    create: {
      firstName: "System",
      lastName: "Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

## Seed Environment Variables

Add these to the local `.env` file:

```env
ADMIN_EMAIL="admin@schoolos.com"
ADMIN_PASSWORD="your-strong-admin-password"
```

These credentials must not be committed to GitHub.

The `.env.example` file should only contain:

```env
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

## Running the Seed

Make sure `tsx` is installed:

```bash
npm install -D tsx
```

Then run:

```bash
npx prisma db seed
```

Prisma executes the seed command configured in `prisma.config.ts`:

```text
npx prisma db seed
        ↓
tsx prisma/seed.ts
        ↓
read ADMIN_EMAIL / ADMIN_PASSWORD
        ↓
hash password
        ↓
create ADMIN user
```

## Why `upsert` Is Used

The seed uses:

```ts
prisma.user.upsert();
```

with the admin email as the unique identifier.

First run:

```text
Admin does not exist
        ↓
CREATE admin
```

Later run:

```text
Admin already exists
        ↓
No duplicate admin is created
```

The current:

```ts
update: {
}
```

means an existing admin is not modified by rerunning the seed.

## Why Public Signup Does Not Create Admins

Public signup always creates:

```text
STUDENT
```

This prevents a user from submitting:

```json
{
  "role": "ADMIN"
}
```

and gaining administrator privileges.

The initial Admin account is created through the trusted seed process.

Later, an authenticated Admin can be given functionality to create or manage other privileged accounts.

## Seed vs Signup

### Normal Signup

```text
POST /api/auth/signup
        ↓
Create STUDENT
```

### Admin Bootstrap

```text
npx prisma db seed
        ↓
Create initial ADMIN
```

These are separate mechanisms.

## Development Team Rule

Because the development database is shared, developers should **not run the admin seed casually against the shared database**.

Admin credentials should be shared securely with authorized team members only.

---

# 29. Environment Variables

Backend `.env`:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL="your-supabase-postgresql-url"

JWT_SECRET_KEY="your-long-random-secret"

ADMIN_EMAIL="admin@schoolos.com"
ADMIN_PASSWORD="your-strong-admin-password"
```

`.env` must never be committed to Git.

`.env.example` should contain only placeholders:

```env
NODE_ENV=development
PORT=4000

DATABASE_URL=

JWT_SECRET_KEY=

ADMIN_EMAIL=
ADMIN_PASSWORD=
```

---

# 30. Complete Authentication File Structure

```text
backend/
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── src/
│   │
│   ├── config/
│   │   └── database.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── role.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.controller.ts
│   │       ├── auth.service.ts
│   │       └── auth.schema.ts
│   │
│   ├── routes/
│   │   └── auth.router.ts
│   │
│   ├── types/
│   │   ├── auth.ts
│   │   └── express.d.ts
│   │
│   ├── utils/
│   │   ├── app-error.ts
│   │   ├── async-handler.ts
│   │   ├── jwt.ts
│   │   └── password.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma.config.ts
├── .env
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

---

# 31. Complete API Reference

| Method | Endpoint            | Authentication | Role   | Purpose                |
| ------ | ------------------- | -------------- | ------ | ---------------------- |
| POST   | `/api/auth/signup`  | No             | Public | Create student account |
| POST   | `/api/auth/login`   | No             | Public | Login                  |
| GET    | `/api/auth/me`      | Yes            | Any    | Get current user       |
| POST   | `/api/auth/refresh` | No\*           | Any    | Get new access token   |
| POST   | `/api/auth/logout`  | No\*           | Any    | Revoke refresh token   |

`*` The refresh and logout endpoints authenticate the supplied refresh token themselves rather than requiring the short-lived access token.

---

# 32. Authentication Lifecycle

```text
               SIGNUP
                  │
                  ▼
             Create User
                  │
                  ▼
              STUDENT
                  │
                  │
                  ▼
                LOGIN
                  │
          ┌───────┴────────┐
          ▼                ▼
    Access Token      Refresh Token
      (15 min)           (7 days)
          │                │
          │                ▼
          │          Store Token Hash
          │                │
          ▼                ▼
 Protected API       Refresh Endpoint
          │                │
          ▼                ▼
   authenticate       Rotate Token
          │                │
          ▼                ▼
       req.user       New Tokens
          │
          ▼
     authorize(...)
          │
          ▼
      Controller
```

## Logout

```text
Logout
  ↓
Refresh Token
  ↓
Find token
  ↓
Set revokedAt
  ↓
Cannot refresh again
  ↓
Frontend removes stored tokens
```

---

# 33. Security Rules

The authentication implementation must follow these rules:

- Never store plain-text passwords.
- Never expose `passwordHash` in API responses.
- Never commit `.env`.
- Never expose `JWT_SECRET_KEY` to the frontend.
- Never expose `ADMIN_PASSWORD` to the frontend.
- Never allow public signup to choose `ADMIN`.
- Validate request data before processing it.
- Require authentication for protected endpoints.
- Require authorization for role-specific endpoints.
- Keep access tokens short-lived.
- Revoke refresh tokens on logout.
- Never put sensitive information inside the JWT payload.
- Do not bypass authentication or authorization for convenience.
- Do not run administrative seed scripts against shared environments without coordination.

---

# 34. Team Usage

Other developers should use the shared authentication middleware instead of implementing their own authentication.

Example:

```ts
router.post(
  "/courses",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  createCourse,
);
```

They should not:

- Create another JWT system
- Create another password hashing utility
- Decode JWTs themselves
- Implement separate role-checking logic
- Directly access authentication secrets
- Modify authentication middleware without coordination
- Modify shared authentication models without coordination

Authentication, authorization, middleware, and the shared Prisma auth models are maintained as shared backend infrastructure.
::
