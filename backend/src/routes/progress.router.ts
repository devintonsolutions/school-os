import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import { asyncHandler } from "../utils/async-handler";
import * as progressController from "../modules/progress/progress.controller";
import {
  courseIdParamSchema,
  lessonIdParamSchema,
  markLessonCompleteSchema,
} from "../modules/progress/progress.schema";

const router = Router();

// Mark a lesson complete: /api/v1/progress/lessons/:lessonId
router.patch(
  "/progress/lessons/:lessonId",
  authenticate,
  authorize("STUDENT"),
  validateRequest({
    params: lessonIdParamSchema,
    body: markLessonCompleteSchema,
  }),
  asyncHandler(progressController.markLessonComplete)
);

// Continue learning: /api/v1/progress/courses/:courseId/continue
router.get(
  "/progress/courses/:courseId/continue",
  authenticate,
  authorize("STUDENT"),
  validateRequest({ params: courseIdParamSchema }),
  asyncHandler(progressController.getContinueLearning)
);

// Course progress summary: /api/v1/progress/courses/:courseId
router.get(
  "/progress/courses/:courseId",
  authenticate,
  authorize("STUDENT"),
  validateRequest({ params: courseIdParamSchema }),
  asyncHandler(progressController.getCourseProgress)
);

export default router;
