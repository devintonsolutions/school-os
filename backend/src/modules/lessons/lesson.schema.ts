import { z } from "zod";
import { paginationQuerySchema } from "../lms-shared/common.schema";

/**
 * Validates the `:courseId` route parameter for course-scoped lesson routes.
 */
export const courseIdParamSchema = z.object({
  courseId: z.uuid("Course ID must be a valid UUID"),
});

export type CourseIdParamInput = z.infer<typeof courseIdParamSchema>;

/**
 * Validates the `:moduleId` route parameter for module-scoped lesson routes.
 */
export const moduleIdParamSchema = z.object({
  moduleId: z.uuid("Module ID must be a valid UUID"),
});

export type ModuleIdParamInput = z.infer<typeof moduleIdParamSchema>;

/**
 * Schema for creating a lesson within a module.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Generated UUID.
 * - `moduleId`: Provided via route parameter `:moduleId`.
 * (Note: type, durationMinutes, and isFreePreview were removed from real Prisma schema).
 */
export const createLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Lesson title must be at least 2 characters")
      .max(150, "Lesson title cannot exceed 150 characters"),

    content: z
      .string()
      .trim()
      .max(50000, "Content cannot exceed 50000 characters")
      .optional(),

    videoUrl: z
      .url("Video URL must be a valid URL")
      .refine((url) => url.startsWith("https://"), {
        message: "Video URL must use secure HTTPS protocol",
      })
      .optional(),

    order: z
      .number()
      .int("Order must be an integer")
      .positive("Order must be a positive integer")
      .optional(),
  })
  .strict();

export type CreateLessonInput = z.infer<typeof createLessonSchema>;

/**
 * Schema for updating an existing lesson.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Provided via route parameter `:id`.
 * - `moduleId`: Cannot move lessons between modules via regular update.
 * Requires at least one field to update.
 */
export const updateLessonSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(2, "Lesson title must be at least 2 characters")
      .max(150, "Lesson title cannot exceed 150 characters")
      .optional(),

    content: z
      .string()
      .trim()
      .max(50000, "Content cannot exceed 50000 characters")
      .optional(),

    videoUrl: z
      .url("Video URL must be a valid URL")
      .refine((url) => url.startsWith("https://"), {
        message: "Video URL must use secure HTTPS protocol",
      })
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
      data.content !== undefined ||
      data.videoUrl !== undefined ||
      data.order !== undefined,
    { message: "At least one field must be provided for lesson update" }
  );

export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;

export const reorderLessonItemSchema = z
  .object({
    id: z.uuid("Lesson ID must be a valid UUID"),
    order: z
      .number()
      .int("Order must be an integer")
      .positive("Order must be a positive integer"),
  })
  .strict();

export type ReorderLessonItem = z.infer<typeof reorderLessonItemSchema>;

/**
 * Schema for batch reordering lessons within a module (PUT /modules/:moduleId/lessons/reorder).
 *
 * Intentionally Excluded from Request Body:
 * - `moduleId`: Inherited from route context.
 * - Content fields: Reordering endpoint strictly mutates sequencing positions.
 */
export const reorderLessonsSchema = z
  .object({
    lessons: z
      .array(reorderLessonItemSchema)
      .min(1, "At least one lesson must be provided for reordering")
      .max(100, "Cannot reorder more than 100 lessons at once")
      .refine(
        (items) => new Set(items.map((item) => item.id)).size === items.length,
        { message: "Duplicate lesson IDs are not allowed in reordering payload" }
      )
      .refine(
        (items) => new Set(items.map((item) => item.order)).size === items.length,
        { message: "Duplicate order values are not allowed in reordering payload" }
      ),
  })
  .strict();

export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;

/**
 * Query schema for listing lessons of a course.
 *
 * Reuses the shared `page`/`limit` rules (limit max 50) but raises the
 * default page size to 50, matching the Modules API.
 */
export const listLessonsQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(50, "Limit cannot exceed 50")
    .default(50),
});

export type ListLessonsQueryInput = z.infer<typeof listLessonsQuerySchema>;
