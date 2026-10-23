import { z } from "zod";
import { paginationQuerySchema } from "../lms-shared/common.schema";

export const enrollmentStatusEnum = z.enum(["ACTIVE", "COMPLETED", "DROPPED"]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusEnum>;

/**
 * Validates the `:courseId` route parameter for course-scoped enrollment routes.
 * (The shared `uuidParamSchema` validates a param named `id`, not `courseId`.)
 */
export const courseIdParamSchema = z.object({
  courseId: z.uuid("Course ID must be a valid UUID"),
});

export type CourseIdParamInput = z.infer<typeof courseIdParamSchema>;

/**
 * Query schema for listing enrollments.
 *
 * Used by:
 * - `GET /enrollments/my` (student's own enrollments)
 * - `GET /courses/:courseId/enrollments` (teacher/admin roster)
 *
 * Intentionally Excluded:
 * - `studentId`: always taken from the authenticated user for `/my`.
 * - `courseId`: always taken from the route for the roster.
 */
export const listEnrollmentsQuerySchema = paginationQuerySchema.extend({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(50, "Limit cannot exceed 50")
    .default(50),
  status: enrollmentStatusEnum.optional(),
});

export type ListEnrollmentsQueryInput = z.infer<
  typeof listEnrollmentsQuerySchema
>;
