# Lessons API — Developer 2 (Core LMS)

Base URL: `/api/v1`
All routes require a valid JWT: `Authorization: Bearer <TOKEN>`.

## Access rules

| Action | Allowed |
| --- | --- |
| Create / update / delete / reorder | Course owner (`teacherId`) or `ADMIN` |
| List / get | Owner + admin (any status); other teachers on `PUBLISHED`; students on `PUBLISHED` **and enrolled** |
| Student, published but not enrolled | `403` `"Enrollment required"` |
| Student, draft/archived course | `404` `"Course not found"` (existence not leaked) |
| Any write on archived course | `400` `"Archived courses cannot be edited"` |

> **Route layout note (SRS §24):** the SRS lists the Lessons base path as
> `/api/v1/lessons`. This implementation uses `/lessons/:id` for lesson-scoped
> operations, `GET /api/v1/courses/:courseId/lessons` exactly as shown in the
> SRS representative endpoints (PDF p.15), and `/modules/:moduleId/lessons`
> for create/reorder because a lesson belongs to a module and
> `lesson.schema.ts` takes `moduleId` from the route, not the body.

> **FR-19 scope:** this API stores text (`content`) and a **single** video
> (`videoUrl`). Images, multiple videos, external resources and attachments
> have no schema fields yet; see `dev2-global-changes-needed.md` §2.

## Endpoints

| # | Method | Path | Purpose |
| --- | --- | --- | --- |
| 1 | POST | `/api/v1/modules/:moduleId/lessons` | Create a lesson (position auto-appended if `order` is omitted) |
| 2 | GET | `/api/v1/courses/:courseId/lessons` | List course lessons (paginated, module order then lesson order) |
| 3 | GET | `/api/v1/lessons/:id` | Get one lesson |
| 4 | PATCH | `/api/v1/lessons/:id` | Update title, content, videoUrl or order |
| 5 | DELETE | `/api/v1/lessons/:id` | Delete a lesson (cascades to `LessonProgress`) |
| 6 | PUT | `/api/v1/modules/:moduleId/lessons/reorder` | Atomically reorder all lessons of a module |

---

## 1. Create a lesson

`POST /api/v1/modules/:moduleId/lessons`

Body (`createLessonSchema`, `.strict()`):

```json
{
  "title": "Variables and Expressions",
  "content": "A variable is a symbol that represents a value.",
  "videoUrl": "https://example.com/videos/variables.mp4",
  "order": 1
}
```

- `title`: required, 2–150 chars
- `content`: optional, max 50,000 chars
- `videoUrl`: optional, must be an `https://` URL
- `order`: optional positive integer. Omit it to append (`max(order) + 1`).

```bash
curl -X POST "http://localhost:4000/api/v1/modules/$MODULE_ID/lessons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Variables and Expressions",
    "content": "A variable is a symbol that represents a value.",
    "videoUrl": "https://example.com/videos/variables.mp4"
  }'
```

`201 Created`

```json
{
  "success": true,
  "message": "Lesson created successfully",
  "data": {
    "id": "3f7b2c1d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    "title": "Variables and Expressions",
    "content": "A variable is a symbol that represents a value.",
    "videoUrl": "https://example.com/videos/variables.mp4",
    "order": 1,
    "moduleId": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
    "module": {
      "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "title": "Introduction to Algebra",
      "order": 1
    }
  }
}
```

## 2. List lessons of a course

`GET /api/v1/courses/:courseId/lessons`

Query parameters:

| Param | Type | Default | Rules |
| --- | --- | --- | --- |
| `page` | integer | `1` | must be > 0 |
| `limit` | integer | **`50`** | 1–50 |

- Ordered by `module.order ASC`, then `lesson.order ASC`.
- Includes `module { id, title, order }` for each lesson.
- Returns `meta { total, page, totalPages }`.

```bash
curl "http://localhost:4000/api/v1/courses/$COURSE_ID/lessons?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "3f7b2c1d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
      "title": "Variables and Expressions",
      "content": "A variable is a symbol that represents a value.",
      "videoUrl": "https://example.com/videos/variables.mp4",
      "order": 1,
      "moduleId": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "module": {
        "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
        "title": "Introduction to Algebra",
        "order": 1
      }
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

## 3. Get one lesson

`GET /api/v1/lessons/:id`

```bash
curl "http://localhost:4000/api/v1/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK` — same lesson shape as the list item.

