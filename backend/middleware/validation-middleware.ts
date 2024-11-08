import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from "zod";

export const validateParams = (schema: z.ZodObject<any, any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((issue: any) => ({
                    message: `Error with ${issue.path.join('.')}: ${issue.message}`
                }));
                res.status(400).json({ error: 'Bad request', details: errorMessages })
            } else {
                res.status(500).json({ error: 'Internal Server Error'});
            }
        }
    }
}