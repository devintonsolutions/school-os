import { Router } from "express";
import {
  createQuiz,
  getQuizzesByCourse,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestion,
  deleteQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  getStudentAttempts,
  getAllQuizAttempts,
} from "../modules/quizzes/quizzes.controller";
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  submitQuizAttemptSchema,
} from "../modules/quizzes/quizzes.schema";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validate } from "../middleware/validation.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();

// All quiz endpoints require an active JWT session
router.use(authenticate);

// --- Quiz Management (Teacher/Admin) ---
router.post(
  "/",
  authorize("TEACHER", "ADMIN"),
  validate(createQuizSchema),
  asyncHandler(createQuiz)
);

router.get(
  "/course/:courseId",
  authorize("STUDENT", "TEACHER", "ADMIN"),
  asyncHandler(getQuizzesByCourse)
);

router.get(
  "/:id",
  authorize("STUDENT", "TEACHER", "ADMIN"),
  asyncHandler(getQuizById)
);

router.patch(
  "/:id",
  authorize("TEACHER", "ADMIN"),
  validate(updateQuizSchema),
  asyncHandler(updateQuiz)
);

router.delete(
  "/:id",
  authorize("TEACHER", "ADMIN"),
  asyncHandler(deleteQuiz)
);

// --- Question Bank Management (Teacher/Admin) ---
router.post(
  "/:id/questions",
  authorize("TEACHER", "ADMIN"),
  validate(createQuestionSchema),
  asyncHandler(addQuestion)
);

router.delete(
  "/questions/:questionId",
  authorize("TEACHER", "ADMIN"),
  asyncHandler(deleteQuestion)
);

// --- Student Quiz Taking & Automated Grading ---
router.post(
  "/:id/attempts/start",
  authorize("STUDENT"),
  asyncHandler(startQuizAttempt)
);

router.post(
  "/attempts/:attemptId/submit",
  authorize("STUDENT"),
  validate(submitQuizAttemptSchema),
  asyncHandler(submitQuizAttempt)
);

router.get(
  "/:id/attempts/me",
  authorize("STUDENT"),
  asyncHandler(getStudentAttempts)
);

// --- Teacher Review of Student Attempts ---
router.get(
  "/:id/attempts",
  authorize("TEACHER", "ADMIN"),
  asyncHandler(getAllQuizAttempts)
);

export default router;
