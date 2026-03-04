# Phase 6a — Cleanup & Hardening — COMPLETE

> Address tech debt, type safety issues, and structural problems discovered during Step 0 implementation. Do this before continuing with Phase 6 feature work (Steps 1-9).
>
> **Status**: All 4 tasks complete. Committed as `d5efa1b`.

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode, migrations 001-007
- **Tests**: vitest in `packages/backend/tests/`, helper at `tests/helpers/test-app.ts`, in-memory SQLite
- **Pre-existing frontend TS errors** exist in 4 files (Vite builds fine but `tsc --noEmit` fails)
- Run `npx` from project root, not from `packages/backend` (ENOENT issue). Or use node directly: `/opt/homebrew/opt/node@20/bin/node node_modules/.bin/<tool>`
- Node.js v20 required (`/opt/homebrew/opt/node@20/bin` must be on PATH)

---

## Task 1: Fix Frontend TypeScript Errors (4 files, 5 errors)

Goal: `tsc --noEmit --project packages/frontend/tsconfig.app.json` passes with 0 errors.

### 1a. `packages/frontend/src/pages/assistant.tsx` (lines 82, 99)
**Error**: `Expected 1-2 arguments, but got 0` — calling `api.delete()` with no arguments.
**Fix**: The delete calls for conversations are missing the path argument. Find the two `api.delete()` calls and ensure they pass the correct URL path (e.g., `/assistant/conversations/${id}`). Check the backend route `DELETE /api/v1/assistant/conversations/:id` for the expected endpoint.

### 1b. `packages/frontend/src/pages/garden-layout.tsx` (line 58)
**Error**: Plot create call is missing required fields `is_covered` and `tags`.
**Fix**: Add `is_covered: false` and `tags: []` to the plot creation payload. These have defaults in the Zod schema (`PlotCreateSchema`) but are required properties in the inferred type. The schema is in `packages/shared/src/schemas/plot.schema.ts`.

### 1c. `packages/frontend/src/pages/pest-events.tsx` (line 132)
**Error**: `'outcome' does not exist in type` — the update payload includes an `outcome` field that's not in the schema.
**Fix**: Check `PestEventUpdateSchema` in `packages/shared/src/schemas/pest-event.schema.ts`. Either:
- Remove `outcome` from the frontend payload if it's not a real field, OR
- Add `outcome` to the shared Zod schema if the DB column exists (check migration `005_phase5b_companion_rotation_pest.sql` for the `pest_events` table columns)

### 1d. `packages/frontend/src/pages/plot-detail.tsx` (line 62)
**Error**: Plant instance creation missing required `tags` field.
**Fix**: Add `tags: []` to the plant instance creation payload. Same issue as 1b — default exists in Zod schema but required in the inferred type.

### Verification
```bash
# Must pass with 0 errors:
node node_modules/.bin/tsc --noEmit --project packages/frontend/tsconfig.app.json

# Must still build:
node node_modules/.bin/vite build packages/frontend
```

---

## Task 2: Expand Integration Test Coverage

Goal: Cover error/edge cases, not just happy paths. Add tests for the error handling paths and service edge cases that were silently broken before.

### 2a. Add error case tests to existing files

**`packages/backend/tests/gardens.test.ts`** — add:
- GET nonexistent garden by ID → 404
- PATCH nonexistent garden → 404
- DELETE nonexistent garden (idempotent or 404, verify which)
- Create two gardens, verify list returns both

**`packages/backend/tests/plant-instances.test.ts`** — add:
- Create with nonexistent `plant_catalog_id` → error
- Create with nonexistent `plot_id` → error
- Status transition to invalid status → error
- Delete instance, verify GET returns 404

**`packages/backend/tests/search.test.ts`** — add:
- Search with special characters (quotes, percent signs) → doesn't crash
- Search with very long query → returns results or empty (no crash)

### 2b. New test file: `packages/backend/tests/push.test.ts`
- GET /api/v1/push/vapid-key returns configured: false (no env vars in tests)
- POST /api/v1/push/subscribe with valid payload → 201
- POST /api/v1/push/subscribe with missing fields → 400
- DELETE /api/v1/push/unsubscribe → removes subscription
- PATCH /api/v1/push/preferences → updates preferences
- Subscribe same endpoint twice → updates (upsert), not duplicate

### 2c. New test file: `packages/backend/tests/export.test.ts`
- GET /api/v1/export/gardens → returns JSON array
- GET /api/v1/export/gardens/csv → returns CSV string
- GET /api/v1/export/invalid_entity → 400
- Export empty table → returns empty data (not crash)

### Verification
```bash
cd packages/backend
node ../node_modules/.bin/vitest run
# All tests pass, 0 failures
```

---

## Task 3: Split Route Registration (Backend DI Cleanup)

Goal: Break up the 183-line `registerRoutes()` God function into logical groups.

### 3a. Create route group files

Split `packages/backend/src/routes/index.ts` into group registration functions. Each group handles its own repo/service instantiation:

