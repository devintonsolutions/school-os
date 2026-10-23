import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../lms-shared/ownership";
import type { ListEnrollmentsQueryInput } from "./enrollment.schema";
import * as enrollmentService from "./enrollment.service";

export async function enrollInCourse(req: Request, res: Response) {
  const enrollment = await enrollmentService.enrollInCourse(
    req.params.courseId as string,
    req.user as AuthenticatedUser
  );

  res.status(201).json({
    success: true,
    message: "Enrolled successfully",
    data: enrollment,
  });
}

export async function listMyEnrollments(req: Request, res: Response) {
  const query = (res.locals.query ?? req.query) as ListEnrollmentsQueryInput;
  const result = await enrollmentService.listMyEnrollments(
    query,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    data: result.items,
    meta: result.meta,
  });
}

export async function listCourseEnrollments(req: Request, res: Response) {
  const query = (res.locals.query ?? req.query) as ListEnrollmentsQueryInput;
  const result = await enrollmentService.listCourseEnrollments(
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
