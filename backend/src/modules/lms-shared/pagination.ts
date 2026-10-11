export interface PaginationParams {
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Computes Prisma-compatible skip and take offset values.
 *
 * @param page 1-based page index (defaults to 1)
 * @param limit Number of records per page (defaults to 10)
 * @returns Object with { skip, take }
 */
export function getPagination(page = 1, limit = 10): PaginationParams {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, limit);
  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  return { skip, take };
}

/**
 * Constructs a standardized paginated response structure.
 *
 * @param items List of records retrieved for current page
 * @param total Total number of records matching query
 * @param page Current page number
 * @param limit Page size limit
 * @returns Object with { items, meta: { page, limit, total, totalPages } }
 */
export function buildPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const safeLimit = Math.max(1, limit);
  const totalPages = Math.ceil(total / safeLimit);

  return {
    items,
    meta: {
      page,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}
