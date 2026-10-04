import type { RequestHandler } from "express";
import type { UserRole } from "../types/auth";
import { AppError } from "../utils/app-error";

export function authorize(
  ...allowedRoles: UserRole[]
): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
}