import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PestTypeEnum, SeverityEnum, TreatmentTypeEnum, OutcomeEnum } from './enums.js';

export const PestEventCreateSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid(),
  pest_type: PestTypeEnum.default('other'),
  pest_name: z.string().min(1).max(200),
  severity: SeverityEnum.default('medium'),
  detected_date: z.string().min(1),
  resolved_date: z.string().nullable().optional(),
  treatment_applied: z.string().max(500).nullable().optional(),
  treatment_type: TreatmentTypeEnum.default('none'),
  outcome: OutcomeEnum.default('ongoing'),
  photos: z.array(z.string()).default([]),
  notes: z.string().max(2000).nullable().optional(),
});

export const PestEventUpdateSchema = PestEventCreateSchema.partial();

export const PestEventSchema = BaseEntitySchema.merge(PestEventCreateSchema);

export type PestEvent = z.infer<typeof PestEventSchema>;
export type PestEventCreate = z.infer<typeof PestEventCreateSchema>;
export type PestEventUpdate = z.infer<typeof PestEventUpdateSchema>;
