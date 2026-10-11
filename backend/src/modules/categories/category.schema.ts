import { z } from "zod";

/**
 * Schema for creating a course category.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: System-generated UUID.
 * (Note: Category only has id, name, description in the real schema).
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
