import type { Request, Response } from "express";
import * as categoryService from "./category.service";

export async function createCategory(req: Request, res: Response) {
  const category = await categoryService.createCategory(req.body);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
}

export async function getCategories(req: Request, res: Response) {
  const categories = await categoryService.getCategories();

  res.status(200).json({
    success: true,
    data: categories,
  });
}

export async function getCategoryById(req: Request, res: Response) {
  const category = await categoryService.getCategoryById(req.params.id as string);

  res.status(200).json({
    success: true,
    data: category,
  });
}

export async function updateCategory(req: Request, res: Response) {
  const category = await categoryService.updateCategory(
    req.params.id as string,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
}

export async function deleteCategory(req: Request, res: Response) {
  await categoryService.deleteCategory(req.params.id as string);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
}
