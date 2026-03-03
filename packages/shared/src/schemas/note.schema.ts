import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { NoteContentTypeEnum } from './enums.js';

export const EntityLinkSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
});

export const NoteCreateSchema = z.object({
  content: z.string().min(1).max(10000),
  content_type: NoteContentTypeEnum.default('text'),
  entity_links: z.array(EntityLinkSchema).default([]),
  photo_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  note_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const NoteUpdateSchema = z.object({
  content: z.string().min(1).max(10000).optional(),
  content_type: NoteContentTypeEnum.optional(),
  entity_links: z.array(EntityLinkSchema).optional(),
  photo_ids: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  pinned: z.boolean().optional(),
  note_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const NoteSchema = BaseEntitySchema.merge(NoteCreateSchema);

export type Note = z.infer<typeof NoteSchema>;
export type NoteCreate = z.infer<typeof NoteCreateSchema>;
export type NoteUpdate = z.infer<typeof NoteUpdateSchema>;
export type EntityLink = z.infer<typeof EntityLinkSchema>;
