# Progress API - Developer 2 (Core LMS)

Base URL: `/api/v1`  
All routes require a valid JWT: `Authorization: Bearer <TOKEN>`.

This API covers:

- **FR-20** - students mark lessons complete; `student`, `lesson`, and `completedAt` are stored.
- **FR-24** - lesson progress per course (lesson-only; assignment/quiz weighting is not included).
- **FR-25** - continue learning with the next incomplete lesson in curriculum order.

## Scope and access

| Rule | Behaviour |
|---|---|
| Roles | `STUDENT` only. `TEACHER` and `ADMIN` get `403 Forbidden`. |
| Course for completion | Must be `PUBLISHED`; `DRAFT` / `ARCHIVED` return `404 "Course not found"` to students. |
| Enrollment | Same query as the Lessons API; no `Enrollment.status` filter. |
| Missing enrollment on PUBLISHED course | `403 "Enrollment required"` |
| Missing enrollment on ARCHIVED course | `404 "Course not found"` (does not leak archived courses) |
| Un-complete | Not supported. `completed: false` returns `400`. |
| Teacher progress view | Not part of this API. |
| List endpoint | None, so no pagination is needed here. |
| Schema change | None. |

### Enrollment query

The service uses the same query as `lesson.service.ts`:

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

It intentionally does **not** check `Enrollment.status`. Every enrollment created
by the Enrollment API is `ACTIVE`.

## Endpoints

| # | Method | Path | Role | Purpose |
|---|---|---|---|---|
| 1 | PATCH | `/api/v1/progress/lessons/:lessonId` | `STUDENT` | Mark a lesson complete (idempotent) |
| 2 | GET | `/api/v1/progress/courses/:courseId` | `STUDENT` | Current student's progress summary for one course |
| 3 | GET | `/api/v1/progress/courses/:courseId/continue` | `STUDENT` | Next incomplete lesson |

The router is mounted at `/api/v1` after the enrollment router:

```ts
app.use("/api/v1", progressRouter);
```

---

## 1. Mark a lesson complete

`PATCH /api/v1/progress/lessons/:lessonId`

Request body:

```json
{
  "completed": true
}
```

`completed: false` is rejected with `400` because the documents only define
"mark complete", not un-complete/reset.

### Idempotency

`LessonProgress` has `@@unique([studentId, lessonId])`.

- First completion creates one row and sets `completedAt`.
- Completing again returns the same row with `alreadyCompleted: true`.
- The original `completedAt` is **not** overwritten.
- A simultaneous double request is protected by the unique constraint; `P2002`
  is handled as an idempotent success.

### Curl

```bash
curl -X PATCH "http://localhost:4000/api/v1/progress/lessons/$LESSON_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

### Success - always `200`

```json
{
  "success": true,
  "message": "Lesson completed successfully",
  "data": {
    "id": "9b2f4c1e-7a3d-4b5c-8e9f-0a1b2c3d4e5f",
    "lessonId": "55555555-5555-4555-8555-555555555555",
    "courseId": "22222222-2222-4222-8222-222222222222",
    "completed": true,
    "completedAt": "2026-10-24T10:00:00.000Z",
    "alreadyCompleted": false
  }
}
```

Duplicate completion:

```json
{
  "success": true,
  "message": "Lesson already completed",
  "data": {
    "id": "9b2f4c1e-7a3d-4b5c-8e9f-0a1b2c3d4e5f",
    "lessonId": "55555555-5555-4555-8555-555555555555",
    "courseId": "22222222-2222-4222-8222-222222222222",
    "completed": true,
    "completedAt": "2026-10-24T10:00:00.000Z",
    "alreadyCompleted": true
  }
}
```

### Errors

| Status | Message | Cause |
|---|---|---|
| `400` | `Validation failed` | Invalid UUID, missing body, or `completed: false` |
| `401` | `Access token is required` | Missing/invalid JWT |
| `403` | `Forbidden` | Teacher/Admin called the route |
| `403` | `Enrollment required` | Student is not enrolled in a PUBLISHED course |
| `404` | `Lesson not found` | Lesson does not exist |
| `404` | `Course not found` | Course is DRAFT or ARCHIVED |

---

## 2. Course progress summary

`GET /api/v1/progress/courses/:courseId`

Returns the current student's lesson-only progress for one course.

### Curl

```bash
curl "http://localhost:4000/api/v1/progress/courses/$COURSE_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

### Success - `200`

