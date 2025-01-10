/**
 * Middleware for validating incoming request bodies using Zod schemas.
 * Ensures that requests adhere to the expected structure and constraints.
 */

import { ZodError, ZodObject, ZodRawShape } from "zod"; // Import Zod library for schema validation
import { Request, Response, NextFunction } from "express";

/**
 * Validation middleware factory.
 * Generates middleware that validates the `req.body` against a provided Zod schema.
 *
 * @param {z.ZodSchema} schema - The Zod schema to validate the request body against.
 * @returns {Function} Middleware function for request validation.
 */
export function validationMiddleware<T extends ZodRawShape>(
  schema: ZodObject<T>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request body using the provided schema
      schema.parse(req.body);

      // If validation passes, proceed to the next middleware or route handler
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Handle validation errors from Zod
        const messages = error.errors.map((issue) => ({
          message: `${issue.path.join(".")}: ${issue.message}`, // Detailed error message
        }));

        console.error(messages);

        // Respond with a 400 Bad Request and detailed error messages
        res.status(400).json({
          success: false,
          message: `${messages[0].message}`, // Only include the first error message
        });
      } else {
        // Handle unexpected errors
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };
}
