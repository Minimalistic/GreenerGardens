import { z } from 'zod';
import { BaseEntitySchema } from './common.js';

export const FeedbackTypeEnum = z.enum(['bug', 'feature_request', 'feedback']);
export type FeedbackType = z.infer<typeof FeedbackTypeEnum>;

export const FeedbackSeverityEnum = z.enum(['low', 'medium', 'high', 'critical']);
export type FeedbackSeverity = z.infer<typeof FeedbackSeverityEnum>;

export const FeedbackStatusEnum = z.enum(['open', 'acknowledged', 'resolved', 'wont_fix']);
export type FeedbackStatus = z.infer<typeof FeedbackStatusEnum>;

export const FeedbackCreateSchema = z.object({
  feedback_type: FeedbackTypeEnum,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  severity: FeedbackSeverityEnum.nullable().optional(),
  page_route: z.string().max(500).nullable().optional(),
  element_context: z.string().max(1000).nullable().optional(),
});

export const FeedbackUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  severity: FeedbackSeverityEnum.nullable().optional(),
  status: FeedbackStatusEnum.optional(),
  element_context: z.string().max(1000).nullable().optional(),
});

export const FeedbackSchema = BaseEntitySchema.merge(FeedbackCreateSchema).extend({
  status: FeedbackStatusEnum,
});

export type Feedback = z.infer<typeof FeedbackSchema>;
export type FeedbackCreate = z.infer<typeof FeedbackCreateSchema>;
export type FeedbackUpdate = z.infer<typeof FeedbackUpdateSchema>;
