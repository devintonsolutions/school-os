import { z } from "zod";

/**
 * Schema for creating a course category.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: System-generated UUID.
 * - `slug`: Derived server-side from `name` via slugify utility to prevent spoofing/collisions.
 * - `createdAt`, `updatedAt`: System-managed timestamps.
 */
export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100, "Category name cannot exceed 100 characters"),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * Schema for updating an existing category.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Specified via route parameter `:id`.
 * - `slug`: Recomputed server-side if `name` changes.
 * - `createdAt`, `updatedAt`: System-managed.
 * Requires at least one updatable field.
 */
export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(100, "Category name cannot exceed 100 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.description !== undefined,
    { message: "At least one field (name or description) must be provided for update" }
  );

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
