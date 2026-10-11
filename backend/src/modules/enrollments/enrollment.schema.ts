import { z } from "zod";
import { paginationQuerySchema } from "../lms-shared/common.schema";

export const enrollmentStatusEnum = z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusEnum>;

/**
 * Schema for enrolling into a course (POST /enrollments).
 *
 * Intentionally Excluded from Request Body:
 * - `studentId`: Extracted securely from `req.user.id`. Clients cannot enroll on behalf of others.
 * - `status`: Always initialized as `ACTIVE` (or re-activated if previously `CANCELLED`).
 * - `enrolledAt`, `completedAt`: System timestamps.
 */
export const enrollSchema = z
  .object({
    courseId: z.uuid("Course ID must be a valid UUID"),
  })
  .strict();

export type EnrollInput = z.infer<typeof enrollSchema>;

/**
 * Query schema for listing student enrollments (GET /enrollments/my).
 *
 * Intentionally Excluded from Query Parameters:
 * - `studentId`: Query filters are automatically scoped to `req.user.id` in the service layer.
 */
export const listEnrollmentsQuerySchema = paginationQuerySchema.extend({
  status: enrollmentStatusEnum.optional(),
});

export type ListEnrollmentsQueryInput = z.infer<typeof listEnrollmentsQuerySchema>;
