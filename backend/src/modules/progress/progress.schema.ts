import { z } from "zod";

/**
 * Validates the `:lessonId` route parameter for lesson progress routes.
 * (The shared `uuidParamSchema` validates a param named `id`, not `lessonId`.)
 */
export const lessonIdParamSchema = z.object({
  lessonId: z.uuid("Lesson ID must be a valid UUID"),
});

export type LessonIdParamInput = z.infer<typeof lessonIdParamSchema>;

/**
 * Validates the `:courseId` route parameter for course progress routes.
 */
export const courseIdParamSchema = z.object({
  courseId: z.uuid("Course ID must be a valid UUID"),
});

export type CourseIdParamInput = z.infer<typeof courseIdParamSchema>;

/**
 * Schema for marking a lesson complete.
 *
 * FR-20 / UC-05 only define "mark complete". Un-completing is not part of the
 * documents, so `completed: false` is rejected with a 400 validation error.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Automatically generated UUID.
 * - `studentId`: Extracted strictly from authenticated `req.user.id`.
 * - `lessonId`: Provided via route parameter `:lessonId`.
 * - `completedAt`: Managed server-side.
 */
export const markLessonCompleteSchema = z
  .object({
    completed: z
      .boolean()
      .refine((value) => value === true, {
        message: "Un-completing a lesson is not supported",
      }),
  })
  .strict();

export type MarkLessonCompleteInput = z.infer<
  typeof markLessonCompleteSchema
>;
