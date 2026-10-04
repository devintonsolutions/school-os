import { Router } from "express";

import {
  signup,
  login,
  me,
  refresh,
  logout,
} from "../modules/auth/auth.controller";

import {
  signUpSchema,
  loginSchema,
  refreshTokenSchema,
} from "../modules/auth/auth.schema";

import { validate } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.post("/signup", validate(signUpSchema), asyncHandler(signup));

router.post("/login", validate(loginSchema), asyncHandler(login));

router.get("/me", authenticate, asyncHandler(me));

router.post("/refresh", validate(refreshTokenSchema), asyncHandler(refresh));

router.post("/logout", validate(refreshTokenSchema), asyncHandler(logout));

export default router;
