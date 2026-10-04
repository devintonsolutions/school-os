import "dotenv/config";
import jwt from "jsonwebtoken";
import type { UserRole } from "../types/auth";
import { AppError } from "./app-error";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET_KEY;

  if (!secret) {
    throw new Error("JWT_SECRET_KEY is not defined!");
  }

  return secret;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function createAccessToken(userId: string, role: UserRole): string {
  return jwt.sign(
    {
      sub: userId,
      role,
    },
    getJwtSecret(),
    {
      expiresIn: "15m",
      algorithm: "HS256",
    },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string"
    ) {
      throw new AppError("Invalid access token", 401);
    }

    if (
      decoded.role !== "STUDENT" &&
      decoded.role !== "TEACHER" &&
      decoded.role !== "ADMIN"
    ) {
      throw new AppError("Invalid access token", 401);
    }

    return {
      sub: decoded.sub,
      role: decoded.role as UserRole,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("Invalid or expired access token", 401);
  }
}
