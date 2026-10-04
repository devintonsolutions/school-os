import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validate(schema: ZodType): RequestHandler{
    return ( req, res, next) => {
        const result = schema.safeParse(req.body);

        if(!result.success){
            return next(result.error)
        }

        req.body = result.data;
        next();
    }
}