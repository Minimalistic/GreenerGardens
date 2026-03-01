# Phase 6 Plan — Polish & Power — "Depth For Those Who Want It"

> Advanced features for power users: timeline scrubbing, analytics, data views, sun/shade, seed inventory, cost tracking, and reporting. Also includes critical infrastructure: code splitting, error boundaries, push notifications, mobile nav redesign, and integration tests.
> **Depends on**: Phases 1-5 complete (all core features exist)
> Estimated scope: Very Large (recommend splitting into sub-phases when the time comes)

## Context for AI Agents
- **Monorepo**: `packages/backend` (Fastify), `packages/frontend` (React/Vite), `packages/shared` (Zod schemas)
- **Pattern**: Repository → Service → Route (backend), Zod schema (shared), Page → Hook → API call (frontend)
- **DB**: SQLite via `better-sqlite3`, WAL mode
- **History log**: Records all entity mutations with timestamps, field diffs, and full snapshots
- By this phase, the app should have: gardens, plots, plants, harvests, tasks, weather, pest events, soil tests, notes, tags, file uploads, LLM assistant, frost alerts, planting guide
- **Quick wins already done**: Dark mode, PWA, SQLite export (from Phase 3)
- **Frontend bundle** is already ~1MB — code splitting is critical before adding more pages
- **PWA service worker** is configured but doesn't send push notifications yet
- **Mobile bottom nav** has 8+ items already — needs redesign before adding more

---

## Step 0: Infrastructure & Quality (Do First)

These are prerequisites before adding new feature pages. They make the app production-grade.

### 0a. Code Splitting — Lazy-load Routes
- Convert all page imports in `App.tsx` to `React.lazy()` with `Suspense` fallback
- Each page becomes its own chunk — only loaded when navigated to
- Add a loading skeleton/spinner component as the Suspense fallback
- Expected to cut initial bundle from ~1MB to ~300-400KB
- Example:
  ```tsx
  const Dashboard = lazy(() => import('@/pages/dashboard'));
  const CalendarPage = lazy(() => import('@/pages/calendar'));
  // etc.
  ```
- Ensure named exports work with lazy (may need default export wrappers)

### 0b. React Error Boundaries
- Create `packages/frontend/src/components/error-boundary.tsx`
- Wrap route content in `<ErrorBoundary>` inside AppShell
- Fallback UI: "Something went wrong" message with:
  - Error details (in dev mode only)
  - "Go back to Dashboard" button
  - "Reload page" button
