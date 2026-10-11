import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export interface RequestValidationSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/**
 * Validates incoming HTTP request components (body, params, query) using Zod schemas.
 *
 * Design Notes:
 * - On validation failure, passes the ZodError directly to next(err) so the global
 *   errorMiddleware (in src/middleware/error.middleware.ts) formats the standard 400 response.
 * - In Express 4 (with @types/express 5 / future Express 5), req.query is treated as a read-only
 *   getter on the Request object in TypeScript. Directly assigning to req.query causes TS type errors.
 *   Therefore, validated/coerced query data is stored in res.locals.query.
 * - req.body and req.params are updated in-place with parsed/coerced data where allowed.
 */
export function validateRequest(
  schemas: RequestValidationSchemas
): RequestHandler {
  return (req, res, next) => {
    if (schemas.params) {
      const paramsResult = schemas.params.safeParse(req.params);
      if (!paramsResult.success) {
        return next(paramsResult.error);
      }
      req.params = paramsResult.data as Record<string, string>;
    }

    if (schemas.query) {
      const queryResult = schemas.query.safeParse(req.query);
      if (!queryResult.success) {
        return next(queryResult.error);
      }
      res.locals.query = queryResult.data;
    }

    if (schemas.body) {
      const bodyResult = schemas.body.safeParse(req.body);
      if (!bodyResult.success) {
        return next(bodyResult.error);
      }
      req.body = bodyResult.data;
    }

    next();
  };
}
