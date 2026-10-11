# LearnOS — Core LMS Schema Proposal (Developer 2 MOHSIN ALI CTO)

**Author:** Developer 2 Mohsin ali CTO (Core LMS Backend Engineer)  
**Date:** October 11, 2026  
**Status:** Proposal / Pending Team Lead Approval  
**Target File:** `backend/prisma/schema.prisma`  

---

## 1. Proposed Prisma Schema Additions

The following models and enums represent the complete Core LMS domain: **Category, Course, Module, Lesson, Enrollment, and LessonProgress**.

All models adhere strictly to existing repository standards:
- **IDs:** UUID strings (`id String @id @default(uuid())`).
- **Naming Conventions:** PascalCase models and enum names, camelCase fields, UPPERCASE enum values.
- **Relations:** Explicit foreign keys with defensively chosen `onDelete` referential actions.
- **Timestamps:** Every model includes `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.

```prisma
// ============================================================================
// Core LMS Enums
// ============================================================================

enum CourseStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum LessonType {
  VIDEO
  ARTICLE
}

enum EnrollmentStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

// ============================================================================
// Core LMS Models
// ============================================================================

model Category {
  id          String   @id @default(uuid())
  name        String   @unique
  slug        String   @unique
  description String?

  courses     Course[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Course {
  id           String       @id @default(uuid())
  title        String
  slug         String       @unique
  description  String?
  thumbnailUrl String?
  status       CourseStatus @default(DRAFT)

  // Category relation: Nullable to allow SetNull if a category is deleted
  categoryId   String?
  category     Category?    @relation(fields: [categoryId], references: [id], onDelete: SetNull)

  // Teacher relation: Restrict deletion so courses are never orphaned silently
  teacherId    String
  teacher      User         @relation("TeacherCourses", fields: [teacherId], references: [id], onDelete: Restrict)

  // Structural sub-entities
  modules      Module[]

  // Student enrollments: Course cannot be hard-deleted while enrollments exist
  enrollments  Enrollment[]

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([teacherId])
  @@index([categoryId])
  @@index([status])
  @@index([createdAt])
}

model Module {
  id          String   @id @default(uuid())
  title       String
  description String?
  order       Int

  // Course relation: Cascade delete when parent course is deleted
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)

  lessons     Lesson[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Composite index for fast hierarchical order sorting.
  // Note: Uniqueness is omitted at DB level because unique order constraints
  // break swap/reorder operations in PostgreSQL. Reordering is handled in service layer.
  @@index([courseId, order])
}

model Lesson {
  id              String         @id @default(uuid())
  title           String
  content         String?
  videoUrl        String?
  durationMinutes Int?
  order           Int
  type            LessonType     @default(VIDEO)
  isFreePreview   Boolean        @default(false)

  // Module relation: Cascade delete when parent module is deleted
  moduleId        String
  module          Module         @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  // Student progress tracking
  progress        LessonProgress[]

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  // Composite index for fast hierarchical order sorting.
  // Ordering uniqueness is enforced in service layer to permit clean swap/reorder transactions.
  @@index([moduleId, order])
}

model Enrollment {
  id          String           @id @default(uuid())

  // Student relation: Cascade delete if student account is permanently erased
  studentId   String
  student     User             @relation("StudentEnrollments", fields: [studentId], references: [id], onDelete: Cascade)

  // Course relation: Restrict course deletion if enrollments exist
  courseId    String
  course      Course           @relation(fields: [courseId], references: [id], onDelete: Restrict)

  status      EnrollmentStatus @default(ACTIVE)
  enrolledAt  DateTime         @default(now())
  completedAt DateTime?

  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  // Prevents duplicate enrollments for the same student in the same course.
  // Serves as the index for queries filtering on studentId.
  @@unique([studentId, courseId])
  @@index([courseId])
  @@index([status])
}

model LessonProgress {
  id             String    @id @default(uuid())

  // Student relation: Cascade delete if student account is erased
  studentId      String
  student        User      @relation("StudentLessonProgress", fields: [studentId], references: [id], onDelete: Cascade)

  // Lesson relation: Cascade delete if lesson is removed
  lessonId       String
  lesson         Lesson    @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  isCompleted    Boolean   @default(false)
  completedAt    DateTime?
  lastAccessedAt DateTime  @default(now())

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Ensures exactly one progress record per student per lesson.
  // Serves as the index for queries filtering on studentId.
  @@unique([studentId, lessonId])
  @@index([lessonId])
}
```

---

## 2. Minimal Diff for Existing `User` Model

To wire the bidirectional relations into the shared `User` model, apply this exact diff to `backend/prisma/schema.prisma`:

```diff
 model User {
   id              String   @id @default(uuid())
   email           String   @unique
   passwordHash    String
   firstName       String
   lastName        String
   role            Role     @default(STUDENT)

   isActive        Boolean  @default(true)
   emailVerifiedAt DateTime?
   lastLoginAt     DateTime?

   createdAt       DateTime @default(now())
   updatedAt       DateTime @updatedAt

   refreshTokens   RefreshToken[]
+
+  // Core LMS Relations (Developer 2)
+  taughtCourses   Course[]         @relation("TeacherCourses")
+  enrollments     Enrollment[]     @relation("StudentEnrollments")
+  lessonProgress  LessonProgress[] @relation("StudentLessonProgress")
 }
```

---

## 3. Design Decisions & Architectural Rationale

### A. Referential Actions (`onDelete`) Strategy

| Relation | Foreign Key | Action | Justification |
|---|---|---|---|
| `Course.teacherId` → `User.id` | `teacherId` | `Restrict` | **Safety First.** A teacher must never be deleted if they have published courses. Silently deleting courses destroys learning materials and active student progress. If a teacher departs, their courses must be reassigned by an Admin, or the teacher marked `isActive: false`. |
| `Course.categoryId` → `Category.id` | `categoryId` | `SetNull` | Categories are purely organizational tags. Deleting a category should not delete its courses; courses simply become uncategorized (`categoryId: null`). |
| `Module.courseId` → `Course.id` | `courseId` | `Cascade` | Modules are direct sub-components of a course. A module cannot exist independently without its parent course. |
| `Lesson.moduleId` → `Module.id` | `moduleId` | `Cascade` | Lessons are direct child components of a module. |
| `Enrollment.courseId` → `Course.id` | `courseId` | `Restrict` | **Academic Integrity.** A course cannot be hard-deleted from the database if students are enrolled in it. The course must instead be archived (`status: ARCHIVED`). |
| `Enrollment.studentId` → `User.id` | `studentId` | `Cascade` | If a student account is deleted (e.g., GDPR right-to-be-forgotten), their enrollment records are purged with them. |
| `LessonProgress.lessonId` → `Lesson.id` | `lessonId` | `Cascade` | If a lesson is deleted by an instructor during curriculum editing, its associated progress records are cleaned up. |
| `LessonProgress.studentId` → `User.id` | `studentId` | `Cascade` | Deleting a student removes their lesson completion history. |

### B. Unique Constraints vs. Indexes

1. **`Enrollment @@unique([studentId, courseId])`**  
   Guarantees at the database level that a student cannot have duplicate active enrollment records for a single course. Also acts as an index for queries filtering on `studentId`.
2. **`LessonProgress @@unique([studentId, lessonId])`**  
   Guarantees that a student has at most one progress tracking entry per lesson. Enables idempotent progress upserts (`prisma.lessonProgress.upsert(...)`). Also acts as an index for queries filtering on `studentId`.
3. **`Category @unique on name and slug` & `Course @unique on slug`**  
   Enables collision-free, human-readable URL routing.
4. **Why `Module` and `Lesson` Order Uniqueness is Handled in the Service Layer:**  
   In PostgreSQL, unique constraints on `[courseId, order]` or `[moduleId, order]` break swap and drag-and-drop reorder operations. For instance, swapping items at positions `1` and `2` within a transaction triggers a temporary duplicate key violation unless deferred constraints are configured (which Prisma does not natively manage). Using composite indexes `@@index([courseId, order])` and `@@index([moduleId, order])` gives optimal query sorting while re-sequencing logic is handled safely in the service layer inside a `prisma.$transaction`.

### C. Indexing Strategy & Redundancy Removal

- **Composite Index Left-Prefix Optimization:**
  - In `Enrollment`, `@@unique([studentId, courseId])` already indexes the leading column `studentId`. A standalone `@@index([studentId])` was removed as redundant.
  - In `LessonProgress`, `@@unique([studentId, lessonId])` already indexes the leading column `studentId`. A standalone `@@index([studentId])` was removed as redundant.
  - In `Module` and `Lesson`, `@@index([courseId, order])` and `@@index([moduleId, order])` already index leading parent IDs (`courseId` and `moduleId`). Standalone single-column indexes on `courseId` and `moduleId` were removed as redundant.
  - `@@index([isCompleted])` on `LessonProgress` was removed because low-cardinality boolean indexes yield poor selectivity on relational databases compared to composite lookups by student or lesson.
- **Active Indexes Maintained:**
  - `Course`: `@@index([teacherId])`, `@@index([categoryId])`, `@@index([status])`, `@@index([createdAt])`.
  - `Enrollment`: `@@index([courseId])` (for teacher roster lookups), `@@index([status])` (for filtering active vs. completed enrollments).
  - `LessonProgress`: `@@index([lessonId])` (for lesson-level completion aggregates).

### D. Archiving vs. Hard Delete Strategy

- **Courses use `CourseStatus.ARCHIVED` instead of hard deletion.**
- When an instructor or admin chooses to "delete" a published course:
  1. The API verifies whether enrollments exist.
  2. If enrollments exist, the API sets `status: ARCHIVED`.
  3. Archived courses are hidden from the public catalog and cannot receive new enrollments, but enrolled students retain access to materials they already joined.
- Hard delete (`prisma.course.delete`) is only permitted in the service layer for `DRAFT` courses with zero enrollments.

---

## 4. Service-Layer Rules & Business Logic Constraints

Because certain business rules cannot or should not be enforced purely at the database level, the service layer must strictly enforce the following invariants:

1. **Teacher Ownership Checks on Course, Module, and Lesson Edits:**
   * Only the teacher assigned to the course (`course.teacherId === req.user.id`) or a user with the `ADMIN` role is allowed to update or delete a course, or create, update, reorder, or delete its modules and lessons.
   * Enforced via the shared `assertOwnerOrAdmin(course.teacherId, req.user)` helper.
2. **Student-Only Access to Own Enrollments & Progress:**
   * Students may only query or manipulate their own enrollments and progress records (`req.user.id === studentId`).
   * A student cannot mark progress on behalf of another user.
3. **ACTIVE Enrollment Required Before Marking Progress:**
   * Before creating or updating a `LessonProgress` entry for a lesson, the service must verify:
     1. The lesson belongs to module $M$, which belongs to course $C$.
     2. The requesting student has an existing record in `Enrollment` for course $C$ with `status: ACTIVE`.
   * If no enrollment exists or if `status === CANCELLED`, the service throws `AppError("Active enrollment required to update lesson progress", 403)`.
4. **Re-activating a CANCELLED Enrollment Instead of Duplicate Creation:**
   * When a student requests enrollment in a course:
     1. The service checks for an existing record matching `[studentId, courseId]`.
     2. If an enrollment exists with `status: ACTIVE`, throw `AppError("Already enrolled in this course", 409)`.
     3. If an enrollment exists with `status: CANCELLED`, re-activate the existing record by updating `status` to `ACTIVE`, updating `enrolledAt: new Date()`, and setting `completedAt: null`. This avoids violating the `@@unique([studentId, courseId])` database constraint.
5. **Atomic Reordering Transactions:**
   * All module and lesson reordering must execute within a `prisma.$transaction([ ... ])` to prevent partial sequence states.

---

## 5. Entity Relationship Diagram (ERD)

```text
       ┌────────────────────────┐
       │          User          │
       │────────────────────────│
       │ id: UUID (PK)          │
       │ role: STUDENT|TEACHER  │
       └─────┬────────────┬─────┘
             │ 1          │ 1
  (teacherId)│            │(studentId)
   [Restrict]│            │[Cascade]
             ▼ *          ▼ *
    ┌────────────────┐   ┌──────────────────────────┐
    │     Course     │   │        Enrollment        │
    │────────────────│   │──────────────────────────│
    │ id: UUID (PK)  │◄──┤ id: UUID (PK)            │
    │ categoryId: FK │ * │ studentId: UUID (FK)     │
    │ teacherId: FK  │   │ courseId: UUID (FK)      │
    │ status: Enum   │   │ status: Enum             │
    └────┬───────▲───┘   │ @@unique([stdId, crsId]) │
         │ 1     │       └──────────────────────────┘
[Cascade]│       │ [SetNull]
         ▼ *     │
    ┌────────────┴───┐   ┌──────────────────────────┐
    │     Module     │   │         Category         │
    │────────────────│   │──────────────────────────│
    │ id: UUID (PK)  │   │ id: UUID (PK)            │
    │ courseId: FK   │   │ name: String (UQ)        │
    │ order: Int     │   │ slug: String (UQ)        │
    └────────┬───────┘   └──────────────────────────┘
             │ 1
    [Cascade]│
             ▼ *
    ┌────────────────┐   ┌──────────────────────────┐
    │     Lesson     │   │      LessonProgress      │
    │────────────────│   │──────────────────────────│
    │ id: UUID (PK)  │◄──┤ id: UUID (PK)            │
    │ moduleId: FK   │ 1 │ studentId: UUID (FK)     │
    │ order: Int     │   │ lessonId: UUID (FK)      │
    │ type: Enum     │ * │ isCompleted: Boolean     │
    └────────────────┘   │ @@unique([stdId, lsnId]) │
                         └─────────────▲────────────┘
                                       │ * [Cascade]
                                       │ (studentId)
                                     User
```

---

## 6. Migration Execution & Team Coordination Plan

> [!CAUTION]
> **CRITICAL ENVIRONMENT WARNING**  
> **DO NOT run migrations against the shared Supabase database!**  
> Always verify that `DATABASE_URL` in your `.env` points to your **local or isolated personal development database** before executing any migration commands.

### Migration Command
Run only the standard Prisma migrate command without manual timestamp prefixes (Prisma automatically generates the timestamp prefix):

```bash
npx prisma migrate dev --name add_core_lms_models
```

### Local Validation Steps
Inside `backend/`:
```bash
# 1. Format schema
npx prisma format

# 2. Validate schema syntax
npx prisma validate

# 3. Create and apply migration against your LOCAL database
npx prisma migrate dev --name add_core_lms_models

# 4. Generate updated Prisma Client (outputs to src/generated/prisma)
npm run prisma:generate

# 5. Type-check TypeScript codebase against new models
npm run build
```

---

## 7. Open Questions for the Team Lead

1. **Multiple Instructors / Co-teachers:** Does a course only ever have one primary teacher (`teacherId`), or should we plan for a many-to-many `CourseInstructor` relationship?
2. **Category Hierarchy:** Are categories flat (single-level), or do we need parent-child subcategories (e.g., `parentId String?` self-relation)?
3. **API Versioning Path:** Should Developer 2 mount LMS routes at `/api/v1/courses` or at `/api/courses` to match Developer 1's `/api/auth` pattern?
4. **Category Deactivation vs. Deletion:** If an admin deactivates a category, should we add `isActive Boolean @default(true)` to `Category`, or is deletion with `onDelete: SetNull` sufficient?
5. **Course Monetization / Pricing:** Are all courses completely free in LearnOS v1 (since `price` was removed from scope), or will pricing/checkout be introduced by another module later?

---

## 8. Message to Team Lead (Copy-Paste for Discord / Slack)

```text
Hey team lead! 👋 Developer 2 here with the Core LMS schema proposal ready for review:

📦 Models & Enums to Add:
- Enums: CourseStatus (DRAFT, PUBLISHED, ARCHIVED), LessonType (VIDEO, ARTICLE), EnrollmentStatus (ACTIVE, COMPLETED, CANCELLED)
- Models: Category, Course, Module, Lesson, Enrollment, LessonProgress

📝 Exact lines to add to the User model in prisma/schema.prisma:
  // Core LMS Relations (Developer 2)
  taughtCourses   Course[]         @relation("TeacherCourses")
  enrollments     Enrollment[]     @relation("StudentEnrollments")
  lessonProgress  LessonProgress[] @relation("StudentLessonProgress")

💡 Key Architecture Decisions Made:
1. Module and Lesson ordering uses @@index([courseId, order]) rather than unique constraints to prevent PostgreSQL swap/reorder conflicts (ordering enforced in service layer).
2. Defensive onDelete: Restrict on Course.teacherId and Enrollment.courseId prevents accidental deletion of learning history.
3. Cleaned up redundant indexes; Course.price and LessonType.QUIZ removed from scope.
4. Service-layer rules defined: teacher ownership checks, student-only progress updates, active enrollment requirement, and re-activating CANCELLED enrollments.

❓ Quick questions for you:
1. Multiple instructors: Is a single teacherId per course sufficient, or do we need co-instructors?
2. Category hierarchy: Are categories strictly flat or nested (parent/child)?
3. Route prefix: Should we mount at /api/v1/* (REST standard) or /api/* (matches existing /api/auth)?
4. Category lifecycle: Do we need isActive on Category, or is onDelete: SetNull on delete enough?
5. Course pricing: Confirming all courses are free in v1 since price was removed from scope?

Detailed documentation is available in docs/dev2-schema-proposal.md. Whenever you're ready, let me know if I should proceed with creating the service and controller modules! 🚀
```
