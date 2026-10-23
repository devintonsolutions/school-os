# Modules API — Developer 2 (Core LMS)

Base URL: `/api/v1`
All routes require a valid JWT: `Authorization: Bearer <TOKEN>`.

Role rules:

| Action | Allowed |
| --- | --- |
| List modules | Any authenticated user (students only for `PUBLISHED` courses) |
| Create / update / delete / reorder | Course owner (`teacherId`) or `ADMIN` |

> **Route layout note (SRS §24):** the SRS lists the Modules base path as
> `/api/v1/modules`. This implementation keeps create/list/reorder nested under
> `/api/v1/courses/:courseId/modules` and only update/delete under
> `/api/v1/modules/:id`. That follows the same course-scoped pattern the SRS
> itself uses for lessons (`GET /api/v1/courses/:courseId/lessons`) and
> enrollment (`POST /api/v1/courses/:courseId/enroll`); the base-path table is
> treated as a module grouping, not an exhaustive URL list.

## Endpoints

| # | Method | Path | Purpose |
| --- | --- | --- | --- |
| 1 | POST | `/api/v1/courses/:courseId/modules` | Create a module (position auto-appended if `order` is omitted) |
| 2 | GET | `/api/v1/courses/:courseId/modules` | List modules ordered by `order` ASC (paginated) |
| 3 | PATCH | `/api/v1/modules/:id` | Update title, description or order |
| 4 | DELETE | `/api/v1/modules/:id` | Delete a module (cascades to its lessons) |
| 5 | PUT | `/api/v1/courses/:courseId/modules/reorder` | Atomically reorder all modules of a course |

---

## 1. Create a module

`POST /api/v1/courses/:courseId/modules`

Body (`createModuleSchema`, `.strict()`):

```json
{
  "title": "Introduction to Algebra",
  "description": "Variables, expressions and simple equations",
  "order": 1
}
```

- `title`: required, 2–150 chars
- `description`: optional, max 1000 chars
- `order`: optional positive integer. Omit it to append at the end (`max(order) + 1`).

```bash
curl -X POST "http://localhost:3000/api/v1/courses/$COURSE_ID/modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Algebra",
    "description": "Variables, expressions and simple equations"
  }'
```

`201 Created`

```json
{
  "success": true,
  "message": "Module created successfully",
  "data": {
    "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
    "title": "Introduction to Algebra",
    "description": "Variables, expressions and simple equations",
    "order": 1,
    "courseId": "0b6f0f47-6a4b-4d5e-9c3a-1f2e3d4c5b6a",
    "_count": { "lessons": 0 }
  }
}
```

## 2. List modules of a course

`GET /api/v1/courses/:courseId/modules`

Query parameters (shared pagination rules):

| Param | Type | Default | Rules |
| --- | --- | --- | --- |
| `page` | integer | `1` | must be > 0 |
| `limit` | integer | **`50`** | 1–50 |

- Ordered by `order` ASC.
- Includes `_count.lessons` for each module.
- Returns `meta { total, page, totalPages }` alongside `data`.
- Students receive `404 Course not found` unless the course is `PUBLISHED`. The owner teacher and admins can always read it.

