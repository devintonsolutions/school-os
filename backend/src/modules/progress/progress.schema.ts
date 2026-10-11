import { z } from "zod";

/**
 * Schema for updating/completing lesson progress (PATCH /progress/lessons/:lessonId).
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Automatically generated UUID.
 * - `studentId`: Extracted strictly from authenticated `req.user.id`.
 * - `lessonId`: Provided via route parameter `:lessonId`.
 * - `completedAt`, `lastAccessedAt`: Managed server-side based on completion status.
 */
export const markLessonProgressSchema = z
  .object({
    isCompleted: z.boolean(),
  })
  .strict();

export type MarkLessonProgressInput = z.infer<typeof markLessonProgressSchema>;
