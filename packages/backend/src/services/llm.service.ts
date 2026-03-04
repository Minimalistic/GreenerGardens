import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import type { LlmConversationRepository } from '../db/repositories/llm.repository.js';
import type { LlmMessageRepository } from '../db/repositories/llm.repository.js';
import type { LlmContextService } from './llm-context.service.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_HISTORY = 20;

const SYSTEM_PROMPT_TEMPLATE = `You are a helpful, knowledgeable gardening advisor for a specific garden. You provide personalized advice based on the garden's actual data shown below.

Guidelines:
- Give specific, actionable advice based on the garden's zone, plants, and current conditions
- Reference the user's actual plants by name when relevant
- Consider seasonal timing based on frost dates and current date
- Be concise but thorough — prioritize practical advice
- If you don't have enough data to answer, say so and suggest what the user could track
- Never modify garden data directly — suggest actions the user should take
- Use markdown formatting for readability

## Garden Context
{context}`;

export class LlmService {
  private client: Anthropic | null = null;

  constructor(
    private convRepo: LlmConversationRepository,
    private msgRepo: LlmMessageRepository,
    private contextService: LlmContextService,
  ) {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }

  isConfigured(): boolean {
    return !!this.client;
  }

  listConversations() {
    return this.convRepo.findAll({ limit: 50, orderBy: 'updated_at', orderDir: 'DESC' });
  }

  getConversation(id: string) {
    return this.convRepo.findById(id);
  }

  createConversation(title?: string) {
    const id = uuid();
    return this.convRepo.insert({
      id,
      title: title ?? null,
    });
  }

  deleteConversation(id: string) {
    this.convRepo.delete(id);
  }

  getMessages(conversationId: string) {
    return this.msgRepo.findByConversation(conversationId, 100);
  }

  async *sendMessageStream(conversationId: string, userMessage: string, gardenId: string) {
    if (!this.client) {
      throw new Error('Anthropic API key not configured');
    }

    // Store user message
    const userMsgId = uuid();
    const context = this.contextService.buildContext(gardenId);
    this.msgRepo.insert({
      id: userMsgId,
      conversation_id: conversationId,
      role: 'user',
      content: userMessage,
      context_summary: null,
    });

    // Build message history
    const history = this.msgRepo.findByConversation(conversationId, MAX_HISTORY);
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = history.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Build system prompt
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace('{context}', context);

    // Auto-title conversation from first message
    const conv = this.convRepo.findById(conversationId);
    if (conv && !conv.title) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '');
      this.convRepo.update(conversationId, { title });
    }

    // Call Claude with streaming
    const stream = this.client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    let fullContent = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;
        yield event.delta.text;
      }
    }

    // Store assistant response
    const assistantMsgId = uuid();
    this.msgRepo.insert({
      id: assistantMsgId,
      conversation_id: conversationId,
      role: 'assistant',
      content: fullContent,
      context_summary: `Context included: garden info, ${context.split('\n').length} lines`,
    });

    // Touch conversation timestamp
    this.convRepo.update(conversationId, { updated_at: new Date().toISOString() });
  }
}
