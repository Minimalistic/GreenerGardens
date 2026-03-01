import { z } from 'zod';

export const UUIDSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/));

export const BaseEntitySchema = z.object({
  id: UUIDSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
