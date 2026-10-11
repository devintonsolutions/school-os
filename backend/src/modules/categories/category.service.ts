import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

export async function createCategory(data: CreateCategoryInput) {
  try {
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError("Category name already exists", 409);
    }

    return await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error?.code === "P2002") {
      throw new AppError("Category name already exists", 409);
    }
    throw error;
  }
}

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  });
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { courses: true },
      },
    },
  });

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
}

export async function updateCategory(id: string, data: UpdateCategoryInput) {
  await getCategoryById(id);

  try {
    return await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new AppError("Category name already exists", 409);
    }
    if (error?.code === "P2025") {
      throw new AppError("Category not found", 404);
    }
    throw error;
  }
}

export async function deleteCategory(id: string) {
  await getCategoryById(id);

  try {
    await prisma.category.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      throw new AppError("Category not found", 404);
    }
    throw error;
  }
}
