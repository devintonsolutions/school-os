# Global changes needed — Developer 2 notes

Project-wide items that Developer 2 cannot change without team approval, because
they touch shared/global files owned by Developer 1.

## 1. `errorCode` missing from API error responses

- **Requirement:** SRS §25 — API Response Format (PDF p.15) and NFR-08 (PDF p.12) require:
  ```json
  { "success": false, "message": "Course not found", "errorCode": "COURSE_NOT_FOUND" }
  ```
- **Current behaviour:** `backend/src/middleware/error.middleware.ts` returns
  `{ success: false, message }` (plus `errors[]` for Zod validation) but **no `errorCode`**.
- **Impact:** every module (auth, users, courses, categories, modules, ...) is non-compliant,
  not just Modules.
- **Owner:** Developer 1 (shared middleware).
- **Needed decision:** error-code naming convention (e.g. `MODULE_NOT_FOUND`, `VALIDATION_ERROR`,
  `FORBIDDEN`) and whether `AppError` should carry the code.
- **Status:** open — not changed by Developer 2 (global file, out of scope).

## 2. FR-19 content types need schema support

- **Requirement:** SRS FR-19 (PDF p.9) says lessons may contain **text, images,
  videos, external resources, and attachments**.
- **Current schema:** `Lesson` only has `content String?` (text) and
  `videoUrl String?` (a **single** video). There are no fields for images,
  multiple videos, external resources or attachments.
- **Suggestion:** add an optional `attachments Json?` field (or a dedicated
  `LessonAttachment` model) to store `{ name, url, type, size }` entries.
- **Impact:** requires a `schema.prisma` change, a new migration and team-lead
  approval because the DB is shared.
- **Status:** open — schema.prisma was **not** touched by Developer 2.

## 3. `GET /courses/:id` lesson content leak (fixed)

- **Requirement:** SRS UC-05 (PDF p.20) expects the student to be **enrolled**
  before opening/completing a lesson.
- **Previous behaviour:** `getCourseById` (`backend/src/modules/courses/course.service.ts`)
  returned full `modules.lessons` (including `content` and `videoUrl`) to any
  authenticated user for a `PUBLISHED` course, without checking enrollment.
- **Fixed behaviour:**
  - Owner teacher, admin and enrolled students receive the full course detail.
  - Non-owner teachers and non-enrolled students receive a curriculum preview:
    modules with `id`, `title`, `order`, and lessons with `id`, `title`, `order`.
  - Preview responses omit lesson `content`, `videoUrl` and `moduleId`.
  - DRAFT/ARCHIVED courses remain hidden (`404`) from non-owner/admin users.
- **Status:** fixed in `course.service.ts` (no schema change).

## 4. Enrollment ownership and no unenroll endpoint

- SRS section 29/43 assigns Enrollment to Developer 3; Team Guide section 10/32 assigns it to Developer 2. Built by Developer 2.
- No unenroll endpoint was added (FR-21 to FR-23 / UC-04 do not request one); `EnrollmentStatus.DROPPED` remains unused.

## 5. Progress ownership and document gaps

- (a) SRS section 43 gives FR-24 to Developer 3; Team Guide section 10/31 gives it to Developer 2. Built by Developer 2.
- (b) FR-25 says "latest incomplete lesson", but LessonProgress has no last-viewed field; this API uses the next incomplete lesson in curriculum order (module.order, then lesson.order).
- (c) FR-24 mentions assignment/quiz weighting; this API is lesson-only because assignments and quizzes belong to Developer 3.