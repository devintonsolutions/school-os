import { z } from "zod";
import { paginationQuerySchema } from "../lms-shared/common.schema";

/**
 * Validates the `:courseId` route parameter for course-scoped module routes.
 * (The shared `uuidParamSchema` validates a param named `id`, not `courseId`.)
 */
export const courseIdParamSchema = z.object({
  courseId: z.uuid("Course ID must be a valid UUID"),
});

export type CourseIdParamInput = z.infer<typeof courseIdParamSchema>;

/**
 * Schema for creating a new module within a course.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Automatically generated UUID.
 * - `courseId`: Injected from route parameter `:courseId`.
 * - `createdAt`, `updatedAt`: Database-managed timestamps.
 */
export const createModuleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Module title must be at least 2 characters")
      .max(150, "Module title cannot exceed 150 characters"),

    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),

    order: z
      .number()
      .int("Order must be an integer")
      .positive("Order must be a positive integer")
      .optional(),
  })
  .strict();

export type CreateModuleInput = z.infer<typeof createModuleSchema>;

/**
 * Schema for updating an existing module.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Provided via route parameter `:id`.
 * - `courseId`: Course parent ownership cannot be modified via update.
 * Requires at least one field to update.
 */
export const updateModuleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Module title must be at least 2 characters")
      .max(150, "Module title cannot exceed 150 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),

    order: z
      .number()
      .int("Order must be an integer")
      .positive("Order must be a positive integer")
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.order !== undefined,
    { message: "At least one field (title, description, or order) must be provided for update" }
  );

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;

export const reorderModuleItemSchema = z
  .object({
    id: z.uuid("Module ID must be a valid UUID"),
    order: z
      .number()
      .int("Order must be an integer")
      .positive("Order must be a positive integer"),
  })
  .strict();

export type ReorderModuleItem = z.infer<typeof reorderModuleItemSchema>;

/**
 * Schema for batch reordering modules inside a course (PUT /courses/:courseId/modules/reorder).
 *
 * Intentionally Excluded from Request Body:
 * - `courseId`: Inherited from route context.
 * - Content fields: Reordering endpoint strictly mutates sequencing positions.
 */
export const reorderModulesSchema = z
  .object({
    modules: z
      .array(reorderModuleItemSchema)
      .min(1, "At least one module must be provided for reordering")
      .max(100, "Cannot reorder more than 100 modules at once")
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        { message: "Duplicate module IDs are not allowed in reordering payload" }
      )
      .refine(
        (items) => new Set(items.map((item) => item.order)).size === items.length,
        { message: "Duplicate order values are not allowed in reordering payload" }
      ),
  })
  .strict();

export type ReorderModulesInput = z.infer<typeof reorderModulesSchema>;

/**
 * Query schema for listing modules of a course.
 *
 * Reuses the shared `page`/`limit` rules (limit max 50) but raises the
 * default page size to 50, since a curriculum is normally small.
 */
export const listModulesQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(50, "Limit cannot exceed 50")
    .default(50),
});

export type ListModulesQueryInput = z.infer<typeof listModulesQuerySchema>;
