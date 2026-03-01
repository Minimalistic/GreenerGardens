import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface LlmConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface LlmMessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  context_summary: string | null;
  created_at: string;
}

export class LlmConversationRepository extends BaseRepository<LlmConversationRow> {
  constructor(db: Database.Database) {
    super(db, 'llm_conversations');
  }
}

export class LlmMessageRepository extends BaseRepository<LlmMessageRow> {
  constructor(db: Database.Database) {
    super(db, 'llm_messages');
  }

  findByConversation(conversationId: string, limit = 50): LlmMessageRow[] {
    return this.db.prepare(
      'SELECT * FROM llm_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?'
    ).all(conversationId, limit) as LlmMessageRow[];
  }

  deleteByConversation(conversationId: string): void {
    this.db.prepare('DELETE FROM llm_messages WHERE conversation_id = ?').run(conversationId);
  }
}
