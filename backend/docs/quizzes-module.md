# School OS — Developer 3: Quizzes & Automated Grading Module

This document provides complete architectural and implementation documentation for the **Quizzes & Automated Assessment Engine** built by **Developer 3** in School OS (Requirements FR-30 through FR-33).

---

## 1. Architectural Overview & Business Rules

The Quizzes module manages online timed testing, question banks with multiple question types, anti-cheat question projections, time-limit enforcement, and automated submission grading with atomic gradebook synchronization.

### Key Business Rules & Security Features
- **BR-03 & BR-05**: Only the instructor who owns the course (or an `ADMIN`) can create, update, delete quizzes, and add or delete questions.
- **Anti-Cheat Question Projection**: When students fetch quiz questions via `GET /api/v1/quizzes/:id` or start an attempt, the service explicitly omits `isCorrect` on options from the response payload, preventing inspection via browser developer tools or network sniffers.
- **Enforced Time Limits**: If a quiz has `timeLimit` in minutes, the server computes `(now - startedAt) / 60000`. Submissions beyond the time limit (with a 2-minute latency grace period) are automatically rejected.
- **Multi-Type Question Bank**:
  - `SINGLE_CHOICE`: Radio button style. Exactly one option marked `isCorrect: true`.
  - `TRUE_FALSE`: Two options ("True" / "False"). Exactly one marked `isCorrect: true`.
  - `MULTIPLE_CHOICE`: Multi-select checkboxes. One or more marked `isCorrect: true`.
  - `SHORT_ANSWER`: Open text question evaluated with case-insensitive trimmed matching.
- **Automated Grading Engine & Atomic Gradebook Sync**:
  On submission, the engine checks every student answer against the database options and sums points earned. Inside an atomic transaction (`prisma.$transaction`):
  1. Updates `QuizAttempt` with `completedAt = now` and `score = totalEarned`.
  2. Inserts or updates `Answer` records with `isCorrect: boolean`.
  3. Automatically upserts into the consolidated `Grade` table (`studentId`, `courseId`, `quizId`, `score`, `maxScore`, `gradedAt: now`), updating the student's academic record in real time without manual teacher intervention.

---

## 2. Directory Structure

```text
backend/src/modules/quizzes/
├── quizzes.schema.ts     # Zod input validation schemas & TypeScript types
├── quizzes.service.ts    # Business logic, question banks, attempt sessions & auto-grading engine
└── quizzes.controller.ts # Express request/response handlers

backend/src/routes/
└── quizzes.router.ts     # Route definitions with RBAC authorization & validation middleware
```

---

## 3. API Endpoints Reference

Base Path: `/api/v1/quizzes`

All endpoints require JWT authentication (`Authorization: Bearer <token>`).

### Quiz & Question Management (Teacher/Admin)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/quizzes` | `TEACHER`, `ADMIN` | Create a new timed quiz for an owned course |
| `GET` | `/api/v1/quizzes/course/:courseId` | `STUDENT`, `TEACHER`, `ADMIN` | List all quizzes in a course (students must be enrolled) |
| `GET` | `/api/v1/quizzes/:id` | `STUDENT`, `TEACHER`, `ADMIN` | Get quiz details & questions (student view hides correct answers) |
| `PATCH` | `/api/v1/quizzes/:id` | `TEACHER`, `ADMIN` | Update quiz title, description, or time limit |
| `DELETE` | `/api/v1/quizzes/:id` | `TEACHER`, `ADMIN` | Delete quiz (cascades questions, attempts, and grades) |
| `POST` | `/api/v1/quizzes/:id/questions` | `TEACHER`, `ADMIN` | Add a question with options to the quiz |
| `DELETE` | `/api/v1/quizzes/questions/:questionId` | `TEACHER`, `ADMIN` | Remove a question from the quiz |

### Student Quiz Taking & Automated Grading

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/v1/quizzes/:id/attempts/start` | `STUDENT` | Start a new timed attempt session |
| `POST` | `/api/v1/quizzes/attempts/:attemptId/submit` | `STUDENT` | Submit answers, calculate score, and sync gradebook |
| `GET` | `/api/v1/quizzes/:id/attempts/me` | `STUDENT` | View student's own attempts and scores for a quiz |
| `GET` | `/api/v1/quizzes/:id/attempts` | `TEACHER`, `ADMIN` | View all student attempts and scores for a quiz |

---

## 4. Request & Response Examples

### 1. Create a Timed Quiz
**POST** `/api/v1/quizzes`
```json
{
  "title": "Quiz 1: Data Structures Fundamentals",
  "description": "Test your knowledge on Stacks, Queues, and Binary Search Trees.",
  "courseId": "00000000-0000-0000-0000-000000000001",
  "timeLimit": 30
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Quiz created successfully",
  "data": {
    "id": "7b2e91a0-...",
    "title": "Quiz 1: Data Structures Fundamentals",
    "courseId": "00000000-0000-0000-0000-000000000001",
    "timeLimit": 30,
    "createdAt": "2026-10-19T15:00:00.000Z"
  }
}
```

---

### 2. Add Single Choice Question to Quiz
**POST** `/api/v1/quizzes/:quizId/questions`
```json
{
  "questionText": "What is the average time complexity of searching in a Balanced Binary Search Tree?",
  "questionType": "SINGLE_CHOICE",
  "points": 2,
  "options": [
    { "optionText": "O(1)", "isCorrect": false },
    { "optionText": "O(log n)", "isCorrect": true },
    { "optionText": "O(n)", "isCorrect": false },
    { "optionText": "O(n^2)", "isCorrect": false }
  ]
}
```

---

### 3. Start Quiz Attempt (Student)
**POST** `/api/v1/quizzes/:quizId/attempts/start`
- **Headers**: `Authorization: Bearer <student_token>`

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Quiz attempt started",
  "data": {
    "attemptId": "a9841f3e-...",
    "startedAt": "2026-10-19T15:05:00.000Z",
    "timeLimit": 30,
    "quiz": {
      "id": "7b2e91a0-...",
      "title": "Quiz 1: Data Structures Fundamentals",
      "questions": [
        {
          "id": "q1-uuid",
          "questionText": "What is the average time complexity...?",
          "options": [
            { "id": "opt1-uuid", "optionText": "O(1)" },
            { "id": "opt2-uuid", "optionText": "O(log n)" }
          ]
        }
      ]
    }
  }
}
```
*(Notice `isCorrect` is completely hidden for students!)*

---

### 4. Submit Attempt & Automated Scoring
**POST** `/api/v1/quizzes/attempts/:attemptId/submit`
```json
{
  "answers": [
    {
      "questionId": "q1-uuid",
      "selectedOptionId": "opt2-uuid"
    },
    {
      "questionId": "q2-uuid",
      "answerText": "queue"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quiz submitted and graded successfully",
  "data": {
    "attemptId": "a9841f3e-...",
    "score": 4,
    "maxScore": 4,
    "percentage": "100%",
    "completedAt": "2026-10-19T15:15:00.000Z"
  }
}
```

---

## 5. Testing
All HTTP requests are included in [`backend/requests.http`](file:///D:/Projects/SchoolOS_Project/school-os/backend/requests.http) under Section "DEVELOPER 3: QUIZZES & AUTOMATED GRADING ENGINE" (Requests 17 through 26).
