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
