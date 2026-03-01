import { z } from 'zod';

export const UploadSchema = z.object({
  id: z.string().uuid(),
  original_name: z.string(),
  stored_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().positive(),
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().nullable().optional(),
  created_at: z.string(),
});

export type Upload = z.infer<typeof UploadSchema>;