**`packages/backend/src/routes/groups/core.routes.ts`**
```ts
export function registerCoreRoutes(fastify, db) {
  // Gardens, plots, sub-plots, plant catalog, plant instances, harvests
}
```

**`packages/backend/src/routes/groups/tracking.routes.ts`**
```ts
export function registerTrackingRoutes(fastify, db) {
  // History, weather, tasks, calendar, alerts
}
```

**`packages/backend/src/routes/groups/knowledge.routes.ts`**
```ts
export function registerKnowledgeRoutes(fastify, db) {
  // Companion, rotation, search, planting guide, LLM assistant
}
```

**`packages/backend/src/routes/groups/management.routes.ts`**
```ts
export function registerManagementRoutes(fastify, db) {
  // Notes, tags, uploads, pest events, soil tests
}
```

**`packages/backend/src/routes/groups/data.routes.ts`**
```ts
export function registerDataRoutes(fastify, db) {
  // Export, backup, analytics, seed inventory, cost entries, timeline, weather-compare, push
}
```

### 3b. Simplify `index.ts`

The main `registerRoutes()` becomes ~30 lines:
```ts
export function registerRoutes(fastify, db) {
  registerCoreRoutes(fastify, db);
  registerTrackingRoutes(fastify, db);
  registerKnowledgeRoutes(fastify, db);
  registerManagementRoutes(fastify, db);
  registerDataRoutes(fastify, db);
}
```

### 3c. Handle cross-cutting concerns
- The history logger is shared across groups — create it once in `index.ts` and pass it into group functions
- `instanceService.setCalendarService()` and `instanceService.setTaskService()` cross group boundaries — wire these in `index.ts` after all groups register
- `setAlertService()` and `setPushService()` for the weather job — call from `index.ts`
- The weather fetch job start stays in `index.ts`

### Verification
```bash
# Backend typecheck:
node node_modules/.bin/tsc --noEmit --project packages/backend/tsconfig.json

# All existing tests still pass (this is a pure refactor):
cd packages/backend && node ../node_modules/.bin/vitest run
```

---

## Task 4: Split Settings Page (Frontend)

Goal: Break the 441-line `settings.tsx` into a tabbed layout with focused sub-components.

### 4a. Create settings sub-components

**`packages/frontend/src/pages/settings/garden-info.tsx`**
- Garden name, description, address, lat/lon, USDA zone, timezone, frost dates, area
- The form + save button

**`packages/frontend/src/pages/settings/display-prefs.tsx`**
- Temperature unit, measurement unit, date format selects

**`packages/frontend/src/pages/settings/notifications.tsx`**
- The existing `NotificationSettings` component (extracted from settings.tsx)

**`packages/frontend/src/pages/settings/data-management.tsx`**
- Data export (SQLite download)
- Backup management (create, list, download, delete, integrity check, vacuum)

### 4b. Update `settings.tsx` to use Tabs

Use shadcn/ui `Tabs` component to organize the sub-components:
```tsx
<Tabs defaultValue="garden">
  <TabsList>
    <TabsTrigger value="garden">Garden</TabsTrigger>
    <TabsTrigger value="display">Display</TabsTrigger>
    <TabsTrigger value="notifications">Notifications</TabsTrigger>
    <TabsTrigger value="data">Data</TabsTrigger>
  </TabsList>
  <TabsContent value="garden"><GardenInfoSettings /></TabsContent>
  <TabsContent value="display"><DisplayPrefsSettings /></TabsContent>
  <TabsContent value="notifications"><NotificationSettings /></TabsContent>
  <TabsContent value="data"><DataManagementSettings /></TabsContent>
</Tabs>
```

### 4c. Shared state
- The `useSettings()` hook and `useToast()` can be called in each sub-component independently
- The garden info form data doesn't need to cross tab boundaries
- Each tab is self-contained with its own save/action buttons

### Verification
```bash
# Frontend typecheck (0 errors after Task 1):
node node_modules/.bin/tsc --noEmit --project packages/frontend/tsconfig.app.json

# Build succeeds:
node node_modules/.bin/vite build packages/frontend
```

---

## Order of Operations

1. **Task 1** (TS errors) — do first, quick wins, unblocks strict type checking
2. **Task 2** (tests) — do second, catches more bugs before refactoring
3. **Task 3** (route split) — refactor with confidence (tests catch regressions)
4. **Task 4** (settings split) — frontend cleanup

Tasks 1 and 2 are independent and can be done in parallel.
Tasks 3 and 4 are independent and can be done in parallel (after 1+2).

## Final Verification

After all 4 tasks:
```bash
# Backend typecheck — 0 errors
node node_modules/.bin/tsc --noEmit --project packages/backend/tsconfig.json

# Frontend typecheck — 0 errors
node node_modules/.bin/tsc --noEmit --project packages/frontend/tsconfig.app.json

# Backend tests — all pass
cd packages/backend && node ../node_modules/.bin/vitest run

# Frontend build — succeeds
node node_modules/.bin/vite build packages/frontend

# Backend build — succeeds
node node_modules/.bin/tsc --project packages/backend/tsconfig.json
```
