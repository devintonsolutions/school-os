import type { Request, Response } from "express";
import type { AuthenticatedUser } from "../lms-shared/ownership";
import type { ListModulesQueryInput } from "./course-module.schema";
import * as moduleService from "./course-module.service";

export async function createModule(req: Request, res: Response) {
  const courseModule = await moduleService.createModule(
    req.params.courseId as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(201).json({
    success: true,
    message: "Module created successfully",
    data: courseModule,
  });
}

export async function listModules(req: Request, res: Response) {
  const query = (res.locals.query ?? req.query) as ListModulesQueryInput;
  const result = await moduleService.listModules(
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

export async function updateModule(req: Request, res: Response) {
  const courseModule = await moduleService.updateModule(
    req.params.id as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Module updated successfully",
    data: courseModule,
  });
}

export async function deleteModule(req: Request, res: Response) {
  const result = await moduleService.deleteModule(
    req.params.id as string,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Module deleted successfully",
    data: result,
  });
}

export async function reorderModules(req: Request, res: Response) {
  const modules = await moduleService.reorderModules(
    req.params.courseId as string,
    req.body,
    req.user as AuthenticatedUser
  );

  res.status(200).json({
    success: true,
    message: "Modules reordered successfully",
    data: modules,
  });
}
