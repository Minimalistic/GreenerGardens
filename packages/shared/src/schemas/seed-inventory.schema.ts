import { z } from 'zod';

export const SeedInventoryCreateSchema = z.object({
  plant_catalog_id: z.string().optional(),
  variety_name: z.string().min(1),
  brand: z.string().optional(),
  source: z.string().optional(),
  quantity_packets: z.number().int().min(0).optional(),
  quantity_seeds_approx: z.number().int().min(0).optional(),
  purchase_date: z.string().optional(),
  expiration_date: z.string().optional(),
  lot_number: z.string().optional(),
  germination_rate_tested: z.number().min(0).max(100).optional(),
  storage_location: z.string().optional(),
  cost_cents: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const SeedInventoryUpdateSchema = SeedInventoryCreateSchema.partial();

export const SeedInventorySchema = SeedInventoryCreateSchema.extend({
  id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type SeedInventoryCreate = z.infer<typeof SeedInventoryCreateSchema>;
export type SeedInventoryUpdate = z.infer<typeof SeedInventoryUpdateSchema>;
export type SeedInventory = z.infer<typeof SeedInventorySchema>;
