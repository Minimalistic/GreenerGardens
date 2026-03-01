import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { TaskTypeEnum, TaskPriorityEnum, TaskStatusEnum } from './enums.js';

export const TaskCreateSchema = z.object({
  entity_type: z.string().nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  task_type: TaskTypeEnum.default('other'),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  due_date: z.string().nullable().optional(),
  completed_date: z.string().nullable().optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().default('{}'),
  priority: TaskPriorityEnum.default('medium'),
  status: TaskStatusEnum.default('pending'),
  auto_generated: z.boolean().default(false),
  source_reason: z.string().max(500).nullable().optional(),
});

export const TaskUpdateSchema = TaskCreateSchema.partial();

export const TaskSchema = BaseEntitySchema.merge(TaskCreateSchema);

export type Task = z.infer<typeof TaskSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
