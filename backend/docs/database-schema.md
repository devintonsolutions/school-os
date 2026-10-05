# School OS — Database Architecture & Schema Specification

This document provides complete documentation of the **School OS Database Architecture**, covering all 23 models across 7 functional domains, relationships, cascade rules, and indexing strategies.

---

## 1. Architectural Overview

The School OS database is modeled in **PostgreSQL** (hosted on Supabase) and managed using **Prisma ORM (v7)**. 

### Key Design Highlights
- **Normalized to 3NF**: Clean relational structure with explicit junction tables carrying metadata (timestamps, scores, status).
- **UUID Primary Keys**: Every table uses a single-column UUID surrogate key (`@id @default(uuid())`). This ensures ID obfuscation across public APIs and avoids cross-environment ID collision.
- **Unified User Table**: All roles (`STUDENT`, `TEACHER`, `ADMIN`) reside in the single `users` table differentiated by the `Role` enum, preventing duplicate shared profile fields and polymorphic foreign keys.
- **Referential Integrity & Cascade Rules**: Strict `onDelete` behaviors configured to avoid orphaned records while safeguarding core business entities (e.g. `Restrict` on teacher deletion if courses exist).
- **Composite Unique Constraints**: Enforced at the database level (`@@unique([studentId, courseId])`, `@@unique([assignmentId, studentId])`, etc.) to guarantee idempotency and eliminate duplicate records even under high concurrency.

---

## 2. Functional Domains & Entity Breakdown

```text
                                  ┌──────────────┐
                                  │     Role     │
                                  └──────┬───────┘
                                         │
                   ┌─────────────────────▼─────────────────────┐
                   │                    User                   │
                   └──────┬───────┬───────┬──────────┬─────────┘
                          │       │       │          │
        ┌─────────────────┘       │       │          └────────────────┐
        ▼                         ▼       ▼                           ▼
┌──────────────┐            ┌───────────┐ ┌────────────────┐    ┌────────────┐
│ Notification │            │ Enrollment│ │ LessonProgress │    │ Refresh    │
└──────────────┘            └─────┬─────┘ └────────▲───────┘    │ Token      │
                                  │                │            └────────────┘
                                  ▼                │
┌──────────────┐            ┌───────────┐          │
│   Category   ├───────────►│   Course  │          │
└──────────────┘            └──┬─┬─┬──┬─┘          │
                               │ │ │  │            │
             ┌─────────────────┘ │ │  └──────────┐ │
             ▼                   ▼ ▼             ▼ │
       ┌──────────┐      ┌──────────┐       ┌──────────┐
       │Assignment│      │   Quiz   │       │  Module  │
       └─────┬────┘      └────┬─────┘       └────┬─────┘
             │                │                  │
             ▼                ▼                  ▼
       ┌──────────┐      ┌──────────┐       ┌──────────┐
       │Submission│      │ Question ├──────►│  Lesson  │
       └─────┬────┘      └────┬─────┘       └──────────┘
             │                │
             └────────►┌──────▼───┐
                       │   Grade  │
                       └──────────┘
```

---

### Domain 1: Authentication & Users

#### `enum Role`
Defines system-wide permissions:
- `STUDENT`: Default public signup role. Enrolls in courses, submits assignments, takes quizzes.
- `TEACHER`: Creates and manages courses, modules, lessons, assignments, quizzes, and grades.
- `ADMIN`: Platform administration, user role assignments, and category management.

#### `model User` (Table: `User`)
Central identity entity containing credentials, security audit timestamps, and reverse relations to all domain models. Compatible with previously created teammate migrations.

```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  passwordHash    String
  firstName       String
  lastName        String
  role            Role      @default(STUDENT)
  avatarUrl       String?
  bio             String?

  isActive        Boolean   @default(true)
  emailVerifiedAt DateTime?
  lastLoginAt     DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Auth Relations
  refreshTokens     RefreshToken[]

  // Domain Relations
  coursesTaught     Course[]           @relation("TeacherCourses")
  enrollments       Enrollment[]
  lessonProgress    LessonProgress[]
  submissions       Submission[]
  quizAttempts      QuizAttempt[]
  grades            Grade[]
  attendanceRecords AttendanceRecord[]
  discussions       Discussion[]
  discussionReplies DiscussionReply[]
  announcements     Announcement[]     @relation("AnnouncementAuthor")
  notifications     Notification[]
  reviews           Review[]
  certificates      Certificate[]
}
```

#### `model RefreshToken` (Table: `RefreshToken`)
Stores hashed cryptographically secure refresh tokens for multi-device session management and token rotation.
- `tokenHash`: SHA-256 hash of the refresh token.
- `onDelete: Cascade` with User.

#### `model Notification` (Table: `notifications`)
In-app alerts for deadlines, announcements, grades, and replies.
- Composite index `@@index([userId, isRead])` for high-performance notification feed retrieval.

---

### Domain 2: Course Structure

#### `model Category` (Table: `categories`)
Hierarchical subject classification (e.g. "Computer Science", "Mathematics"). Deleting a category sets course foreign keys to null (`onDelete: SetNull`).

#### `model Course` (Table: `courses`)
The central pedagogical unit.
- **Status Lifecycle**: `enum CourseStatus { DRAFT, PUBLISHED, ARCHIVED }`
- **Ownership**: `teacherId` referencing `User` with `onDelete: Restrict` (prevents deleting active instructors while their courses exist).
- **Indexes**: `teacherId`, `categoryId`, `status`.

#### `model Module` & `model Lesson` (Tables: `modules`, `lessons`)
Ordered curriculum content tree:
- `Course` (1) ➔ `Module` (N) ➔ `Lesson` (N).
- Each model has an explicit integer `order` field for drag-and-drop or custom sequencing.
- Lessons support video links (`videoUrl`), markdown/rich-text content (`content`), and completion tracking.

