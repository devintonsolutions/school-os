import type { Request, Response } from "express";
import * as courseService from "./course.service";

export async function createCourse(req: Request, res: Response) {
  const course = await courseService.createCourse(req.body, req.user!.id);

  res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
}

export async function listCourses(req: Request, res: Response) {
  const query = res.locals.query ?? req.query;
  const result = await courseService.listCourses(query, req.user as any);

  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function listMyCourses(req: Request, res: Response) {
  const query = res.locals.query ?? req.query;
  const result = await courseService.listMyCourses(query, req.user!.id);

  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function getCourseById(req: Request, res: Response) {
  const course = await courseService.getCourseById(
    req.params.id as string,
    req.user as any
  );

  res.status(200).json({
    success: true,
    data: course,
  });
}

export async function updateCourse(req: Request, res: Response) {
  const course = await courseService.updateCourse(
    req.params.id as string,
    req.body,
    req.user as any
  );

  res.status(200).json({
    success: true,
    message: "Course updated successfully",
    data: course,
  });
}

export async function updateCourseStatus(req: Request, res: Response) {
  const course = await courseService.updateCourseStatus(
    req.params.id as string,
    req.body.status,
    req.user as any
  );

  res.status(200).json({
    success: true,
    message: "Course status updated successfully",
    data: course,
  });
}

export async function deleteCourse(req: Request, res: Response) {
  await courseService.deleteCourse(req.params.id as string, req.user as any);

  res.status(200).json({
    success: true,
    message: "Course deleted successfully",
  });
}
