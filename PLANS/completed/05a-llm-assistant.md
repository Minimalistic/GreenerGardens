# Phase 5a Plan — LLM Gardening Assistant — "Ask Your Garden"

> The AI assistant answers garden questions with full context of the user's specific garden, plants, weather, and history. High-value, standalone feature.
> **Depends on**: Phase 1 (schema). Enhanced by Phase 2a (weather data), but can work without it.
> Estimated scope: Medium (LLM integration, chat UI, context builder, 1 new table + page)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode
- **LLM**: Use Anthropic Claude API. API key from `process.env.ANTHROPIC_API_KEY`. Call from backend only.
- Use `@anthropic-ai/sdk` npm package for Claude API calls
- Recommended model: `claude-sonnet-4-6` (good balance of quality and speed for a chat assistant)

---

## Step 1: Database Schema — Migration (add to next available migration number)

### LLM chat history tables
```sql
CREATE TABLE IF NOT EXISTS llm_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS llm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES llm_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  context_summary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_llm_messages_conv ON llm_messages(conversation_id, created_at);
```

### Implementation notes:
- Add Zod schemas for llm_conversations, llm_messages in `packages/shared/`
- `role` is one of: `user`, `assistant`, `system`
- `context_summary` stores what context was injected for that message (for debugging/transparency)

---

## Step 2: LLM Service (Backend)

### 2a. Core LLM service (`packages/backend/src/services/llm.service.ts`)
- Install `@anthropic-ai/sdk` in backend package
- System prompt template that includes:
  - User's zone, garden name, location, frost dates
  - Current date and season
  - Summary of garden state (plot count, active plants, recent harvests)
  - Clear instruction: "You are a helpful gardening advisor for a specific garden. You provide advice based on the garden's data. You suggest actions but never modify data directly."
- `sendMessage(conversationId, userMessage)` — main method:
  1. Build context from garden data
  2. Retrieve conversation history (last N messages)
  3. Call Claude API with system prompt + context + history + user message
  4. Store both user message and assistant response
  5. Return assistant response

### 2b. Context builder (`packages/backend/src/services/llm-context.service.ts`)
- Analyze user message for entity references (plant names, plot names, "my tomatoes", etc.)
- Build context block by querying relevant tables:
  - **Always include**: garden info, current season, zone, frost dates
  - **If plant mentioned**: plant catalog data, active instances, recent harvests, pest history
  - **If plot mentioned**: plot data, what's planted, soil tests (if they exist)
  - **If weather mentioned**: recent weather + forecast (if weather tables exist)
  - **If "what should I do"**: overdue tasks, upcoming calendar events (if they exist)
- Stay within context limits — summarize older data, prioritize recent
- Gracefully handle missing Phase 2+ data (weather, tasks may not exist yet)

### 2c. Status check
- `isConfigured()` — returns whether ANTHROPIC_API_KEY is set
- Used by frontend to show/hide assistant or display setup instructions

---

## Step 3: LLM Routes

- `GET /api/v1/assistant/status` — check if API key is configured
- `GET /api/v1/assistant/conversations` — list conversations (most recent first)
- `POST /api/v1/assistant/conversations` — start new conversation (returns conversation ID)
- `GET /api/v1/assistant/conversations/:id/messages` — get conversation history
- `POST /api/v1/assistant/conversations/:id/messages` — send message, get streamed response
- `DELETE /api/v1/assistant/conversations/:id` — delete conversation

### Streaming
- Use Fastify's reply.raw for streaming Claude responses
- Send server-sent events (SSE) or newline-delimited JSON chunks
- Frontend renders tokens as they arrive for responsive feel

---

## Step 4: Frontend — Chat Interface

### 4a. Assistant page (`packages/frontend/src/pages/assistant.tsx`)
- Add `/assistant` route to App.tsx
- Add "Assistant" to sidebar nav (MessageSquare icon from lucide-react)

### 4b. Chat UI layout
- Left sidebar: conversation list (title, date, delete button)
- Main area: message list + input box
- Messages: user messages right-aligned, assistant messages left-aligned with markdown rendering
- Input: text area with send button, supports Enter to send (Shift+Enter for newline)
- Typing indicator while waiting for response (animated dots)

### 4c. Quick prompt buttons
- Show when conversation is empty or as floating suggestions:
  - "What should I do this week?"
  - "Any concerns about my garden?"
  - "What can I plant right now?"
  - "How are my tomatoes doing?" (dynamic, based on what's planted)

### 4d. Graceful degradation
- When no API key: "Configure your Anthropic API key in Settings to enable the AI assistant"
- Link to settings page
- Add ANTHROPIC_API_KEY field to settings page (or display instructions for .env)

### 4e. Assistant hooks
- `packages/frontend/src/hooks/use-assistant.ts`
- `useAssistantStatus()` — check if configured
- `useConversations()` — list conversations
- `useConversationMessages(id)` — get messages
- `useSendMessage()` — send message mutation (handles streaming)

---

## Step 5: Proactive Insights (Stretch Goal)

### 5a. Insight generation
- Background job (or on dashboard load): call LLM with garden summary, ask for 2-3 actionable insights
- Examples: "Your lettuce was planted 45 days ago — harvest window is approaching", "Frost risk this week — consider covering tender plants"
- Cache insights for the day (don't re-call LLM on every dashboard load)

### 5b. Dashboard insight cards
- Display as dismissible cards on dashboard
- Styled distinctly (slight purple/blue tint to indicate AI-generated)
- "Dismiss" button removes for the day
- "Ask more" button opens assistant with follow-up context

### 5c. Implementation
- `GET /api/v1/assistant/insights` — returns cached daily insights
- Generate insights once daily or when dashboard is first loaded each day
- Store in a simple key-value cache (could be a `kv_cache` table or in-memory)

---

## Verification Checklist

- [ ] LLM chat works with Anthropic API key configured
- [ ] Context builder includes relevant garden data in prompts
- [ ] Conversation history persists across page reloads
- [ ] Multiple conversations can be managed (create, switch, delete)
- [ ] Quick prompt buttons work and produce useful responses
- [ ] Streaming responses render progressively
- [ ] App works gracefully when API key is not set
- [ ] Proactive insights appear on dashboard (if implemented)
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
