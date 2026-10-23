# Enrollments API - Developer 2 (Core LMS)

Base URL: `/api/v1`
All routes require a valid JWT: `Authorization: Bearer <TOKEN>`.

## Access rules

| Action | Allowed |
| --- | --- |
| Enroll in a course | `STUDENT` only (BR-01) |
| View own enrollments | `STUDENT` only |
| View a course roster | Course owner (`teacherId`) or `ADMIN` |
| Non-owner teacher on roster | `403` `"Forbidden"` |
| Teacher/Admin trying to enroll | `403` `"Forbidden"` |
| Student trying to view a roster | `403` `"Forbidden"` |
| Non-published course enrollment | `404` `"Course not found"` (DRAFT/ARCHIVED existence is not leaked) |
| Duplicate enrollment | `409` `"Already enrolled in this course"` |

> **Route layout note (SRS section 24):** the SRS lists the Enrollments base
> path as `/api/v1/enrollments`, but its representative endpoint is
> `POST /api/v1/courses/:courseId/enroll` (PDF p.15). This implementation
> follows that exact enrollment URL and keeps the roster course-scoped, like
> Modules and Lessons. The router is mounted at `/api/v1`.

> **Scope note:** FR-21, FR-22 and FR-23 do not ask for an unenroll/drop
> endpoint. `EnrollmentStatus.DROPPED` and `COMPLETED` therefore remain unused
> by this API; every new enrollment is `ACTIVE`. Enrollment completion
> (`completedAt`) belongs to `LessonProgress` / the Progress API, not to this
> model.

## Endpoints

| # | Method | Path | Roles | Purpose |
| --- | --- | --- | --- | --- |
| 1 | POST | `/api/v1/courses/:courseId/enroll` | `STUDENT` | Enroll the current student in a published course |
| 2 | GET | `/api/v1/enrollments/my` | `STUDENT` | List the current student's enrollments (paginated) |
| 3 | GET | `/api/v1/courses/:courseId/enrollments` | `TEACHER`, `ADMIN` | List a course roster (paginated) |

There is **no** unenroll endpoint in this API.

---

## 1. Enroll in a course

`POST /api/v1/courses/:courseId/enroll`

No request body. The student is taken from the JWT (`req.user.id`); a client
cannot enroll another student.

```bash
curl -X POST "http://localhost:4000/api/v1/courses/$COURSE_ID/enroll" \
  -H "Authorization: Bearer $TOKEN"
```

`201 Created`

```json
{
  "success": true,
  "message": "Enrolled successfully",
  "data": {
    "id": "9b2f4c1e-7a3d-4b5c-8e9f-0a1b2c3d4e5f",
    "enrolledAt": "2026-10-24T10:00:00.000Z",
    "status": "ACTIVE",
    "studentId": "11111111-1111-4111-8111-111111111111",
    "courseId": "22222222-2222-4222-8222-222222222222",
    "course": {
      "id": "22222222-2222-4222-8222-222222222222",
      "title": "Introduction to Algorithms",
      "description": "Core algorithms and data structures.",
      "thumbnail": null,
      "status": "PUBLISHED",
      "teacher": {
        "id": "33333333-3333-4333-8333-333333333333",
        "firstName": "Professor",
        "lastName": "Smith",
        "avatarUrl": null
      },
      "category": {
        "id": "44444444-4444-4444-8444-444444444444",
        "name": "Computer Science"
      },
      "_count": {
        "modules": 4
      }
    }
  }
}
```

### Enrollment rules

1. Course must exist, otherwise `404`.
2. Course must be `PUBLISHED`, otherwise `404`.
3. The service checks for an existing `(studentId, courseId)` row first.
4. The database `@@unique([studentId, courseId])` is still the final guard;
   a `P2002` race is converted to `409`.
5. Only a `STUDENT` can reach the service (`authorize("STUDENT")` plus a
   defensive role check).

### Errors

| Status | Message | Cause |
| --- | --- | --- |
| `400` | `Validation failed` | `:courseId` is not a UUID |
| `401` | `Access token is required` | Missing/invalid JWT |
| `403` | `Forbidden` | Teacher/Admin tried to enroll |
| `404` | `Course not found` | Course missing, DRAFT or ARCHIVED |
| `409` | `Already enrolled in this course` | Duplicate enrollment |

