import { z } from 'zod';

export const TagCreateSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(20).nullable().optional(),
});

export const TagUpdateSchema = TagCreateSchema.partial();

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().nullable(),
  created_at: z.string(),
});

export const EntityTagSchema = z.object({
  tag_id: z.string().uuid(),
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
});

export type Tag = z.infer<typeof TagSchema>;
export type TagCreate = z.infer<typeof TagCreateSchema>;
export type TagUpdate = z.infer<typeof TagUpdateSchema>;
export type EntityTag = z.infer<typeof EntityTagSchema>;
