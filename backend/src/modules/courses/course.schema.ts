import { z } from "zod";
import { paginationQuerySchema } from "../lms-shared/common.schema";

export const courseStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export type CourseStatus = z.infer<typeof courseStatusEnum>;

/**
 * Schema for creating a new course.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Generated as a UUID by PostgreSQL.
 * - `slug`: Derived server-side from `title` via slugify utility.
 * - `teacherId`: Injected strictly from the authenticated teacher/admin session (`req.user.id`).
 * - `status`: Always initialized to `DRAFT` upon creation; cannot be self-published on create.
 * - `price`: Omitted as monetization is out of scope for Core LMS v1.
 * - `createdAt`, `updatedAt`: Managed automatically by the database.
 */
export const createCourseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Course title must be at least 3 characters")
      .max(150, "Course title cannot exceed 150 characters"),

    description: z
      .string()
      .trim()
      .max(5000, "Description cannot exceed 5000 characters")
      .optional(),

    thumbnailUrl: z
      .url("Thumbnail URL must be a valid URL")
      .refine((url) => url.startsWith("https://"), {
        message: "Thumbnail URL must use secure HTTPS protocol",
      })
      .optional(),

    categoryId: z.uuid("Category ID must be a valid UUID").optional(),
  })
  .strict();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

/**
 * Schema for updating course metadata.
 *
 * Intentionally Excluded from Request Body:
 * - `id`: Identified via route param `:id`.
 * - `teacherId`: Ownership cannot be transferred via basic course edit.
 * - `status`: Lifecycle transitions are governed via the dedicated `updateCourseStatusSchema`.
 * - `slug`: Re-derived server-side only if `title` changes.
 */
export const updateCourseSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Course title must be at least 3 characters")
      .max(150, "Course title cannot exceed 150 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(5000, "Description cannot exceed 5000 characters")
      .optional(),

    thumbnailUrl: z
      .url("Thumbnail URL must be a valid URL")
      .refine((url) => url.startsWith("https://"), {
        message: "Thumbnail URL must use secure HTTPS protocol",
      })
      .optional(),

    categoryId: z.uuid("Category ID must be a valid UUID").nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.thumbnailUrl !== undefined ||
      data.categoryId !== undefined,
    { message: "At least one field must be provided for course update" }
  );

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

/**
 * Schema for transitioning course publication status (PATCH /courses/:id/status).
 *
 * Intentionally Excluded from Request Body:
 * - All metadata fields: Restricts the endpoint solely to lifecycle state changes.
 * - Course publishing triggers service-layer validation (e.g. verifying non-empty curriculum).
 */
export const updateCourseStatusSchema = z
  .object({
    status: courseStatusEnum,
  })
  .strict();

export type UpdateCourseStatusInput = z.infer<typeof updateCourseStatusSchema>;

/**
 * Query schema for searching, filtering, and paginating courses.
 * Extends the shared paginationQuerySchema with course-specific filters.
 */
export const listCoursesQuerySchema = paginationQuerySchema.extend({
  categoryId: z.uuid("Category ID must be a valid UUID").optional(),
  search: z
    .string()
    .trim()
    .max(100, "Search keyword cannot exceed 100 characters")
    .optional(),
  status: courseStatusEnum.optional(),
});

export type ListCoursesQueryInput = z.infer<typeof listCoursesQuerySchema>;
