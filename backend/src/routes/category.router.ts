import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/role.middleware";
import { validateRequest } from "../modules/lms-shared/validate-request";
import { uuidParamSchema } from "../modules/lms-shared/common.schema";
import { asyncHandler } from "../utils/async-handler";
import * as categoryController from "../modules/categories/category.controller";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../modules/categories/category.schema";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validateRequest({ body: createCategorySchema }),
  asyncHandler(categoryController.createCategory)
);

router.get(
  "/",
  authenticate,
  asyncHandler(categoryController.getCategories)
);

router.get(
  "/:id",
  authenticate,
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(categoryController.getCategoryById)
);

router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateRequest({ params: uuidParamSchema, body: updateCategorySchema }),
  asyncHandler(categoryController.updateCategory)
);

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validateRequest({ params: uuidParamSchema }),
  asyncHandler(categoryController.deleteCategory)
);

export default router;
