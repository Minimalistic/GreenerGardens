import { z } from 'zod';

export const CostCategoryEnum = z.enum([
  'seeds', 'soil', 'fertilizer', 'tools', 'infrastructure',
  'pest_control', 'water', 'labor', 'other',
]);

export const CostEntryCreateSchema = z.object({
  category: CostCategoryEnum.default('other'),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  amount_cents: z.number().int().min(0),
  description: z.string().min(1),
  purchase_date: z.string(),
  vendor: z.string().optional(),
  receipt_upload_id: z.string().optional(),
  notes: z.string().optional(),
});

export const CostEntryUpdateSchema = CostEntryCreateSchema.partial();

export const CostEntrySchema = CostEntryCreateSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type CostCategory = z.infer<typeof CostCategoryEnum>;
export type CostEntryCreate = z.infer<typeof CostEntryCreateSchema>;
export type CostEntryUpdate = z.infer<typeof CostEntryUpdateSchema>;
export type CostEntry = z.infer<typeof CostEntrySchema>;
