import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import {
  uuidParamSchema,
  paginationQuerySchema,
} from "../modules/lms-shared/common.schema";
import { asyncHandler } from "../utils/async-handler";
import * as courseController from "../modules/courses/course.controller";
import {
  createCourseSchema,
  updateCourseSchema,
  updateCourseStatusSchema,
  listCoursesQuerySchema,
} from "../modules/courses/course.schema";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ body: createCourseSchema }),
  asyncHandler(courseController.createCourse)
);

router.get(
  "/",
  authenticate,
  validateRequest({ query: listCoursesQuerySchema }),
  asyncHandler(courseController.listCourses)
);

// Register /my BEFORE /:id to avoid UUID route collision
router.get(
  "/my",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ query: paginationQuerySchema }),
  asyncHandler(courseController.listMyCourses)
);

router.get(
  "/:id",
  authenticate,
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(courseController.getCourseById)
);

router.patch(
  "/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema, body: updateCourseSchema }),
  asyncHandler(courseController.updateCourse)
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema, body: updateCourseStatusSchema }),
  asyncHandler(courseController.updateCourseStatus)
);

router.delete(
  "/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(courseController.deleteCourse)
);

export default router;
