import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";
import { verifyAccessToken } from "../utils/jwt";

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError("Access token is required", 401));
  }

  if (!authHeader.startsWith("Bearer ")) {
    return next(new AppError("Invalid authorization header", 401));
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return next(new AppError("Access token is required", 401));
  }

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
