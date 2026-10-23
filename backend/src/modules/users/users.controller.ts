import * as userService from "./users.service";
import type { Request, Response, NextFunction } from "express";
import { Role } from "../../generated/prisma/client";

export async function userGetAll(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { role } = req.query;
    // Validate only if role was provided
    if (role !== undefined) {
      if (
        typeof role !== "string" ||
        !Object.values(Role).includes(role as Role)
      ) {
        return res.status(400).json({
          message: "Invalid role provided.",
        });
      }
    }

    const users = await userService.getAllUsers(role as Role | undefined);

    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export async function userUpdateRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { role } = req.body;
  if (role === undefined) {
    return res.status(400).json({
      message: "Please provide the role required to change the users role.",
    });
  }
  if (typeof role !== "string" || !Object.values(Role).includes(role as Role)) {
    return res.status(400).json({
      message: "Invalid role provided.",
    });
  }
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "ID is required" });
    }
    if (typeof userId !== "string") {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }
    return res
      .status(200)
      .json(await userService.updateUserRole(userId, req.body.role));
  } catch (error) {
    next(error);
  }
}

export async function userUpdateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.body.isActive && req.body.isActive !== false) {
    return res
      .status(400)
      .json({ message: "isActive field is required to update users status." });
  }
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    if (!userId) {
      return res.status(400).json({ message: "ID is required" });
    }
    if (typeof userId !== "string") {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }
    return res
      .status(200)
      .json(await userService.updateUserStatus(userId, req.body.isActive));
  } catch (error) {
    next(error);
  }
}
