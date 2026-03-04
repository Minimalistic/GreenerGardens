import type { ZodSchema } from 'zod';

/**
 * Parse and validate request body against a Zod schema.
 * Throws a ZodError on failure (caught by the global error handler).
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
