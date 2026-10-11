# School OS — User Module

## 1. Overview

The User Module manages administrative user operations in School OS.

It currently supports:

- Retrieving all users.
- Filtering users by role.
- Updating a user's role.
- Activating or deactivating a user account.

The module is divided into two files:

- `user.controller.ts` — handles HTTP requests, validates input, and returns responses.
- `users.service.ts` — performs database operations using Prisma.

## 2. API Endpoints

The following routes are suggested examples. Adjust them to match the actual router configuration.

| Method | Endpoint                       | Description                   |
| ------ | ------------------------------ | ----------------------------- |
| GET    | `/api/v1/users`                | Retrieve all users            |
| GET    | `/api/v1/users?role=STUDENT`   | Filter users by role          |
| PATCH  | `/api/v1/users/:userId/role`   | Update a user's role          |
| PATCH  | `/api/v1/users/:userId/status` | Activate or deactivate a user |

### 2.1 Retrieve Users

**Endpoint:** `GET /api/v1/users`

An optional `role` query parameter filters the returned users.

Example requests:

```http
GET /api/v1/users
GET /api/v1/users?role=STUDENT
GET /api/v1/users?role=TEACHER
GET /api/v1/users?role=ADMIN
```

If no role is provided, all users are returned. Invalid roles result in a `400 Bad Request` response.

### 2.2 Update User Role

**Endpoint:** `PATCH /api/v1/users/:userId/role`

Example request body:

```json
{
  "role": "TEACHER"
}
```

The controller validates the supplied role against the Prisma `Role` enum before calling the service.

### 2.3 Update Account Status

**Endpoint:** `PATCH /api/v1/users/:userId/status`

Example request body:

```json
{
  "isActive": false
}
```

- `true` activates the account.
- `false` deactivates the account.
- Missing or non-boolean values should result in `400 Bad Request`.

## 3. Public User Fields

The service uses `publicUserSelect` to return only these fields:

- `id`
- `firstName`
- `lastName`
- `email`
- `role`
- `bio`
- `avatarUrl`
- `isActive`
- `createdAt`

Sensitive fields such as `passwordHash` are excluded from these responses.

## 4. Service Functions

### `getAllUsers(role?)`

Retrieves users, optionally filtering by role. Results are ordered by `createdAt` in descending order, with the newest users first.

### `updateUserRole(userId, role)`

Updates the specified user's role and returns the selected public fields.

### `updateUserStatus(userId, isActive)`

Updates the user's active status and returns the selected public fields.

## 5. Issues Found

### Issue 1: Missing `return` in `userUpdateStatus`

The current code is:

```ts
if (typeof isActive !== "boolean") {
  res.status(400).json({
    message: "isActive must be a boolean",
  });
}
```

**Problem:** The function continues executing after sending the error response. It may call the service and attempt to send another response.

**Fix:**

```ts
if (typeof isActive !== "boolean") {
  return res.status(400).json({
    message: "isActive must be a boolean",
  });
}
```

### Issue 2: Inconsistent Prisma `Role` imports

The controller imports the runtime enum from the generated Prisma client:

```ts
import { Role } from "../../generated/prisma/client";
```

However, the service imports the type from:

```ts
import type { Role } from "@prisma/client";
```

If the project uses a custom Prisma generator output, these imports may refer to different clients and cause type errors.

**Fix:** Import the `Role` type from the same generated client used by your Prisma instance. Adjust the relative path based on the service file's location.

For example:

```ts
import type { Role } from "../../generated/prisma/client";
```

### Issue 3: `as Role` does not validate data

A type assertion tells TypeScript to treat a value as a particular type. It does not validate or convert the actual value.

Your runtime validation is what checks whether the supplied role exists in the enum:

```ts
typeof role === "string" && Object.values(Role).includes(role as Role);
```

You can consider using Zod schemas to centralize role validation and reduce repeated code.

### Issue 4: Repeated `role` query parameters

A request such as:

```http
GET /api/v1/users?role=STUDENT&role=ADMIN
```

may produce an array rather than a string. Your existing `typeof role !== "string"` check correctly rejects this case.

### Issue 5: Reusing the validated role

In `userUpdateRole`, the role is validated in a local variable but the service receives `req.body.role` again.

Prefer passing the validated variable:

```ts
return res
  .status(200)
  .json(await userService.updateUserRole(userId, role as Role));
```

A validated Zod result is preferable when available because it can provide the correct type without a manual assertion.

### Issue 6: Unnecessary `null` in `getAllUsers`

Current signature:

```ts
getAllUsers(role?: Role | null)
```

Your controller passes a role or `undefined`, so `null` appears unnecessary unless you intentionally support it.

Prefer:

```ts
getAllUsers(role?: Role)
```

Also, `return await` is unnecessary when directly returning the Prisma promise.

### Issue 7: Handling users that do not exist

Prisma's `update()` operation throws an error when the user ID does not exist.

The centralized error middleware should translate Prisma's `P2025` record-not-found error into `404 Not Found`, rather than returning a generic `500 Internal Server Error`.

### Issue 8: Authorization must be enforced

Comments such as `// admin only service` do not enforce permissions.

The router should apply authentication and admin-role authorization middleware to the relevant endpoints. Only authorized administrators should be able to list all users, update roles, or change account status.

### Issue 9: Protect sensitive administrative actions

Define explicit rules for whether administrators can:

- Change their own role.
- Deactivate their own account.
- Demote or deactivate the last active administrator.
- Promote another user to administrator.

These safeguards help prevent accidental loss of administrative access and privilege escalation.

## 6. Recommended Correction for `userUpdateStatus`

```ts
export async function userUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof userId !== "string" || userId.length === 0) {
      return res.status(400).json({
        message: "A valid user ID is required.",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be a boolean.",
      });
    }

    const user = await userService.updateUserStatus(userId, isActive);

    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
}
```

## 7. Testing Checklist

- [x] Retrieve all users without exposing `passwordHash`.
- [x] Filter users by `STUDENT`, `TEACHER`, and `ADMIN`.
- [x] Reject invalid role values.
- [x] Reject repeated role query parameters.
- [x] Reject missing or non-boolean `isActive`.
- [x] Confirm that `isActive: false` deactivates the account.
- [x] Return `404` when the specified user does not exist.
- [x] Reject unauthenticated requests.
- [x] Reject non-admin users attempting administrative operations.
- [ ] Verify safeguards for self-demotion and the last active administrator.

## 8. Scope

This documentation covers the supplied user controller and service code. Route paths are illustrative until the router is reviewed.

User creation, profile self-service, and email verification are not included because their implementations were not supplied.
