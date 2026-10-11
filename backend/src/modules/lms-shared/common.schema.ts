import { z } from "zod";

/**
 * Validates route parameters containing an entity UUID.
 * Example route: /api/v1/courses/:id
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export type UuidParamInput = z.infer<typeof uuidParamSchema>;

/**
 * Validates and coerces standard pagination query parameters.
 * - page: integer > 0, defaults to 1
 * - limit: integer between 1 and 50, defaults to 10
 */
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer")
    .positive("Page must be greater than 0")
    .default(1),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be greater than 0")
    .max(50, "Limit cannot exceed 50")
    .default(10),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

/**
 * Validates URL-safe slugs for categories and courses.
 * Enforces lowercase alphanumeric strings separated by single hyphens.
 */
export const slugSchema = z
  .string()
  .min(1, "Slug cannot be empty")
  .max(100, "Slug cannot exceed 100 characters")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must contain only lowercase alphanumeric characters separated by single hyphens"
  );

export type SlugInput = z.infer<typeof slugSchema>;
