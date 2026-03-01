import { z } from 'zod';
import { EntityTypeEnum, HistoryActionEnum } from './enums.js';

export const FieldChangeSchema = z.record(z.string(), z.object({
  old: z.unknown().optional(),
  new: z.unknown().optional(),
}));

export const HistoryLogSchema = z.object({
  id: z.string().uuid(),
  entity_type: EntityTypeEnum,
  entity_id: z.string().uuid(),
  action: HistoryActionEnum,
  timestamp: z.string(),
  field_changes: FieldChangeSchema.nullable().optional(),
  snapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  changed_by: z.string().default('system'),
  notes: z.string().nullable().optional(),
});

export type FieldChange = z.infer<typeof FieldChangeSchema>;
export type HistoryLog = z.infer<typeof HistoryLogSchema>;