---

## 2. My enrollments

`GET /api/v1/enrollments/my?page=1&limit=50&status=ACTIVE`

- `page`: optional positive integer, default `1`.
- `limit`: optional positive integer, default `50`, maximum `50`.
- `status`: optional `ACTIVE | COMPLETED | DROPPED`.
- The service always filters by `studentId = req.user.id`; there is no
  `studentId` query parameter.
- Results are ordered by `enrolledAt` descending (newest first).

```bash
curl "http://localhost:4000/api/v1/enrollments/my?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "9b2f4c1e-7a3d-4b5c-8e9f-0a1b2c3d4e5f",
      "enrolledAt": "2026-10-24T10:00:00.000Z",
      "status": "ACTIVE",
      "studentId": "11111111-1111-4111-8111-111111111111",
      "courseId": "22222222-2222-4222-8222-222222222222",
      "course": {
        "id": "22222222-2222-4222-8222-222222222222",
        "title": "Introduction to Algorithms",
        "description": "Core algorithms and data structures.",
        "thumbnail": null,
        "status": "PUBLISHED",
        "teacher": {
          "id": "33333333-3333-4333-8333-333333333333",
          "firstName": "Professor",
          "lastName": "Smith",
          "avatarUrl": null
        },
        "category": {
          "id": "44444444-4444-4444-8444-444444444444",
          "name": "Computer Science"
        },
        "_count": {
          "modules": 4
        }
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

The course summary includes `course.status`, so the client can show an
archived course in the student's history. It does **not** include modules or
lessons; use `GET /api/v1/courses/:courseId/lessons` for content.

---

## 3. Course roster

`GET /api/v1/courses/:courseId/enrollments?page=1&limit=50&status=ACTIVE`

- Course owner (`teacherId`) or `ADMIN` only.
- `page` / `limit`: same rules as above.
- `status`: optional `ACTIVE | COMPLETED | DROPPED`.
- Results are ordered by `enrolledAt` ascending (first enrolled first).
- Student fields are limited to:
  `id`, `firstName`, `lastName`, `email`, `avatarUrl`.
  No `passwordHash`, token or other secret is selected.

```bash
curl "http://localhost:4000/api/v1/courses/$COURSE_ID/enrollments?page=1&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

`200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "9b2f4c1e-7a3d-4b5c-8e9f-0a1b2c3d4e5f",
      "enrolledAt": "2026-10-24T10:00:00.000Z",
      "status": "ACTIVE",
      "studentId": "11111111-1111-4111-8111-111111111111",
      "courseId": "22222222-2222-4222-8222-222222222222",
      "student": {
        "id": "11111111-1111-4111-8111-111111111111",
        "firstName": "Alex",
        "lastName": "Doe",
        "email": "student@schoolos.com",
        "avatarUrl": null
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

### Errors

| Status | Message | Cause |
| --- | --- | --- |
| `400` | `Validation failed` | Invalid `:courseId` or query |
| `401` | `Access token is required` | Missing/invalid JWT |
| `403` | `Forbidden` | Student, or teacher who does not own the course |
| `404` | `Course not found` | Course does not exist |

---

## Lessons access consistency

The Lessons API uses this query
(`backend/src/modules/lessons/lesson.service.ts` lines 116-127):

```ts
prisma.enrollment.findUnique({
  where: {
    studentId_courseId: {
      studentId: user.id,
      courseId: course.id,
    },
  },
  select: { id: true },
});
```

It does **not** filter by `status`. Because this Enrollment API has no
unenroll/drop endpoint, every row it creates is `ACTIVE`, so Lessons,
Assignments and Quizzes stay consistent.

If a future task adds soft unenroll (`DROPPED`), the Lessons, Assignments and
Quizzes enrollment checks must all add `status: "ACTIVE"`. That is a
cross-module change and needs team approval; it is not part of this API.

## Pagination

All list endpoints return:

```json
{
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

`limit` is capped at `50`. `page` starts at `1`.

## Known global gaps (not changed here)

- `errorCode` is still missing from the global error middleware; see
  `dev2-global-changes-needed.md` section 1.