#### `model Enrollment` (Table: `enrollments`)
Junction between `User` (Student) and `Course`.
- `status`: `enum EnrollmentStatus { ACTIVE, COMPLETED, DROPPED }`.
- `@@unique([studentId, courseId])`: Enforces at database level that a student can only enroll once in a course.

#### `model LessonProgress` (Table: `lesson_progress`)
Tracks per-student lesson completion.
- `completed`: Boolean flag.
- `completedAt`: Timestamp for analytics and time-to-completion auditing.
- `@@unique([studentId, lessonId])`.

---

### Domain 3: Assignments & Grading

#### `model Assignment` (Table: `assignments`)
Gradable coursework tied to a course with `dueDate` and `maxScore`.

#### `model Submission` (Table: `submissions`)
Student turn-in for an assignment.
- Supports text content (`content`) and document attachments (`fileUrl`).
- `score` and `feedback` populated by teacher upon evaluation.
- `@@unique([assignmentId, studentId])`: Restricts each student to one active submission per assignment.

#### `model Grade` (Table: `grades`)
Consolidated gradebook and academic record table.
- Stores points earned (`score`) out of `maxScore`.
- Can point to an `assignmentId` OR a `quizId`.
- Indexed by `@@index([studentId, courseId])` for fast transcript generation.

---

### Domain 4: Quizzes & Automated Assessment

#### `model Quiz` (Table: `quizzes`)
Timed online tests with configurable `timeLimit` in minutes.

#### `model Question` & `model Option` (Tables: `questions`, `options`)
Questions support four distinct question styles via `enum QuestionType`:
- `SINGLE_CHOICE`: Single radio option.
- `MULTIPLE_CHOICE`: Multi-select checkboxes.
- `TRUE_FALSE`: Binary boolean response.
- `SHORT_ANSWER`: Open-ended string text.

#### `model QuizAttempt` & `model Answer` (Tables: `quiz_attempts`, `answers`)
Student exam execution engine:
- `QuizAttempt`: Tracks `startedAt`, `completedAt`, and final calculated `score`.
- `Answer`: Stores either the `selectedOptionId` (for choice questions) or `answerText` (for short answers), with an `isCorrect` flag computed by the auto-grading service.
- `@@unique([attemptId, questionId])`: Prevents duplicate responses per question in an attempt.

---

### Domain 5: Attendance

#### `model AttendanceSession` (Table: `attendance_sessions`)
Specific class meeting date and time slot tied to a course.
- Indexed by `@@index([courseId, date])` for calendar queries.

#### `model AttendanceRecord` (Table: `attendance_records`)
Per-student attendance state:
- `enum AttendanceStatus { PRESENT, ABSENT, LATE, EXCUSED }`.
- `@@unique([sessionId, studentId])`.

---

### Domain 6: Communication

#### `model Discussion` & `model DiscussionReply` (Tables: `discussions`, `discussion_replies`)
Course-scoped interactive forums.
- Discussion threads created by students or instructors.
- Threaded replies with cascade cleanup when parent discussion or course is removed.

#### `model Announcement` (Table: `announcements`)
Broadcast notifications authored by instructors (`authorId`) for enrolled course participants.

---

### Domain 7: Engagement

#### `model Review` (Table: `reviews`)
Student rating (1 to 5 stars) and qualitative feedback.
- `@@unique([courseId, studentId])`: Restricts students to one review per course.

#### `model Certificate` (Table: `certificates`)
Permanent credentials issued upon completing a course.
- `certificateNumber`: Unique alphanumeric identifier (`@unique`) for credential verification.
- `@@unique([studentId, courseId])`.

---

## 3. Database Indexes Summary

| Table | Index Columns | Query Purpose |
|---|---|---|
| `refresh_tokens` | `(userId)` | Look up active user sessions during refresh/revoke |
| `notifications` | `(userId, isRead)` | Rapid fetch of unread notifications |
| `courses` | `(teacherId)`, `(categoryId)`, `(status)` | Filtering courses in dashboard & public catalog |
| `modules` | `(courseId)` | Rendering module curriculum list |
| `lessons` | `(moduleId)` | Rendering lessons within a module |
| `enrollments` | `(courseId)` | Fetching course roster of students |
| `lesson_progress` | `(lessonId)` | Computing lesson completion metrics |
| `assignments` | `(courseId)` | Fetching course assignments |
| `submissions` | `(studentId)` | Fetching all submissions by a student |
| `grades` | `(studentId, courseId)` | Generating student gradebook / transcript |
| `quizzes` | `(courseId)` | Listing course quizzes |
| `questions` | `(quizId)` | Loading question bank for a quiz |
| `options` | `(questionId)` | Loading answer choices |
| `quiz_attempts` | `(quizId)`, `(studentId)` | Quiz attempt history and analytics |
| `attendance_sessions` | `(courseId, date)` | Course attendance calendar |
| `attendance_records` | `(studentId)` | Student attendance percentage calculations |
| `discussions` | `(courseId)` | Course community feed |
| `discussion_replies`| `(discussionId)` | Loading discussion replies |
| `announcements` | `(courseId)` | Course announcement stream |
| `reviews` | `(courseId)` | Calculating average course ratings |

---

## 4. Prisma Migration Commands

To apply this schema to the Supabase PostgreSQL database:

```bash
# Validate schema syntax
npx prisma validate

# Push schema directly to database (ideal for rapid development)
npx prisma db push

# OR create and track versioned SQL migrations
npx prisma migrate dev --name init_full_schema

# Regenerate Prisma Client in src/generated/prisma
npm run prisma:generate

# Open visual database browser
npx prisma studio
```
