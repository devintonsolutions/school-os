import { Router } from "express";
import {
  createAssignment,
  getAssignmentsByCourse,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getMySubmission,
  getAssignmentSubmissions,
  gradeSubmission,
} from "../modules/assignments/assignments.controller";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  createSubmissionSchema,
  gradeSubmissionSchema,
} from "../modules/assignments/assignments.schema";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

// All assignment routes require authentication
router.use(authenticate);

// --- Assignment Management (Teacher/Admin) ---
router.post(
  "/",
  authorize("TEACHER", "ADMIN"),
  validate(createAssignmentSchema),
  asyncHandler(createAssignment)
);

router.patch(
  "/:id",
  authorize("TEACHER", "ADMIN"),
  validate(updateAssignmentSchema),
  asyncHandler(updateAssignment)
);

router.delete(
  "/:id",
  authorize("TEACHER", "ADMIN"),
  asyncHandler(deleteAssignment)
);

// --- Course Assignments Retrieval ---
router.get(
  "/course/:courseId",
  authorize("STUDENT", "TEACHER", "ADMIN"),
  asyncHandler(getAssignmentsByCourse)
);

router.get(
  "/:id",
  authorize("STUDENT", "TEACHER", "ADMIN"),
  asyncHandler(getAssignmentById)
);

// --- Student Submissions ---
router.post(
  "/:id/submissions",
  authorize("STUDENT"),
  validate(createSubmissionSchema),
  asyncHandler(submitAssignment)
);

router.get(
  "/:id/submissions/me",
  authorize("STUDENT"),
  asyncHandler(getMySubmission)
);

// --- Teacher/Admin Grading & Submissions Review ---
router.get(
  "/:id/submissions",
  authorize("TEACHER", "ADMIN"),
  asyncHandler(getAssignmentSubmissions)
);

router.patch(
  "/submissions/:submissionId/grade",
  authorize("TEACHER", "ADMIN"),
  validate(gradeSubmissionSchema),
  asyncHandler(gradeSubmission)
);

export default router;
