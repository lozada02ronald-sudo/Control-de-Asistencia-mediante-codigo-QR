import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

export function validateRequest(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      req.body = parsed.body;
      req.params = parsed.params;
      req.query = parsed.query;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

