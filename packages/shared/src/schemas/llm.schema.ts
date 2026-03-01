import { z } from 'zod';

export const LlmRoleEnum = z.enum(['user', 'assistant']);
export type LlmRole = z.infer<typeof LlmRoleEnum>;

export const LlmConversationSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type LlmConversation = z.infer<typeof LlmConversationSchema>;

export const LlmMessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  role: LlmRoleEnum,
  content: z.string(),
  context_summary: z.string().nullable(),
  created_at: z.string(),
});
export type LlmMessage = z.infer<typeof LlmMessageSchema>;

export const SendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  garden_id: z.string().min(1),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
