import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import { uuidParamSchema } from "../modules/lms-shared/common.schema";
import { asyncHandler } from "../utils/async-handler";
import * as moduleController from "../modules/course-modules/course-module.controller";
import {
  courseIdParamSchema,
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
  listModulesQuerySchema,
} from "../modules/course-modules/course-module.schema";

const router = Router();

// Course-scoped routes: /api/v1/courses/:courseId/modules
router.post(
  "/courses/:courseId/modules",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: courseIdParamSchema, body: createModuleSchema }),
  asyncHandler(moduleController.createModule)
);

router.get(
  "/courses/:courseId/modules",
  authenticate,
  validateRequest({
    params: courseIdParamSchema,
    query: listModulesQuerySchema,
  }),
  asyncHandler(moduleController.listModules)
);

router.put(
  "/courses/:courseId/modules/reorder",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: courseIdParamSchema, body: reorderModulesSchema }),
  asyncHandler(moduleController.reorderModules)
);

// Module-scoped routes: /api/v1/modules/:id
router.patch(
  "/modules/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema, body: updateModuleSchema }),
  asyncHandler(moduleController.updateModule)
);

router.delete(
  "/modules/:id",
  authenticate,
  authorize("TEACHER", "ADMIN"),
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(moduleController.deleteModule)
);

export default router;
