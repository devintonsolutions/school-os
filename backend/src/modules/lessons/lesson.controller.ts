import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../lms-shared/ownership";
import type { ListLessonsQueryInput } from "./lesson.schema";
import * as lessonService from "./lesson.service";

export async function createLesson(req: Request, res: Response) {
  const lesson = await lessonService.createLesson(
    req.params.moduleId as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(201).json({
    success: true,
    message: "Lesson created successfully",
    data: lesson,
  });
}

export async function listLessons(req: Request, res: Response) {
  const query = (res.locals.query ?? req.query) as ListLessonsQueryInput;
  const result = await lessonService.listLessons(
    req.params.courseId as string,
    query,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function getLessonById(req: Request, res: Response) {
  const lesson = await lessonService.getLessonById(
    req.params.id as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    data: lesson,
  });
}

export async function updateLesson(req: Request, res: Response) {
  const lesson = await lessonService.updateLesson(
    req.params.id as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Lesson updated successfully",
    data: lesson,
  });
}

export async function deleteLesson(req: Request, res: Response) {
  const result = await lessonService.deleteLesson(
    req.params.id as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Lesson deleted successfully",
    data: result,
  });
}

export async function reorderLessons(req: Request, res: Response) {
  const lessons = await lessonService.reorderLessons(
    req.params.moduleId as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Lessons reordered successfully",
    data: lessons,
  });
}
