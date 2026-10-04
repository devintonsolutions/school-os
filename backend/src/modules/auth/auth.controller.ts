import type { Request, Response } from "express";
import * as authService from "./auth.service";

export async function signup(
  req: Request,
  res: Response
) {
  const user = await authService.signup(req.body);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: user,
  });
}

export async function login(
  req: Request,
  res: Response
) {
  const result = await authService.login(req.body);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: result,
  });
}

export async function me(
  req: Request,
  res: Response
) {
  const user = await authService.getCurrentUser(
    req.user!.id
  );

  res.status(200).json({
    success: true,
    data: user,
  });
}

export async function refresh(
  req: Request,
  res: Response
) {
  const result = await authService.refreshAccessToken(
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Access token refreshed",
    data: result,
  });
}

export async function logout(
  req: Request,
  res: Response
) {
  await authService.logout(req.body.refreshToken);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
}

