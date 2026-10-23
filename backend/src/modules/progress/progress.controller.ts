import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../lms-shared/ownership";
import * as progressService from "./progress.service";

export async function markLessonComplete(req: Request, res: Response) {
  const progress = await progressService.markLessonComplete(
    req.params.lessonId as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: progress.alreadyCompleted
      ? "Lesson already completed"
      : "Lesson completed successfully",
    data: progress,
  });
}

export async function getCourseProgress(req: Request, res: Response) {
  const progress = await progressService.getCourseProgress(
    req.params.courseId as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    data: progress,
  });
}

export async function getContinueLearning(req: Request, res: Response) {
  const progress = await progressService.getContinueLearning(
    req.params.courseId as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    data: progress,
  });
}