```bash
curl "http://localhost:3000/api/v1/courses/$COURSE_ID/modules?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "title": "Introduction to Algebra",
      "description": "Variables, expressions and simple equations",
      "order": 1,
      "courseId": "0b6f0f47-6a4b-4d5e-9c3a-1f2e3d4c5b6a",
      "_count": { "lessons": 3 }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

## 3. Update a module

`PATCH /api/v1/modules/:id`

Body (`updateModuleSchema`, all fields optional, at least one required):

```json
{
  "title": "Algebra Basics",
  "order": 2
}
```

```bash
curl -X PATCH "http://localhost:3000/api/v1/modules/$MODULE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Algebra Basics", "order": 2 }'
```

`200 OK`

```json
{
  "success": true,
  "message": "Module updated successfully",
  "data": {
    "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
    "title": "Algebra Basics",
    "description": "Variables, expressions and simple equations",
    "order": 2,
    "courseId": "0b6f0f47-6a4b-4d5e-9c3a-1f2e3d4c5b6a",
    "_count": { "lessons": 3 }
  }
}
```

> For a full reorder use endpoint 5. Endpoint 3 only accepts an `order` that is currently free.

## 4. Delete a module

`DELETE /api/v1/modules/:id`

```bash
curl -X DELETE "http://localhost:3000/api/v1/modules/$MODULE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "message": "Module deleted successfully",
  "data": {
    "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
    "deletedLessons": 3
  }
}
```

Cascade behaviour (ERD §G, PDF p.20 and ERD §H, p.22):

- `Module → Lesson` is `onDelete: Cascade`, so **all lessons of the module are deleted**.
- `Lesson → LessonProgress` is also `onDelete: Cascade`, so **students' progress for those lessons is deleted permanently**.
- `deletedLessons` tells the client how many lessons were removed, so the UI can warn before confirming.
- Archived courses are still read-only (`400`).

Ordering after delete:

- Remaining module positions are **not shifted**. There is no equivalent "close the gap" pattern in the Courses/Categories modules, so deleting `order = 2` out of `1,2,3` leaves `1,3`.
- This is safe: list ordering still works, and create appends `max(order) + 1`. Use endpoint 5 when you want to normalise positions back to `1..N`.

## 5. Reorder modules

`PUT /api/v1/courses/:courseId/modules/reorder`

Body (`reorderModulesSchema`):

```json
{
  "modules": [
    { "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11", "order": 2 },
    { "id": "9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "order": 1 }
  ]
}
```

Rules enforced by the API:

1. Every module of the course must be present exactly once (no missing, no foreign ids).
2. `order` values must be unique (Zod) and form a contiguous sequence `1..N`.
3. Updates run inside `prisma.$transaction`, so a failed reorder changes nothing.

```bash
curl -X PUT "http://localhost:3000/api/v1/courses/$COURSE_ID/modules/reorder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      { "id": "'"$MODULE_ID_A"'", "order": 2 },
      { "id": "'"$MODULE_ID_B"'", "order": 1 }
    ]
  }'
```

`200 OK`

```json
{
  "success": true,
  "message": "Modules reordered successfully",
  "data": [
    {
      "id": "9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "title": "Module B",
      "description": null,
      "order": 1,
      "courseId": "0b6f0f47-6a4b-4d5e-9c3a-1f2e3d4c5b6a",
      "_count": { "lessons": 0 }
    },
    {
      "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "title": "Algebra Basics",
      "description": "Variables, expressions and simple equations",
      "order": 2,
      "courseId": "0b6f0f47-6a4b-4d5e-9c3a-1f2e3d4c5b6a",
      "_count": { "lessons": 3 }
    }
  ]
}
```

---

## Error reference

| Status | When | Message |
| --- | --- | --- |
| `400` | Invalid body/params/query (Zod) | `Validation failed` + `errors[]` |
| `400` | Course is `ARCHIVED` | `Archived courses cannot be edited` |
| `400` | Reorder payload does not cover the course | `Provided modules do not match the modules of this course` |
| `400` | Reorder positions have gaps | `Module positions must be sequential starting from 1` |
| `400` | Reorder on a course without modules | `Course has no modules to reorder` |
| `401` | Missing/invalid token | Authentication error |
| `403` | Teacher is not the course owner | `Forbidden` |
| `404` | Course not found or not visible to the user | `Course not found` |
| `404` | Module not found | `Module not found` |
| `409` | `order` already used in the course | `Module position already in use` |

> Note: SRS §25 / NFR-08 require an `errorCode` field in error responses. The
> shared error middleware does not return it yet — see
> `dev2-global-changes-needed.md`.

## Postman quick setup

1. Create an environment with `baseUrl = http://localhost:3000/api/v1`, `TOKEN`, `COURSE_ID`, `MODULE_ID`.
2. Add header `Authorization: Bearer {{TOKEN}}` on every request.
3. Use JSON body with `Content-Type: application/json`.
4. For the list endpoint use query params `page` and `limit` (default `limit = 50`).