## 4. Update a lesson

`PATCH /api/v1/lessons/:id`

Body (`updateLessonSchema`, all fields optional, at least one required):

```json
{
  "title": "Variables, Expressions and Equations",
  "content": "Updated lesson text."
}
```

```bash
curl -X PATCH "http://localhost:4000/api/v1/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Variables, Expressions and Equations",
    "content": "Updated lesson text."
  }'
```

`200 OK`

```json
{
  "success": true,
  "message": "Lesson updated successfully",
  "data": {
    "id": "3f7b2c1d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    "title": "Variables, Expressions and Equations",
    "content": "Updated lesson text.",
    "videoUrl": "https://example.com/videos/variables.mp4",
    "order": 1,
    "moduleId": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
    "module": {
      "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "title": "Introduction to Algebra",
      "order": 1
    }
  }
}
```

> For a full reorder use endpoint 6. Endpoint 4 only accepts an `order` that is currently free.

## 5. Delete a lesson

`DELETE /api/v1/lessons/:id`

```bash
curl -X DELETE "http://localhost:4000/api/v1/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "message": "Lesson deleted successfully",
  "data": {
    "id": "3f7b2c1d-4e5f-4a6b-8c9d-0e1f2a3b4c5d",
    "deletedProgress": 2
  }
}
```

Cascade behaviour (ERD §G, PDF p.20 and ERD §H, p.23):

- `LessonProgress` rows for this lesson are **deleted permanently**.
- `deletedProgress` tells the client how many student progress records were removed, so the UI can warn first.
- Remaining lesson positions are **not shifted** (same as Modules); use endpoint 6 to normalise to `1..N`.

## 6. Reorder lessons

`PUT /api/v1/modules/:moduleId/lessons/reorder`

Body (`reorderLessonsSchema`):

```json
{
  "lessons": [
    { "id": "3f7b2c1d-4e5f-4a6b-8c9d-0e1f2a3b4c5d", "order": 2 },
    { "id": "9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", "order": 1 }
  ]
}
```

Rules:

1. Every lesson of the module must be present exactly once (no missing, no foreign ids).
2. `order` values must be unique (Zod) and form a contiguous sequence `1..N`.
3. Updates run inside `prisma.$transaction`, so a failed reorder changes nothing.

```bash
curl -X PUT "http://localhost:4000/api/v1/modules/$MODULE_ID/lessons/reorder" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lessons": [
      { "id": "'"$LESSON_ID_A"'", "order": 2 },
      { "id": "'"$LESSON_ID_B"'", "order": 1 }
    ]
  }'
```

`200 OK`

```json
{
  "success": true,
  "message": "Lessons reordered successfully",
  "data": [
    {
      "id": "9a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
      "title": "Lesson B",
      "content": null,
      "videoUrl": null,
      "order": 1,
      "moduleId": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
      "module": {
        "id": "6f1c2e0a-9b7d-4a51-8f2c-2a0f4f0d9b11",
        "title": "Introduction to Algebra",
        "order": 1
      }
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
| `400` | Reorder payload does not cover the module | `Provided lessons do not match the lessons of this module` |
| `400` | Reorder positions have gaps | `Lesson positions must be sequential starting from 1` |
| `400` | Reorder on a module without lessons | `Module has no lessons to reorder` |
| `401` | Missing/invalid token | Authentication error |
| `403` | Teacher is not the course owner | `Forbidden` |
| `403` | Student is not enrolled in a published course | `Enrollment required` |
| `404` | Course not found or not visible to the user | `Course not found` |
| `404` | Module not found | `Module not found` |
| `404` | Lesson not found | `Lesson not found` |
| `409` | `order` already used in the module | `Lesson position already in use` |

> Note: SRS §25 / NFR-08 require an `errorCode` field in error responses. The
> shared error middleware does not return it yet — see
> `dev2-global-changes-needed.md` §1.

## Postman quick setup

1. Environment: `baseUrl = http://localhost:4000/api/v1`, `TOKEN`, `COURSE_ID`, `MODULE_ID`, `LESSON_ID`.
2. Header `Authorization: Bearer {{TOKEN}}` on every request.
3. JSON body with `Content-Type: application/json`.
4. List endpoint: query params `page` and `limit` (default `limit = 50`).