- Also wrap the assistant page separately (LLM streaming errors shouldn't crash the whole app)

### 0c. Mobile Navigation Redesign
- Current bottom nav has too many items for mobile screens (8+ pages)
- Redesign to show 4 primary items + "More" overflow:
  - Primary: Dashboard, Garden, Calendar, Tasks
  - "More" button opens a slide-up sheet with remaining pages: Harvests, Catalog, Assistant, Notes, Settings
- Update `packages/frontend/src/components/layout/mobile-nav.tsx`
- Remember: sidebar on desktop stays unchanged (it has room for all items)

### 0d. Integration Tests
- Install `vitest` in backend package (if not already present)
- Create test infrastructure: `packages/backend/tests/` directory
- Test helper: creates fresh in-memory SQLite DB, runs migrations, seeds, returns Fastify app instance
- Write integration tests for core API routes:
  - `gardens.test.ts` — CRUD + validation
  - `plant-instances.test.ts` — CRUD + status transitions + auto-date setting
  - `assistant.test.ts` — status endpoint, conversation CRUD (skip actual LLM calls)
  - `companion.test.ts` — compatibility checks return correct results
  - `rotation.test.ts` — rotation violations detected correctly
  - `search.test.ts` — FTS5 returns expected results
- Test pattern: setup → action → assertion, no mocking of internal services (test real behavior)
- Add `"test": "vitest run"` script to backend package.json
- Aim for coverage of: all route handlers, service edge cases (bad input, missing entities), migration correctness

### 0e. Push Notifications (PWA)
- Register push subscription in service worker using `PushManager`
- Backend: store push subscriptions in a `push_subscriptions` table
- Send notifications via `web-push` npm package for:
  - Task due today (morning batch at configurable time)
  - Frost alerts (immediate when detected by weather job)
  - Harvest reminders (plant instance approaching maturity)
- Frontend: notification permission request flow in settings page
  - "Enable notifications" toggle with permission prompt
  - Notification preferences: which types to receive
- Service worker handles `push` event and shows notification with action buttons
- Respect user preferences: only send enabled notification types

---

## Step 1: Interactive Timeline Scrubber

This is the "spine" of the app per the spec — the most architecturally significant feature.

### 1a. Timeline reconstruction service (`packages/backend/src/services/timeline.service.ts`)
- `getGardenStateAtDate(gardenId, targetDate)` — reconstruct full garden state at any past date
  - For each entity type, walk the history_log backwards from targetDate
  - For creates: entity exists at that date
  - For deletes: entity doesn't exist after that date
  - For updates: apply field_changes in reverse to reconstruct prior state
- `getTimelineEvents(gardenId, startDate, endDate, entityTypes[])` — get all history_log entries in range
- `getTimelineMarkers(gardenId, startDate, endDate)` — aggregated activity markers for the timeline bar

### 1b. Timeline API
- `GET /api/v1/timeline/state?date=ISO8601` — get garden state at date
- `GET /api/v1/timeline/events?start=&end=&types=` — events in range
- `GET /api/v1/timeline/markers?start=&end=&zoom=day|week|month` — aggregated markers

### 1c. Frontend: Timeline component
- Persistent, scrubbable horizontal bar (like a video scrubber)
- Lives at the bottom of the app shell (visible on all pages)
- Activity markers as colored dots (green=planting, orange=harvest, red=pest, blue=weather)
- Zoom levels: day, week, month, season, year
- Drag to scrub — all page content updates to reflect that date
- "Return to today" button when viewing past/future
- Visual indicator when viewing non-current date (soft tint, timestamp badge)

### 1d. Planning mode
- When scrubbed into the future, UI shifts to "planning mode" (dashed borders, purple tint)
- Future-dated records appear as planned items
- Create future-dated plant_instances, tasks, etc.

### 1e. Global timeline context
- React context `TimelineContext` that provides `currentViewDate`
- All data-fetching hooks check this context — if viewing a past date, fetch from timeline API instead of current state
- Dashboard, garden layout, plot detail all respect timeline position

---

## Step 2: Table/Spreadsheet Views

### 2a. Generic table view component
- `packages/frontend/src/components/data-table.tsx`
- Reusable component using shadcn/ui Table
- Features: sortable columns, filterable, column visibility toggle, pagination
- CSV export button per table

### 2b. Add table views for all entity types
- Plant instances table: all plants with sortable columns (name, plot, status, health, planted date, days since planting)
- Harvests table: all harvests sortable by date, plant, quantity, quality
- Tasks table: filterable by status, priority, due date
- Pest events table: filterable by status, severity
- Soil tests table: by plot, date
- History log table: the raw audit trail, filterable by entity type and date range

### 2c. View mode toggle
- Add toggle on relevant pages: "Card view" / "Table view"
- Remember user's preference per page (localStorage)

---

## Step 3: Harvest Analytics

### 3a. Analytics service (`packages/backend/src/services/analytics.service.ts`)
- `getYieldByPlant(gardenId, year)` — harvest totals grouped by plant/variety
- `getYieldByPlot(gardenId, year)` — harvest totals per plot
- `getYearOverYearComparison(gardenId, years[])` — multi-year comparison
- `getSeasonalTimeline(gardenId, year)` — harvest quantities over time
- `getDestinationBreakdown(gardenId, year)` — pie chart data
- `getYieldEfficiency(gardenId, year)` — lbs per sqft, per plant

### 3b. Analytics API
- `GET /api/v1/analytics/harvests?year=&groupBy=plant|plot|month`
- `GET /api/v1/analytics/harvests/compare?years=2025,2026`
- `GET /api/v1/analytics/harvests/destinations?year=`
- `GET /api/v1/analytics/harvests/efficiency?year=`

### 3c. Frontend: Analytics page
- `packages/frontend/src/pages/analytics.tsx` — route `/analytics`
- Install `recharts` in frontend
- Charts:
  - Bar chart: yield by plant/variety
  - Stacked area: seasonal harvest timeline
  - Pie chart: harvest destinations
  - Year-over-year comparison line chart
  - Heat map overlay on garden layout (yield per plot)

---

## Step 4: Weather Historical Comparison

### 4a. Backend
- `GET /api/v1/weather/compare?years=2025,2026` — year-over-year temperature/precipitation
- `GET /api/v1/weather/gdd?year=&base=50` — GDD accumulation curve

### 4b. Frontend
- Weather page or expanded weather section with:
  - Year-over-year temperature overlay chart
  - GDD accumulation curve with crop maturity markers
  - Precipitation comparison

---

## Step 5: Garden Layout Enhancements

### 5a. Background image support
- Upload satellite/drone photo as background
- Scale calibration: user clicks two points, enters real-world distance
- Opacity slider (0-100%)
- Image stored in `/uploads/` directory, path in garden settings

### 5b. Sun/shade calculation engine
- `packages/backend/src/services/sun-shade.service.ts`
- Solar position calculation using garden lat/lon + date
- Input: structures with heights (from plot geometry or new infrastructure elements)
- Output: hours of direct sun per grid cell for a given date
- Library suggestion: `suncalc` npm package for solar position

### 5c. Sun/shade API
- `GET /api/v1/sun-shade?date=&plot=ID` — sun hours per cell for a date
- `GET /api/v1/sun-shade/animation?date=` — shadow positions at hourly intervals

### 5d. Layer system for layout
- Toggle-able overlay layers on the garden canvas:
  - Sun/shade layer (hours-of-sun heat map)
  - Companion planting layer (green/red highlights)
  - Crop rotation layer (family history color coding)
  - Pest pressure layer (heat map of historical pest events)
  - Harvest yield layer (heat map of productivity)
- Each layer is a separate Konva layer that can be shown/hidden
- Layer toggle buttons in layout toolbar

---

## Step 6: Seed Inventory Management

### 6a. Database — migration
```sql
CREATE TABLE IF NOT EXISTS seed_inventory (
  id TEXT PRIMARY KEY,
  plant_catalog_id TEXT REFERENCES plant_catalog(id),
  variety_name TEXT NOT NULL,
  brand TEXT,
  source TEXT,
  quantity_packets INTEGER DEFAULT 0,
  quantity_seeds_approx INTEGER,
  purchase_date TEXT,
  expiration_date TEXT,
  lot_number TEXT,
  germination_rate_tested REAL,
  storage_location TEXT,
  cost_cents INTEGER,
  notes TEXT,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_seed_inventory_plant ON seed_inventory(plant_catalog_id);
CREATE INDEX idx_seed_inventory_expiry ON seed_inventory(expiration_date);
```

### 6b. Backend: repository, service, routes
- Standard CRUD + special endpoints:
  - `GET /api/v1/seed-inventory` — list with filters (expiring soon, low quantity)
  - `POST /api/v1/seed-inventory/:id/germination-test` — log germination test results
  - `PATCH /api/v1/seed-inventory/:id/deduct` — deduct seeds when planting

### 6c. Frontend: Seed inventory page
- Route `/seeds`, add to sidebar nav
- Card view of seed packets with: variety, brand, quantity, expiration, viability indicator
- Expiring soon warnings (seeds past typical viability)
- Link to planting: when creating a plant_instance, optionally deduct from seed inventory

---

## Step 7: Cost & ROI Tracking

### 7a. Database — migration
```sql
CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'other',
  entity_type TEXT,
  entity_id TEXT,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  vendor TEXT,
  receipt_photo TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cost_entries_category ON cost_entries(category);
CREATE INDEX idx_cost_entries_date ON cost_entries(purchase_date);
CREATE INDEX idx_cost_entries_entity ON cost_entries(entity_type, entity_id);
```

### 7b. Backend: repository, service, routes
- Standard CRUD + analytics:
  - `GET /api/v1/costs` — list with filters
  - `GET /api/v1/costs/summary?year=` — total spend by category
  - `GET /api/v1/costs/roi?year=` — compare spend vs harvest value (using configurable grocery prices)

### 7c. Frontend
- Cost logging page or section in settings
- Opt-in feature (off by default, enable in settings)
- Simple form: amount, category, description, date, vendor
- Analytics: spend by category pie chart, year-over-year bar chart

---

## Step 8: Backup Automation

> Note: Basic SQLite export is already done in Phase 3 Quick Wins. This extends it.

### 8a. Backup service (`packages/backend/src/services/backup.service.ts`)
- Use SQLite's online backup API (`db.backup()`) for consistent snapshot
- Schedule: configurable (default daily via node-cron)
- Rotation: keep N most recent backups (default 7)
- Backup location: configurable path (default `./data/backups/`)
- Integrity verification: `PRAGMA integrity_check` after backup

### 8b. Backup API
- `POST /api/v1/backup/create` — trigger manual backup
- `GET /api/v1/backup/list` — list available backups with sizes/dates
- `POST /api/v1/backup/restore/:filename` — restore from backup (dangerous — confirm)
- `GET /api/v1/backup/download/:filename` — download backup file

### 8c. Extended export
- `GET /api/v1/export/full?format=json|csv` — full database export as JSON or CSV
- `GET /api/v1/export/:entityType?format=json|csv&filters...` — filtered export

### 8d. Frontend
- Data management section in settings page (extend existing export section)
- Backup management: trigger backup, view backup list, download, restore
- JSON/CSV export buttons per entity type
- Database maintenance: run VACUUM, integrity check

---

## Step 9: Print/PDF Reports

### 9a. Report templates
- Garden summary report (overview of what's planted where)
- Planting calendar (printable monthly view)
- Harvest report (season summary with totals)
- Plot history report (rotation and yield history)

### 9b. Implementation
- Use browser's `window.print()` with print-specific CSS
- Or: server-side PDF generation with `puppeteer` or `pdfkit`
- Print button on relevant pages that renders a clean, print-formatted version

---

## Verification Checklist

### Infrastructure (Step 0) — COMPLETE
- [x] Code splitting: initial bundle under 500KB, pages load on demand
- [x] Error boundary catches component crashes, shows recovery UI
- [x] Mobile nav shows 4 primary items + "More" overflow on small screens
- [x] Integration tests pass: `npm test` in backend succeeds (6 files, 25 tests)
- [x] Push notifications: permission flow, subscription stored, notifications received

### Features (Steps 1-9)
- [ ] Timeline scrubber allows viewing past garden state
- [ ] Table views available for all entity types with sort/filter
- [ ] Harvest analytics charts render correctly
- [ ] Sun/shade calculation produces reasonable results
- [ ] Layout layers can be toggled independently
- [ ] Seed inventory tracks packets and deducts on planting
- [ ] Cost tracking can be enabled and used (off by default)
- [ ] Backup automation creates and rotates backups
- [ ] JSON/CSV export works for all entity types
- [ ] Print/PDF reports generate clean output
- [ ] TypeScript compiles with 0 errors, Vite builds successfully
