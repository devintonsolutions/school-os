import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import { asyncHandler } from "../utils/async-handler";
import * as enrollmentController from "../modules/enrollments/enrollment.controller";
import {
  courseIdParamSchema,
  listEnrollmentsQuerySchema,
} from "../modules/enrollments/enrollment.schema";

const router = Router();

// Student enrollment: /api/v1/courses/:courseId/enroll
router.post(
  "/courses/:courseId/enroll",
  authenticate,
  authorize("STUDENT"),
  validateRequest({ params: courseIdParamSchema }),
  asyncHandler(enrollmentController.enrollInCourse)
);

// Student's own enrollments: /api/v1/enrollments/my
router.get(
  "/enrollments/my",
  authenticate,
  authorize("STUDENT"),
  validateRequest({ query: listEnrollmentsQuerySchema }),
  asyncHandler(enrollmentController.listMyEnrollments)
);

// Course roster: /api/v1/courses/:courseId/enrollments
router.get(
  "/courses/:courseId/enrollments",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({
    params: courseIdParamSchema,
    query: listEnrollmentsQuerySchema,
  }),
  asyncHandler(enrollmentController.listCourseEnrollments)
);

export default router;
