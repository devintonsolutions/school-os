# School OS — Developer 3: Assignments & Submissions Module

This document provides complete documentation for the **Assignments & Submissions** module built by **Developer 3** in School OS.

---

## 1. Architectural Overview & Business Rules

The Assignments & Submissions module manages coursework creation, student turn-in, late-submission detection, and instructor grading with automated gradebook updates.

### Enforced Business Rules (SRS Compliance)
- **BR-03**: Only the instructor owning the course (or an `ADMIN`) can create, update, or delete assignments for that course.
- **BR-05**: Teachers can only view and grade submissions belonging to courses they own.
- **BR-06**: Students can only access their own submissions (`/me`). They cannot inspect submissions belonging to other students.
- **BR-08**: Submissions submitted after `assignment.dueDate` are automatically flagged with `isLate = true`.
- **Duplicate Prevention**: Enforced via Prisma composite constraint `@@unique([assignmentId, studentId])` so students cannot submit duplicate records for the same assignment.
- **Transaction-Safe Consolidated Grading**: When a teacher grades a submission, the system runs an atomic database transaction (`prisma.$transaction`) that:
  1. Updates the `Submission` record with `score` and `feedback`.
  2. Upserts into the central `Grade` table (`studentId`, `courseId`, `assignmentId`, `score`, `maxScore`, `gradedAt`), keeping the academic gradebook automatically in sync.

---

## 2. Directory Structure

```text
backend/src/modules/assignments/
├── assignments.schema.ts     # Zod input validation schemas & TypeScript types
├── assignments.service.ts    # Business logic, Prisma operations, and permission checks
└── assignments.controller.ts # Express request/response handlers

backend/src/routes/
└── assignments.router.ts     # Route definitions, RBAC authorization, and validation middlewares
```

---

## 3. API Endpoints Reference

Base Path: `/api/v1/assignments`

All endpoints require JWT authentication (`Authorization: Bearer <token>`).

### Assignment Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/assignments` | `TEACHER`, `ADMIN` | Create a new assignment for an owned course |
| `GET` | `/api/v1/assignments/course/:courseId` | `STUDENT`, `TEACHER`, `ADMIN` | List all assignments for a course (students must be enrolled) |
| `GET` | `/api/v1/assignments/:id` | `STUDENT`, `TEACHER`, `ADMIN` | Get assignment details by ID |
| `PATCH` | `/api/v1/assignments/:id` | `TEACHER`, `ADMIN` | Update assignment details (title, description, due date, max score) |
| `DELETE` | `/api/v1/assignments/:id` | `TEACHER`, `ADMIN` | Delete an assignment (cascades to submissions and grades) |

### Submission & Grading Endpoints

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/assignments/:id/submissions` | `STUDENT` | Submit coursework (text content and/or file URL) |
| `GET` | `/api/v1/assignments/:id/submissions/me` | `STUDENT` | Get the logged-in student's submission for an assignment |
| `GET` | `/api/v1/assignments/:id/submissions` | `TEACHER`, `ADMIN` | List all student submissions for an assignment |
| `PATCH` | `/api/v1/assignments/submissions/:submissionId/grade` | `TEACHER`, `ADMIN` | Grade a submission with marks and feedback, updating the gradebook |

---

## 4. Request & Response Examples

### 1. Create Assignment
**POST** `/api/v1/assignments`
```json
{
  "title": "Assignment 1: Algorithms & Data Structures",
  "description": "Implement a binary search tree and test edge cases.",
  "courseId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "dueDate": "2026-12-31T23:59:59.000Z",
  "maxScore": 100
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Assignment created successfully",
  "data": {
    "id": "e4b95f12-0732-4217-bc45-6a1005a7698b",
    "title": "Assignment 1: Algorithms & Data Structures",
    "description": "Implement a binary search tree and test edge cases.",
    "dueDate": "2026-12-31T23:59:59.000Z",
    "maxScore": 100,
    "courseId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "createdAt": "2026-10-12T18:45:00.000Z"
  }
}
```

---

### 2. Submit Assignment (Student)
**POST** `/api/v1/assignments/:id/submissions`
```json
{
  "content": "Here is my source code link and implementation summary.",
  "fileUrl": "https://example.com/files/submission-alex.zip"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Assignment submitted successfully",
  "data": {
    "id": "c1a84f33-...",
    "assignmentId": "e4b95f12-...",
    "studentId": "user-uuid...",
    "content": "Here is my source code link...",
    "fileUrl": "https://example.com/files/submission-alex.zip",
    "submittedAt": "2026-10-12T18:47:00.000Z",
    "score": null,
    "feedback": null,
    "isLate": false
  }
}
```

---

### 3. Grade Submission (Teacher/Admin)
**PATCH** `/api/v1/assignments/submissions/:submissionId/grade`
```json
{
  "score": 95,
  "feedback": "Clean implementation and great algorithmic complexity."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Submission graded successfully",
  "data": {
    "id": "c1a84f33-...",
    "score": 95,
    "feedback": "Clean implementation and great algorithmic complexity."
  }
}
```

---

## 5. Testing
All requests are included in [`backend/requests.http`](file:///D:/Projects/SchoolOS_Project/school-os/backend/requests.http) under Section "DEVELOPER 3: ASSIGNMENTS & SUBMISSIONS MODULE".