```json
{
  "success": true,
  "data": {
    "courseId": "22222222-2222-4222-8222-222222222222",
    "courseTitle": "Introduction to Algorithms",
    "courseStatus": "PUBLISHED",
    "totalLessons": 5,
    "completedLessons": 2,
    "percentage": 40,
    "allCompleted": false
  }
}
```

### Percentage rules

```text
percentage = totalLessons === 0
  ? 0
  : Math.round((completedLessons / totalLessons) * 100)
```

- Integer `0-100`.
- **0 lessons:** `totalLessons: 0`, `completedLessons: 0`, `percentage: 0`,
  `allCompleted: false`.
- **Lessons added later:** total increases, percentage drops automatically.
- **Lesson/module deleted later:** `LessonProgress` cascades; both counts drop
  and percentage is recalculated.
- **All lessons complete:** `percentage: 100`, `allCompleted: true`. This API
  does **not** change `Enrollment.status`.

### Archived course

For an enrolled student:

- `200` read-only response.
- `courseStatus: "ARCHIVED"`.
- Completion is still blocked with `404`.
- No new progress can be written.

### Errors

| Status | Message | Cause |
|---|---|---|
| `400` | `Validation failed` | Invalid course UUID |
| `401` | `Access token is required` | Missing/invalid JWT |
| `403` | `Forbidden` | Teacher/Admin called the route |
| `403` | `Enrollment required` | Not enrolled in a PUBLISHED course |
| `404` | `Course not found` | Course missing, DRAFT, or ARCHIVED without enrollment |

---

## 3. Continue learning

`GET /api/v1/progress/courses/:courseId/continue`

Returns the next incomplete lesson ordered by:

1. `module.order` ascending
2. `lesson.order` ascending

### Curl

```bash
curl "http://localhost:4000/api/v1/progress/courses/$COURSE_ID/continue" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

### Success - `200`

```json
{
  "success": true,
  "data": {
    "courseId": "22222222-2222-4222-8222-222222222222",
    "courseTitle": "Introduction to Algorithms",
    "courseStatus": "PUBLISHED",
    "totalLessons": 5,
    "completedLessons": 2,
    "percentage": 40,
    "allCompleted": false,
    "nextLesson": {
      "id": "55555555-5555-4555-8555-555555555555",
      "title": "Lesson 3",
      "moduleId": "66666666-6666-4666-8666-666666666666",
      "moduleTitle": "Module 1",
      "moduleOrder": 1,
      "lessonOrder": 3
    }
  }
}
```

### All lessons complete

```json
{
  "success": true,
  "data": {
    "courseId": "22222222-2222-4222-8222-222222222222",
    "courseTitle": "Introduction to Algorithms",
    "courseStatus": "PUBLISHED",
    "totalLessons": 5,
    "completedLessons": 5,
    "percentage": 100,
    "allCompleted": true,
    "nextLesson": null
  }
}
```

### 0 lessons

```json
{
  "success": true,
  "data": {
    "courseId": "22222222-2222-4222-8222-222222222222",
    "courseTitle": "Empty Course",
    "courseStatus": "PUBLISHED",
    "totalLessons": 0,
    "completedLessons": 0,
    "percentage": 0,
    "allCompleted": false,
    "nextLesson": null
  }
}
```

### Archived course

For an enrolled student:

- `200` read-only response.
- `courseStatus: "ARCHIVED"`.
- `nextLesson: null` even if incomplete lessons remain, because archived content
  cannot be continued through this API.

### "Latest incomplete" note

SRS FR-25 says "latest incomplete lesson", but `LessonProgress` has no
`lastViewedAt` / `lastAccessedAt` field. This implementation uses the **next
incomplete lesson in curriculum order**. Adding a last-viewed field would need a
schema change and team-lead approval.

---

## Progress model

```prisma
model LessonProgress {
  id          String    @id @default(uuid())
  completed   Boolean   @default(false)
  completedAt DateTime?

  studentId   String
  student     User      @relation(fields: [studentId], references: [id], onDelete: Cascade)

  lessonId    String
  lesson      Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([studentId, lessonId])
  @@index([lessonId])
  @@map("lesson_progress")
}
```

No schema change is required for this API.

## Not included

- No un-complete/reset progress endpoint.
- No teacher/admin student-progress view.
- No assignment/quiz weighting; progress is lesson-only.
- No `Enrollment.status` update when all lessons are completed.
- No pagination because there is no list endpoint.

## Known global gaps

- `errorCode` is still missing from the global error middleware; see
  `dev2-global-changes-needed.md` section 1.
- `GET /courses/:id` still returns nested lessons without an enrollment check;
  see `dev2-global-changes-needed.md` section 3.
