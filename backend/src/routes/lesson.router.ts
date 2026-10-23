import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import { uuidParamSchema } from "../modules/lms-shared/common.schema";
import { asyncHandler } from "../utils/async-handler";
import * as lessonController from "../modules/lessons/lesson.controller";
import {
  courseIdParamSchema,
  moduleIdParamSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
  listLessonsQuerySchema,
} from "../modules/lessons/lesson.schema";

const router = Router();

// Module-scoped routes: /api/v1/modules/:moduleId/lessons
router.post(
  "/modules/:moduleId/lessons",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: moduleIdParamSchema, body: createLessonSchema }),
  asyncHandler(lessonController.createLesson)
);

router.put(
  "/modules/:moduleId/lessons/reorder",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: moduleIdParamSchema, body: reorderLessonsSchema }),
  asyncHandler(lessonController.reorderLessons)
);

// Course-scoped list (SRS representative endpoint): /api/v1/courses/:courseId/lessons
router.get(
  "/courses/:courseId/lessons",
  authenticate,
  validateRequest({
    params: courseIdParamSchema,
    query: listLessonsQuerySchema,
  }),
  asyncHandler(lessonController.listLessons)
);

// Lesson-scoped routes: /api/v1/lessons/:id
router.get(
  "/lessons/:id",
  authenticate,
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(lessonController.getLessonById)
);

router.patch(
  "/lessons/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema, body: updateLessonSchema }),
  asyncHandler(lessonController.updateLesson)
);

router.delete(
  "/lessons/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(lessonController.deleteLesson)
);

export default router;
