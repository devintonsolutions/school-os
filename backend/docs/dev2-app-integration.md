# LearnOS — Core LMS Router Mount Proposal (Developer 2)

**Author:** Developer 2 (Core LMS Backend Engineer)  
**Status:** PROPOSED — REQUIRES TEAM LEAD APPROVAL  
**Target File:** `src/app.ts`  

---

> [!IMPORTANT]
> **REQUIRES TEAM LEAD APPROVAL**  
> Under team collaboration rules, `src/app.ts` is a shared global file. Developer 2 will not edit `src/app.ts` directly. This document specifies the exact code lines to be added by the team lead (or by Developer 2 upon explicit approval).

---

## 1. Context & Prefix Decision (TODO)

There is an architectural decision regarding the route prefix:
- **Option A (`/api`):** Follows Developer 1's existing pattern (`/api/auth`).
- **Option B (`/api/v1`):** Adheres to versioned REST API best practices specified in the initial LMS project brief.

The integration diff below uses a configurable `API_PREFIX` placeholder so the lead can choose either convention without changing router logic.

---

## 2. Proposed Diff for `src/app.ts`

```diff
 import express from "express";
 import authRouter from "./routes/auth.router";
+// Core LMS Routers (Developer 2) — REQUIRES TEAM LEAD APPROVAL
+import categoryRouter from "./routes/category.router";
+import courseRouter from "./routes/course.router";
+import moduleRouter from "./routes/module.router";
+import lessonRouter from "./routes/lesson.router";
+import enrollmentRouter from "./routes/enrollment.router";
+import progressRouter from "./routes/progress.router";
+
 import { errorMiddleware } from "./middleware/error.middleware";

 const app = express();

 app.use(express.json());

+// Health check
 app.get("/health", (req, res) => {
   res.json({
     status: "ok",
   });
 });

+// Auth routes (Developer 1)
 app.use("/api/auth", authRouter);

+/* ==========================================================================
+ * Core LMS Routes (Developer 2)
+ * TODO [Team Lead]: Select API prefix convention:
+ *   Option 1: "/api" (e.g., /api/courses) - Matches /api/auth
+ *   Option 2: "/api/v1" (e.g., /api/v1/courses) - Versioned standard
+ * ========================================================================== */
+const LMS_PREFIX = "/api/v1"; // Or "/api" per team lead decision
+
+app.use(`${LMS_PREFIX}/categories`, categoryRouter);
+app.use(`${LMS_PREFIX}/courses`, courseRouter);
+app.use(`${LMS_PREFIX}/modules`, moduleRouter);
+app.use(`${LMS_PREFIX}/lessons`, lessonRouter);
+app.use(`${LMS_PREFIX}/enrollments`, enrollmentRouter);
+app.use(`${LMS_PREFIX}/progress`, progressRouter);

 // Must be after all routes
 app.use(errorMiddleware);

 export default app;
```

---

## 3. Scope of LMS Routers to be Mounted

| Resource | Router File | Target Endpoint Path | Handled Responsibilities |
|---|---|---|---|
| **Categories** | `src/routes/category.router.ts` | `/categories` | List, create, update, delete categories |
| **Courses** | `src/routes/course.router.ts` | `/courses` | Public catalog, teacher course management, publish, archive |
| **Modules** | `src/routes/module.router.ts` | `/modules` | Course module creation, updates, and re-ordering |
| **Lessons** | `src/routes/lesson.router.ts` | `/lessons` | Lesson content management, free preview flags, ordering |
| **Enrollments**| `src/routes/enrollment.router.ts` | `/enrollments`| Course enrollment, duplicate prevention, student course lists |
| **Progress** | `src/routes/progress.router.ts` | `/progress` | Lesson completion toggling, course percentage calculation |

---

## 4. Integration Verification Checklist

Before enabling these lines:
1. [ ] Team lead approves schema migration `20261011_add_core_lms_models` in `prisma/schema.prisma`.
2. [ ] `npm run prisma:generate` generates client models for `Course`, `Category`, `Module`, `Lesson`, `Enrollment`, `LessonProgress`.
3. [ ] Team lead confirms route prefix preference (`/api` vs `/api/v1`).
4. [ ] Ensure all router files export a default Express `Router` instance.
5. [ ] Verify that `app.use(errorMiddleware)` remains the final middleware call in `src/app.ts`.
