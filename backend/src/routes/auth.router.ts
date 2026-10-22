import { Router } from "express";

import {
  signup,
  login,
  me,
  updateMe,
  refresh,
  logout,
  resendVerification,
  verifyEmail,
} from "../modules/auth/auth.controller";

import {
  signUpSchema,
  loginSchema,
  refreshTokenSchema,
  userSelfUpdateSchema,
  userSendEmailVerificationSchema,
  userEmailVerificationTokenSchema,
} from "../modules/auth/auth.schema";

import { validate } from "../middleware/validation.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { authorize } from "../middleware/role.middleware";

const router = Router();

router.post("/signup/", validate(signUpSchema), asyncHandler(signup));

router.post("/login/", validate(loginSchema), asyncHandler(login));

router.get("/me/", authenticate, asyncHandler(me));

router.patch(
  "/me/",
  authenticate,
  validate(userSelfUpdateSchema),
  asyncHandler(updateMe),
);

router.post(
  "/token/refresh/",
  validate(refreshTokenSchema),
  asyncHandler(refresh),
);

router.post("/logout/", validate(refreshTokenSchema), asyncHandler(logout));

router.post(
  "/send-verification/",
  validate(userSendEmailVerificationSchema),
  asyncHandler(resendVerification),
);

router.post(
  "/verify-email/",
  validate(userEmailVerificationTokenSchema),
  asyncHandler(verifyEmail),
);

export default router;
